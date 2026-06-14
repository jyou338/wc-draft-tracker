import { execSync } from "child_process";
import { NextResponse } from "next/server";
import path from "path";

// Only available in development — returns 403 in production
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const scriptPath = path.join(process.cwd(), "scripts", "fetch-wc-data.mjs");
    const output = execSync(`node ${scriptPath}`, {
      env: { ...process.env },
      timeout: 30_000,
    }).toString();

    return NextResponse.json({ ok: true, output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? "";
    return NextResponse.json({ ok: false, error: message, detail: stderr }, { status: 500 });
  }
}
