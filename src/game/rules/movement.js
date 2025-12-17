/**
 * @typedef {"up"|"down"|"left"|"right"} Direction
 */

function axisOf(dir) {
  return dir === "left" || dir === "right" ? "h" : "v";
}

function oppositeOf(dir) {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  return "left";
}

export function createAlternateAxisRule() {
  return {
    id: "alternate_axis",
    label: "alternate axis",
    check(ctx) {
      const last = ctx.accepted[ctx.accepted.length - 1];
      if (!last) return { ok: true };
      if (axisOf(last.dir) === axisOf(ctx.dir)) return { ok: false, id: "alternate_axis", label: "alternate axis" };
      return { ok: true };
    },
  };
}

export function createNoImmediateReversalRule() {
  return {
    id: "no_reversal",
    label: "no immediate reversal",
    check(ctx) {
      const last = ctx.accepted[ctx.accepted.length - 1];
      if (!last) return { ok: true };
      if (oppositeOf(last.dir) === ctx.dir) return { ok: false, id: "no_reversal", label: "no immediate reversal" };
      return { ok: true };
    },
  };
}

export function createMomentumRule({ maxRepeat }) {
  return {
    id: "momentum",
    label: `momentum (max ${maxRepeat} repeats)`,
    check(ctx) {
      if (maxRepeat <= 0) return { ok: true };
      let streak = 0;
      for (let i = ctx.accepted.length - 1; i >= 0; i -= 1) {
        if (ctx.accepted[i].dir !== ctx.dir) break;
        streak += 1;
      }
      if (streak >= maxRepeat) return { ok: false, id: "momentum", label: "momentum" };
      return { ok: true };
    },
  };
}

export function createAxisBalanceRule({ window, maxDelta }) {
  return {
    id: "axis_balance",
    label: `axis balance (last ${window}: diff ≤ ${maxDelta})`,
    check(ctx) {
      if (window <= 1) return { ok: true };
      const slice = ctx.accepted.slice(-Math.max(0, window - 1));
      slice.push({ t: Math.round(ctx.nowMs - ctx.startedAtMs), dir: ctx.dir });
      let h = 0;
      let v = 0;
      for (const m of slice) {
        if (axisOf(m.dir) === "h") h += 1;
        else v += 1;
      }
      if (Math.abs(h - v) > maxDelta) return { ok: false, id: "axis_balance", label: "axis balance" };
      return { ok: true };
    },
  };
}
