// ─────────────────────────────────────────────────────────────────────────────
//  fetch-wc-data.mjs
//  Fetches live 2026 World Cup data from football-data.org and rewrites
//  data/tournament.ts so Vercel can redeploy a fresh static build.
//
//  Run locally:   FOOTBALL_DATA_KEY=xxx node scripts/fetch-wc-data.mjs
//  In CI:         the key comes from the GitHub secret FOOTBALL_DATA_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.FOOTBALL_DATA_KEY;
if (!API_KEY) {
  console.error("❌  FOOTBALL_DATA_KEY env var is not set.");
  process.exit(1);
}

const BASE = "https://api.football-data.org/v4";

// Our 12 drafted teams. Must match how football-data.org spells team names.
// See TEAM_NAME_MAP below for any mismatches.
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

// Draft picks — owner + flag. Never changes mid-tournament.
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

// Map football-data.org team names → our names if they differ.
const API_TO_OUR_NAME = {
  // e.g. "Korea Republic": "South Korea"
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} for ${path}: ${text}`);
  }
  return res.json();
}

function normalise(apiName) {
  return API_TO_OUR_NAME[apiName] ?? apiName;
}

function isDrafted(apiTeamName) {
  return DRAFTED_TEAMS.includes(normalise(apiTeamName));
}

// "GROUP_STAGE" + matchday 1 → 1, "ROUND_OF_16" → 5, etc.
function stageToMatchday(stage, matchday) {
  if (stage === "GROUP_STAGE") return matchday ?? 1;
  const map = {
    ROUND_OF_32: 4,
    ROUND_OF_16: 5,
    QUARTER_FINALS: 6,
    SEMI_FINALS: 7,
    THIRD_PLACE: 8,
    FINAL: 9,
  };
  return map[stage] ?? 99;
}

function fmtKickoff(utcDate) {
  if (!utcDate) return undefined;
  const d = new Date(utcDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${hh}:${mm} UTC`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching WC 2026 matches from football-data.org…");

  // All matches for the 2026 World Cup
  const data = await apiGet("/competitions/WC/matches?season=2026");
  const allMatches = data.matches ?? [];
  console.log(`  Total matches: ${allMatches.length}`);

  const finished = allMatches.filter((m) => m.status === "FINISHED");
  const upcoming = allMatches.filter((m) =>
    ["SCHEDULED", "TIMED"].includes(m.status)
  );

  console.log(`  Finished: ${finished.length}, Upcoming: ${upcoming.length}`);

  // ── Results ───────────────────────────────────────────────────────────────

  const relevantFinished = finished.filter(
    (m) => isDrafted(m.homeTeam.name) || isDrafted(m.awayTeam.name)
  );
  console.log(`  Relevant finished: ${relevantFinished.length}`);

  // football-data.org includes goals + bookings inline on each match object.
  // We need per-match detail for scorers — fetch each individually.
  const results = [];

  for (const m of relevantFinished) {
    const detail = await apiGet(`/matches/${m.id}`);
    const homeApi = detail.homeTeam.name;
    const awayApi = detail.awayTeam.name;
    const home = normalise(homeApi);
    const away = normalise(awayApi);
    const homeScore = detail.score.fullTime.home ?? 0;
    const awayScore = detail.score.fullTime.away ?? 0;
    const matchday = stageToMatchday(detail.stage, detail.matchday);

    const goals = detail.goals ?? [];
    const bookings = detail.bookings ?? [];

    function buildResult(ourTeam, opponentTeam, scoreFor, scoreAgainst) {
      const ourGoals = [];
      const ourAssists = [];
      const ourYellows = [];
      const ourReds = [];
      const ourOwnGoals = [];

      for (const g of goals) {
        const scorerTeam = normalise(g.team?.name ?? "");
        if (g.type === "OWN_GOAL") {
          // Own goal: the team listed is the one who scored it against themselves
          if (scorerTeam === ourTeam) {
            ourOwnGoals.push(g.scorer?.name ?? "Unknown");
          } else {
            // Opponent own goal = free goal for us, no scorer to log
          }
        } else {
          if (scorerTeam === ourTeam) {
            ourGoals.push(g.scorer?.name ?? "Unknown");
            if (g.assist?.name) ourAssists.push(g.assist.name);
          }
        }
      }

      for (const b of bookings) {
        const bookedTeam = normalise(b.team?.name ?? "");
        if (bookedTeam === ourTeam) {
          if (b.card === "YELLOW_CARD") ourYellows.push(b.player?.name ?? "Unknown");
          if (b.card === "RED_CARD" || b.card === "YELLOW_RED_CARD")
            ourReds.push(b.player?.name ?? "Unknown");
        }
      }

      const cleanSheet = scoreAgainst === 0;

      return {
        matchday,
        team: ourTeam,
        opponent: opponentTeam,
        scoreFor,
        scoreAgainst,
        goals: ourGoals,
        assists: ourAssists,
        cleanSheet,
        yellowCards: ourYellows,
        redCards: ourReds,
        ownGoals: ourOwnGoals,
      };
    }

    if (isDrafted(homeApi)) results.push(buildResult(home, away, homeScore, awayScore));
    if (isDrafted(awayApi)) results.push(buildResult(away, home, awayScore, homeScore));
  }

  // ── Fixtures ──────────────────────────────────────────────────────────────

  const relevantUpcoming = upcoming.filter(
    (m) => isDrafted(m.homeTeam.name) || isDrafted(m.awayTeam.name)
  );

  const fixturesOut = [];

  for (const m of relevantUpcoming) {
    const home = normalise(m.homeTeam.name);
    const away = normalise(m.awayTeam.name);
    const matchday = stageToMatchday(m.stage, m.matchday);
    const kickoff = fmtKickoff(m.utcDate);

    if (isDrafted(m.homeTeam.name))
      fixturesOut.push({ matchday, team: home, opponent: away, kickoff });
    if (isDrafted(m.awayTeam.name))
      fixturesOut.push({ matchday, team: away, opponent: home, kickoff });
  }

  fixturesOut.sort((a, b) => a.matchday - b.matchday || a.team.localeCompare(b.team));

  // ── Generate tournament.ts ────────────────────────────────────────────────

  const now = new Date().toISOString().slice(0, 10);

  const draftTs = DRAFT.map(
    (p) =>
      `  { team: ${JSON.stringify(p.team)}, owner: ${JSON.stringify(p.owner)}, flag: ${JSON.stringify(p.flag)} },`
  ).join("\n");

  function resultToTs(r) {
    return [
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
    ].join("\n");
  }

  function fixtureToTs(f) {
    const kickoffPart = f.kickoff ? `, kickoff: ${JSON.stringify(f.kickoff)}` : "";
    return `  { matchday: ${f.matchday}, team: ${JSON.stringify(f.team)}, opponent: ${JSON.stringify(f.opponent)}${kickoffPart} },`;
  }

  const output = `// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GENERATED by scripts/fetch-wc-data.mjs — do not edit by hand.
//  Last fetched: ${now}
//  Source: football-data.org /competitions/WC
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
${results.map(resultToTs).join("\n")}
];

export interface Fixture {
  matchday: number;
  team: string;
  opponent: string;
  kickoff?: string;
}

export const fixtures: Fixture[] = [
${fixturesOut.map(fixtureToTs).join("\n")}
];

export const lastUpdated = "Auto-updated ${now} via football-data.org";
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
