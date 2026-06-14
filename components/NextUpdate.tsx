"use client";

import { useEffect, useState } from "react";

function msUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime() - now.getTime();
}

function fmt(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function NextUpdate() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    setRemaining(msUntilNextHour());
    const id = setInterval(() => {
      setRemaining(msUntilNextHour());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null;

  return (
    <span className="next-update">
      Next update in <b>{fmt(remaining)}</b>
    </span>
  );
}
