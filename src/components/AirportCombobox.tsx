import { useEffect, useMemo, useRef, useState } from "react";
import type { Airport } from "../types";

function airportLabel(a: Airport): string {
  return `${a.city} (${a.code})`;
}

// A plain <select> doesn't scale to ~1,200 real-world airports — this is a lightweight
// type-to-filter combobox with no external dependency.
export function AirportCombobox({
  airports,
  value,
  onChange,
  label,
  placeholder,
}: {
  airports: Airport[];
  value: string;
  onChange: (code: string) => void;
  label: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = airports.find((a) => a.code === value);

  useEffect(() => {
    if (!open) setQuery(selected ? airportLabel(selected) : "");
  }, [selected, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return airports.slice(0, 50);
    return airports
      .filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.country.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [airports, query]);

  function choose(a: Airport) {
    onChange(a.code);
    setQuery(airportLabel(a));
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        type="text"
        value={open ? query : selected ? airportLabel(selected) : query}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
          if (value) onChange("");
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = results[highlighted];
            if (pick) choose(pick);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {/* Hidden input keeps the picked code participating in native form validation/required checks. */}
      <input type="text" value={value} readOnly required tabIndex={-1} className="sr-only" aria-hidden="true" />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-slate-400">No airports match.</li>
          ) : (
            results.map((a, i) => (
              <li
                key={a.code}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(a);
                }}
                className={`cursor-pointer px-3 py-2 ${i === highlighted ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"}`}
              >
                <span className="font-medium">{a.city}</span>{" "}
                <span className="text-slate-500">
                  ({a.code}) · {a.country}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
