from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Annotated

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator
from bson import ObjectId

from groq import AsyncGroq
import requests

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PyObjectId = Annotated[str, BeforeValidator(str)]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def age_from_birthdate(birthdate: date) -> int:
    today = date.today()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))

def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc

# --- Native in-app purchases (RevenueCat) ---
# Product IDs below are placeholders: they must exactly match products you
# create in App Store Connect / Google Play Console AND in RevenueCat (as
# non-subscription / non-renewing products), or verification will always
# fail to find a matching purchase. See PRD notes for the full setup
# checklist. REVENUECAT_SECRET_API_KEY is the server-side secret key from
# RevenueCat > Project Settings > API Keys (never the public SDK key).

UNLOCK_PRODUCT_ID = "com.nexusapp.mobile.unlock_full"   # $1 one-time: ad-free + exclusive features
PIN_PRODUCT_ID = "com.nexusapp.mobile.pin_slot"          # $6 one-time, repeatable: pin a post/opportunity for a day
DAILY_PIN_SLOTS = 5
PIN_TARGET_COLLECTIONS = {"forum_post": ("forum_posts", "author_id"), "opportunity": ("opportunities", "posted_by")}

def revenuecat_secret_key() -> str:
    key = os.environ.get("REVENUECAT_SECRET_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="Purchases are not configured yet")
    return key

def rc_get_subscriber(app_user_id: str) -> dict:
    resp = requests.get(
        f"https://api.revenuecat.com/v1/subscribers/{app_user_id}",
        headers={"Authorization": f"Bearer {revenuecat_secret_key()}"},
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not verify purchase with RevenueCat")
    return resp.json().get("subscriber", {})

def rc_find_non_subscription_purchase(subscriber: dict, product_id: str, transaction_id: str) -> bool:
    purchases = subscriber.get("non_subscriptions", {}).get(product_id, [])
    return any(p.get("id") == transaction_id for p in purchases)

async def get_own_pin_target(target_type: str, target_id: str, user_id: str):
    if target_type not in PIN_TARGET_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid target_type")
    coll_name, owner_field = PIN_TARGET_COLLECTIONS[target_type]
    try:
        doc = await db[coll_name].find_one({"_id": ObjectId(target_id)})
    except Exception:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    if doc.get(owner_field) != user_id:
        raise HTTPException(status_code=403, detail="You can only pin your own content")
    return doc

async def today_pin_map(target_type: str) -> dict:
    today = date.today().isoformat()
    slots = await db.pin_slots.find({"slot_date": today, "target_type": target_type}).to_list(DAILY_PIN_SLOTS)
    return {s["target_id"]: s["rank"] for s in slots}

async def user_map(ids):
    oids = []
    for i in set(ids):
        try:
            oids.append(ObjectId(i))
        except Exception:
            pass
    if not oids:
        return {}
    docs = await db.users.find({"_id": {"$in": oids}}, {"name": 1, "avatar": 1}).to_list(len(oids))
    return {str(d["_id"]): {"id": str(d["_id"]), "name": d.get("name"), "avatar": d.get("avatar")} for d in docs}

async def shared_project_user_ids(uid: str) -> set:
    """User ids that share at least one project (as members) with the given user."""
    projects = await db.projects.find({"members": uid}).to_list(200)
    ids = set()
    for p in projects:
        for m in p.get("members", []):
            if m and m != uid:
                ids.add(m)
    return ids

async def my_connection_map(uid: str) -> dict:
    """Map other_user_id -> status relative to `uid`: connected / pending_out / pending_in."""
    conns = await db.connections.find({"$or": [{"requester_id": uid}, {"recipient_id": uid}]}).to_list(2000)
    out = {}
    for c in conns:
        other = c["recipient_id"] if c["requester_id"] == uid else c["requester_id"]
        if c["status"] == "accepted":
            out[other] = "connected"
        elif c["requester_id"] == uid:
            out[other] = "pending_out"
        else:
            out[other] = "pending_in"
    return out

async def are_connected(a: str, b: str) -> bool:
    c = await db.connections.find_one({"status": "accepted", "$or": [
        {"requester_id": a, "recipient_id": b},
        {"requester_id": b, "recipient_id": a},
    ]})
    return bool(c)

async def is_blocked(a: str, b: str) -> bool:
    """True if either user has blocked the other."""
    c = await db.blocks.find_one({"$or": [
        {"blocker_id": a, "blocked_id": b},
        {"blocker_id": b, "blocked_id": a},
    ]})
    return bool(c)

async def blocked_id_set(uid: str) -> set:
    """All user ids that uid has blocked, or that have blocked uid."""
    rows = await db.blocks.find({"$or": [{"blocker_id": uid}, {"blocked_id": uid}]}).to_list(2000)
    out = set()
    for r in rows:
        out.add(r["blocked_id"] if r["blocker_id"] == uid else r["blocker_id"])
    return out

async def recompute_reputation(uid: str):
    reviews = await db.reviews.find({"reviewee_id": uid}).to_list(2000)
    if reviews:
        reliability = round(sum(r["reliability"] for r in reviews) / len(reviews))
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
    else:
        reliability = 100
        avg_rating = 0
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {
        "reputation.reliability": reliability,
        "reputation.avg_rating": avg_rating,
        "reputation.review_count": len(reviews),
    }})

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    birthdate: str
    school: Optional[str] = ""
    grade: Optional[str] = ""

class LoginInput(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    interests: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    looking_for: Optional[List[str]] = None
    location: Optional[str] = None

class ProjectInput(BaseModel):
    title: str
    description: str
    category: str
    roles_needed: List[str] = []
    skills: List[str] = []
    timeline: Optional[str] = ""

class OpportunityInput(BaseModel):
    title: str
    org: str
    type: str
    description: str
    deadline: Optional[str] = ""
    tags: List[str] = []
    link: Optional[str] = ""
    location: Optional[str] = "Remote"

class MessageInput(BaseModel):
    to_user_id: str
    text: str

class ForumPostInput(BaseModel):
    community: str
    title: str
    body: str

class ForumCommentInput(BaseModel):
    text: str

class ProjectCommentInput(BaseModel):
    text: str

class MatchInput(BaseModel):
    goal: str

class ReviewInput(BaseModel):
    rating: int              # 1-5
    reliability: int         # 0-100
    comment: str = ""
    project_id: Optional[str] = None

class ReportInput(BaseModel):
    target_type: str         # "user" | "message" | "forum_post" | "forum_comment" | "project" | "opportunity"
    target_id: str
    reason: str
    details: Optional[str] = ""

class DeletionRequestInput(BaseModel):
    email: str
    reason: Optional[str] = ""

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return clean(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")

@api_router.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        birthdate = date.fromisoformat(data.birthdate)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Please enter a valid date of birth")
    if birthdate > date.today():
        raise HTTPException(status_code=400, detail="Please enter a valid date of birth")
    if age_from_birthdate(birthdate) < 13:
        raise HTTPException(status_code=400, detail="You must be at least 13 years old to use Nexus")
    doc = {
        "email": email, "password_hash": hash_password(data.password),
        "name": data.name, "school": data.school or "", "grade": data.grade or "",
        "birthdate": data.birthdate,
        "bio": "", "avatar": f"https://api.dicebear.com/7.x/thumbs/svg?seed={data.name}",
        "interests": [], "skills": [], "looking_for": [], "location": "",
        "verified": email.endswith(".edu"), "role": "student",
        "reputation": {"projects_completed": 0, "reliability": 100, "avg_rating": 0, "review_count": 0},
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    set_auth_cookie(response, create_access_token(uid, email))
    doc["_id"] = res.inserted_id
    return clean(doc)

@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_auth_cookie(response, create_access_token(str(user["_id"]), email))
    return clean(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return clean(fresh)

@api_router.get("/students")
async def list_students(user: dict = Depends(get_current_user)):
    students = await db.users.find({"role": "student"}).to_list(200)
    shared = await shared_project_user_ids(user["id"])
    conn_map = await my_connection_map(user["id"])
    blocked = await blocked_id_set(user["id"])
    out = []
    for s in students:
        sid = str(s["_id"])
        if sid == user["id"] or sid in blocked:
            continue
        c = clean(s)
        c.pop("birthdate", None)
        status = conn_map.get(sid, "none")
        c["can_review"] = (sid in shared) or (status == "connected")
        c["connection_status"] = status
        out.append(c)
    return out

@api_router.get("/students/{sid}")
async def get_student(sid: str, user: dict = Depends(get_current_user)):
    s = await db.users.find_one({"_id": ObjectId(sid)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    c = clean(s)
    c.pop("birthdate", None)
    shared = await shared_project_user_ids(user["id"])
    conn_map = await my_connection_map(user["id"])
    status = conn_map.get(sid, "none")
    c["can_review"] = (sid in shared) or (status == "connected")
    c["connection_status"] = status
    return c

@api_router.get("/students/{sid}/reviews")
async def list_reviews(sid: str, user: dict = Depends(get_current_user)):
    reviews = await db.reviews.find({"reviewee_id": sid}).sort("created_at", -1).to_list(500)
    umap = await user_map([r["reviewer_id"] for r in reviews])
    out = []
    for r in reviews:
        r = clean(r)
        r["reviewer"] = umap.get(r["reviewer_id"])
        out.append(r)
    return out

@api_router.post("/students/{sid}/reviews")
async def create_review(sid: str, data: ReviewInput, user: dict = Depends(get_current_user)):
    if sid == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot review yourself")
    target = await db.users.find_one({"_id": ObjectId(sid)})
    if not target:
        raise HTTPException(status_code=404, detail="Student not found")
    shared = await shared_project_user_ids(user["id"])
    connected = await are_connected(user["id"], sid)
    if sid not in shared and not connected:
        raise HTTPException(status_code=403, detail="You can only review students you've collaborated with on a project or are connected with")
    rating = max(1, min(5, int(data.rating)))
    reliability = max(0, min(100, int(data.reliability)))
    doc = {
        "reviewer_id": user["id"], "reviewee_id": sid,
        "project_id": data.project_id, "rating": rating,
        "reliability": reliability, "comment": (data.comment or "").strip(),
        "reviewer_name": user["name"], "reviewer_avatar": user.get("avatar"),
        "created_at": now_iso(),
    }
    # one review per reviewer -> reviewee (upsert = editable)
    await db.reviews.update_one(
        {"reviewer_id": user["id"], "reviewee_id": sid},
        {"$set": doc}, upsert=True,
    )
    await recompute_reputation(sid)
    fresh = await db.users.find_one({"_id": ObjectId(sid)})
    return clean(fresh)

@api_router.post("/connections/{sid}")
async def send_connection(sid: str, user: dict = Depends(get_current_user)):
    if sid == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself")
    if not await db.users.find_one({"_id": ObjectId(sid)}):
        raise HTTPException(status_code=404, detail="Student not found")
    existing = await db.connections.find_one({"$or": [
        {"requester_id": user["id"], "recipient_id": sid},
        {"requester_id": sid, "recipient_id": user["id"]},
    ]})
    if existing:
        # if the other person already requested me, accept it
        if existing["status"] == "pending" and existing["recipient_id"] == user["id"]:
            await db.connections.update_one({"_id": existing["_id"]},
                                            {"$set": {"status": "accepted", "updated_at": now_iso()}})
            return {"status": "connected"}
        return {"status": "connected" if existing["status"] == "accepted" else (
            "pending_out" if existing["requester_id"] == user["id"] else "pending_in")}
    await db.connections.insert_one({
        "requester_id": user["id"], "recipient_id": sid,
        "status": "pending", "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"status": "pending_out"}

@api_router.post("/connections/{sid}/respond")
async def respond_connection(sid: str, body: dict, user: dict = Depends(get_current_user)):
    action = body.get("action")
    conn = await db.connections.find_one({"requester_id": sid, "recipient_id": user["id"], "status": "pending"})
    if not conn:
        raise HTTPException(status_code=404, detail="No pending request from this student")
    if action == "accept":
        await db.connections.update_one({"_id": conn["_id"]},
                                        {"$set": {"status": "accepted", "updated_at": now_iso()}})
        return {"status": "connected"}
    await db.connections.delete_one({"_id": conn["_id"]})
    return {"status": "none"}

@api_router.get("/connections")
async def list_connections(user: dict = Depends(get_current_user)):
    conns = await db.connections.find({"status": "accepted", "$or": [
        {"requester_id": user["id"]}, {"recipient_id": user["id"]},
    ]}).to_list(1000)
    other_ids = [c["recipient_id"] if c["requester_id"] == user["id"] else c["requester_id"] for c in conns]
    oids = [ObjectId(i) for i in other_ids]
    docs = await db.users.find({"_id": {"$in": oids}}).to_list(len(oids)) if oids else []
    return [clean(d) for d in docs]

@api_router.get("/connections/requests")
async def list_requests(user: dict = Depends(get_current_user)):
    conns = await db.connections.find({"recipient_id": user["id"], "status": "pending"}).sort("created_at", -1).to_list(1000)
    umap = await user_map([c["requester_id"] for c in conns])
    out = []
    for c in conns:
        u = umap.get(c["requester_id"])
        if u:
            full = await db.users.find_one({"_id": ObjectId(c["requester_id"])})
            out.append(clean(full))
    return out

def _local_match(goal, candidates):
    import re
    words = set(re.findall(r"[a-zA-Z\+#]+", goal.lower()))
    scored = []
    for c in candidates:
        tags = [t.lower() for t in (c["skills"] + c["interests"] + c["looking_for"])]
        hits = [t for t in tags if any((w in t or t in w) for w in words if len(w) > 2)]
        overlap = len(set(hits))
        bio_hit = any(w in c["bio"].lower() for w in words if len(w) > 3)
        score = min(96, 55 + overlap * 12 + (8 if bio_hit else 0))
        matched = list(dict.fromkeys(hits))[:3]
        if matched:
            reason = f"{c['name'].split()[0]} brings {', '.join(matched)} — directly relevant to your goal."
        else:
            reason = f"{c['name'].split()[0]} is an active, reliable collaborator worth reaching out to."
            score = 60
        scored.append({"id": c["id"], "reason": reason, "score": score, "_o": overlap})
    scored.sort(key=lambda x: x["_o"], reverse=True)
    top = scored[:5] if any(s["_o"] > 0 for s in scored) else scored[:4]
    for s in top:
        s.pop("_o", None)
    return top


@api_router.post("/match")
async def ai_match(data: MatchInput, user: dict = Depends(get_current_user)):
    import json
    students = await db.users.find({"role": "student"}).to_list(200)
    pool = [s for s in students if str(s["_id"]) != user["id"]]
    candidates = [{
        "id": str(s["_id"]), "name": s["name"], "grade": s.get("grade", ""),
        "school": s.get("school", ""), "skills": s.get("skills", []),
        "interests": s.get("interests", []), "looking_for": s.get("looking_for", []),
        "bio": s.get("bio", "")
    } for s in pool]

    system = (
        "You are Nexus AI, a matchmaking engine for ambitious high school students. "
        "Given a student's goal and a list of candidate students, pick the 3-5 BEST teammates. "
        "For each, write ONE short, specific sentence on why they fit the goal. "
        "Respond ONLY with valid JSON in this exact shape: "
        '{"matches":[{"id":"<candidate id>","reason":"<why they fit>","score":<0-100>}]}'
    )
    prompt = f"GOAL: {data.goal}\n\nCANDIDATES:\n{json.dumps(candidates)}"
    try:
        groq_client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
        completion = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        text = completion.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1].replace("json", "", 1).strip()
        parsed = json.loads(text)
        raw_matches = parsed.get("matches", [])
    except Exception as e:
        logger.error(f"AI match error: {e}")
        raw_matches = _local_match(data.goal, candidates)

    by_id = {str(s["_id"]): s for s in pool}
    results = []
    for m in raw_matches:
        s = by_id.get(m.get("id"))
        if s:
            results.append({"student": clean(s), "reason": m.get("reason", ""), "score": m.get("score", 70)})
    return {"matches": results}

@api_router.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    projects = await db.projects.find().sort("created_at", -1).to_list(200)
    umap = await user_map([p["owner_id"] for p in projects])
    conn_map = await my_connection_map(user["id"])
    counts = {}
    if projects:
        pipeline = [{"$match": {"project_id": {"$in": [str(p["_id"]) for p in projects]}}},
                    {"$group": {"_id": "$project_id", "n": {"$sum": 1}}}]
        async for row in db.project_comments.aggregate(pipeline):
            counts[row["_id"]] = row["n"]
    out = []
    for p in projects:
        p = clean(p)
        owner = umap.get(p["owner_id"])
        if owner:
            owner = dict(owner)
            owner["connection_status"] = "self" if p["owner_id"] == user["id"] else conn_map.get(p["owner_id"], "none")
        p["owner"] = owner
        p["comment_count"] = counts.get(p["id"], 0)
        out.append(p)
    return out

@api_router.get("/projects/{pid}")
async def get_project(pid: str, user: dict = Depends(get_current_user)):
    try:
        p = await db.projects.find_one({"_id": ObjectId(pid)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p = clean(p)
    owner = (await user_map([p["owner_id"]])).get(p["owner_id"])
    if owner:
        owner = dict(owner)
        conn_map = await my_connection_map(user["id"])
        owner["connection_status"] = "self" if p["owner_id"] == user["id"] else conn_map.get(p["owner_id"], "none")
    p["owner"] = owner
    p["comment_count"] = await db.project_comments.count_documents({"project_id": pid})
    return p

@api_router.post("/projects")
async def create_project(data: ProjectInput, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"owner_id": user["id"], "members": [user["id"]], "applicants": [],
                "status": "active", "progress": 0, "created_at": now_iso()})
    res = await db.projects.insert_one(doc)
    doc["_id"] = res.inserted_id
    p = clean(doc)
    p["owner"] = {"id": user["id"], "name": user["name"], "avatar": user.get("avatar")}
    p["comment_count"] = 0
    return p

@api_router.post("/projects/{pid}/join")
async def join_project(pid: str, user: dict = Depends(get_current_user)):
    await db.projects.update_one({"_id": ObjectId(pid)}, {"$addToSet": {"applicants": user["id"]}})
    return {"ok": True}

@api_router.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(get_current_user)):
    try:
        p = await db.projects.find_one({"_id": ObjectId(pid)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own projects")
    await db.projects.delete_one({"_id": ObjectId(pid)})
    await db.project_comments.delete_many({"project_id": pid})
    return {"ok": True}

@api_router.get("/projects/{pid}/comments")
async def get_project_comments(pid: str, user: dict = Depends(get_current_user)):
    comments = await db.project_comments.find({"project_id": pid}).sort("created_at", 1).to_list(500)
    umap = await user_map([c["author_id"] for c in comments])
    out = []
    for c in comments:
        c = clean(c)
        c["author"] = umap.get(c["author_id"])
        out.append(c)
    return out

@api_router.post("/projects/{pid}/comments")
async def add_project_comment(pid: str, data: ProjectCommentInput, user: dict = Depends(get_current_user)):
    doc = {"project_id": pid, "author_id": user["id"], "text": data.text, "created_at": now_iso()}
    res = await db.project_comments.insert_one(doc)
    doc["_id"] = res.inserted_id
    c = clean(doc)
    c["author"] = {"id": user["id"], "name": user["name"], "avatar": user.get("avatar")}
    return c

@api_router.post("/projects/{pid}/progress")
async def update_progress(pid: str, body: dict, user: dict = Depends(get_current_user)):
    prog = int(body.get("progress", 0))
    status = "completed" if prog >= 100 else "active"
    await db.projects.update_one({"_id": ObjectId(pid)}, {"$set": {"progress": prog, "status": status}})
    p = await db.projects.find_one({"_id": ObjectId(pid)})
    return clean(p)

@api_router.get("/opportunities")
async def list_opportunities(user: dict = Depends(get_current_user)):
    opps = await db.opportunities.find().sort("created_at", -1).to_list(200)
    pinned = await today_pin_map("opportunity")
    out = [clean(o) for o in opps]
    for o in out:
        o["pinned"] = o["id"] in pinned
    out.sort(key=lambda o: 0 if o["pinned"] else 1)
    return out

OPEN_TO_ALL_LOC = {"Remote", "Nationwide", "Online"}

def _state_of(loc: str) -> str:
    if not loc:
        return ""
    parts = [p.strip() for p in loc.split(",")]
    return parts[1] if len(parts) >= 2 else ""

def _recommend_opps(user: dict, opps: list, limit: int = 8):
    """Local, skills + area aware recommender. Returns list of opps with score/reason/area_match."""
    import re
    labels = []
    for key in ("skills", "interests", "looking_for"):
        labels += [str(t) for t in user.get(key, []) if str(t).strip()]
    def words_of(text):
        return {w for w in re.findall(r"[a-z0-9\+#]+", (text or "").lower()) if len(w) > 2}
    user_state = _state_of(user.get("location", ""))

    scored = []
    for o in opps:
        hay = " ".join([o.get("title", ""), o.get("description", ""), o.get("type", ""),
                        " ".join(o.get("tags", []))]).lower()
        matched = [l for l in labels if any(w in hay for w in words_of(l))]
        # de-dup while keeping order
        matched = list(dict.fromkeys(matched))
        overlap = len(matched)
        loc = o.get("location", "")
        area_match = bool(user_state and _state_of(loc) == user_state)
        open_all = loc in OPEN_TO_ALL_LOC
        score = 50 + overlap * 11 + (18 if area_match else 0) + (6 if open_all else 0)
        score = min(98, score)

        first = matched[:2]
        if first and area_match:
            reason = f"Fits your {', '.join(first)} and it's in your area ({loc})."
        elif first:
            reason = f"Great match for your {', '.join(first)} background."
        elif area_match:
            reason = f"Right in your area ({loc})."
        elif open_all:
            reason = f"Open to everyone ({loc}) — worth a look."
        else:
            reason = "A strong pick to broaden your horizons."

        item = clean(dict(o))
        item.update({"score": score, "reason": reason, "area_match": area_match,
                     "matched": matched[:3], "_o": overlap})
        scored.append(item)

    scored.sort(key=lambda x: (x["score"], x["_o"]), reverse=True)
    top = scored[:limit]
    for s in top:
        s.pop("_o", None)
    return top

@api_router.get("/opportunities/recommended")
async def recommended_opportunities(limit: int = 8, user: dict = Depends(get_current_user)):
    import json
    opps = await db.opportunities.find().to_list(200)
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    profile = clean(fresh) if fresh else user
    local = _recommend_opps(profile, opps, limit=limit)

    # Optional LLM refinement of reasons/ranking (Groq). Falls back to local silently.
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if key and local:
        try:
            by_id = {clean(dict(o))["id"]: clean(dict(o)) for o in opps}
            cand = [{"id": i["id"], "title": i["title"], "type": i.get("type"),
                     "tags": i.get("tags", []), "location": i.get("location", ""),
                     "description": i.get("description", "")[:200]} for i in local]
            system = (
                "You are Nexus AI recommending extracurricular opportunities to a high school student. "
                "Given the student's skills, interests and home area, rank the candidates and write ONE short, "
                "specific sentence per opportunity on why it fits (mention a skill/interest or the location). "
                'Respond ONLY with valid JSON: {"recommendations":[{"id":"<id>","reason":"<why>","score":<0-100>}]}'
            )
            prompt = (f"STUDENT SKILLS: {profile.get('skills', [])}\nINTERESTS: {profile.get('interests', [])}\n"
                      f"LOOKING FOR: {profile.get('looking_for', [])}\nAREA: {profile.get('location', '')}\n\n"
                      f"CANDIDATES:\n{json.dumps(cand)}")
            groq_client = AsyncGroq(api_key=key)
            completion = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            text = completion.choices[0].message.content.strip()
            parsed = json.loads(text)
            out = []
            for r in parsed.get("recommendations", []):
                base = by_id.get(r.get("id"))
                if base:
                    local_item = next((x for x in local if x["id"] == r["id"]), {})
                    base.update({"reason": r.get("reason", local_item.get("reason", "")),
                                 "score": r.get("score", local_item.get("score", 70)),
                                 "area_match": local_item.get("area_match", False),
                                 "matched": local_item.get("matched", [])})
                    out.append(base)
            if out:
                return {"recommendations": out, "engine": "llm"}
        except Exception as e:
            logger.error(f"Opportunity recommend LLM error: {e}")

    return {"recommendations": local, "engine": "local"}

@api_router.post("/opportunities")
async def create_opportunity(data: OpportunityInput, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"posted_by": user["id"], "created_at": now_iso()})
    res = await db.opportunities.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)

@api_router.delete("/opportunities/{oid}")
async def delete_opportunity(oid: str, user: dict = Depends(get_current_user)):
    try:
        o = await db.opportunities.find_one({"_id": ObjectId(oid)})
    except Exception:
        o = None
    if not o:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    if o.get("posted_by") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own opportunities")
    await db.opportunities.delete_one({"_id": ObjectId(oid)})
    return {"ok": True}

@api_router.get("/conversations")
async def conversations(user: dict = Depends(get_current_user)):
    msgs = await db.messages.find({"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}).sort("created_at", -1).to_list(1000)
    partners = {}
    for m in msgs:
        other = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
        if other not in partners:
            partners[other] = m
    umap = await user_map(list(partners.keys()))
    out = []
    for pid, last in partners.items():
        u = umap.get(pid)
        if u:
            out.append({"user": u, "last_message": last["text"], "last_at": last["created_at"]})
    return out

@api_router.get("/messages/{other_id}")
async def get_messages(other_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.messages.find({"$or": [
        {"from_user_id": user["id"], "to_user_id": other_id},
        {"from_user_id": other_id, "to_user_id": user["id"]}]}).sort("created_at", 1).to_list(1000)
    connected = await are_connected(user["id"], other_id)
    blocked = await is_blocked(user["id"], other_id)
    sent = await db.messages.count_documents({"from_user_id": user["id"], "to_user_id": other_id})
    return {
        "messages": [clean(m) for m in msgs],
        "connected": connected,
        "blocked": blocked,
        "can_send": (connected or sent < 1) and not blocked,
    }

@api_router.post("/messages")
async def post_message(data: MessageInput, user: dict = Depends(get_current_user)):
    if await is_blocked(user["id"], data.to_user_id):
        raise HTTPException(status_code=403, detail="You can't message this student.")
    connected = await are_connected(user["id"], data.to_user_id)
    if not connected:
        sent = await db.messages.count_documents({"from_user_id": user["id"], "to_user_id": data.to_user_id})
        if sent >= 1:
            raise HTTPException(status_code=403,
                                detail="You can only send one message until you connect. Send a connection request to keep chatting.")
    doc = {"from_user_id": user["id"], "to_user_id": data.to_user_id,
           "text": data.text, "created_at": now_iso()}
    res = await db.messages.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)

@api_router.post("/users/{sid}/block")
async def block_user(sid: str, user: dict = Depends(get_current_user)):
    if sid == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
    if not await db.users.find_one({"_id": ObjectId(sid)}):
        raise HTTPException(status_code=404, detail="Student not found")
    await db.blocks.update_one(
        {"blocker_id": user["id"], "blocked_id": sid},
        {"$setOnInsert": {"blocker_id": user["id"], "blocked_id": sid, "created_at": now_iso()}},
        upsert=True,
    )
    # A block also severs any existing connection between the two students.
    await db.connections.delete_many({"$or": [
        {"requester_id": user["id"], "recipient_id": sid},
        {"requester_id": sid, "recipient_id": user["id"]},
    ]})
    return {"ok": True}

@api_router.delete("/users/{sid}/block")
async def unblock_user(sid: str, user: dict = Depends(get_current_user)):
    await db.blocks.delete_one({"blocker_id": user["id"], "blocked_id": sid})
    return {"ok": True}

@api_router.get("/blocks")
async def list_blocks(user: dict = Depends(get_current_user)):
    blocks = await db.blocks.find({"blocker_id": user["id"]}).sort("created_at", -1).to_list(500)
    umap = await user_map([b["blocked_id"] for b in blocks])
    return [umap[b["blocked_id"]] for b in blocks if b["blocked_id"] in umap]

@api_router.post("/reports")
async def create_report(data: ReportInput, user: dict = Depends(get_current_user)):
    """User-generated-content safety report. Reviewed by the Trust & Safety team;
    Google Play's User Generated Content policy requires this reporting path
    for any app that lets users message each other or post content."""
    doc = {
        "reporter_id": user["id"], "target_type": data.target_type, "target_id": data.target_id,
        "reason": data.reason, "details": (data.details or "").strip(),
        "status": "open", "created_at": now_iso(),
    }
    res = await db.reports.insert_one(doc)
    doc["_id"] = res.inserted_id
    logger.warning("Content report: type=%s target=%s reporter=%s reason=%s",
                    data.target_type, data.target_id, user["id"], data.reason)
    return clean(doc)

@api_router.delete("/auth/me")
async def delete_account(response: Response, user: dict = Depends(get_current_user)):
    """Self-service account deletion (Google Play User Data policy requirement).
    Removes the account and associated personal content."""
    uid = user["id"]
    await db.messages.delete_many({"$or": [{"from_user_id": uid}, {"to_user_id": uid}]})
    await db.connections.delete_many({"$or": [{"requester_id": uid}, {"recipient_id": uid}]})
    reviews_given = await db.reviews.find({"reviewer_id": uid}).to_list(2000)
    affected_reviewees = {r["reviewee_id"] for r in reviews_given}
    await db.reviews.delete_many({"$or": [{"reviewer_id": uid}, {"reviewee_id": uid}]})
    for reviewee_id in affected_reviewees:
        await recompute_reputation(reviewee_id)
    posts = await db.forum_posts.find({"author_id": uid}).to_list(2000)
    post_ids = [str(p["_id"]) for p in posts]
    if post_ids:
        await db.forum_comments.delete_many({"post_id": {"$in": post_ids}})
    await db.forum_comments.delete_many({"author_id": uid})
    await db.forum_posts.delete_many({"author_id": uid})
    await db.projects.update_many({"members": uid}, {"$pull": {"members": uid}})
    await db.blocks.delete_many({"$or": [{"blocker_id": uid}, {"blocked_id": uid}]})
    await db.reports.delete_many({"reporter_id": uid})
    await db.users.delete_one({"_id": ObjectId(uid)})
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.post("/account-deletion-requests")
async def request_account_deletion(data: DeletionRequestInput):
    """Public, no-login deletion request channel. Google Play requires a web
    resource that lets a user request account/data deletion without needing
    the app installed or an active session."""
    doc = {
        "email": data.email.lower().strip(),
        "reason": (data.reason or "").strip(),
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.account_deletion_requests.insert_one(doc)
    logger.warning("Account deletion request received for %s", doc["email"])
    return {"ok": True, "message": "We've received your request and will delete your account and data within 30 days."}

@api_router.get("/forum")
async def list_forum(community: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"community": community} if community else {}
    posts = await db.forum_posts.find(q).sort("created_at", -1).to_list(200)
    umap = await user_map([p["author_id"] for p in posts])
    counts = {}
    if posts:
        pipeline = [{"$match": {"post_id": {"$in": [str(p["_id"]) for p in posts]}}},
                    {"$group": {"_id": "$post_id", "n": {"$sum": 1}}}]
        async for row in db.forum_comments.aggregate(pipeline):
            counts[row["_id"]] = row["n"]
    pinned = await today_pin_map("forum_post")
    out = []
    for p in posts:
        p = clean(p)
        p["author"] = umap.get(p["author_id"])
        p["comment_count"] = counts.get(p["id"], 0)
        p["pinned"] = p["id"] in pinned
        out.append(p)
    out.sort(key=lambda p: 0 if p["pinned"] else 1)
    return out

@api_router.post("/forum")
async def create_post(data: ForumPostInput, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc.update({"author_id": user["id"], "upvotes": 0, "created_at": now_iso()})
    res = await db.forum_posts.insert_one(doc)
    doc["_id"] = res.inserted_id
    p = clean(doc)
    p["author"] = {"id": user["id"], "name": user["name"], "avatar": user.get("avatar")}
    p["comment_count"] = 0
    return p

@api_router.get("/forum/{pid}/comments")
async def get_comments(pid: str, user: dict = Depends(get_current_user)):
    comments = await db.forum_comments.find({"post_id": pid}).sort("created_at", 1).to_list(500)
    umap = await user_map([c["author_id"] for c in comments])
    out = []
    for c in comments:
        c = clean(c)
        c["author"] = umap.get(c["author_id"])
        out.append(c)
    return out

@api_router.post("/forum/{pid}/comments")
async def add_comment(pid: str, data: ForumCommentInput, user: dict = Depends(get_current_user)):
    doc = {"post_id": pid, "author_id": user["id"], "text": data.text, "created_at": now_iso()}
    res = await db.forum_comments.insert_one(doc)
    doc["_id"] = res.inserted_id
    c = clean(doc)
    c["author"] = {"id": user["id"], "name": user["name"], "avatar": user.get("avatar")}
    return c

@api_router.post("/forum/{pid}/upvote")
async def upvote(pid: str, user: dict = Depends(get_current_user)):
    await db.forum_posts.update_one({"_id": ObjectId(pid)}, {"$inc": {"upvotes": 1}})
    return {"ok": True}

@api_router.delete("/forum/{pid}")
async def delete_forum_post(pid: str, user: dict = Depends(get_current_user)):
    try:
        p = await db.forum_posts.find_one({"_id": ObjectId(pid)})
    except Exception:
        p = None
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    if p["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    await db.forum_posts.delete_one({"_id": ObjectId(pid)})
    await db.forum_comments.delete_many({"post_id": pid})
    return {"ok": True}

@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    my_projects = await db.projects.find({"members": user["id"]}).to_list(50)
    opps = await db.opportunities.find().sort("created_at", -1).to_list(200)
    students = await db.users.find({"role": "student"}).to_list(50)
    suggested = [clean(s) for s in students if str(s["_id"]) != user["id"]][:4]
    connections_count = await db.connections.count_documents({"status": "accepted", "$or": [
        {"requester_id": user["id"]}, {"recipient_id": user["id"]},
    ]})
    requests_count = await db.connections.count_documents({"recipient_id": user["id"], "status": "pending"})
    return {
        "my_projects": [clean(p) for p in my_projects],
        "opportunities": [clean(o) for o in opps],
        "suggested_teammates": suggested,
        "stats": {
            "projects": len(my_projects),
            "connections": connections_count,
            "connection_requests": requests_count,
            "opportunities": await db.opportunities.count_documents({}),
        }
    }

class PurchaseVerifyInput(BaseModel):
    product_type: str                  # "full_unlock" | "pin_slot"
    rc_transaction_id: str
    target_type: Optional[str] = None  # required for pin_slot
    target_id: Optional[str] = None    # required for pin_slot

@api_router.get("/pin-slots/today")
async def pin_slots_today(user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    slots = await db.pin_slots.find({"slot_date": today}).sort("rank", 1).to_list(DAILY_PIN_SLOTS)
    return {"slot_date": today, "slots_remaining": max(0, DAILY_PIN_SLOTS - len(slots)), "slots": [clean(s) for s in slots]}

@api_router.post("/purchases/verify")
async def verify_purchase(data: PurchaseVerifyInput, user: dict = Depends(get_current_user)):
    subscriber = rc_get_subscriber(user["id"])

    if data.product_type == "full_unlock":
        if not rc_find_non_subscription_purchase(subscriber, UNLOCK_PRODUCT_ID, data.rc_transaction_id):
            raise HTTPException(status_code=402, detail="No matching purchase found")
        existing = await db.app_unlocks.find_one({"rc_transaction_id": data.rc_transaction_id})
        if not existing:
            await db.app_unlocks.insert_one({
                "user_id": user["id"], "rc_transaction_id": data.rc_transaction_id, "created_at": now_iso(),
            })
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"app_unlocked": True}})
        return {"ok": True, "app_unlocked": True}

    if data.product_type == "pin_slot":
        if not data.target_type or not data.target_id:
            raise HTTPException(status_code=400, detail="target_type and target_id are required")
        if not rc_find_non_subscription_purchase(subscriber, PIN_PRODUCT_ID, data.rc_transaction_id):
            raise HTTPException(status_code=402, detail="No matching purchase found")
        already_used = await db.pin_purchases.find_one({"rc_transaction_id": data.rc_transaction_id})
        if already_used:
            return {"ok": True, "already_granted": True, "slot_date": already_used["slot_date"]}
        await get_own_pin_target(data.target_type, data.target_id, user["id"])

        # Claim the first day (today, or the next day, and so on) with an open slot.
        slot_date = date.today()
        for _ in range(30):
            iso = slot_date.isoformat()
            count = await db.pin_slots.count_documents({"slot_date": iso})
            if count < DAILY_PIN_SLOTS:
                await db.pin_slots.insert_one({
                    "slot_date": iso, "target_type": data.target_type, "target_id": data.target_id,
                    "user_id": user["id"], "rank": count + 1, "created_at": now_iso(),
                })
                await db.pin_purchases.insert_one({
                    "user_id": user["id"], "target_type": data.target_type, "target_id": data.target_id,
                    "rc_transaction_id": data.rc_transaction_id, "slot_date": iso, "created_at": now_iso(),
                })
                return {"ok": True, "slot_date": iso}
            slot_date += timedelta(days=1)
        raise HTTPException(status_code=503, detail="No pin slots available right now — contact support")

    raise HTTPException(status_code=400, detail="Invalid product_type")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.blocks.create_index([("blocker_id", 1), ("blocked_id", 1)], unique=True)
    await db.account_deletion_requests.create_index("email")
    await seed()
    await backfill_opportunity_locations()

@app.on_event("shutdown")
async def shutdown():
    client.close()

async def backfill_opportunity_locations():
    """Fill in location for any already-posted opportunity that's missing one
    (e.g. rows created before the location field existed). Matches by title
    against seed_data.OPPORTUNITIES; falls back to 'Remote' if not found."""
    from seed_data import OPPORTUNITIES
    by_title = {o["title"]: o.get("location", "Remote") for o in OPPORTUNITIES}
    cursor = db.opportunities.find({"$or": [{"location": {"$exists": False}}, {"location": ""}, {"location": None}]})
    async for o in cursor:
        location = by_title.get(o.get("title"), "Remote")
        await db.opportunities.update_one({"_id": o["_id"]}, {"$set": {"location": location}})

async def seed():
    from seed_data import STUDENTS, PROJECTS, OPPORTUNITIES, FORUM
    if await db.users.count_documents({"role": "student"}) > 0:
        return
    logger.info("Seeding demo data...")
    id_map = {}
    for s in STUDENTS:
        rep = dict(s["reputation"])
        rep.setdefault("avg_rating", 0)
        rep.setdefault("review_count", 0)
        rep.pop("endorsements", None)
        doc = {
            "email": s["email"], "password_hash": hash_password("password123"),
            "name": s["name"], "school": s["school"], "grade": s["grade"],
            "bio": s["bio"], "avatar": f"https://api.dicebear.com/7.x/thumbs/svg?seed={s['name'].replace(' ','')}",
            "interests": s["interests"], "skills": s["skills"], "looking_for": s["looking_for"],
            "location": s.get("location", ""),
            "verified": True, "role": "student",
            "reputation": rep, "created_at": now_iso(),
        }
        res = await db.users.insert_one(doc)
        id_map[s["name"]] = str(res.inserted_id)

    for p in PROJECTS:
        owner = id_map[p["owner"]]
        member_ids = [owner] + [id_map[m] for m in p.get("members", []) if m in id_map and id_map[m] != owner]
        await db.projects.insert_one({
            "title": p["title"], "description": p["description"], "category": p["category"],
            "roles_needed": p["roles_needed"], "skills": p["skills"], "timeline": p["timeline"],
            "owner_id": owner, "members": member_ids, "applicants": [],
            "status": p["status"], "progress": p["progress"], "created_at": now_iso(),
        })

    for o in OPPORTUNITIES:
        await db.opportunities.insert_one({**o, "posted_by": None, "created_at": now_iso()})

    for f in FORUM:
        author = id_map[f["author"]]
        res = await db.forum_posts.insert_one({
            "community": f["community"], "title": f["title"], "body": f["body"],
            "author_id": author, "upvotes": f["upvotes"], "created_at": now_iso(),
        })
        for c in f.get("comments", []):
            await db.forum_comments.insert_one({
                "post_id": str(res.inserted_id), "author_id": id_map[c["author"]],
                "text": c["text"], "created_at": now_iso(),
            })
    logger.info("Seeding complete.")