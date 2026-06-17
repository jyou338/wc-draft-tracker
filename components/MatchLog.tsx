"use client";

import { useState } from "react";
import type { Result, DraftPick } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";
import { SCORING } from "@/lib/scoring";

const pts = (val: number) => (val > 0 ? `+${val}` : `${val}`);

export default function MatchLog({ results, draft }: { results: Result[]; draft: DraftPick[] }) {
  const flagOf = (team: string) => draft.find((d) => d.team === team)?.flag ?? "";
  const ownerOf = (team: string) => draft.find((d) => d.team === team)?.owner ?? "";

  const [showAll, setShowAll] = useState(false);

  if (results.length === 0) {
    return <div className="card">No matches logged yet. They start soon.</div>;
  }

  // Most recent game first, using actual event date
  const sorted = [...results].sort((a, b) => {
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
    return b.matchday - a.matchday;
  });
  const visible = showAll ? sorted : sorted.slice(0, 3);

  return (
    <>
      {visible.map((r, i) => {
        const total = resultPoints(r);
        return (
          <div className="card" key={`${r.team}-${r.matchday}-${i}`}>
            <div className="result-line">
              <div className="result-teams">
                <span className="flag" aria-hidden>{flagOf(r.team)}</span>
                {r.team}
                <span className="vs"> </span>
                {r.opponent}
              </div>
              <div className="result-score">{r.scoreFor}–{r.scoreAgainst}</div>
            </div>
            <div className="result-meta">
              {r.goals.map((g, k) => (
                <span className="tag goal" key={`g${k}`}>⚽ {g} {pts(SCORING.goal)}</span>
              ))}
              {r.assists > 0 && (
                <span className="tag assist">
                  🅰 {r.assists} {r.assists === 1 ? "assist" : "assists"} {pts(r.assists * SCORING.assist)}
                </span>
              )}
              {r.cleanSheet && (
                <span className="tag">🧤 Clean sheet {pts(SCORING.cleanSheet)}</span>
              )}
              {r.yellowCards.map((y, k) => (
                <span className="tag" key={`y${k}`}>🟨 {y} {pts(SCORING.yellowCard)}</span>
              ))}
              {r.redCards.map((rc, k) => (
                <span className="tag" key={`r${k}`}>🟥 {rc} {pts(SCORING.redCard)}</span>
              ))}
              {r.ownGoals.map((o, k) => (
                <span className="tag" key={`o${k}`}>❌ OG {o} {pts(SCORING.ownGoal)}</span>
              ))}
              <span className="tag earned">{ownerOf(r.team)} {pts(total)}</span>
            </div>
          </div>
        );
      })}

      {!showAll && sorted.length > 3 && (
        <button className="show-more-btn" onClick={() => setShowAll(true)}>
          Show {sorted.length - 3} earlier result{sorted.length - 3 !== 1 ? "s" : ""}
        </button>
      )}
    </>
  );
}
