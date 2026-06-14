// ─────────────────────────────────────────────────────────────────────────────
//  SCORING WEIGHTS  — change a number, redeploy, every total recalculates.
// ─────────────────────────────────────────────────────────────────────────────
//  Confirmed from the organiser's table:  goal = 5,  assist = 2
//  The rest are ASSUMPTIONS (no such events have happened yet). Confirm with
//  your organiser and adjust — the whole site reflows automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING = {
  goal: 5, // confirmed
  assist: 2, // confirmed
  cleanSheet: 4, // assumed
  yellowCard: -1, // assumed
  redCard: -3, // assumed
  ownGoal: -2, // assumed
} as const;

// Which weights are still guesses — used to footnote them in the UI.
export const ASSUMED: (keyof typeof SCORING)[] = [
  "cleanSheet",
  "yellowCard",
  "redCard",
  "ownGoal",
];

export const SCORING_LABELS: Record<keyof typeof SCORING, string> = {
  goal: "Goal",
  assist: "Assist",
  cleanSheet: "Clean sheet",
  yellowCard: "Yellow card",
  redCard: "Red card",
  ownGoal: "Own goal",
};
