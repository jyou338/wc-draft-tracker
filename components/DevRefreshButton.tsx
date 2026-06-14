"use client";

import { useState } from "react";

export default function DevRefreshButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [log, setLog] = useState<string>("");

  async function handleRefresh() {
    setState("loading");
    setLog("");
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setState("ok");
        setLog(json.output ?? "Done.");
        // Reload the page after a short delay so Next.js picks up the new data file
        setTimeout(() => window.location.reload(), 800);
      } else {
        setState("error");
        setLog(json.detail || json.error || "Unknown error");
      }
    } catch (e) {
      setState("error");
      setLog(String(e));
    }
  }

  return (
    <div className="dev-bar">
      <span className="dev-badge">DEV</span>
      <button
        className={`dev-refresh ${state}`}
        onClick={handleRefresh}
        disabled={state === "loading"}
      >
        {state === "loading" && "⏳ Fetching…"}
        {state === "idle"    && "↻ Refresh data"}
        {state === "ok"      && "✓ Updated — reloading…"}
        {state === "error"   && "✗ Error — see below"}
      </button>
      {log && <pre className="dev-log">{log}</pre>}
    </div>
  );
}
