"use client";

import { useState } from "react";
import type { Result } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";
import { SCORING } from "@/lib/scoring";

interface Props {
  results: Result[];
  owner: string;
}

const pts = (val: number) => (val > 0 ? `+${val}` : `${val}`);

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
            const total = resultPoints(r);
            return (
              <div className="history-entry" key={i}>
                <div className="history-match">
                  <span className="history-score">
                    {r.scoreFor}–{r.scoreAgainst}
                    {r.shootout && (
                      <span className="pens-note"> ({r.shootout.scoreFor}–{r.shootout.scoreAgainst}p)</span>
                    )}
                  </span>
                  <span className="history-opponent">vs {r.opponent}</span>
                  <span className={`history-pts ${total >= 0 ? "pos" : "neg"}`}>
                    {pts(total)} pts
                  </span>
                </div>
                <div className="history-tags">
                  {r.goals.map((g, k) => (
                    <span className="tag goal" key={`g${k}`}>⚽ {g} {pts(SCORING.goal)}</span>
                  ))}
                  {r.assists > 0 && (
                    <span className="tag assist">🅰 {r.assists} {r.assists === 1 ? "assist" : "assists"} {pts(r.assists * SCORING.assist)}</span>
                  )}
                  {r.cleanSheet && (
                    <span className="tag">🧤 Clean sheet {pts(SCORING.cleanSheet)}</span>
                  )}
                  {r.yellowCards.map((y, k) => (
                    <span className="tag bad" key={`y${k}`}>🟨 {y} {pts(SCORING.yellowCard)}</span>
                  ))}
                  {r.redCards.map((rc, k) => (
                    <span className="tag bad" key={`r${k}`}>🟥 {rc} {pts(SCORING.redCard)}</span>
                  ))}
                  {r.ownGoals.map((o, k) => (
                    <span className="tag bad" key={`o${k}`}>❌ Own goal · {o} {pts(SCORING.ownGoal)}</span>
                  ))}
                  {r.shootout && (
                    <span className="tag shootout-head">
                      🥅 Shootout {r.shootout.won ? "won" : "lost"} {r.shootout.scoreFor}–{r.shootout.scoreAgainst}
                    </span>
                  )}
                  {r.shootout?.kicks.map((k, j) => (
                    <span className={`tag shootout ${k.scored ? "goal" : "bad"}`} key={`so${j}`}>
                      {k.scored ? "⚽" : "❌"} {k.player} {pts(k.scored ? SCORING.shootoutGoal : SCORING.shootoutMiss)}
                    </span>
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
