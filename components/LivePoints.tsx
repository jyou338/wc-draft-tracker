"use client";
import { useLive } from "@/components/LiveProvider";

export default function LivePoints({
  team,
  basePoints,
}: {
  team: string;
  basePoints: number;
}) {
  const { livePoints } = useLive();
  const bonus = livePoints[team] ?? 0;
  const total = basePoints + bonus;

  return (
    <div className="pts">
      <div className={`num${bonus !== 0 ? " live-pts-num" : ""}`}>{total}</div>
      <div className="lbl">pts</div>
      {bonus !== 0 && (
        <div className="live-pts-delta">{bonus > 0 ? "+" : ""}{bonus} live</div>
      )}
    </div>
  );
}
