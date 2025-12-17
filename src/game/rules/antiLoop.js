function samePos(a, b) {
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

export function createNoShortCycleRule({ period }) {
  return {
    id: "no_short_cycle",
    label: `no ${period}-step cycle`,
    check(ctx) {
      if (!Number.isFinite(period) || period <= 1) return { ok: true };
      if (ctx.accepted.length < period) return { ok: true }; // allow the first cycle to complete
      const idx = ctx.trail.length - period;
      if (idx < 0) return { ok: true };
      if (samePos(ctx.to, ctx.trail[idx])) return { ok: false, id: "no_short_cycle", label: "no short cycle" };
      return { ok: true };
    },
  };
}

