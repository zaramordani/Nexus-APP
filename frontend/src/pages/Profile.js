import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/AuthContext";
import { PageHead, Avatar, Reputation } from "@/components/common";
import { AreaPicker } from "@/components/AreaSelect";
import { ShieldCheck, FloppyDisk, X, Plus, Shuffle, LinkSimple, Trash, WarningCircle, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { isNative, purchaseFullUnlock } from "@/lib/purchases";
import { formatError } from "@/api";

const AVATAR_STYLES = ["thumbs", "bottts", "fun-emoji", "adventurer", "notionists", "lorelei", "micah", "personas"];
const buildAvatar = (style, seed) => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

function AvatarPicker({ value, name, onChange }) {
  const [customUrl, setCustomUrl] = useState("");
  const styleOptions = AVATAR_STYLES.map((s) => buildAvatar(s, name || "nexus"));

  const shuffle = () => {
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    onChange(buildAvatar(style, `${name}-${Math.floor(Math.random() * 99999)}`));
  };

  return (
    <div>
      <label className="nb-label">Avatar</label>
      <div className="flex items-center gap-3 mt-1 mb-3">
        <Avatar src={value} name={name} className="w-16 h-16" />
        <button type="button" className="nb-btn nb-btn-sec text-sm py-2" onClick={shuffle} data-testid="avatar-shuffle">
          <Shuffle size={16} weight="bold" /> Shuffle
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {styleOptions.map((url) => (
          <button type="button" key={url} onClick={() => onChange(url)} data-testid="avatar-option"
            className={`rounded-lg border-2 p-0.5 ${value === url ? "border-[#FF7B54] bg-[#FF7B54]" : "border-[#0A0A0A] bg-white"}`}>
            <img src={url} alt="" className="w-10 h-10 rounded-md" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex items-center gap-2 nb-input py-2 flex-1">
          <LinkSimple size={16} weight="bold" className="text-[#4A4A4A]" />
          <input className="flex-1 outline-none bg-transparent text-sm" placeholder="Paste an image URL…"
            value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} data-testid="avatar-url-input" />
        </div>
        <button type="button" className="nb-btn nb-btn-ghost py-2 px-3 text-sm"
          onClick={() => { if (customUrl.trim()) { onChange(customUrl.trim()); toast.success("Avatar updated"); } }}
          data-testid="avatar-url-apply">Use</button>
      </div>
    </div>
  );
}

function TagEditor({ label, items, color, onChange, testid }) {
  const [val, setVal] = useState("");
  const add = () => {
    const t = val.trim();
    if (t && !items.includes(t)) { onChange([...items, t]); setVal(""); }
  };
  return (
    <div>
      <label className="nb-label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
        {items.map((i) => (
          <span key={i} className={`nb-chip ${color}`}>{i}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== i))}><X size={12} weight="bold" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="nb-input py-2" value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Type & press Enter" data-testid={testid} />
        <button type="button" className="nb-btn nb-btn-sec py-2 px-3" onClick={add}><Plus size={18} weight="bold" /></button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, setUser, deleteAccount } = useAuth();
  const nav = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const rc_transaction_id = await purchaseFullUnlock();
      const { data } = await api.post("/purchases/verify", { product_type: "full_unlock", rc_transaction_id });
      if (data.app_unlocked) {
        setUser({ ...user, app_unlocked: true });
        toast.success("Unlocked! Enjoy ad-free, exclusive features.");
      }
    } catch (err) {
      if (err?.message !== "Purchase was cancelled.") toast.error(formatError(err?.response?.data?.detail) || err.message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Your account and data have been deleted.");
      nav("/", { replace: true });
    } catch {
      toast.error("Could not delete your account. Please try again.");
      setDeleting(false);
    }
  };
  const [f, setF] = useState({
    name: user.name, school: user.school || "", grade: user.grade || "11th", bio: user.bio || "",
    avatar: user.avatar, interests: user.interests || [], skills: user.skills || [], looking_for: user.looking_for || [],
    location: user.location || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", f);
      setUser(data);
      toast.success("Profile saved! ✨");
    } catch { toast.error("Could not save."); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-8">
      <PageHead label="Your Profile" title="Your verified identity." />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Card preview */}
        <div className="md:col-span-1">
          <div className="nb-card p-5 text-center sticky top-8" data-testid="profile-preview">
            <Avatar src={f.avatar} name={user.name} className="w-24 h-24 mx-auto" />
            <h3 className="font-display text-xl font-bold mt-3">{f.name}</h3>
            <p className="text-xs text-[#4A4A4A]">{f.grade} · {f.school}</p>
            {f.location && <p className="text-xs text-[#4A4A4A]">📍 {f.location}</p>}
            {user.verified && (
              <div className="nb-chip bg-[#2ECC71] text-white mt-2 mx-auto"><ShieldCheck size={14} weight="fill" /> Verified student</div>
            )}
            <div className="mt-4"><Reputation rep={user.reputation} /></div>
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2 nb-card p-6 space-y-4">
          <AvatarPicker value={f.avatar} name={f.name} onChange={(url) => setF({ ...f, avatar: url })} />
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="nb-label">Name</label><input className="nb-input mt-1" value={f.name} onChange={set("name")} data-testid="profile-name" /></div>
            <div><label className="nb-label">Grade</label>
              <select className="nb-input mt-1" value={f.grade} onChange={set("grade")} data-testid="profile-grade">
                {["9th", "10th", "11th", "12th"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div><label className="nb-label">School</label><input className="nb-input mt-1" value={f.school} onChange={set("school")} data-testid="profile-school" /></div>
          <div><label className="nb-label">Area / Location (for opportunities near you)</label>
            <AreaPicker value={f.location} onChange={(loc) => setF({ ...f, location: loc })} testidPrefix="profile-area" />
          </div>
          <div><label className="nb-label">Bio</label><textarea className="nb-input mt-1 min-h-[80px]" value={f.bio} onChange={set("bio")} data-testid="profile-bio" placeholder="What are you passionate about?" /></div>

          <TagEditor label="Skills" items={f.skills} color="bg-[#FFD166]" onChange={(v) => setF({ ...f, skills: v })} testid="profile-skills" />
          <TagEditor label="Interests" items={f.interests} color="bg-[#A0C4FF]" onChange={(v) => setF({ ...f, interests: v })} testid="profile-interests" />
          <TagEditor label="Looking for" items={f.looking_for} color="bg-white" onChange={(v) => setF({ ...f, looking_for: v })} testid="profile-looking" />

          <button className="nb-btn w-full justify-center" onClick={save} disabled={saving} data-testid="profile-save">
            <FloppyDisk size={18} weight="bold" /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>

      {isNative() && (
        <div className="nb-card p-6 mt-6 bg-[#FFD166]">
          <h3 className="font-display text-lg font-bold flex items-center gap-2"><Sparkle size={20} weight="fill" /> Full access</h3>
          {user.app_unlocked ? (
            <p className="text-sm font-bold mt-1" data-testid="unlock-status-active">
              ✓ Unlocked — ad-free with exclusive features.
            </p>
          ) : (
            <>
              <p className="text-sm font-medium mt-1 mb-3">
                One-time $1 purchase: removes ads and unlocks exclusive features.
              </p>
              <button type="button" className="nb-btn text-sm py-2" onClick={handleUnlock} disabled={unlocking} data-testid="unlock-full-access-btn">
                {unlocking ? "Processing…" : "Unlock for $1"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="nb-card p-6 mt-6 border-[#E63946]">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 text-[#E63946]"><WarningCircle size={20} weight="bold" /> Danger zone</h3>
        <p className="text-sm text-[#4A4A4A] font-medium mt-1 mb-3">
          Deleting your account permanently removes your profile, messages, connections, reviews and forum posts. This can't be undone.
        </p>
        {!confirmingDelete ? (
          <button type="button" className="nb-btn nb-btn-ghost text-sm py-2 text-[#E63946]" onClick={() => setConfirmingDelete(true)} data-testid="delete-account-btn">
            <Trash size={16} weight="bold" /> Delete my account
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">Are you sure?</span>
            <button type="button" className="nb-btn text-sm py-2 !bg-[#E63946] !text-white" onClick={handleDeleteAccount} disabled={deleting} data-testid="delete-account-confirm">
              {deleting ? "Deleting…" : "Yes, permanently delete"}
            </button>
            <button type="button" className="nb-btn nb-btn-ghost text-sm py-2" onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancel</button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[#4A4A4A] font-medium mt-6">
        <Link to="/privacy" className="underline">Privacy Policy</Link> · <Link to="/terms" className="underline">Terms of Service</Link>
      </p>
    </div>
  );
}
