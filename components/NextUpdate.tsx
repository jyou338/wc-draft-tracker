"use client";

import { useEffect, useState } from "react";

// Match hours: 12:00–23:59 UTC → every 10 min
// Overnight:  00:00–11:59 UTC → every hour
function msUntilNextRun() {
  const now = new Date();
  const h = now.getUTCHours();
  const next = new Date(now);

  if (h >= 12) {
    // Next 10-minute boundary
    const m = now.getUTCMinutes();
    const nextM = Math.ceil((m + 1) / 10) * 10;
    if (nextM < 60) {
      next.setUTCMinutes(nextM, 0, 0);
    } else {
      next.setUTCHours(h + 1, 0, 0, 0);
    }
  } else {
    // Next hour boundary
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(h + 1);
  }

  return next.getTime() - now.getTime();
}

function isMatchHours() {
  return new Date().getUTCHours() >= 12;
}

function fmt(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function NextUpdate() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [matchHours, setMatchHours] = useState(false);

  useEffect(() => {
    const tick = () => {
      setRemaining(msUntilNextRun());
      setMatchHours(isMatchHours());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null;

  return (
    <span className="next-update">
      Next update in <b>{fmt(remaining)}</b>
      {matchHours && <> · every 10 min</>}
    </span>
  );
}
