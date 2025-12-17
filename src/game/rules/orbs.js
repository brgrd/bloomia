/**
 * @typedef {"up"|"down"|"left"|"right"} Direction
 */

function axisOf(dir) {
  return dir === "left" || dir === "right" ? "h" : "v";
}

export function createLocalDensityAxisRule({ radius, threshold, forbidAxis }) {
  const axisLabel = forbidAxis === "h" ? "horizontal" : "vertical";
  return {
    id: "local_density_axis",
    label: `dense area (≥${threshold} within ${radius}px): no ${axisLabel}`,
    check(ctx) {
      const stats = ctx.field.statsNear(ctx.to.x, ctx.to.y, radius);
      if (stats.count < threshold) return { ok: true };
      if (axisOf(ctx.dir) === forbidAxis) return { ok: false, id: "local_density_axis", label: "density axis" };
      return { ok: true };
    },
  };
}

export function createParityConstraintRule({ radius }) {
  const kNearest = 5;
  return {
    id: "orb_parity",
    label: `orb parity (within ${radius}px): match move #`,
    check(ctx) {
      const stats = ctx.field.parityAt(ctx.to.x, ctx.to.y, radius, kNearest);
      const expected = ctx.moveIndex & 1;
      const actual = stats.paritySumNearest & 1;
      if (actual !== expected) {
        const expLabel = expected ? "odd" : "even";
        const actLabel = actual ? "odd" : "even";
        return {
          ok: false,
          id: "orb_parity",
          label: `orb parity: need ${expLabel} (move #${ctx.moveIndex}), got ${actLabel} (dots ${stats.paritySumNearest}/${stats.nearestUsed})`,
        };
      }
      return { ok: true };
    },
  };
}
