import { buildStandings, type Standing } from "@/lib/standings";

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

export default function Scoreboard() {
  const standings = buildStandings();
  return (
    <div className="board">
      {standings.map((s, i) => {
        const cards = s.yellowCards + s.redCards + s.ownGoals;
        return (
          <div
            key={s.team}
            className={`row ${stateClass(s)}`}
            style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
          >
            <div className="plate">{s.rank}</div>
            <div className="id">
              <span className="flag" aria-hidden>
                {s.flag}
              </span>
              <div className="names">
                <div className="owner">{s.owner}</div>
                <div className="team">
                  {s.flag} {s.team}
                  {s.played > 0 ? ` · ${s.played} played` : " · yet to play"}
                </div>
              </div>
            </div>
            <div className="tail">
              <div className="breakdown">
                <Stat value={s.goals} label="G" />
                <Stat value={s.assists} label="A" />
                <Stat value={s.cleanSheets} label="CS" />
                <Stat value={cards} label="Crd" />
              </div>
              <div className="pts">
                <div className="num">{s.points}</div>
                <div className="lbl">pts</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
