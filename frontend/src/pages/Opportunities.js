import { useEffect, useState } from "react";
import { api, formatError } from "@/api";
import { useAuth } from "@/AuthContext";
import { PageHead, DeleteButton } from "@/components/common";
import { AreaFilter, AreaPicker } from "@/components/AreaSelect";
import { parseLocation } from "@/constants/locations";
import { Trophy, CalendarBlank, ArrowSquareOut, Buildings, MapPin, Sparkle, Plus, X, Globe, MapPinLine } from "@phosphor-icons/react";
import { toast } from "sonner";

const TYPES = ["All", "Research", "Competition", "Scholarship", "Internship", "Hackathon"];
const TYPE_COLOR = {
  Research: "bg-[#A0C4FF]", Competition: "bg-[#FF7B54]", Scholarship: "bg-[#FFD166]",
  Internship: "bg-[#2ECC71] text-white", Hackathon: "bg-[#FFB4A2]",
};
const OPEN_TO_ALL = ["Remote", "Nationwide", "Online"];

export default function Opportunities() {
  const { user } = useAuth();
  const [opps, setOpps] = useState([]);
  const [recs, setRecs] = useState([]);
  const [filter, setFilter] = useState("All");
  const [area, setArea] = useState({ state: "all", cities: [] });
  const [open, setOpen] = useState(false);

  const loadOpps = () => api.get("/opportunities").then((r) => setOpps(r.data)).catch(() => {});

  useEffect(() => {
    loadOpps();
    api.get("/opportunities/recommended?limit=3").then((r) => setRecs(r.data.recommendations || [])).catch(() => {});
  }, []);

  const deleteOpp = async (o) => {
    try {
      await api.delete(`/opportunities/${o.id}`);
      toast.success("Opportunity deleted.");
      setOpps((os) => os.filter((x) => x.id !== o.id));
      setRecs((rs) => rs.filter((x) => x.id !== o.id));
    } catch (e) {
      toast.error(formatError(e?.response?.data?.detail));
    }
  };

  const shown = opps.filter((o) => {
    const typeOk = filter === "All" || o.type === filter;
    let areaOk = true;
    if (area.state !== "all") {
      if (OPEN_TO_ALL.includes(o.location)) areaOk = true;
      else {
        const p = parseLocation(o.location);
        areaOk = p.state === area.state && (!area.cities?.length || area.cities.includes(p.city));
      }
    }
    return typeOk && areaOk;
  });

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-8">
      <PageHead label="Opportunity Board" title="Discover what's next.">
        <button className="nb-btn" onClick={() => setOpen(true)} data-testid="new-opp-btn">
          <Plus size={18} weight="bold" /> Post opportunity
        </button>
      </PageHead>

      {/* AI recommendations */}
      {recs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkle size={20} weight="fill" className="text-[#FF7B54]" />
            <h2 className="font-display text-2xl font-bold tracking-tight">Recommended for you</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {recs.map((o) => (
              <div key={o.id} className="nb-card nb-card-hover p-5 flex flex-col bg-[#A0C4FF]/25" data-testid={`opp-rec-${o.id}`}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className={`nb-chip ${TYPE_COLOR[o.type] || "bg-white"}`}>{o.type}</span>
                  <div className="flex items-center gap-2">
                    {typeof o.score === "number" && <span className="nb-chip bg-white text-xs">{o.score}% match</span>}
                    {o.posted_by === user.id && <DeleteButton onDelete={() => deleteOpp(o)} label="opportunity" testId={`delete-opp-rec-${o.id}`} />}
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight leading-tight">{o.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#4A4A4A] mt-1 mb-2">
                  <span className="flex items-center gap-1"><Buildings size={14} weight="bold" /> {o.org}</span>
                  {o.location && <span className="flex items-center gap-1"><MapPin size={14} weight="bold" /> {o.location}</span>}
                </div>
                {o.reason && (
                  <div className="flex items-start gap-1 text-xs font-medium text-[#4A4A4A] mb-3 bg-white border-2 border-[#0A0A0A]/10 rounded-lg p-2">
                    <Sparkle size={13} weight="fill" className="text-[#FF7B54] mt-0.5 shrink-0" /> {o.reason}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#FF7B54]">
                    <CalendarBlank size={14} weight="bold" /> {o.deadline}
                  </span>
                  <a href={o.link} target="_blank" rel="noreferrer" className="nb-btn nb-btn-accent text-sm py-2">
                    Apply <ArrowSquareOut size={14} weight="bold" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-2xl font-bold tracking-tight mb-3">Browse all</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)} data-testid={`opp-filter-${t}`}
            className={`nb-chip ${filter === t ? "bg-[#FF7B54]" : "bg-white"}`}>{t}</button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6 max-w-md">
        <MapPin size={18} weight="bold" className="text-[#4A4A4A] shrink-0" />
        <div className="flex-1">
          <AreaFilter state={area.state} cities={area.cities} onChange={setArea} testidPrefix="oppboard" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((o) => (
          <div key={o.id} className="nb-card nb-card-hover p-5 flex flex-col" data-testid={`opp-${o.id}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="w-10 h-10 bg-[#FFD166] border-2 border-[#0A0A0A] rounded-lg flex items-center justify-center">
                <Trophy size={20} weight="bold" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`nb-chip ${TYPE_COLOR[o.type] || "bg-white"}`}>{o.type}</span>
                {o.posted_by === user.id && <DeleteButton onDelete={() => deleteOpp(o)} label="opportunity" testId={`delete-opp-${o.id}`} />}
              </div>
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight leading-tight">{o.title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#4A4A4A] mt-1 mb-2">
              <span className="flex items-center gap-1"><Buildings size={14} weight="bold" /> {o.org}</span>
              {o.location && <span className="flex items-center gap-1"><MapPin size={14} weight="bold" /> {o.location}</span>}
            </div>
            <p className="text-sm text-[#4A4A4A] font-medium line-clamp-3 mb-4">{o.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-bold text-[#FF7B54]">
                <CalendarBlank size={14} weight="bold" /> {o.deadline}
              </span>
              <a href={o.link} target="_blank" rel="noreferrer" className="nb-btn nb-btn-accent text-sm py-2" data-testid={`opp-apply-${o.id}`}>
                Apply <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {open && <NewOpportunityModal onClose={() => setOpen(false)} onCreated={() => { setOpen(false); loadOpps(); }} />}
    </div>
  );
}

function NewOpportunityModal({ onClose, onCreated }) {
  const [f, setF] = useState({ title: "", org: "", type: "Internship", description: "", deadline: "", link: "", tags: "" });
  const [locMode, setLocMode] = useState("place"); // "place" | "online"
  const [place, setPlace] = useState({ state: "", city: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const location = locMode === "online" ? "Online" : (place.city && place.state ? `${place.city}, ${place.state}` : "");
    if (locMode === "place" && !location) { toast.error("Please choose a place, or switch to Online."); return; }
    const payload = {
      ...f,
      location,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      await api.post("/opportunities", payload);
      toast.success("Opportunity posted!");
      onCreated();
    } catch {
      toast.error("Could not post opportunity.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="nb-card bg-[#FDFBF7] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid="new-opp-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-black">Post an opportunity</h2>
          <button type="button" onClick={onClose}><X size={24} weight="bold" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="nb-label">Title</label>
            <input className="nb-input mt-1" value={f.title} onChange={set("title")} required data-testid="opp-title" /></div>
          <div><label className="nb-label">Organization</label>
            <input className="nb-input mt-1" value={f.org} onChange={set("org")} required data-testid="opp-org" /></div>
          <div><label className="nb-label">Type</label>
            <select className="nb-input mt-1" value={f.type} onChange={set("type")} data-testid="opp-type">
              {TYPES.slice(1).map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <div><label className="nb-label">Description</label>
            <textarea className="nb-input mt-1 min-h-[90px]" value={f.description} onChange={set("description")} required data-testid="opp-description" /></div>

          {/* Location section: a place, or online */}
          <div>
            <label className="nb-label">Location</label>
            <div className="flex gap-2 mt-1 mb-2">
              <button type="button" onClick={() => setLocMode("place")} data-testid="opp-loc-place-tab"
                className={`nb-chip flex items-center gap-1 ${locMode === "place" ? "bg-[#A0C4FF]" : "bg-white"}`}>
                <MapPinLine size={14} weight="bold" /> A place
              </button>
              <button type="button" onClick={() => setLocMode("online")} data-testid="opp-loc-online-tab"
                className={`nb-chip flex items-center gap-1 ${locMode === "online" ? "bg-[#A0C4FF]" : "bg-white"}`}>
                <Globe size={14} weight="bold" /> Online
              </button>
            </div>
            {locMode === "place" ? (
              <AreaPicker
                value={place.city && place.state ? `${place.city}, ${place.state}` : ""}
                onChange={(v) => { const p = parseLocation(v); setPlace({ state: p.state || "", city: p.city || "" }); }}
                testidPrefix="opp-loc"
              />
            ) : (
              <div className="nb-input mt-1 flex items-center gap-2 text-sm font-bold text-[#4A4A4A] bg-white" data-testid="opp-loc-online-note">
                <Globe size={16} weight="bold" /> This opportunity is fully online — open to students anywhere.
              </div>
            )}
          </div>

          <div><label className="nb-label">Deadline</label>
            <input type="date" className="nb-input mt-1" value={f.deadline} onChange={set("deadline")} data-testid="opp-deadline" /></div>
          <div><label className="nb-label">Link to apply</label>
            <input className="nb-input mt-1" placeholder="https://…" value={f.link} onChange={set("link")} data-testid="opp-link" /></div>
          <div><label className="nb-label">Tags (comma separated)</label>
            <input className="nb-input mt-1" placeholder="AI, Research, Robotics" value={f.tags} onChange={set("tags")} data-testid="opp-tags" /></div>
        </div>
        <button className="nb-btn w-full justify-center mt-5" data-testid="opp-submit">Post opportunity</button>
      </form>
    </div>
  );
}