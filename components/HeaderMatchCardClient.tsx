"use client";
import { useLive, type LiveMatchDetail } from "@/components/LiveProvider";
import LocalTime from "@/components/LocalTime";
import KickoffCountdown from "@/components/KickoffCountdown";

type NextFixture = {
  team: string;
  opponent: string;
  flag: string;
  kickoffISO: string;
  kickoff?: string;
} | null;

function fmtNames(names: string[]): string {
  const counts: Record<string, number> = {};
  for (const n of names) counts[n] = (counts[n] ?? 0) + 1;
  return Object.entries(counts)
    .map(([n, c]) => (c > 1 ? `${n} (${c})` : n))
    .join(", ");
}

function fmtCard(names: string[]): string {
  if (names.length === 1) return names[0];
  return String(names.length);
}

function LiveMatchRow({ live }: { live: LiveMatchDetail }) {
  const hasBreakdown =
    live.goals.length > 0 ||
    live.assists > 0 ||
    live.yellowCards.length > 0 ||
    live.redCards.length > 0 ||
    live.ownGoals.length > 0;

  return (
    <div className="header-card-match-block">
      <div className="header-card-match">
        {live.team}
        <span className="header-card-score">
          {live.scoreFor}–{live.scoreAgainst}
        </span>
        {live.opponent}
        <span className="header-card-minute">{live.minute}&prime;</span>
      </div>
      {hasBreakdown && (
        <div className="header-card-breakdown">
          {live.goals.length > 0 && <span>⚽ {fmtNames(live.goals)}</span>}
          {live.assists > 0 && <span>{live.assists} ast</span>}
          {live.yellowCards.length > 0 && <span>🟡 {fmtCard(live.yellowCards)}</span>}
          {live.redCards.length > 0 && <span>🔴 {fmtCard(live.redCards)}</span>}
          {live.ownGoals.length > 0 && <span>OG {fmtNames(live.ownGoals)}</span>}
        </div>
      )}
    </div>
  );
}

export default function HeaderMatchCardClient({
  nextFixture,
}: {
  nextFixture: NextFixture;
}) {
  const { liveMatches } = useLive();

  if (liveMatches.length > 0) {
    return (
      <div className="header-card">
        <div className="header-card-label live-label">
          ⬤ Live{liveMatches.length > 1 ? ` · ${liveMatches.length} matches` : ""}
        </div>
        {liveMatches.map((live, i) => (
          <LiveMatchRow key={`${live.team}-${i}`} live={live} />
        ))}
      </div>
    );
  }

  if (!nextFixture) return null;

  return (
    <div className="header-card">
      <div className="header-card-label">Next Match</div>
      <div className="header-card-match">
        <span className="flag" aria-hidden>
          {nextFixture.flag}
        </span>
        {nextFixture.team}
        <span className="header-card-vs">vs</span>
        {nextFixture.opponent}
      </div>
      <div className="header-card-sub">
        <LocalTime iso={nextFixture.kickoffISO} fallback={nextFixture.kickoff ?? ""} />
        <KickoffCountdown iso={nextFixture.kickoffISO} />
      </div>
    </div>
  );
}
