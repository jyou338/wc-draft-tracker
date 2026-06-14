import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const res = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
    { headers: { "Accept": "application/json" } }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
