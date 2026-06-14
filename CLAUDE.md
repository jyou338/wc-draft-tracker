# World Cup Draft Table — project notes

A standings site for a 12-manager fantasy draft built on the 2026 FIFA World Cup.
Each manager owns one nation; points come from that nation's match events. Static
Next.js so it runs free on Vercel's Hobby plan — no database, no backend.

## Stack
- Next.js 14 (App Router), React 18, TypeScript
- Plain CSS (`app/globals.css`), no Tailwind — keeps the build dependency-free
- Google Fonts (Oswald / Inter / JetBrains Mono) via a `<link>` in `app/layout.tsx`
  (loaded at runtime, so the build needs no network)
- Fully static (`○ (Static)`); no env vars

## Commands
- `pnpm install` then `pnpm dev` → http://localhost:3000
- `pnpm build` to verify before pushing
- Deploy: push to GitHub, import on Vercel (auto-detects Next.js), every push redeploys

## Where things live
- `data/tournament.ts` — THE data file. Draft picks, completed `results`, upcoming
  `fixtures`, and `lastUpdated`. This is the only file edited each round.
- `lib/scoring.ts` — point weights + which are still assumptions
- `lib/standings.ts` — computes per-manager totals and ranks from results × weights
- `components/` — `Scoreboard`, `MatchLog`, `Fixtures` (all server components)
- `app/page.tsx` — composes the page (header score bug, standings, results, fixtures, footer)

## Scoring (`lib/scoring.ts`)
- **Confirmed by the organiser:** goal **+5**, assist **+2**
- **Assumed (not yet confirmed):** clean sheet +4, yellow −1, red −3, own goal −2.
  These are flagged with `*` in the footer. Change a number, redeploy, totals recompute.

## Updating each round
1. Add a `Result` object per drafted team that played.
2. Delete that team's entry from `fixtures`.
3. Update `lastUpdated`.
4. Commit + push.

## Current state & open item (read before changing standings)
Matchday 1 data was verified against FIFA official stats, ESPN, Sofascore, CBS, Yahoo:
- Brazil 1–1 Morocco (Group C, 13 Jun) — correct. Scorers Vinícius 32', Saibari 21' — correct.
- Vinícius's assist = **Bruno Guimarães** — correct (already in data).
- **Correction applied:** Morocco's goal *was* assisted (**Brahim Díaz**). The organiser's
  table wrongly omitted it. Added → Morocco/James now 7, not 5.
- **OPEN DECISION:** Brazil picked up **2 yellow cards** (confirmed). They are NOT yet in
  the data, to avoid applying an unconfirmed penalty. Once the organiser confirms whether
  yellows count:
    - cards count (−1): add both → Brazil/Sammy drops to **5**, Morocco leads on **7**
    - cards don't count: set `yellowCard: 0` in scoring; Brazil & Morocco **tie at 7**
  The two booked Brazil players' names are still to confirm.
- All 7 upcoming fixtures match the official schedule (Norway's is officially "Iraq vs Norway").

## Conventions
- Keep it static and free — don't add a database or server unless explicitly asked.
- `data/tournament.ts` is the source of truth; never hardcode standings elsewhere.
- Manager names display in uppercase via CSS; flags are emoji on each `DraftPick`.
