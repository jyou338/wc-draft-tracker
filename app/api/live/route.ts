import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { LiveMatchDetail } from "@/data/tournament";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: row } = await supabase
      .from("tournament_cache")
      .select("data")
      .eq("id", 1)
      .single();

    const liveMatches: LiveMatchDetail[] = (row?.data as { liveMatches?: LiveMatchDetail[] })?.liveMatches ?? [];
    return NextResponse.json({ liveMatches });
  } catch {
    return NextResponse.json({ liveMatches: [] });
  }
}
