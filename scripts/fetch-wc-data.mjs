// ─────────────────────────────────────────────────────────────────────────────
//  fetch-wc-data.mjs
//  Fetches 2026 World Cup data from ESPN's public API and upserts it to
//  Supabase so the site picks it up on the next page load.
//
//  Run locally:
//    node --env-file=.env.local scripts/fetch-wc-data.mjs
//
//  Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//  No other API key required.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("    Run with: node --env-file=.env.local scripts/fetch-wc-data.mjs");
  process.exit(1);
}

async function supabaseUpsert(payload) {
  const res = await fetch(`${supabaseUrl}/rest/v1/tournament_cache`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id: 1, data: payload, fetched_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
}

const DRAFTED_TEAMS = [
  "Brazil", "Morocco", "Spain", "France", "England", "Portugal",
  "Argentina", "Germany", "Netherlands", "Belgium", "Norway", "Colombia",
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

// Per-team shootout kicks come only from the summary endpoint — the scoreboard
// feed exposes the tally (shootoutScore) but not the individual misses.
// Returns a map of ESPN team displayName → ordered kicks [{ player, scored }].
async function fetchShootoutKicks(eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return {};
  const data = await res.json();
  const byTeam = {};
  for (const entry of data.shootout ?? []) {
    if (!entry.team) continue;
    byTeam[entry.team] = (entry.shots ?? []).map(shot => ({
      player: shot.player ?? "Unknown",
      scored: shot.didScore === true,
    }));
  }
  return byTeam;
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

  const allDates = [...dateRange("2026-06-11", "2026-07-19")];
  const BATCH = 10;
  const seenIds = new Set();
  const allEvents = [];

  for (let i = 0; i < allDates.length; i += BATCH) {
    const batch = allDates.slice(i, i + BATCH);
    const pages = await Promise.all(batch.map(fetchScoreboard));
    for (const data of pages) {
      for (const event of data.events ?? []) {
        if (!seenIds.has(event.id)) {
          seenIds.add(event.id);
          allEvents.push(event);
        }
      }
    }
  }

  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log(`  Unique events: ${allEvents.length}`);

  const results = [];
  const fixturesOut = [];
  const liveMatches = [];
  const teamCompletedCount = {};
  const teamFixtureCount = {};

  for (const event of allEvents) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const competitors = competition.competitors ?? [];
    const details = competition.details ?? [];
    const isCompleted = competition.status?.type?.completed === true;
    const isLive = competition.status?.type?.state === "in";
    const isGroupStage = (event.season?.slug ?? "") === "group-stage";

    const draftedComps = competitors.filter(c => isDrafted(c.team.displayName));
    if (draftedComps.length === 0) continue;

    // A completed match with a shootoutScore was decided on penalties — pull the
    // per-kick breakdown once for the whole event (rare, so the extra call is cheap).
    const wentToShootout =
      isCompleted &&
      competitors.some(c => c.shootoutScore !== undefined && c.shootoutScore !== null && c.shootoutScore !== "");
    const shootoutKicks = wentToShootout ? await fetchShootoutKicks(event.id) : {};

    for (const comp of draftedComps) {
      const ourName = normalise(comp.team.displayName);
      const opponentComp = competitors.find(c => c !== comp);
      const opponentName = opponentComp ? normalise(opponentComp.team.displayName) : "Unknown";
      const opponentId = opponentComp?.id;

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
          const player = detail.athletesInvolved?.[0]?.displayName ?? "Unknown";

          // Shootout kicks also carry scoringPlay=true; they're scored separately
          // (see shootout field below), so exclude them from open-play goals.
          if (detail.shootout) continue;

          if (detail.ownGoal) {
            if (detail.team?.id === opponentId) ownGoals.push(player);
            else if (detail.team?.id === ourTeamId) goals.push(`OG (${player})`);
          } else if (detail.team?.id === ourTeamId) {
            if (detail.scoringPlay) goals.push(player);
            else if (detail.redCard) redCards.push(player);
            else if (detail.yellowCard) yellowCards.push(player);
          }
        }

        const assistStat = comp.statistics?.find(s => s.name === "goalAssists");
        const assists = parseInt(assistStat?.displayValue ?? "0");

        const ourKicks = shootoutKicks[comp.team.displayName];
        const shootout = ourKicks
          ? {
              scoreFor: parseInt(comp.shootoutScore ?? "0"),
              scoreAgainst: parseInt(opponentComp?.shootoutScore ?? "0"),
              won: comp.winner === true,
              kicks: ourKicks,
            }
          : undefined;

        results.push({
          matchday, team: ourName, opponent: opponentName,
          scoreFor, scoreAgainst, goals, assists,
          cleanSheet: scoreAgainst === 0,
          yellowCards, redCards, ownGoals,
          ...(shootout ? { shootout } : {}),
        });
      } else if (isLive) {
        teamCompletedCount[ourName] = (teamCompletedCount[ourName] ?? 0) + 1;
        liveMatches.push({
          team: ourName, opponent: opponentName,
          scoreFor: parseInt(comp.score ?? "0"),
          scoreAgainst: parseInt(opponentComp?.score ?? "0"),
          minute: competition.status?.displayClock ?? "",
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
          matchday, team: ourName, opponent: opponentName,
          kickoff: fmtKickoff(event.date),
          kickoffISO: event.date ?? undefined,
        });
      }
    }
  }

  fixturesOut.sort((a, b) => {
    if (a.matchday !== b.matchday) return a.matchday - b.matchday;
    if (a.kickoffISO && b.kickoffISO) return new Date(a.kickoffISO) - new Date(b.kickoffISO);
    return (a.kickoff ?? "").localeCompare(b.kickoff ?? "");
  });

  console.log(`  Results: ${results.length}, Fixtures: ${fixturesOut.length}, Live: ${liveMatches.length}`);

  const nowDateTime = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const payload = { results, fixtures: fixturesOut, liveMatches, lastUpdated: nowDateTime };

  await supabaseUpsert(payload);
  console.log(`✅  Supabase updated (${nowDateTime})`);
}

main().catch(e => {
  console.error("❌ ", e.message);
  process.exit(1);
});
