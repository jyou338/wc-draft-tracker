"use client";
import { useEffect, useState } from "react";

function timeAgo(dateStr: string): string {
  // Parse "2026-06-14 20:57 UTC" → Date
  const date = new Date(dateStr.replace(" UTC", "Z").replace(" ", "T"));
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LastUpdated({ timestamp }: { timestamp: string }) {
  const [ago, setAgo] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setAgo(timeAgo(timestamp));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return (
    <span className="stamp">
      Updated {timestamp}{ago ? ` · ${ago}` : ""}
    </span>
  );
}
