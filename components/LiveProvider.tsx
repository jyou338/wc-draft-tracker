"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { LiveMatch, LiveMatchDetail } from "@/data/tournament";
import { SCORING } from "@/lib/scoring";

export type { LiveMatchDetail };

type LiveCtx = {
  liveMatches: LiveMatchDetail[];
  livePoints: Record<string, number>;
};

const LiveContext = createContext<LiveCtx>({ liveMatches: [], livePoints: {} });

export function useLive() {
  return useContext(LiveContext);
}

function matchPoints(m: LiveMatchDetail): number {
  return (
    m.goals.length * SCORING.goal +
    m.assists * SCORING.assist +
    (m.scoreAgainst === 0 ? SCORING.cleanSheet : 0) +
    m.yellowCards.length * SCORING.yellowCard +
    m.redCards.length * SCORING.redCard +
    m.ownGoals.length * SCORING.ownGoal
  );
}

function toDetail(m: LiveMatch): LiveMatchDetail {
  return { ...m, goals: [], assists: 0, yellowCards: [], redCards: [], ownGoals: [] };
}

const POLL_MS = 60_000;

export default function LiveProvider({
  children,
  initialLiveMatches,
}: {
  children: React.ReactNode;
  initialLiveMatches: LiveMatch[];
}) {
  const [liveMatches, setLiveMatches] = useState<LiveMatchDetail[]>(
    initialLiveMatches.map(toDetail),
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        const data = await res.json();
        setLiveMatches(data.liveMatches ?? []);
      }
    } catch {
      // network failure — keep last known state
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const livePoints: Record<string, number> = {};
  for (const m of liveMatches) {
    livePoints[m.team] = (livePoints[m.team] ?? 0) + matchPoints(m);
  }

  return (
    <LiveContext.Provider value={{ liveMatches, livePoints }}>
      {children}
    </LiveContext.Provider>
  );
}
