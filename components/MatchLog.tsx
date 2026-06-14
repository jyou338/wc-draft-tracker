import { draft, results } from "@/data/tournament";
import { resultPoints } from "@/lib/standings";

const flagOf = (team: string) =>
  draft.find((d) => d.team === team)?.flag ?? "";
const ownerOf = (team: string) =>
  draft.find((d) => d.team === team)?.owner ?? "";

export default function MatchLog() {
  if (results.length === 0) {
    return <div className="card">No matches logged yet. They start soon.</div>;
  }
  // newest first
  const ordered = [...results].sort((a, b) => b.matchday - a.matchday);
  return (
    <>
      {ordered.map((r, i) => {
        const pts = resultPoints(r);
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
                  ⚽ {g}
                </span>
              ))}
              {r.assists.map((a, k) => (
                <span className="tag assist" key={`a${k}`}>
                  🅰 {a}
                </span>
              ))}
              {r.cleanSheet && <span className="tag">🧤 Clean sheet</span>}
              {r.yellowCards.map((y, k) => (
                <span className="tag" key={`y${k}`}>
                  🟨 {y}
                </span>
              ))}
              {r.redCards.map((rc, k) => (
                <span className="tag" key={`r${k}`}>
                  🟥 {rc}
                </span>
              ))}
              {r.ownGoals.map((o, k) => (
                <span className="tag" key={`o${k}`}>
                  ❌ OG {o}
                </span>
              ))}
              <span className="tag earned">
                {ownerOf(r.team)} +{pts}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
