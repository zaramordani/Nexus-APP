import { useState } from "react";
import { api } from "@/api";
import { Rocket, X, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export const CATEGORIES = ["AI / Machine Learning", "Robotics", "Web Dev", "Research", "Startups", "Nonprofit", "Game Dev", "Other"];

// Shared modal used to both create a new project and edit an existing one
// (title/description/category/roles/skills/timeline, plus progress when editing).
export default function ProjectModal({ project, onClose, onSaved }) {
  const isEdit = !!project;
  const [f, setF] = useState(() => project
    ? {
        title: project.title, description: project.description, category: project.category,
        roles: (project.roles_needed || []).join(", "), skills: (project.skills || []).join(", "),
        timeline: project.timeline || "", progress: project.progress ?? 0,
      }
    : { title: "", description: "", category: CATEGORIES[0], roles: "", skills: "", timeline: "3 months", progress: 0 });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: f.title, description: f.description, category: f.category,
      roles_needed: f.roles.split(",").map((s) => s.trim()).filter(Boolean),
      skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
      timeline: f.timeline,
    };
    try {
      if (isEdit) {
        await api.put(`/projects/${project.id}`, { ...payload, progress: Number(f.progress) });
        toast.success("Project updated!");
      } else {
        await api.post("/projects", payload);
        toast.success("Project created! 🚀");
      }
      onSaved();
    } catch { toast.error(isEdit ? "Could not update project." : "Could not create project."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="nb-card bg-[#FDFBF7] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid={isEdit ? "edit-project-modal" : "create-project-modal"}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-black flex items-center gap-2">
            {isEdit ? <PencilSimple size={24} weight="bold" /> : <Rocket size={24} weight="bold" />} {isEdit ? "Edit project" : "New project"}
          </h2>
          <button type="button" onClick={onClose}><X size={24} weight="bold" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="nb-label">Title</label><input className="nb-input mt-1" value={f.title} onChange={set("title")} required data-testid="project-title" /></div>
          <div><label className="nb-label">Description</label><textarea className="nb-input mt-1 min-h-[80px]" value={f.description} onChange={set("description")} required data-testid="project-desc" /></div>
          <div><label className="nb-label">Category</label>
            <select className="nb-input mt-1" value={f.category} onChange={set("category")} data-testid="project-category">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="nb-label">Roles needed (comma separated)</label><input className="nb-input mt-1" value={f.roles} onChange={set("roles")} placeholder="Frontend Developer, Designer" data-testid="project-roles" /></div>
          <div><label className="nb-label">Skills (comma separated)</label><input className="nb-input mt-1" value={f.skills} onChange={set("skills")} placeholder="React, Python" /></div>
          <div><label className="nb-label">Timeline</label><input className="nb-input mt-1" value={f.timeline} onChange={set("timeline")} /></div>
          {isEdit && (
            <div>
              <div className="flex items-center justify-between text-sm font-bold mb-1">
                <label className="nb-label">Progress</label>
                <span>{f.progress}%</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={f.progress}
                onChange={(e) => setF({ ...f, progress: e.target.value })}
                className="w-full accent-[#FF7B54]" data-testid="project-progress" />
            </div>
          )}
        </div>
        <button type="submit" disabled={saving} className="nb-btn w-full justify-center mt-5" data-testid="project-save">
          {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create project")}
        </button>
      </form>
    </div>
  );
}