import { draft, results } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";
import { SCORING } from "@/lib/scoring";

const flagOf = (team: string) =>
  draft.find((d) => d.team === team)?.flag ?? "";
const ownerOf = (team: string) =>
  draft.find((d) => d.team === team)?.owner ?? "";

const pts = (val: number) => (val > 0 ? `+${val}` : `${val}`);

export default function MatchLog() {
  if (results.length === 0) {
    return <div className="card">No matches logged yet. They start soon.</div>;
  }
  // newest first
  const ordered = [...results].sort((a, b) => b.matchday - a.matchday);
  return (
    <>
      {ordered.map((r, i) => {
        const total = resultPoints(r);
        return (
          <div className="card" key={`${r.team}-${r.matchday}-${i}`}>
            <div className="result-line">
              <div className="result-teams">
                <span className="flag" aria-hidden>
                  {flagOf(r.team)}
                </span>
                {r.team}
                <span className="vs"> </span>
                {r.opponent}
              </div>
              <div className="result-score">
                {r.scoreFor}–{r.scoreAgainst}
              </div>
            </div>
            <div className="result-meta">
              {r.goals.map((g, k) => (
                <span className="tag goal" key={`g${k}`}>
                  ⚽ {g} {pts(SCORING.goal)}
                </span>
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
                <span className="tag" key={`y${k}`}>
                  🟨 {y} {pts(SCORING.yellowCard)}
                </span>
              ))}
              {r.redCards.map((rc, k) => (
                <span className="tag" key={`r${k}`}>
                  🟥 {rc} {pts(SCORING.redCard)}
                </span>
              ))}
              {r.ownGoals.map((o, k) => (
                <span className="tag" key={`o${k}`}>
                  ❌ OG {o} {pts(SCORING.ownGoal)}
                </span>
              ))}
              <span className="tag earned">
                {ownerOf(r.team)} {pts(total)}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
