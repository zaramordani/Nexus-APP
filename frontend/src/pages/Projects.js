import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatError } from "@/api";
import { useAuth } from "@/AuthContext";
import { PageHead, Avatar, Chips, DeleteButton } from "@/components/common";
import ProjectModal, { CATEGORIES } from "@/components/ProjectModal";
import { Plus, Handshake, Clock, CheckCircle, Check, ChatCircle, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("All");

  const load = () => api.get("/projects").then((r) => setProjects(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const connectOwner = async (p, e) => {
    e?.stopPropagation();
    try {
      const { data } = await api.post(`/connections/${p.owner_id}`);
      if (data.status === "connected") toast.success(`Connected with ${p.owner?.name?.split(" ")[0]}! 🤝`);
      else toast.success(`Connection request sent to ${p.owner?.name?.split(" ")[0]} about "${p.title}".`);
      load();
    } catch (e) { toast.error(formatError(e?.response?.data?.detail)); }
  };

  const deleteProject = async (p) => {
    try {
      await api.delete(`/projects/${p.id}`);
      toast.success("Project deleted.");
      setProjects((ps) => ps.filter((x) => x.id !== p.id));
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    }
  };

  const shown = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-8">
      <PageHead label="Project Hub" title="Build together.">
        <button className="nb-btn" onClick={() => setOpen(true)} data-testid="create-project-btn">
          <Plus size={18} weight="bold" /> New project
        </button>
      </PageHead>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)} data-testid={`filter-${c}`}
            className={`nb-chip ${filter === c ? "bg-[#FF7B54]" : "bg-white"}`}>{c}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {shown.map((p) => (
          <div
            key={p.id}
            className="nb-card nb-card-hover p-5 flex flex-col cursor-pointer"
            data-testid={`project-${p.id}`}
            onClick={() => navigate(`/app/projects/${p.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="nb-chip bg-[#A0C4FF]">{p.category}</span>
              {p.status === "completed"
                ? <span className="nb-chip bg-[#2ECC71] text-white"><CheckCircle size={14} weight="bold" /> Completed</span>
                : <span className="nb-chip bg-[#FFD166]"><Clock size={14} weight="bold" /> Active</span>}
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight">{p.title}</h3>
            <p className="text-sm text-[#4A4A4A] font-medium mt-1 mb-3 line-clamp-3">{p.description}</p>

            <div className="mb-3">
              <div className="nb-label mb-1">Roles needed</div>
              <Chips items={p.roles_needed} color="bg-[#FFD166]" />
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1"><span>Progress</span><span>{p.progress}%</span></div>
              <div className="h-3 border-2 border-[#0A0A0A] rounded-full bg-white overflow-hidden">
                <div className="h-full bg-[#FF7B54]" style={{ width: `${p.progress}%` }} />
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.owner && <Avatar src={p.owner.avatar} name={p.owner.name} className="w-8 h-8" />}
                <div className="text-xs">
                  <div className="font-bold">{p.owner?.name}</div>
                  <div className="text-[#4A4A4A] flex items-center gap-1"><Clock size={12} /> {p.timeline}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-[#4A4A4A]" data-testid={`comments-count-${p.id}`}>
                  <ChatCircle size={16} weight="bold" /> {p.comment_count || 0}
                </span>
                {p.owner_id === user.id
                  ? <div className="flex items-center gap-2">
                      <span className="nb-chip bg-white">You own this</span>
                      <button
                        type="button"
                        className="nb-chip bg-white hover:bg-[#A0C4FF]"
                        title="Edit project"
                        data-testid={`edit-project-${p.id}`}
                        onClick={(e) => { e.stopPropagation(); setEditing(p); }}
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <DeleteButton onDelete={() => deleteProject(p)} label="project" testId={`delete-project-${p.id}`} />
                    </div>
                  : p.owner?.connection_status === "connected"
                    ? <span className="nb-chip bg-[#2ECC71] text-white"><Check size={14} weight="bold" /> Connected</span>
                    : p.owner?.connection_status === "pending_out"
                      ? <span className="nb-chip bg-white"><Clock size={14} weight="bold" /> Requested</span>
                      : <button className="nb-btn nb-btn-sec text-sm py-2" onClick={(e) => connectOwner(p, e)} data-testid={`connect-owner-${p.id}`}>
                          <Handshake size={16} weight="bold" /> Connect
                        </button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && <ProjectModal onClose={() => setOpen(false)} onSaved={() => { load(); setOpen(false); }} />}
      {editing && (
        <ProjectModal
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); setEditing(null); }}
        />
      )}
    </div>
  );
}