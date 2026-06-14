"use client";

import { useState, useEffect } from "react";

function fmt(ms: number): string | null {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days >= 7) return null;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${String(mins).padStart(2, "0")}m`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export default function KickoffCountdown({ iso }: { iso: string }) {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(iso).getTime();
    const tick = () => setDisplay(fmt(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);

  if (!display) return null;

  return <span className="kickoff-countdown"> · {display}</span>;
}
