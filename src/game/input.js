const THRESHOLD = 26;

function keyToDir(key) {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

export function attachInput({ canvas, onDirection, enabled }) {
  window.addEventListener("keydown", (e) => {
    const dir = keyToDir(e.key);
    if (!dir) return;
    if (!enabled()) return;
    e.preventDefault();
    onDirection(dir);
  });

  let start = null;
  function onDown(e) {
    if (!enabled()) return;
    const t = e.touches?.[0];
    if (!t) return;
    start = { x: t.clientX, y: t.clientY };
  }
  function onMove(e) {
    if (!start) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    start = null;
    onDirection(dir);
  }
  function onEnd() {
    start = null;
  }

  canvas.addEventListener("touchstart", onDown, { passive: true });
  canvas.addEventListener("touchmove", onMove, { passive: true });
  canvas.addEventListener("touchend", onEnd, { passive: true });
  canvas.addEventListener("touchcancel", onEnd, { passive: true });
}

