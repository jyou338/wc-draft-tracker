// ─────────────────────────────────────────────────────────────────────────────
//  fetch-wc-data.mjs
//  Fetches 2026 World Cup data from ESPN's public API and rewrites
//  data/tournament.ts so Vercel can redeploy a fresh static build.
//
//  Run locally:   node scripts/fetch-wc-data.mjs
//  No API key required.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DRAFTED_TEAMS = [
  "Brazil", "Morocco", "Spain", "France", "England", "Portugal",
  "Argentina", "Germany", "Netherlands", "Belgium", "Norway", "Colombia",
];

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

// ESPN displayName → our name if they differ
const ESPN_TO_OUR_NAME = {};

function normalise(espnName) {
  return ESPN_TO_OUR_NAME[espnName] ?? espnName;
}

function isDrafted(name) {
  return DRAFTED_TEAMS.includes(normalise(name));
}

function* dateRange(startIso, endIso) {
  const cur = new Date(startIso);
  const end = new Date(endIso);
  while (cur <= end) {
    yield cur.toISOString().slice(0, 10).replace(/-/g, "");
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

function fmtKickoff(utcDate) {
  if (!utcDate) return undefined;
  const d = new Date(utcDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${hh}:${mm} UTC`;
}

async function fetchScoreboard(dateStr) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const KNOCKOUT_MATCHDAY = {
  "round-of-32": 4,
  "round-of-16": 5,
  "quarter-finals": 6,
  "semi-finals": 7,
  "third-place": 8,
  "final": 9,
};

async function main() {
  console.log("Fetching WC 2026 data from ESPN…");

  const seenIds = new Set();
  const allEvents = [];

  for (const dateStr of dateRange("2026-06-11", "2026-07-19")) {
    const data = await fetchScoreboard(dateStr);
    for (const event of data.events ?? []) {
      if (!seenIds.has(event.id)) {
        seenIds.add(event.id);
        allEvents.push(event);
      }
    }
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log(`  Unique events: ${allEvents.length}`);

  const results = [];
  const fixturesOut = [];
  // Track group-stage games per team to assign matchday 1/2/3
  const teamCompletedCount = {};
  const teamFixtureCount = {};

  for (const event of allEvents) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const competitors = competition.competitors ?? [];
    const details = competition.details ?? [];
    const isCompleted = competition.status?.type?.completed === true;
    const isGroupStage = (event.season?.slug ?? "") === "group-stage";

    const draftedComps = competitors.filter(c => isDrafted(c.team.displayName));
    if (draftedComps.length === 0) continue;

    for (const comp of draftedComps) {
      const ourName = normalise(comp.team.displayName);
      const opponentComp = competitors.find(c => c !== comp);
      const opponentName = opponentComp ? normalise(opponentComp.team.displayName) : "Unknown";

      if (isCompleted) {
        let matchday;
        if (isGroupStage) {
          teamCompletedCount[ourName] = (teamCompletedCount[ourName] ?? 0) + 1;
          matchday = teamCompletedCount[ourName];
        } else {
          matchday = KNOCKOUT_MATCHDAY[event.season?.slug] ?? 99;
        }

        const scoreFor = parseInt(comp.score ?? "0");
        const scoreAgainst = parseInt(opponentComp?.score ?? "0");
        const ourTeamId = comp.id;

        const goals = [];
        const yellowCards = [];
        const redCards = [];
        const ownGoals = [];

        for (const detail of details) {
          const isOurTeam = detail.team?.id === ourTeamId;
          if (!isOurTeam) continue;
          const player = detail.athletesInvolved?.[0]?.displayName ?? "Unknown";

          if (detail.ownGoal) {
            ownGoals.push(player);
          } else if (detail.scoringPlay) {
            goals.push(player);
          } else if (detail.redCard) {
            redCards.push(player);
          } else if (detail.yellowCard) {
            yellowCards.push(player);
          }
        }

        const assistStat = comp.statistics?.find(s => s.name === "goalAssists");
        const assists = parseInt(assistStat?.displayValue ?? "0");

        results.push({
          matchday,
          team: ourName,
          opponent: opponentName,
          scoreFor,
          scoreAgainst,
          goals,
          assists,
          cleanSheet: scoreAgainst === 0,
          yellowCards,
          redCards,
          ownGoals,
        });
      } else {
        let matchday;
        if (isGroupStage) {
          const played = teamCompletedCount[ourName] ?? 0;
          const fixtured = teamFixtureCount[ourName] ?? 0;
          teamFixtureCount[ourName] = fixtured + 1;
          matchday = played + fixtured + 1;
        } else {
          matchday = KNOCKOUT_MATCHDAY[event.season?.slug] ?? 99;
        }

        fixturesOut.push({
          matchday,
          team: ourName,
          opponent: opponentName,
          kickoff: fmtKickoff(event.date),
        });
      }
    }
  }

  fixturesOut.sort((a, b) => a.matchday - b.matchday || a.team.localeCompare(b.team));

  console.log(`  Results: ${results.length}, Fixtures: ${fixturesOut.length}`);

  // ── Generate tournament.ts ─────────────────────────────────────────────────

  const now = new Date().toISOString().slice(0, 10);

  const draftTs = DRAFT.map(
    p => `  { team: ${JSON.stringify(p.team)}, owner: ${JSON.stringify(p.owner)}, flag: ${JSON.stringify(p.flag)} },`
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
      `    assists: ${r.assists},`,
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
//  Source: ESPN public API
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
  assists: number;
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

export const lastUpdated = "Auto-updated ${now} via ESPN";
`;

  const outPath = join(ROOT, "data", "tournament.ts");
  writeFileSync(outPath, output, "utf8");
  console.log(`✅  Written to ${outPath}`);
}

main().catch(e => {
  console.error("❌ ", e.message);
  process.exit(1);
});
