import { draft, fixtures } from "@/data/tournament";
import LocalTime from "@/components/LocalTime";

const flagOf = (team: string) =>
  draft.find((d) => d.team === team)?.flag ?? "";
const ownerOf = (team: string) =>
  draft.find((d) => d.team === team)?.owner ?? "";

// Group fixtures by matchday
function groupByMatchday(items: typeof fixtures) {
  const map: Record<number, typeof fixtures> = {};
  for (const f of items) {
    if (!map[f.matchday]) map[f.matchday] = [];
    map[f.matchday].push(f);
  }
  return map;
}

export default function Fixtures() {
  if (fixtures.length === 0) {
    return <div className="card">No upcoming drafted matches scheduled.</div>;
  }

  const grouped = groupByMatchday(fixtures);
  const matchdays = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <>
      {matchdays.map((md) => (
        <div key={md} className="fixture-group">
          <div className="fixture-group-label">Matchday {md}</div>
          {grouped[md].map((f, i) => (
            <div className="fixture" key={`${f.team}-${i}`}>
              <span className="flag" aria-hidden>
                {flagOf(f.team)}
              </span>
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
