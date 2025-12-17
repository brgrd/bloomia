export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatInt(value) {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toString();
}

export function formatMs(ms) {
  const total = Math.max(0, Math.round(ms));
  const seconds = Math.floor(total / 1000);
  const rem = total % 1000;
  return `${seconds}.${rem.toString().padStart(3, "0")}s`;
}
