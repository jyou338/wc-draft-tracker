// ─────────────────────────────────────────────────────────────────────────────
//  fetch-wc-data.mjs
//  Fetches live 2026 World Cup data from API-Football and rewrites
//  data/tournament.ts so Vercel can redeploy a fresh static build.
//
//  Run locally:   API_FOOTBALL_KEY=xxx node scripts/fetch-wc-data.mjs
//  In CI:         the key comes from the GitHub secret API_FOOTBALL_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) {
  console.error("❌  API_FOOTBALL_KEY env var is not set.");
  process.exit(1);
}

// FIFA World Cup 2026 — league ID 1 on API-Football (same as all prior WCs).
// If this ever changes, update this constant.
const WC_LEAGUE_ID = 1;
const SEASON = 2026;

// Our 12 drafted teams (must match API-Football team names exactly).
// See TEAM_NAME_MAP below if the API uses a different spelling.
const DRAFTED_TEAMS = [
  "Brazil",
  "Morocco",
  "Spain",
  "France",
  "England",
  "Portugal",
  "Argentina",
  "Germany",
  "Netherlands",
  "Belgium",
  "Norway",
  "Colombia",
];

// Draft picks (owner + flag — never changes mid-tournament).
const DRAFT = [
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

// If the API spells a team name differently from ours, map it here.
// e.g. "Korea Republic" -> "South Korea"
const API_TO_OUR_NAME = {
  // Add entries as needed:
  // "Korea Republic": "South Korea",
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${url}`);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API returned errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

// ── Name normalisation ────────────────────────────────────────────────────────

function normalise(apiName) {
  return API_TO_OUR_NAME[apiName] ?? apiName;
}

function isDrafted(apiTeamName) {
  return DRAFTED_TEAMS.includes(normalise(apiTeamName));
}

// ── Round → matchday number ───────────────────────────────────────────────────
// API-Football returns strings like "Group Stage - 1", "Round of 16", etc.

function roundToMatchday(round) {
  if (!round) return 1;
  const m = round.match(/Group Stage\s*[-–]\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/round of 32/i.test(round)) return 4;
  if (/round of 16/i.test(round)) return 5;
  if (/quarter.?final/i.test(round)) return 6;
  if (/semi.?final/i.test(round)) return 7;
  if (/3rd/i.test(round) || /third/i.test(round)) return 8;
  if (/final/i.test(round)) return 9;
  return 99;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching fixtures for league ${WC_LEAGUE_ID}, season ${SEASON}…`);

  const allFixtures = await apiGet(
    `/fixtures?league=${WC_LEAGUE_ID}&season=${SEASON}`
  );

  console.log(`  Total fixtures returned: ${allFixtures.length}`);

  // Split into finished vs upcoming
  const finished = allFixtures.filter((f) =>
    ["FT", "AET", "PEN"].includes(f.fixture.status.short)
  );
  const upcoming = allFixtures.filter((f) =>
    ["NS", "TBD", "PST"].includes(f.fixture.status.short)
  );

  console.log(`  Finished: ${finished.length}, Upcoming: ${upcoming.length}`);

  // ── Results ───────────────────────────────────────────────────────────────

  // Only matches where at least one side is a drafted team
  const relevantFinished = finished.filter(
    (f) => isDrafted(f.teams.home.name) || isDrafted(f.teams.away.name)
  );

  console.log(
    `  Relevant finished matches (involving drafted teams): ${relevantFinished.length}`
  );

  const results = [];

  for (const f of relevantFinished) {
    const fixtureId = f.fixture.id;
    const homeApi = f.teams.home.name;
    const awayApi = f.teams.away.name;
    const home = normalise(homeApi);
    const away = normalise(awayApi);
    const homeScore = f.goals.home ?? 0;
    const awayScore = f.goals.away ?? 0;
    const matchday = roundToMatchday(f.league.round);

    // Fetch events for this fixture
    let events = [];
    try {
      events = await apiGet(`/fixtures/events?fixture=${fixtureId}`);
    } catch (e) {
      console.warn(`  ⚠  Could not fetch events for fixture ${fixtureId}: ${e.message}`);
    }

    // Helper: build a Result object for one drafted side
    function buildResult(ourTeam, opponentTeam, scoreFor, scoreAgainst) {
      const goals = [];
      const assists = [];
      const yellowCards = [];
      const redCards = [];
      const ownGoals = [];

      for (const ev of events) {
        const evTeam = normalise(ev.team.name);
        const playerName = ev.player?.name ?? "";
        const assistName = ev.assist?.name ?? "";

        if (ev.type === "Goal") {
          if (ev.detail === "Own Goal") {
            // Own goal is scored for the OTHER team — it hurts the team who conceded
            if (evTeam !== ourTeam) {
              // opponent scored an OG → counts as our goal (no scorer to log)
            } else {
              // WE scored an OG → penalty for us
              ownGoals.push(playerName);
            }
          } else {
            // Normal goal or penalty
            if (evTeam === ourTeam) {
              goals.push(playerName);
              if (assistName) assists.push(assistName);
            }
          }
        } else if (ev.type === "Card") {
          if (evTeam === ourTeam) {
            if (ev.detail === "Yellow Card") yellowCards.push(playerName);
            if (ev.detail === "Red Card" || ev.detail === "Second Yellow") redCards.push(playerName);
          }
        }
      }

      const cleanSheet = scoreAgainst === 0;

      return {
        matchday,
        team: ourTeam,
        opponent: opponentTeam,
        scoreFor,
        scoreAgainst,
        goals,
        assists,
        cleanSheet,
        yellowCards,
        redCards,
        ownGoals,
      };
    }

    if (isDrafted(homeApi)) {
      results.push(buildResult(home, away, homeScore, awayScore));
    }
    if (isDrafted(awayApi)) {
      results.push(buildResult(away, home, awayScore, homeScore));
    }
  }

  // ── Fixtures ──────────────────────────────────────────────────────────────

  const relevantUpcoming = upcoming.filter(
    (f) => isDrafted(f.teams.home.name) || isDrafted(f.teams.away.name)
  );

  const fixturesOut = [];

  for (const f of relevantUpcoming) {
    const home = normalise(f.teams.home.name);
    const away = normalise(f.teams.away.name);
    const matchday = roundToMatchday(f.league.round);

    // Format kickoff time from UTC timestamp
    let kickoff = undefined;
    if (f.fixture.date) {
      const d = new Date(f.fixture.date);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      kickoff = `${days[d.getUTCDay()]} ${hh}:${mm} UTC`;
    }

    if (isDrafted(f.teams.home.name)) {
      fixturesOut.push({ matchday, team: home, opponent: away, kickoff });
    }
    if (isDrafted(f.teams.away.name)) {
      fixturesOut.push({ matchday, team: away, opponent: home, kickoff });
    }
  }

  // Sort fixtures by matchday then team name
  fixturesOut.sort((a, b) => a.matchday - b.matchday || a.team.localeCompare(b.team));

  // ── Generate tournament.ts ────────────────────────────────────────────────

  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const draftTs = DRAFT.map(
    (p) =>
      `  { team: ${JSON.stringify(p.team)}, owner: ${JSON.stringify(p.owner)}, flag: ${JSON.stringify(p.flag)} },`
  ).join("\n");

  function resultToTs(r) {
    const lines = [
      `  {`,
      `    matchday: ${r.matchday},`,
      `    team: ${JSON.stringify(r.team)},`,
      `    opponent: ${JSON.stringify(r.opponent)},`,
      `    scoreFor: ${r.scoreFor},`,
      `    scoreAgainst: ${r.scoreAgainst},`,
      `    goals: ${JSON.stringify(r.goals)},`,
      `    assists: ${JSON.stringify(r.assists)},`,
      `    cleanSheet: ${r.cleanSheet},`,
      `    yellowCards: ${JSON.stringify(r.yellowCards)},`,
      `    redCards: ${JSON.stringify(r.redCards)},`,
      `    ownGoals: ${JSON.stringify(r.ownGoals)},`,
      `  },`,
    ];
    return lines.join("\n");
  }

  function fixtureToTs(f) {
    const kickoffPart = f.kickoff ? `, kickoff: ${JSON.stringify(f.kickoff)}` : "";
    return `  { matchday: ${f.matchday}, team: ${JSON.stringify(f.team)}, opponent: ${JSON.stringify(f.opponent)}${kickoffPart} },`;
  }

  const resultsTs = results.map(resultToTs).join("\n");
  const fixturesTs = fixturesOut.map(fixtureToTs).join("\n");

  const output = `// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GENERATED by scripts/fetch-wc-data.mjs — do not edit by hand.
//  Last fetched: ${now}
//  To update manually, run:  API_FOOTBALL_KEY=xxx node scripts/fetch-wc-data.mjs
// ─────────────────────────────────────────────────────────────────────────────

export interface DraftPick {
  team: string;
  owner: string;
  flag: string;
}

export const draft: DraftPick[] = [
${draftTs}
];

export interface Result {
  matchday: number;
  team: string;
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  goals: string[];
  assists: string[];
  cleanSheet: boolean;
  yellowCards: string[];
  redCards: string[];
  ownGoals: string[];
}

export const results: Result[] = [
${resultsTs}
];

export interface Fixture {
  matchday: number;
  team: string;
  opponent: string;
  kickoff?: string;
}

export const fixtures: Fixture[] = [
${fixturesTs}
];

export const lastUpdated = "Auto-updated ${now} via API-Football";
`;

  const outPath = join(ROOT, "data", "tournament.ts");
  writeFileSync(outPath, output, "utf8");
  console.log(`✅  Written to ${outPath}`);
  console.log(`   Results: ${results.length}, Fixtures: ${fixturesOut.length}`);
}

main().catch((e) => {
  console.error("❌ ", e.message);
  process.exit(1);
});
