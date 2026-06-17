import type { Result, Fixture, LiveMatchDetail } from "@/data/tournament";

export interface TournamentData {
  results: Result[];
  fixtures: Fixture[];
  liveMatches: LiveMatchDetail[];
  lastUpdated: string;
}

const DRAFTED = new Set([
  "Brazil", "Morocco", "Spain", "France", "England", "Portugal",
  "Argentina", "Germany", "Netherlands", "Belgium", "Norway", "Colombia",
]);

const ESPN_TO_OUR_NAME: Record<string, string> = {};
const normalise = (n: string) => ESPN_TO_OUR_NAME[n] ?? n;
const isDrafted = (n: string) => DRAFTED.has(normalise(n));

const KNOCKOUT_MATCHDAY: Record<string, number> = {
  "round-of-32": 4,
  "round-of-16": 5,
  "quarter-finals": 6,
  "semi-finals": 7,
  "third-place": 8,
  "final": 9,
};

function fmtKickoff(utcDate: string): string {
  const d = new Date(utcDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function* dateRange(startISO: string, endISO: string) {
  const cur = new Date(startISO);
  const end = new Date(endISO);
  while (cur <= end) {
    yield cur.toISOString().slice(0, 10).replace(/-/g, "");
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

async function fetchScoreboard(dateStr: string): Promise<{ events: unknown[] }> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return { events: [] };
  return res.json();
}

export async function fetchFromESPN(): Promise<TournamentData> {
  const allDates = [...dateRange("2026-06-11", "2026-07-19")];

  // Fetch in parallel batches of 10
  const BATCH = 10;
  const seenIds = new Set<string>();
  const allEvents: unknown[] = [];

  for (let i = 0; i < allDates.length; i += BATCH) {
    const pages = await Promise.all(allDates.slice(i, i + BATCH).map(fetchScoreboard));
    for (const page of pages) {
      for (const event of page.events) {
        const e = event as Record<string, unknown>;
        if (!seenIds.has(e.id as string)) {
          seenIds.add(e.id as string);
          allEvents.push(event);
        }
      }
    }
  }

  allEvents.sort((a, b) => {
    const ea = a as Record<string, unknown>;
    const eb = b as Record<string, unknown>;
    return new Date(ea.date as string).getTime() - new Date(eb.date as string).getTime();
  });

  const results: Result[] = [];
  const fixturesOut: Fixture[] = [];
  const liveMatches: LiveMatchDetail[] = [];
  const teamCompletedCount: Record<string, number> = {};
  const teamFixtureCount: Record<string, number> = {};

  for (const rawEvent of allEvents) {
    const event = rawEvent as Record<string, unknown>;
    const competition = (event.competitions as unknown[])?.[0] as Record<string, unknown> | undefined;
    if (!competition) continue;

    const competitors = (competition.competitors as unknown[]) ?? [];
    const details = (competition.details as unknown[]) ?? [];
    const statusType = (competition.status as Record<string, unknown>)?.type as Record<string, unknown>;
    const isCompleted = statusType?.completed === true;
    const isLive = statusType?.state === "in";
    const seasonSlug = ((event.season as Record<string, unknown>)?.slug as string) ?? "";
    const isGroupStage = seasonSlug === "group-stage";

    const draftedComps = competitors.filter((c) => {
      const team = (c as Record<string, unknown>).team as Record<string, unknown>;
      return isDrafted(team.displayName as string);
    });
    if (draftedComps.length === 0) continue;

    for (const rawComp of draftedComps) {
      const comp = rawComp as Record<string, unknown>;
      const ourName = normalise((comp.team as Record<string, unknown>).displayName as string);
      const opponentComp = competitors.find((c) => c !== rawComp) as Record<string, unknown> | undefined;
      const opponentName = opponentComp
        ? normalise((opponentComp.team as Record<string, unknown>).displayName as string)
        : "Unknown";
      const opponentId = opponentComp?.id as string | undefined;
      const ourTeamId = comp.id as string;

      if (isCompleted) {
        let matchday: number;
        if (isGroupStage) {
          teamCompletedCount[ourName] = (teamCompletedCount[ourName] ?? 0) + 1;
          matchday = teamCompletedCount[ourName];
        } else {
          matchday = KNOCKOUT_MATCHDAY[seasonSlug] ?? 99;
        }

        const scoreFor = parseInt((comp.score as string) ?? "0");
        const scoreAgainst = parseInt((opponentComp?.score as string) ?? "0");
        const goals: string[] = [];
        const yellowCards: string[] = [];
        const redCards: string[] = [];
        const ownGoals: string[] = [];

        for (const rawDetail of details) {
          const detail = rawDetail as Record<string, unknown>;
          const athletes = detail.athletesInvolved as unknown[] | undefined;
          const playerName =
            ((athletes?.[0] as Record<string, unknown>)?.displayName as string) ?? "Unknown";
          const detailTeamId = (detail.team as Record<string, unknown> | undefined)?.id as string | undefined;

          if (detail.ownGoal) {
            if (detailTeamId === opponentId) ownGoals.push(playerName);
            else if (detailTeamId === ourTeamId) goals.push(`OG (${playerName})`);
          } else if (detailTeamId === ourTeamId) {
            if (detail.scoringPlay) goals.push(playerName);
            else if (detail.redCard) redCards.push(playerName);
            else if (detail.yellowCard) yellowCards.push(playerName);
          }
        }

        const assistStat = (comp.statistics as unknown[] | undefined)?.find(
          (s) => (s as Record<string, unknown>).name === "goalAssists",
        ) as Record<string, unknown> | undefined;

        results.push({
          matchday, date: event.date as string, team: ourName, opponent: opponentName,
          scoreFor, scoreAgainst, goals,
          assists: parseInt((assistStat?.displayValue as string) ?? "0"),
          cleanSheet: scoreAgainst === 0,
          yellowCards, redCards, ownGoals,
        });
      } else if (isLive) {
        teamCompletedCount[ourName] = (teamCompletedCount[ourName] ?? 0) + 1;
        const liveGoals: string[] = [];
        const liveYellow: string[] = [];
        const liveRed: string[] = [];
        const liveOwnGoals: string[] = [];
        for (const rawDetail of details) {
          const detail = rawDetail as Record<string, unknown>;
          const athletes = detail.athletesInvolved as unknown[] | undefined;
          const playerName = ((athletes?.[0] as Record<string, unknown>)?.displayName as string) ?? "Unknown";
          const detailTeamId = (detail.team as Record<string, unknown> | undefined)?.id as string | undefined;
          if (detail.ownGoal) {
            if (detailTeamId === opponentId) liveOwnGoals.push(playerName);
            else if (detailTeamId === ourTeamId) liveGoals.push(`OG (${playerName})`);
          } else if (detailTeamId === ourTeamId) {
            if (detail.scoringPlay) liveGoals.push(playerName);
            else if (detail.redCard) liveRed.push(playerName);
            else if (detail.yellowCard) liveYellow.push(playerName);
          }
        }
        const liveAssistStat = (comp.statistics as unknown[] | undefined)?.find(
          (s) => (s as Record<string, unknown>).name === "goalAssists",
        ) as Record<string, unknown> | undefined;
        liveMatches.push({
          team: ourName, opponent: opponentName,
          scoreFor: parseInt((comp.score as string) ?? "0"),
          scoreAgainst: parseInt((opponentComp?.score as string) ?? "0"),
          minute: ((competition.status as Record<string, unknown>)?.displayClock as string) ?? "",
          goals: liveGoals, assists: parseInt((liveAssistStat?.displayValue as string) ?? "0"),
          yellowCards: liveYellow, redCards: liveRed, ownGoals: liveOwnGoals,
        });
      } else {
        let matchday: number;
        if (isGroupStage) {
          const played = teamCompletedCount[ourName] ?? 0;
          const fixtured = teamFixtureCount[ourName] ?? 0;
          teamFixtureCount[ourName] = fixtured + 1;
          matchday = played + fixtured + 1;
        } else {
          matchday = KNOCKOUT_MATCHDAY[seasonSlug] ?? 99;
        }
        fixturesOut.push({
          matchday, team: ourName, opponent: opponentName,
          kickoff: fmtKickoff(event.date as string),
          kickoffISO: event.date as string | undefined,
        });
      }
    }
  }

  fixturesOut.sort((a, b) => {
    if (a.matchday !== b.matchday) return a.matchday - b.matchday;
    if (a.kickoffISO && b.kickoffISO)
      return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime();
    return a.team.localeCompare(b.team);
  });

  return {
    results,
    fixtures: fixturesOut,
    liveMatches,
    lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  };
}
