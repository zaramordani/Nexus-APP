import { useEffect, useState } from "react";
import { api, formatError } from "@/api";
import { useAuth } from "@/AuthContext";
import { PageHead, Avatar, ReportBlockMenu, DeleteButton, PinButton } from "@/components/common";
import { ArrowFatUp, ChatCircle, Plus, X, UsersThree, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const COMMUNITIES = ["All", "Robotics", "AI", "Research", "Startups", "College Admissions", "Programming", "Biology"];

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [community, setCommunity] = useState("All");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    const url = community === "All" ? "/forum" : `/forum?community=${encodeURIComponent(community)}`;
    api.get(url).then((r) => setPosts(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [community]); // eslint-disable-line

  const deletePost = async (p) => {
    try {
      await api.delete(`/forum/${p.id}`);
      toast.success("Post deleted.");
      setPosts((ps) => ps.filter((x) => x.id !== p.id));
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    }
  };

  const upvote = async (p) => {
    try {
      const { data } = await api.post(`/forum/${p.id}/upvote`);
      setPosts((ps) => ps.map((x) => x.id === p.id
        ? { ...x, upvotes: x.upvotes + (data.upvoted ? 1 : -1), upvoted: data.upvoted }
        : x));
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-8">
      <PageHead label="Community Forum" title="Ask. Share. Learn.">
        <button className="nb-btn" onClick={() => setOpen(true)} data-testid="new-post-btn"><Plus size={18} weight="bold" /> New post</button>
      </PageHead>

      <div className="flex flex-wrap gap-2 mb-6">
        {COMMUNITIES.map((c) => (
          <button key={c} onClick={() => setCommunity(c)} data-testid={`community-${c}`}
            className={`nb-chip ${community === c ? "bg-[#FF7B54]" : "bg-white"}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="nb-card p-5" data-testid={`post-${p.id}`}>
            <div className="flex gap-4">
              <button onClick={() => upvote(p)} className="flex flex-col items-center gap-1 shrink-0" data-testid={`upvote-${p.id}`}>
                <div className={`w-10 h-10 border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center hover:bg-[#FF7B54] ${p.upvoted ? "bg-[#FF7B54] text-white" : "bg-[#FFD166]"}`}>
                  <ArrowFatUp size={20} weight="bold" />
                </div>
                <span className="font-black text-sm">{p.upvotes}</span>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="nb-chip bg-[#A0C4FF]"><UsersThree size={14} weight="bold" /> {p.community}</span>
                  <div className="flex items-center gap-2">
                    {p.author_id === user.id ? (
                      <>
                        <PinButton targetType="forum_post" targetId={p.id} pinned={p.pinned} testId={`pin-post-${p.id}`} onPinned={load} />
                        <button
                          type="button"
                          className="nb-chip bg-white hover:bg-[#A0C4FF]"
                          title="Edit post"
                          data-testid={`edit-post-${p.id}`}
                          onClick={() => setEditing(p)}
                        >
                          <PencilSimple size={14} weight="bold" />
                        </button>
                        <DeleteButton onDelete={() => deletePost(p)} label="post" testId={`delete-post-${p.id}`} />
                      </>
                    ) : (
                      <ReportBlockMenu targetType="forum_post" targetId={p.id} showBlock={false} />
                    )}
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight">{p.title}</h3>
                <p className="text-sm text-[#4A4A4A] font-medium mt-1">{p.body}</p>
                <div className="flex items-center gap-3 mt-3">
                  {p.author && <div className="flex items-center gap-2"><Avatar src={p.author.avatar} name={p.author.name} className="w-7 h-7" /><span className="text-xs font-bold">{p.author.name}</span></div>}
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="flex items-center gap-1 text-xs font-bold text-[#4A4A4A]" data-testid={`comments-toggle-${p.id}`}>
                    <ChatCircle size={16} weight="bold" /> {p.comment_count} comments
                  </button>
                </div>
                {expanded === p.id && <Comments postId={p.id} onAdded={load} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && <PostModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
      {editing && (
        <PostModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function Comments({ postId, onAdded }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const load = () => api.get(`/forum/${postId}/comments`).then((r) => setComments(r.data)).catch(() => {});
  useEffect(() => { load(); }, [postId]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/forum/${postId}/comments`, { text });
    setText("");
    load();
    onAdded?.();
  };

  return (
    <div className="mt-4 border-t-2 border-dashed border-[#0A0A0A]/20 pt-3 space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar src={c.author?.avatar} name={c.author?.name} className="w-7 h-7" />
          <div className="nb-card bg-[#FDFBF7] px-3 py-2 flex-1">
            <div className="text-xs font-bold">{c.author?.name}</div>
            <div className="text-sm font-medium">{c.text}</div>
          </div>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <input className="nb-input py-2 text-sm" placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} data-testid={`comment-input-${postId}`} />
        <button className="nb-btn nb-btn-sec py-2 px-3 text-sm" data-testid={`comment-submit-${postId}`}>Post</button>
      </form>
    </div>
  );
}

function PostModal({ post, onClose, onSaved }) {
  const isEdit = !!post;
  const [f, setF] = useState(post
    ? { community: post.community, title: post.title, body: post.body }
    : { community: "Robotics", title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/forum/${post.id}`, f);
        toast.success("Post updated!");
      } else {
        await api.post("/forum", f);
        toast.success("Posted!");
      }
      onSaved();
    } catch { toast.error(isEdit ? "Could not update post." : "Could not post."); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="nb-card bg-[#FDFBF7] p-6 w-full max-w-lg" data-testid={isEdit ? "edit-post-modal" : "new-post-modal"}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-black">{isEdit ? "Edit post" : "New post"}</h2>
          <button type="button" onClick={onClose}><X size={24} weight="bold" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="nb-label">Community</label>
            <select className="nb-input mt-1" value={f.community} onChange={set("community")} data-testid="post-community">
              {COMMUNITIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="nb-label">Title</label><input className="nb-input mt-1" value={f.title} onChange={set("title")} required data-testid="post-title" /></div>
          <div><label className="nb-label">Body</label><textarea className="nb-input mt-1 min-h-[100px]" value={f.body} onChange={set("body")} required data-testid="post-body" /></div>
        </div>
        <button disabled={saving} className="nb-btn w-full justify-center mt-5" data-testid="post-submit">
          {saving ? (isEdit ? "Saving…" : "Posting…") : (isEdit ? "Save changes" : "Post to forum")}
        </button>
      </form>
    </div>
  );
}