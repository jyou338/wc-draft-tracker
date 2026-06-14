import { draft, results, type Result } from "@/data/tournament";
import { SCORING } from "@/lib/scoring";

export interface Standing {
  rank: number;
  team: string;
  owner: string;
  flag: string;
  played: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  points: number;
}

export function resultPoints(r: Result): number {
  return (
    r.goals.length * SCORING.goal +
    r.assists * SCORING.assist +
    (r.cleanSheet ? SCORING.cleanSheet : 0) +
    r.yellowCards.length * SCORING.yellowCard +
    r.redCards.length * SCORING.redCard +
    r.ownGoals.length * SCORING.ownGoal
  );
}

export function buildStandings(): Standing[] {
  const rows: Standing[] = draft.map((pick) => {
    const teamResults = results.filter((r) => r.team === pick.team);
    const tally = {
      played: teamResults.length,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
      points: 0,
    };
    for (const r of teamResults) {
      tally.goals += r.goals.length;
      tally.assists += r.assists;
      tally.cleanSheets += r.cleanSheet ? 1 : 0;
      tally.yellowCards += r.yellowCards.length;
      tally.redCards += r.redCards.length;
      tally.ownGoals += r.ownGoals.length;
      tally.points += resultPoints(r);
    }
    return { rank: 0, team: pick.team, owner: pick.owner, flag: pick.flag, ...tally };
  });

  // Sort by points, then goals, then alphabetically by owner for stable ties.
  rows.sort(
    (a, b) =>
      b.points - a.points || b.goals - a.goals || a.owner.localeCompare(b.owner),
  );

  // Standard competition ranking (1, 2, 2, 4 …) on points only.
  let lastPoints: number | null = null;
  let lastRank = 0;
  rows.forEach((row, i) => {
    if (row.points !== lastPoints) {
      lastRank = i + 1;
      lastPoints = row.points;
    }
    row.rank = lastRank;
  });

  return rows;
}
