import { draft, fixtures } from "@/data/tournament";

const flagOf = (team: string) =>
  draft.find((d) => d.team === team)?.flag ?? "";
const ownerOf = (team: string) =>
  draft.find((d) => d.team === team)?.owner ?? "";

export default function Fixtures() {
  if (fixtures.length === 0) {
    return <div className="card">No upcoming drafted matches scheduled.</div>;
  }
  return (
    <>
      {fixtures.map((f, i) => (
        <div className="fixture" key={`${f.team}-${i}`}>
          <span className="flag" aria-hidden>
            {flagOf(f.team)}
          </span>
          <span className="ft">{f.team}</span>
          <span className="vs">vs</span>
          <span className="opp">{f.opponent}</span>
          <span className="who">
            {ownerOf(f.team)}
            {f.kickoff ? ` · ${f.kickoff}` : ""}
          </span>
        </div>
      ))}
    </>
  );
}
