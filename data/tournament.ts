// Static draft picks and shared type definitions.
// Dynamic match data (results, fixtures, liveMatches) is fetched at runtime
// from Supabase via lib/get-tournament-data.ts — do not add data exports here.

export interface DraftPick {
  team: string;
  owner: string;
  flag: string;
}

export interface ShootoutKick {
  player: string;
  scored: boolean; // false = missed or saved (ESPN doesn't distinguish the two)
}

export interface Shootout {
  scoreFor: number;     // our team's converted kicks
  scoreAgainst: number; // opponent's converted kicks
  won: boolean;         // did our team advance
  kicks: ShootoutKick[]; // our team's kicks only, in shooting order
}

export interface Result {
  matchday: number;
  date?: string;
  team: string;
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  goals: string[];
  assists: number;
  cleanSheet: boolean;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
  shootout?: Shootout; // present only for knockout matches decided on penalties
  eliminated?: boolean; // true when this team lost a knockout tie (ESPN advance === false)
}

export interface Fixture {
  matchday: number;
  team: string;
  opponent: string;
  kickoff?: string;
  kickoffISO?: string;
}

export interface LiveMatch {
  team: string;
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  minute: string;
}

export interface LiveMatchDetail extends LiveMatch {
  goals: string[];
  assists: number;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
}

export const draft: DraftPick[] = [
  { team: "Brazil",      owner: "Sammy",   flag: "🇧🇷" },
  { team: "Morocco",     owner: "James",   flag: "🇲🇦" },
  { team: "Spain",       owner: "Dan",     flag: "🇪🇸" },
  { team: "France",      owner: "Sam",     flag: "🇫🇷" },
  { team: "England",     owner: "Brendan", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { team: "Portugal",    owner: "Jared",   flag: "🇵🇹" },
  { team: "Argentina",   owner: "Ben",     flag: "🇦🇷" },
  { team: "Germany",     owner: "Aaron",   flag: "🇩🇪" },
  { team: "Netherlands", owner: "Matt",    flag: "🇳🇱" },
  { team: "Belgium",     owner: "Mike",    flag: "🇧🇪" },
  { team: "Norway",      owner: "Scott",   flag: "🇳🇴" },
  { team: "Colombia",    owner: "Nathan",  flag: "🇨🇴" },
];
