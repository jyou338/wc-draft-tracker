import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { fetchFromESPN, type TournamentData } from "@/lib/espn-fetch";

export type { TournamentData };

const STALE_MS = 60_000; // 1 minute

const EMPTY: TournamentData = { results: [], fixtures: [], liveMatches: [], lastUpdated: "" };

function dataKey(d: TournamentData): string {
  return JSON.stringify({ results: d.results, fixtures: d.fixtures, liveMatches: d.liveMatches });
}

// React cache() deduplicates calls within a single render pass.
// ESPN is only fetched when Supabase data is >60s stale.
// Supabase is only written when the data actually changed.
export const getTournamentData = cache(async (): Promise<TournamentData> => {
  try {
    const { data: row } = await supabase
      .from("tournament_cache")
      .select("data, fetched_at")
      .eq("id", 1)
      .single();

    if (row) {
      const age = Date.now() - new Date(row.fetched_at as string).getTime();
      if (age < STALE_MS) return row.data as unknown as TournamentData;
    }

    const fresh = await fetchFromESPN();
    const cached = row?.data as unknown as TournamentData | undefined;
    const changed = !cached || dataKey(fresh) !== dataKey(cached);

    await supabase.from("tournament_cache").upsert({
      id: 1,
      data: changed ? fresh : row!.data,
      fetched_at: new Date().toISOString(),
    });

    return changed ? fresh : cached!;
  } catch (err) {
    console.error("getTournamentData:", err);
    return EMPTY;
  }
});
