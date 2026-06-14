"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { LiveMatch } from "@/data/tournament";
import { SCORING } from "@/lib/scoring";

export interface LiveMatchDetail extends LiveMatch {
  goals: string[];
  assists: number;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
}

type LiveCtx = {
  liveMatches: LiveMatchDetail[];
  livePoints: Record<string, number>;
};

const LiveContext = createContext<LiveCtx>({ liveMatches: [], livePoints: {} });

export function useLive() {
  return useContext(LiveContext);
}

function computeLivePoints(matches: LiveMatchDetail[]): Record<string, number> {
  const pts: Record<string, number> = {};
  for (const m of matches) {
    const p =
      m.goals.length * SCORING.goal +
      m.assists * SCORING.assist +
      (m.scoreAgainst === 0 ? SCORING.cleanSheet : 0) +
      m.yellowCards.length * SCORING.yellowCard +
      m.redCards.length * SCORING.redCard +
      m.ownGoals.length * SCORING.ownGoal;
    pts[m.team] = p;
  }
  return pts;
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

  const livePoints = computeLivePoints(liveMatches);

  return (
    <LiveContext.Provider value={{ liveMatches, livePoints }}>
      {children}
    </LiveContext.Provider>
  );
}
