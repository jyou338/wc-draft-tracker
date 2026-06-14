"use client";

import { useState } from "react";
import type { Result } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";

interface Props {
  results: Result[];
  owner: string;
}

export default function MatchHistory({ results, owner }: Props) {
  const [open, setOpen] = useState(false);

  if (results.length === 0) return null;

  const ordered = [...results].sort((a, b) => b.matchday - a.matchday);

  return (
    <div className="history-wrap">
      <button
        className="history-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{open ? "▲" : "▼"}</span>
        {open ? "Hide" : "Show"} match history ({results.length}{" "}
        {results.length === 1 ? "game" : "games"})
      </button>

      {open && (
        <div className="history-list">
          {ordered.map((r, i) => {
            const pts = resultPoints(r);
            return (
              <div className="history-entry" key={i}>
                <div className="history-match">
                  <span className="history-score">
                    {r.scoreFor}–{r.scoreAgainst}
                  </span>
                  <span className="history-opponent">vs {r.opponent}</span>
                  <span className={`history-pts ${pts >= 0 ? "pos" : "neg"}`}>
                    {pts >= 0 ? "+" : ""}{pts} pts
                  </span>
                </div>
                <div className="history-tags">
                  {r.goals.map((g, k) => (
                    <span className="tag goal" key={`g${k}`}>⚽ {g}</span>
                  ))}
                  {r.assists.map((a, k) => (
                    <span className="tag assist" key={`a${k}`}>🅰 {a}</span>
                  ))}
                  {r.cleanSheet && <span className="tag">🧤 Clean sheet</span>}
                  {r.yellowCards.map((y, k) => (
                    <span className="tag bad" key={`y${k}`}>🟨 {y}</span>
                  ))}
                  {r.redCards.map((rc, k) => (
                    <span className="tag bad" key={`r${k}`}>🟥 {rc}</span>
                  ))}
                  {r.ownGoals.map((o, k) => (
                    <span className="tag bad" key={`o${k}`}>❌ Own goal · {o}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
