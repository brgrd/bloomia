import { sha256Hex } from "../util/hash.js";

export function createRunSummary(state) {
  const durationMs = Math.max(0, Math.round((state.endedAt || performance.now()) - state.startedAt));
  const accuracy =
    state.validMoves + state.invalidMoves > 0 ? state.validMoves / (state.validMoves + state.invalidMoves) : 0;

  const engineRules = state.engine?.list?.() ?? [];
  const rulesPlanIds = Array.isArray(state.rulesPlan) ? state.rulesPlan.map((r) => r.id) : [];

  const digestSource = JSON.stringify({
    seed: state.seed,
    rules: rulesPlanIds,
    moves: state.moves,
  });

  return {
    seed: state.seed,
    score: state.score,
    durationMs,
    moves: state.validMoves + state.invalidMoves,
    validMoves: state.validMoves,
    invalidMoves: state.invalidMoves,
    accuracy,
    stage: state.stage,
    maxTension: state.maxTension ?? 0,
    endReason: state.endReason ?? "unknown",
    activeRules: engineRules,
    runHashPromise: sha256Hex(digestSource),
  };
}
