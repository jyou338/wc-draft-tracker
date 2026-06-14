"use client";
import { useLive } from "@/components/LiveProvider";

export default function LiveBadge({ team }: { team: string }) {
  const { liveMatches } = useLive();
  const match = liveMatches.find((m) => m.team === team);
  if (!match) return null;
  return (
    <span className="live-badge">
      LIVE {match.scoreFor}–{match.scoreAgainst}
      {match.minute && (
        <span className="live-clock">{" "}{match.minute}&prime;</span>
      )}
    </span>
  );
}
