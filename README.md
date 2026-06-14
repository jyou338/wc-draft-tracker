# World Cup Draft Table

A standings site for a 12-manager World Cup fantasy draft. Static Next.js (App
Router) — perfect for the free Vercel Hobby plan. No database; you edit one data
file and push.

## Run locally

```bash
pnpm install     # or npm install
pnpm dev         # http://localhost:3000
```

## Deploy free on Vercel (Hobby)

1. Push this folder to a new GitHub repo.
2. Go to vercel.com → **Add New… → Project** → import the repo.
3. Framework preset auto-detects **Next.js**. Leave everything default.
4. **Deploy.** You get a free `*.vercel.app` URL. Every `git push` redeploys.

There's nothing to configure — no env vars, no database.

## Updating after each round

Edit **`data/tournament.ts`** only:

1. Add a `Result` object for each drafted team that played.
2. Delete the matching entry from `fixtures`.
3. Update `lastUpdated`.
4. `git commit && git push` — Vercel redeploys in ~30s.

Example result:

```ts
{
  matchday: 1,
  team: "Germany",
  opponent: "Curaçao",
  scoreFor: 3, scoreAgainst: 0,
  goals: ["Musiala", "Wirtz", "Havertz"],
  assists: ["Kimmich"],
  cleanSheet: true,
  yellowCards: [], redCards: [], ownGoals: [],
}
```

## Scoring

`lib/scoring.ts` holds the weights. **Goal +5** and **assist +2** are confirmed.
Clean sheet, cards and own goals are **assumptions** (flagged with `*` on the
site) — change the numbers once your organiser confirms them and the whole table
recalculates.
