import { buildStandings, type Standing } from "@/lib/standings";
import { fixtures, results } from "@/data/tournament";
import MatchHistory from "@/components/MatchHistory";
import LocalTime from "@/components/LocalTime";
import KickoffCountdown from "@/components/KickoffCountdown";
import LiveBadge from "@/components/LiveBadge";
import LivePoints from "@/components/LivePoints";

function stateClass(s: Standing): string {
  if (s.rank === 1 && s.points > 0) return "leader";
  if (s.points > 0) return "scoring";
  return "idle";
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <div className={`v${value === 0 ? " zero" : ""}`}>{value}</div>
      <div className="k">{label}</div>
    </div>
  );
}

function topScorers(team: string, n = 3): Array<[string, number]> {
  const map: Record<string, number> = {};
  for (const r of results.filter((r) => r.team === team)) {
    for (const g of r.goals) {
      map[g] = (map[g] ?? 0) + 1;
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export default function Scoreboard() {
  const standings = buildStandings();

  // Previous-matchday standings for movement arrows
  const maxMatchday = results.length > 0 ? Math.max(...results.map((r) => r.matchday)) : 0;
  const prevResults = results.filter((r) => r.matchday < maxMatchday);
  const prevStandings = prevResults.length > 0 ? buildStandings(prevResults) : null;
  const prevRank: Record<string, number> = {};
  if (prevStandings) {
    for (const s of prevStandings) prevRank[s.team] = s.rank;
  }

  const nextGame: Record<string, (typeof fixtures)[0]> = {};
  for (const f of fixtures) {
    if (!nextGame[f.team]) nextGame[f.team] = f;
  }

  return (
    <div className="board">
      {standings.map((s, i) => {
        const penaltyCards = s.yellowCards + s.redCards + s.ownGoals;
        const next = nextGame[s.team];
        const teamResults = results.filter((r) => r.team === s.team);
        const scorers = topScorers(s.team);
        const moved = prevRank[s.team] !== undefined ? prevRank[s.team] - s.rank : null;

        return (
          <div
            key={s.team}
            className={`row ${stateClass(s)}`}
            style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
          >
            <div className="plate">
              {s.rank}
              {moved !== null && moved !== 0 && (
                <div className={`movement ${moved > 0 ? "up" : "down"}`}>
                  {moved > 0 ? `↑${moved}` : `↓${Math.abs(moved)}`}
                </div>
              )}
              {moved === 0 && <div className="movement same">—</div>}
            </div>
            <div className="id">
              <span className="flag" aria-hidden>
                {s.flag}
              </span>
              <div className="names">
                <div className="owner">
                  {s.owner} · {s.team}
                  <LiveBadge team={s.team} />
                </div>
                {next && (
                  <div className="next-fixture">
                    Next: {next.opponent}
                    {next.kickoffISO ? (
                      <> · <LocalTime iso={next.kickoffISO} fallback={next.kickoff ?? ""} /></>
                    ) : next.kickoff ? (
                      ` · ${next.kickoff}`
                    ) : null}
                    {next.kickoffISO && (
                      <KickoffCountdown iso={next.kickoffISO} />
                    )}
                  </div>
                )}
                {scorers.length > 0 && (
                  <div className="top-scorers">
                    {scorers
                      .map(([name, count]) => `${name} (${count})`)
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
            <div className="tail">
              <div className="breakdown">
                <Stat value={s.goals} label="Goals" />
                <Stat value={s.assists} label="Assists" />
                <Stat value={s.cleanSheets} label="Clean sheets" />
                <Stat value={penaltyCards} label="Penalties" />
              </div>
              <LivePoints team={s.team} basePoints={s.points} />
            </div>
            {teamResults.length > 0 && (
              <div className="history-row">
                <MatchHistory results={teamResults} owner={s.owner} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
