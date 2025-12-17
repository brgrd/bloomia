export function createBoundaryRule({ margin }) {
  return {
    id: "boundary",
    label: "stay inside bounds",
    check(ctx) {
      const m = Math.max(0, margin | 0);
      const inside =
        ctx.to.x >= m && ctx.to.y >= m && ctx.to.x <= ctx.width - m && ctx.to.y <= ctx.height - m;
      if (!inside) return { ok: false, id: "boundary", label: "boundary" };
      return { ok: true };
    },
  };
}

export function createAvoidEdgesRule({ minEdge }) {
  return {
    id: "avoid_edges",
    label: `avoid edges (${minEdge}px)`,
    check(ctx) {
      const d = Math.min(ctx.to.x, ctx.to.y, ctx.width - ctx.to.x, ctx.height - ctx.to.y);
      if (d < minEdge) return { ok: false, id: "avoid_edges", label: "avoid edges" };
      return { ok: true };
    },
  };
}

