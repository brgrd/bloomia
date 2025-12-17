export function createField({ rng, width, height }) {
  const count = 32;
  const nodes = Array.from({ length: count }, () => {
    const r = 6 + rng.nextFloat() * 24;
    const phaseGroup = Math.floor(rng.nextFloat() * 3) % 3; // 0..2
    const parity = rng.nextU32() & 1; // 0/1
    return {
      x: rng.nextFloat() * width,
      y: rng.nextFloat() * height,
      vx: (rng.nextFloat() - 0.5) * 0.06,
      vy: (rng.nextFloat() - 0.5) * 0.06,
      r,
      phase: rng.nextFloat() * Math.PI * 2,
      phaseGroup,
      parity,
    };
  });

  function update(dtMs, bloom, tension) {
    const t = dtMs;
    const drift = 1 + bloom * 2.0 + (tension ?? 0) * 1.8;
    for (const n of nodes) {
      n.phase += t * 0.0012 * drift;
      n.x += n.vx * t * drift;
      n.y += n.vy * t * drift;

      if (n.x < -80) n.x = width + 80;
      if (n.x > width + 80) n.x = -80;
      if (n.y < -80) n.y = height + 80;
      if (n.y > height + 80) n.y = -80;
    }
  }

  function statsNear(x, y, radius) {
    const r2 = radius * radius;
    let countNear = 0;
    let paritySum = 0;
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;

    for (const n of nodes) {
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy > r2) continue;
      countNear += 1;
      paritySum += n.parity;
      if (n.phaseGroup === 0) p0 += 1;
      else if (n.phaseGroup === 1) p1 += 1;
      else p2 += 1;
    }

    let dominantPhase = 0;
    if (p1 >= p0 && p1 >= p2) dominantPhase = 1;
    if (p2 >= p0 && p2 >= p1) dominantPhase = 2;

    return { count: countNear, paritySum, phaseCounts: [p0, p1, p2], dominantPhase };
  }

  function parityAt(x, y, radius, kNearest) {
    const r2 = radius * radius;
    const k = Math.max(1, Math.min(12, kNearest | 0));
    /** @type {Array<{d2:number,parity:number}>} */
    const nearest = [];
    let inRadius = 0;

    for (const n of nodes) {
      const dx = n.x - x;
      const dy = n.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      inRadius += 1;

      if (nearest.length < k) {
        nearest.push({ d2, parity: n.parity });
        nearest.sort((a, b) => a.d2 - b.d2);
        continue;
      }
      if (d2 >= nearest[nearest.length - 1].d2) continue;
      nearest[nearest.length - 1] = { d2, parity: n.parity };
      nearest.sort((a, b) => a.d2 - b.d2);
    }

    let paritySumNearest = 0;
    for (const n of nearest) paritySumNearest += n.parity;
    return { inRadius, nearestUsed: nearest.length, paritySumNearest };
  }

  function draw(ctx, bloom) {
    const c1 = [120, 125, 140];
    const c2 = [84, 240, 195];
    const c3 = [124, 240, 255];

    for (const n of nodes) {
      const pulse = 0.5 + 0.5 * Math.sin(n.phase);
      const r = n.r * (0.72 + pulse * 0.28);
      const mix = bloom * 0.85;
      const groupColor = n.phaseGroup === 0 ? c2 : n.phaseGroup === 1 ? c3 : [255, 77, 109];
      const base = [
        Math.round(c1[0] * (1 - mix) + groupColor[0] * mix),
        Math.round(c1[1] * (1 - mix) + groupColor[1] * mix),
        Math.round(c1[2] * (1 - mix) + groupColor[2] * mix),
      ];
      const alpha = 0.08 + bloom * 0.22 + (n.parity ? 0.03 : 0);
      ctx.fillStyle = `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle parity marker (debug-learnable): odd = inner dot, even = inner ring.
      const markerAlpha = 0.08 + bloom * 0.12;
      if (n.parity) {
        ctx.fillStyle = `rgba(232, 238, 247, ${markerAlpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(1.5, r * 0.12), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(232, 238, 247, ${markerAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(2.5, r * 0.18), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  return { update, draw, statsNear, parityAt };
}
