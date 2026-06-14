import { draft, fixtures, liveMatches } from "@/data/tournament";
import LocalTime from "@/components/LocalTime";
import KickoffCountdown from "@/components/KickoffCountdown";

const flagOf = (team: string) => draft.find((d) => d.team === team)?.flag ?? "";

export default function HeaderMatchCard() {
  // ── Live match(es) take priority ──────────────────────────────────
  if (liveMatches.length > 0) {
    const live = liveMatches[0];
    const extra = liveMatches.length - 1;
    return (
      <div className="header-card">
        <div className="header-card-label live-label">⬤ Live</div>
        <div className="header-card-match">
          <span className="flag" aria-hidden>{flagOf(live.team)}</span>
          {live.team}
          <span className="header-card-score">
            {live.scoreFor}–{live.scoreAgainst}
          </span>
          {live.opponent}
        </div>
        <div className="header-card-sub">
          {live.minute}&prime;
          {extra > 0 && <> · +{extra} more live</>}
        </div>
      </div>
    );
  }

  // ── Next upcoming fixture ─────────────────────────────────────────
  const next = [...fixtures]
    .filter((f) => f.kickoffISO)
    .sort(
      (a, b) =>
        new Date(a.kickoffISO!).getTime() - new Date(b.kickoffISO!).getTime(),
    )[0];

  if (!next) return null;

  return (
    <div className="header-card">
      <div className="header-card-label">Next Match</div>
      <div className="header-card-match">
        <span className="flag" aria-hidden>{flagOf(next.team)}</span>
        {next.team}
        <span className="header-card-vs">vs</span>
        {next.opponent}
      </div>
      <div className="header-card-sub">
        {next.kickoffISO ? (
          <LocalTime iso={next.kickoffISO} fallback={next.kickoff ?? ""} />
        ) : (
          next.kickoff
        )}
        {next.kickoffISO && <KickoffCountdown iso={next.kickoffISO} />}
      </div>
    </div>
  );
}
