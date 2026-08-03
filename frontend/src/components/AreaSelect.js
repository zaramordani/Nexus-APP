import { useEffect, useRef, useState } from "react";
import { US_STATES, citiesForState, parseLocation } from "@/constants/locations";
import { CaretDown, Check } from "@phosphor-icons/react";

/**
 * AreaPicker — pick a home area from the full US dataset. Value is a "City, ST" string.
 */
export function AreaPicker({ value, onChange, testidPrefix = "area" }) {
  const init = parseLocation(value);
  const [state, setState] = useState(init.state);
  const [city, setCity] = useState(init.city);
  const cities = state ? citiesForState(state, [city]) : [];

  const emit = (st, c) => onChange(st && c ? `${c}, ${st}` : "");

  const onState = (e) => {
    const st = e.target.value;
    setState(st);
    setCity("");
    emit(st, "");
  };
  const onCity = (e) => {
    const c = e.target.value;
    setCity(c);
    emit(state, c);
  };

  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      <select className="nb-input" value={state} onChange={onState} data-testid={`${testidPrefix}-state`}>
        <option value="">State…</option>
        {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <select className="nb-input" value={city} onChange={onCity} disabled={!state} data-testid={`${testidPrefix}-city`}>
        <option value="">City…</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

/**
 * AreaFilter — filter by area using the full U.S. states + cities dataset.
 * `cities` is an array of selected city names for the chosen state; an empty
 * array means "all cities in that state". state === "all" means no constraint.
 */
export function AreaFilter({ state, cities, onChange, testidPrefix = "opp" }) {
  const selected = cities || [];
  const allCities = state === "all" ? [] : citiesForState(state);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onState = (e) => { onChange({ state: e.target.value, cities: [] }); };

  const toggleCity = (c) => {
    const next = selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c];
    onChange({ state, cities: next });
  };

  const clearCities = () => onChange({ state, cities: [] });

  const cityLabel =
    selected.length === 0 ? "All cities" :
    selected.length === 1 ? selected[0] :
    `${selected.length} cities selected`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <select className="nb-input py-2" value={state} onChange={onState} data-testid={`${testidPrefix}-state-select`}>
        <option value="all">All states</option>
        {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>

      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={state === "all"}
          onClick={() => setOpen((o) => !o)}
          className="nb-input py-2 w-full flex items-center justify-between gap-1 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid={`${testidPrefix}-city-select`}
        >
          <span className="truncate">{cityLabel}</span>
          <CaretDown size={14} weight="bold" className="shrink-0" />
        </button>

        {open && state !== "all" && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto nb-card bg-white p-1.5" data-testid={`${testidPrefix}-city-options`}>
            <button
              type="button"
              onClick={clearCities}
              className={`w-full flex items-center justify-between text-left text-xs font-bold px-2 py-1.5 rounded-md hover:bg-[#FFD166]/40 ${selected.length === 0 ? "bg-[#FFD166]/30" : ""}`}
              data-testid={`${testidPrefix}-city-option-all`}
            >
              All cities {selected.length === 0 && <Check size={13} weight="bold" />}
            </button>
            {allCities.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium rounded-md hover:bg-[#FFD166]/30 cursor-pointer"
                data-testid={`${testidPrefix}-city-option-${c}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c)}
                  onChange={() => toggleCity(c)}
                  className="w-4 h-4 accent-[#FF7B54]"
                />
                {c}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}