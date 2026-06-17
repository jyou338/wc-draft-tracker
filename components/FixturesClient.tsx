"use client";

import { useState } from "react";
import type { Fixture, DraftPick } from "@/data/tournament";
import LocalTime from "@/components/LocalTime";

function groupByMatchday(items: Fixture[]) {
  const map: Record<number, Fixture[]> = {};
  for (const f of items) {
    if (!map[f.matchday]) map[f.matchday] = [];
    map[f.matchday].push(f);
  }
  for (const group of Object.values(map)) {
    group.sort((a, b) => {
      if (a.kickoffISO && b.kickoffISO)
        return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime();
      return (a.kickoff ?? "").localeCompare(b.kickoff ?? "");
    });
  }
  return map;
}

export default function FixturesClient({ fixtures, draft }: { fixtures: Fixture[]; draft: DraftPick[] }) {
  const flagOf = (team: string) => draft.find((d) => d.team === team)?.flag ?? "";
  const ownerOf = (team: string) => draft.find((d) => d.team === team)?.owner ?? "";

  if (fixtures.length === 0) {
    return <div className="card">No upcoming drafted matches scheduled.</div>;
  }

  const grouped = groupByMatchday(fixtures);
  const matchdays = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const [open, setOpen] = useState(new Set([matchdays[0]]));
  const toggle = (md: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(md) ? next.delete(md) : next.add(md);
      return next;
    });

  return (
    <>
      {matchdays.map((md) => (
        <div key={md} className="fixture-group">
          <button className="fixture-group-toggle" onClick={() => toggle(md)}>
            Matchday {md}
            <span className="fixture-toggle-icon">{open.has(md) ? "▲" : "▼"}</span>
          </button>
          {open.has(md) && grouped[md].map((f, i) => (
            <div className="fixture" key={`${f.team}-${i}`}>
              <span className="flag" aria-hidden>{flagOf(f.team)}</span>
              <div className="fixture-info">
                <span className="ft">
                  {f.team} <span className="vs">vs</span> {f.opponent}
                </span>
                <span className="fixture-meta">
                  {ownerOf(f.team)}
                  {f.kickoffISO ? (
                    <> · <LocalTime iso={f.kickoffISO} fallback={f.kickoff ?? ""} /></>
                  ) : f.kickoff ? (
                    ` · ${f.kickoff}`
                  ) : null}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
