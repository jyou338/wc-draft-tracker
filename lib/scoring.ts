// ─────────────────────────────────────────────────────────────────────────────
//  SCORING WEIGHTS  — change a number, redeploy, every total recalculates.
// ─────────────────────────────────────────────────────────────────────────────
//  All confirmed by the organiser.
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING = {
  goal: 5,
  assist: 2,
  cleanSheet: 3,
  yellowCard: -1,
  redCard: -5,
  ownGoal: -10,
  shootoutGoal: 5,
  shootoutMiss: -5,
} as const;

// Which weights are still guesses — used to footnote them in the UI.
export const ASSUMED: (keyof typeof SCORING)[] = [];

export const SCORING_LABELS: Record<keyof typeof SCORING, string> = {
  goal: "Goal",
  assist: "Assist",
  cleanSheet: "Clean sheet",
  yellowCard: "Yellow card",
  redCard: "Red card",
  ownGoal: "Own goal",
  shootoutGoal: "Shootout goal",
  shootoutMiss: "Shootout miss",
};
