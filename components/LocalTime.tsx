"use client";

import { useState, useEffect } from "react";

interface Props {
  iso: string;
  fallback: string;
}

// Derive an abbreviation from the English long timezone name.
// "New Zealand Standard Time" → "NZST"
// "New Zealand Daylight Time" → "NZDT"
// "Eastern Daylight Time"     → "EDT"
// Falls back to the short format if unavailable.
function tzAbbr(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "long",
      hour: "numeric",
    }).formatToParts(date);
    const long = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    if (long) return long.split(" ").map((w) => w[0]).join("");
  } catch {}
  // Fallback: whatever "short" gives (may be GMT+XX on some browsers)
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZoneName: "short",
      hour: "numeric",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {}
  return "";
}

export default function LocalTime({ iso, fallback }: Props) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(iso);
    const time = d.toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const tz = tzAbbr(d);
    setLocal(tz ? `${time} ${tz}` : time);
  }, [iso]);

  // SSR / first paint: render the UTC fallback to avoid hydration mismatch.
  return <>{local ?? fallback}</>;
}
