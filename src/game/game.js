import { clamp } from "../util/format.js";
import { createRng } from "../util/rng.js";
import { attachInput } from "./input.js";
import { createField } from "./field.js";
import { createRunSummary } from "./runSummary.js";
import { createRuleEngine } from "./rules/engine.js";
import { createAlternateAxisRule, createAxisBalanceRule, createMomentumRule, createNoImmediateReversalRule } from "./rules/movement.js";
import { createAvoidEdgesRule, createBoundaryRule } from "./rules/spatial.js";
import { createLocalDensityAxisRule, createParityConstraintRule } from "./rules/orbs.js";
import { RULE_DOCS } from "./rules/registry.js";
import { createNoShortCycleRule } from "./rules/antiLoop.js";

const DIRS = /** @type {const} */ (["up", "down", "left", "right"]);

export function createGame({ canvas, hud, activeRulesEl, rulebookEl, onRunEnd }) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  let rafId = null;
  let lastFrameTs = 0;
  let didRenderRulebook = false;

  const state = {
    seed: 0,
    rng: null,
    rulesRng: null,
    startedAt: 0,
    endedAt: 0,
    running: false,
    width: 0,
    height: 0,
    stage: 0,
    tension: 0,
    maxTension: 0,
    lastTensionDelta: 0,
    hintPenaltyMovesRemaining: 0,
    lastMove: null,
    lastAttempt: null,
    orbParityRadius: 140,
    player: {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      speed: 12,
      radius: 10,
    },
    moves: [],
    validMoves: 0,
    invalidMoves: 0,
    stability: 8,
    score: 0,
    accepted: [],
    trail: [],
    field: null,
    shakeMs: 0,
    bloom: 0,
    engine: null,
    rulesPlan: null,
    lastFail: null,
    endReason: null,
  };

  function stepSizeForStage(stage, tension) {
    const stageComponent = 54 - Math.min(18, stage) * 2;
    const tensionComponent = 26 * clamp(tension, 0, 1);
    return Math.round(clamp(stageComponent - tensionComponent, 26, 60));
  }

  function projectMove(dir) {
    const step = stepSizeForStage(state.stage, state.tension);
    let nx = state.player.tx;
    let ny = state.player.ty;
    if (dir === "up") ny -= step;
    if (dir === "down") ny += step;
    if (dir === "left") nx -= step;
    if (dir === "right") nx += step;
    return { x: nx, y: ny };
  }

  function buildRulesPlan() {
    const rng = state.rulesRng ?? state.rng;
    const orbParityRadius = rng?.pick?.([140, 170]) ?? 140;
    state.orbParityRadius = orbParityRadius;
    const candidates = [
      { id: "alternate_axis", rule: createAlternateAxisRule() },
      { id: "no_reversal", rule: createNoImmediateReversalRule() },
      {
        id: "momentum",
        rule: createMomentumRule({ maxRepeat: rng?.pick?.([2, 2, 3]) ?? 2 }),
      },
      {
        id: "axis_balance",
        rule: createAxisBalanceRule({
          window: rng?.pick?.([6, 7, 8]) ?? 7,
          maxDelta: rng?.pick?.([1, 2]) ?? 2,
        }),
      },
      {
        id: "avoid_edges",
        rule: createAvoidEdgesRule({ minEdge: rng?.pick?.([50, 60, 70]) ?? 60 }),
      },
      {
        id: "local_density_axis",
        rule: createLocalDensityAxisRule({
          radius: rng?.pick?.([110, 130, 150]) ?? 130,
          threshold: rng?.pick?.([6, 7, 8]) ?? 7,
          forbidAxis: rng?.pick?.(["h", "v"]) ?? "h",
        }),
      },
      {
        id: "orb_parity",
        rule: createParityConstraintRule({
          radius: orbParityRadius,
        }),
      },
    ];

    // Deterministic shuffle via RNG
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.nextFloat() * (i + 1));
      const t = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = t;
    }

    return candidates;
  }

  function engineForStage(stage) {
    const baseRules = [createBoundaryRule({ margin: 26 }), createNoShortCycleRule({ period: 4 })];
    const picks = state.rulesPlan ?? [];

    const maxExtraRules = Math.min(picks.length, Math.max(0, stage));
    for (let i = 0; i < maxExtraRules; i += 1) baseRules.push(picks[i].rule);

    // Tighten edge rule slightly as stage grows if it is present.
    const hasAvoidEdges = baseRules.some((r) => r.id === "avoid_edges");
    if (!hasAvoidEdges && stage >= 3) baseRules.push(createAvoidEdgesRule({ minEdge: 80 }));

    return createRuleEngine(baseRules);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    state.width = canvas.width;
    state.height = canvas.height;
  }

  function restart() {
    const now = performance.now();
    state.seed = (Math.random() * 2 ** 32) >>> 0;
    state.rng = createRng(state.seed);
    state.rulesRng = createRng((state.seed ^ 0xa53a9e37) >>> 0);
    state.startedAt = now;
    state.endedAt = 0;
    state.running = true;
    state.stage = 0;
    state.tension = 0;
    state.maxTension = 0;
    state.lastTensionDelta = 0;
    state.hintPenaltyMovesRemaining = 0;
    state.lastMove = null;
    state.lastAttempt = null;
    state.moves = [];
    state.validMoves = 0;
    state.invalidMoves = 0;
    state.stability = 8;
    state.score = 0;
    state.accepted = [];
    state.trail = [];
    state.shakeMs = 0;
    state.bloom = 0;
    state.lastFail = null;
    state.endReason = null;

    state.player.x = state.width * 0.5;
    state.player.y = state.height * 0.5;
    state.player.tx = state.player.x;
    state.player.ty = state.player.y;
    state.trail = [{ x: Math.round(state.player.tx), y: Math.round(state.player.ty) }];

    state.field = createField({ rng: state.rng, width: state.width, height: state.height });
    state.rulesPlan = buildRulesPlan();
    state.engine = engineForStage(state.stage);
    draw(0);
  }

  function stop(reason) {
    if (!state.running) return;
    state.running = false;
    state.endedAt = performance.now();
    state.endReason = reason ?? state.endReason ?? "stability";
    onRunEnd?.(createRunSummary(state));
  }

  function validateMove(dir) {
    const next = projectMove(dir);
    const engine = state.engine ?? engineForStage(state.stage);
    const res = engine.validate({
      dir,
      from: { x: state.player.tx, y: state.player.ty },
      to: next,
      nowMs: performance.now(),
      startedAtMs: state.startedAt,
      accepted: state.accepted,
      stage: state.stage,
      width: state.width,
      height: state.height,
      field: state.field,
      moveIndex: state.accepted.length + 1,
      trail: state.trail,
    });

    if (!res.ok) return { ok: false, reason: res.id, label: res.label, next };
    return { ok: true, next };
  }

  function attemptMove(dir) {
    if (!state.running) return;

    const ts = performance.now();
    const result = validateMove(dir);
    state.moves.push({ t: Math.round(ts - state.startedAt), dir, ok: result.ok ? 1 : 0 });
    state.lastAttempt = {
      dir,
      ok: result.ok ? 1 : 0,
      reason: result.ok ? null : result.reason,
      label: result.ok ? null : result.label,
    };

    if (!result.ok) {
      state.invalidMoves += 1;
      state.stability -= 1;
      state.shakeMs = 140;
      state.lastFail = result.reason;
      const delta = 0.045 + state.tension * 0.02;
      state.tension = clamp(state.tension + delta, 0, 1);
      state.lastTensionDelta = delta;
      if (state.stability <= 0) stop("stability");
      return;
    }

    state.validMoves += 1;
    state.lastFail = null;
    if (state.hintPenaltyMovesRemaining > 0) {
      state.hintPenaltyMovesRemaining -= 1;
      state.lastTensionDelta = 0;
      state.tension = 1;
    } else {
      state.lastTensionDelta = -0.012;
      state.tension = clamp(state.tension - 0.012, 0, 1);
    }
    state.score += 10 + Math.floor(state.bloom * 30);
    state.player.tx = result.next.x;
    state.player.ty = result.next.y;
    state.accepted.push({ t: Math.round(ts - state.startedAt), dir });
    state.lastMove = dir;
    state.trail.push({ x: Math.round(state.player.tx), y: Math.round(state.player.ty) });
    if (state.trail.length > 96) state.trail.splice(0, state.trail.length - 96);

    const maxStage = state.rulesPlan?.length ?? 6;
    const nextStage = Math.min(maxStage, Math.floor(state.validMoves / 10));
    if (nextStage !== state.stage) {
      state.stage = nextStage;
      state.engine = engineForStage(state.stage);
    }

    if (!hasAnyValidMove()) stop("dead_end");
  }

  function hasAnyValidMove() {
    for (const dir of DIRS) {
      const res = validateMove(dir);
      if (res.ok) return true;
    }
    return false;
  }

  function update(dtMs) {
    if (state.running) {
      const passiveDelta = dtMs * 0.0000012;
      state.tension = clamp(state.tension + passiveDelta, 0, 1);
      if (state.hintPenaltyMovesRemaining > 0) state.tension = 1;
      state.maxTension = Math.max(state.maxTension, state.tension);
    } else {
      state.lastTensionDelta = 0;
    }

    const p = state.player;
    const t = clamp(dtMs / 16.67, 0.2, 2);
    p.x += (p.tx - p.x) * 0.22 * t;
    p.y += (p.ty - p.y) * 0.22 * t;

    state.shakeMs = Math.max(0, state.shakeMs - dtMs);
    state.bloom = clamp(0.35 * (state.validMoves / 50) + 0.65 * state.tension, 0, 1);
    state.field.update(dtMs, state.bloom, state.tension);
  }

  function draw(dtMs) {
    const bloom = state.bloom;
    const base = 14 + Math.floor(bloom * 30);
    const bg = `rgb(${base}, ${base + 2}, ${base + 6})`;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    const shake = state.shakeMs > 0 ? (state.shakeMs / 140) ** 2 * 7 : 0;
    if (shake > 0) {
      const dx = (state.rng.nextFloat() - 0.5) * shake;
      const dy = (state.rng.nextFloat() - 0.5) * shake;
      ctx.translate(dx, dy);
    }

    state.field.draw(ctx, bloom);

    const p = state.player;
    const glow = 0.25 + bloom * 0.75;
    ctx.fillStyle = `rgba(${Math.floor(84 + bloom * 40)}, ${Math.floor(240 - bloom * 40)}, ${Math.floor(
      195 + bloom * 40,
    )}, ${0.9})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(124, 240, 255, ${glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 5 + bloom * 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    const elapsed = Math.round((performance.now() - state.startedAt) | 0);
    const local = state.field?.statsNear?.(state.player.tx, state.player.ty, 130);
    const parityLocal = state.field?.parityAt?.(state.player.tx, state.player.ty, state.orbParityRadius, 5);
    const step = stepSizeForStage(state.stage, state.tension);
    const lastMoveLabel = state.lastMove ? state.lastMove.toUpperCase() : "-";
    const lastAttemptLabel = state.lastAttempt
      ? `${state.lastAttempt.dir.toUpperCase()}${
          state.lastAttempt.ok ? " ✓" : ` ✗(${state.lastAttempt.label ?? state.lastAttempt.reason})`
        }`
      : "-";
    hud.textContent = [
      `seed: ${state.seed}`,
      `stage: ${state.stage}`,
      `score: ${state.score}`,
      `tension: ${state.tension.toFixed(3)} (max ${state.maxTension.toFixed(3)})`,
      `step: ${step}px${state.lastTensionDelta ? `  Δtension: ${state.lastTensionDelta > 0 ? "+" : ""}${state.lastTensionDelta.toFixed(3)}` : ""}`,
      `last move: ${lastMoveLabel}`,
      `last input: ${lastAttemptLabel}`,
      state.hintPenaltyMovesRemaining > 0 ? `hint penalty: ${state.hintPenaltyMovesRemaining} moves` : `hint penalty: -`,
      `stability: ${"▮".repeat(Math.max(0, state.stability))}${"▯".repeat(8 - Math.max(0, state.stability))}`,
      `valid/invalid: ${state.validMoves}/${state.invalidMoves}`,
      `time: ${(elapsed / 1000).toFixed(2)}s`,
      local ? `orbs@130: ${local.count} phase:${local.dominantPhase}` : `orbs@130: -`,
      parityLocal
        ? `parity@${state.orbParityRadius}: ${(parityLocal.paritySumNearest & 1) ? "odd" : "even"} (dots ${
            parityLocal.paritySumNearest
          }/${parityLocal.nearestUsed})`
        : `parity@${state.orbParityRadius}: -`,
      state.lastFail ? `last fail: ${state.lastFail}` : `last fail: -`,
      `input: arrows or swipes`,
    ].join("\n");

    if (activeRulesEl) {
      const active = state.engine?.list?.() ?? [];
      activeRulesEl.textContent = active.length ? active.map((r, idx) => `${idx + 1}. ${r.label}`).join("\n") : "(none)";
    }

    if (rulebookEl && !didRenderRulebook) {
      didRenderRulebook = true;
      rulebookEl.textContent = RULE_DOCS.map((doc) => `${doc.label}\n  - ${doc.description}`).join("\n");
    }
  }

  function frame(ts) {
    if (!lastFrameTs) lastFrameTs = ts;
    const dt = ts - lastFrameTs;
    lastFrameTs = ts;
    update(dt);
    draw(dt);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    resize();
    window.addEventListener("resize", () => {
      resize();
      restart();
    });

    attachInput({ canvas, onDirection: attemptMove, enabled: () => state.running });

    restart();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start,
    restart,
    stop,
    requestHint() {
      if (!state.running) return null;
      const prev = state.tension;
      state.hintPenaltyMovesRemaining = 3;
      state.tension = 1;
      state.maxTension = Math.max(state.maxTension, state.tension);
      state.lastTensionDelta = 1 - prev;
      const ok = [];
      for (const dir of DIRS) {
        const res = validateMove(dir);
        if (!res.ok) continue;
        const parity = state.field?.parityAt?.(res.next.x, res.next.y, state.orbParityRadius, 5);
        ok.push({
          dir,
          dots: parity ? parity.paritySumNearest : null,
          nearest: parity ? parity.nearestUsed : null,
        });
      }
      return { directions: ok, penaltyMoves: 3 };
    },
    getState: () => state,
  };
}
