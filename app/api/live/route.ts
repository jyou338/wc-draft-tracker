import { NextResponse } from "next/server";

const DRAFTED = new Set([
  "Brazil", "Morocco", "Spain", "France", "England", "Portugal",
  "Argentina", "Germany", "Netherlands", "Belgium", "Norway", "Colombia",
]);

export interface LiveMatchDetail {
  team: string;
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  minute: string;
  goals: string[];
  assists: number;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${today}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ liveMatches: [] });

    const json = await res.json();
    const liveMatches: LiveMatchDetail[] = [];

    for (const event of json.events ?? []) {
      const comp = event.competitions?.[0];
      if (!comp || comp.status?.type?.state !== "in") continue;

      const competitors: { id: string; team: { displayName: string }; score?: string; statistics?: { name: string; displayValue: string }[] }[] =
        comp.competitors ?? [];
      const details: { team?: { id: string }; scoringPlay?: boolean; ownGoal?: boolean; yellowCard?: boolean; redCard?: boolean; athletesInvolved?: { displayName: string }[] }[] =
        comp.details ?? [];

      for (const c of competitors) {
        const name = c.team?.displayName ?? "";
        if (!DRAFTED.has(name)) continue;

        const opp = competitors.find((x) => x !== c);
        const scoreFor = parseInt(c.score ?? "0");
        const scoreAgainst = parseInt(opp?.score ?? "0");

        const goals: string[] = [];
        const yellowCards: string[] = [];
        const redCards: string[] = [];
        const ownGoals: string[] = [];

        for (const detail of details) {
          const player = detail.athletesInvolved?.[0]?.displayName ?? "Unknown";
          if (detail.ownGoal) {
            // ESPN credits the own goal to the benefiting team.
            if (detail.team?.id === opp?.id) {
              // Our player scored against us → -10
              ownGoals.push(player);
            } else if (detail.team?.id === c.id) {
              // Opponent own goal into their net — counts as a goal for us → +5
              goals.push(`OG (${player})`);
            }
          } else if (detail.team?.id === c.id) {
            if (detail.scoringPlay) goals.push(player);
            else if (detail.redCard) redCards.push(player);
            else if (detail.yellowCard) yellowCards.push(player);
          }
        }

        const assistStat = c.statistics?.find((s) => s.name === "goalAssists");
        const assists = parseInt(assistStat?.displayValue ?? "0");

        liveMatches.push({
          team: name,
          opponent: opp?.team?.displayName ?? "",
          scoreFor,
          scoreAgainst,
          minute: comp.status?.displayClock ?? "",
          goals,
          assists,
          yellowCards,
          redCards,
          ownGoals,
        });
      }
    }

    return NextResponse.json({ liveMatches });
  } catch {
    return NextResponse.json({ liveMatches: [] });
  }
}
