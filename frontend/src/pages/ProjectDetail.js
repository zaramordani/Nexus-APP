import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatError } from "@/api";
import { useAuth } from "@/AuthContext";
import { Avatar, Chips, DeleteButton } from "@/components/common";
import ProjectModal from "@/components/ProjectModal";
import { ArrowLeft, Handshake, Clock, CheckCircle, Check, ChatCircle, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadProject = () =>
    api.get(`/projects/${id}`)
      .then((r) => setProject(r.data))
      .catch(() => setNotFound(true));

  const loadComments = () =>
    api.get(`/projects/${id}/comments`).then((r) => setComments(r.data)).catch(() => {});

  useEffect(() => { loadProject(); loadComments(); }, [id]); // eslint-disable-line

  const connectOwner = async () => {
    try {
      const { data } = await api.post(`/connections/${project.owner_id}`);
      if (data.status === "connected") toast.success(`Connected with ${project.owner?.name?.split(" ")[0]}! 🤝`);
      else toast.success(`Connection request sent to ${project.owner?.name?.split(" ")[0]}.`);
      loadProject();
    } catch (e) { toast.error(formatError(e?.response?.data?.detail)); }
  };

  const deleteProject = async () => {
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success("Project deleted.");
      navigate("/app/projects");
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await api.post(`/projects/${id}/comments`, { text });
      setText("");
      await loadComments();
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    } finally {
      setPosting(false);
    }
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-8">
        <Link to="/app/projects" className="nb-btn nb-btn-sec text-sm py-2 mb-6 inline-flex" data-testid="back-to-projects">
          <ArrowLeft size={16} weight="bold" /> Back to projects
        </Link>
        <div className="nb-card p-6">
          <p className="font-bold">This project doesn't exist or was removed.</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-5 md:px-10 py-8">
        <div className="font-display text-xl font-black animate-pulse">Loading project…</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-8">
      <button onClick={() => navigate(-1)} className="nb-btn nb-btn-sec text-sm py-2 mb-6" data-testid="back-to-projects">
        <ArrowLeft size={16} weight="bold" /> Back
      </button>

      <div className="nb-card p-6" data-testid={`project-detail-${project.id}`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="nb-chip bg-[#A0C4FF]">{project.category}</span>
          {project.status === "completed"
            ? <span className="nb-chip bg-[#2ECC71] text-white"><CheckCircle size={14} weight="bold" /> Completed</span>
            : <span className="nb-chip bg-[#FFD166]"><Clock size={14} weight="bold" /> Active</span>}
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">{project.title}</h1>
        <p className="text-sm md:text-base text-[#4A4A4A] font-medium mt-2 whitespace-pre-wrap">{project.description}</p>

        <div className="mt-5">
          <div className="nb-label mb-1">Roles needed</div>
          <Chips items={project.roles_needed} color="bg-[#FFD166]" />
        </div>

        {project.skills?.length > 0 && (
          <div className="mt-4">
            <div className="nb-label mb-1">Skills</div>
            <Chips items={project.skills} color="bg-[#A0C4FF]" />
          </div>
        )}

        <div className="mt-5">
          <div className="flex justify-between text-xs font-bold mb-1"><span>Progress</span><span>{project.progress}%</span></div>
          <div className="h-3 border-2 border-[#0A0A0A] rounded-full bg-white overflow-hidden">
            <div className="h-full bg-[#FF7B54]" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {project.owner && <Avatar src={project.owner.avatar} name={project.owner.name} className="w-10 h-10" />}
            <div className="text-sm">
              <div className="font-bold">{project.owner?.name}</div>
              <div className="text-[#4A4A4A] flex items-center gap-1 text-xs"><Clock size={12} /> {project.timeline}</div>
            </div>
          </div>
          {project.owner_id === user.id
            ? <div className="flex items-center gap-2">
                <span className="nb-chip bg-white">You own this</span>
                <button
                  type="button"
                  className="nb-chip bg-white hover:bg-[#A0C4FF]"
                  title="Edit project"
                  data-testid={`edit-project-${project.id}`}
                  onClick={() => setEditing(true)}
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
                <DeleteButton onDelete={deleteProject} label="project" testId={`delete-project-${project.id}`} />
              </div>
            : project.owner?.connection_status === "connected"
              ? <span className="nb-chip bg-[#2ECC71] text-white"><Check size={14} weight="bold" /> Connected</span>
              : project.owner?.connection_status === "pending_out"
                ? <span className="nb-chip bg-white"><Clock size={14} weight="bold" /> Requested</span>
                : <button className="nb-btn nb-btn-sec text-sm py-2" onClick={connectOwner} data-testid={`connect-owner-${project.id}`}>
                    <Handshake size={16} weight="bold" /> Connect
                  </button>}
        </div>
      </div>

      <div className="nb-card p-6 mt-6">
        <h2 className="font-display text-xl font-black flex items-center gap-2 mb-4">
          <ChatCircle size={22} weight="bold" /> Comments {comments.length > 0 && `(${comments.length})`}
        </h2>

        <div className="space-y-3 mb-4">
          {comments.length === 0 && <p className="text-sm text-[#4A4A4A] font-medium">No comments yet. Start the conversation!</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2" data-testid={`project-comment-${c.id}`}>
              <Avatar src={c.author?.avatar} name={c.author?.name} className="w-8 h-8" />
              <div className="nb-card bg-[#FDFBF7] px-3 py-2 flex-1">
                <div className="text-xs font-bold">{c.author?.name}</div>
                <div className="text-sm font-medium">{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submitComment} className="flex gap-2">
          <input
            className="nb-input py-2 text-sm"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="project-comment-input"
          />
          <button disabled={posting} className="nb-btn nb-btn-sec py-2 px-3 text-sm" data-testid="project-comment-submit">
            {posting ? "Posting…" : "Post"}
          </button>
        </form>
      </div>

      {editing && (
        <ProjectModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => { loadProject(); setEditing(false); }}
        />
      )}
    </div>
  );
}