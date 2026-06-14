// ─────────────────────────────────────────────────────────────────────────────
//  THE ONLY FILE YOU NEED TO EDIT EACH ROUND
// ─────────────────────────────────────────────────────────────────────────────
//  After every round of matches:
//   1. Add a Result for each drafted team that played (see examples below)
//   2. Remove that fixture from `fixtures`
//   3. Bump `lastUpdated`
//   4. git commit + push  →  Vercel redeploys automatically
//
//  Scoring weights live in /lib/scoring.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface DraftPick {
  team: string;
  owner: string;
  flag: string; // emoji flag
}

// The 12 draft picks, in pick order.
export const draft: DraftPick[] = [
  { team: "Brazil", owner: "Sammy", flag: "🇧🇷" },
  { team: "Morocco", owner: "James", flag: "🇲🇦" },
  { team: "Spain", owner: "Dan", flag: "🇪🇸" },
  { team: "France", owner: "Sam", flag: "🇫🇷" },
  { team: "England", owner: "Brendan", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { team: "Portugal", owner: "Jared", flag: "🇵🇹" },
  { team: "Argentina", owner: "Ben", flag: "🇦🇷" },
  { team: "Germany", owner: "Aaron", flag: "🇩🇪" },
  { team: "Netherlands", owner: "Matt", flag: "🇳🇱" },
  { team: "Belgium", owner: "Mike", flag: "🇧🇪" },
  { team: "Norway", owner: "Scott", flag: "🇳🇴" },
  { team: "Colombia", owner: "Nathan", flag: "🇨🇴" },
];

export interface Result {
  matchday: number;
  team: string; // must match a `team` in `draft`
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  goals: string[]; // scorer names — one entry per goal
  assists: string[]; // assister names — one entry per assist
  cleanSheet: boolean;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
}

// Completed results. Add one object per drafted team, per match.
export const results: Result[] = [
  {
    matchday: 1,
    team: "Brazil",
    opponent: "Morocco",
    scoreFor: 1,
    scoreAgainst: 1,
    goals: ["Vinícius Júnior"],
    assists: ["Bruno Guimarães"],
    cleanSheet: false,
    // PENDING DECISION: Brazil received 2 yellow cards (confirmed — ref Slavko Vinčić,
    // first half). Left empty for now so they don't apply an unconfirmed penalty.
    // Once the league confirms whether yellows count (see lib/scoring.ts), add the two
    // booked players here. With yellowCard: -1 this drops Brazil to 5; with 0 they tie
    // Morocco at 7. Booked players' names still to confirm.
    yellowCards: [],
    redCards: [],
    ownGoals: [],
  },
  {
    matchday: 1,
    team: "Morocco",
    opponent: "Brazil",
    scoreFor: 1,
    scoreAgainst: 1,
    goals: ["Ismael Saibari"],
    // Verified via FIFA official stats + match reports: Brahim Díaz assisted Saibari.
    // (The organiser's original table omitted this as "unverified" — it is confirmed.)
    assists: ["Brahim Díaz"],
    cleanSheet: false,
    yellowCards: [],
    redCards: [],
    ownGoals: [],
  },
];

export interface Fixture {
  matchday: number;
  team: string; // drafted team
  opponent: string;
  kickoff?: string; // optional, e.g. "Sat 19:00"
}

// Upcoming matches involving drafted teams. Delete each one as it's played.
export const fixtures: Fixture[] = [
  { matchday: 1, team: "Germany", opponent: "Curaçao" },
  { matchday: 1, team: "Netherlands", opponent: "Japan" },
  { matchday: 1, team: "Spain", opponent: "Cape Verde" },
  { matchday: 1, team: "Belgium", opponent: "Egypt" },
  { matchday: 1, team: "France", opponent: "Senegal" },
  { matchday: 1, team: "Norway", opponent: "Iraq" },
  { matchday: 1, team: "Argentina", opponent: "Algeria" },
];

export const lastUpdated =
  "Verified vs official sources · Brazil 1–1 Morocco (Matchday 1)";
