import { loadSettings } from "../util/settings.js";
import { formatInt, formatMs } from "../util/format.js";
import { fetchLeaderboard, submitScore } from "./supabaseRest.js";

function isConfigured(settings) {
  return Boolean(settings.supabaseUrl && settings.supabaseAnonKey);
}

function formatLeaderboard(rows) {
  if (!rows.length) return "No scores yet.";
  const lines = [];
  lines.push("rank  score   name              time     acc");
  lines.push("----  -----   ----------------  -------  ----");
  rows.forEach((r, idx) => {
    const rank = String(idx + 1).padStart(4, " ");
    const score = String(r.score).padStart(5, " ");
    const name = (r.name || "Anonymous").slice(0, 16).padEnd(16, " ");
    const time = formatMs(r.duration_ms ?? 0).padStart(7, " ");
    const acc = `${Math.round((r.accuracy ?? 0) * 100)}%`.padStart(4, " ");
    lines.push(`${rank}  ${score}   ${name}  ${time}  ${acc}`);
  });
  return lines.join("\n");
}

function formatRun(run) {
  if (!run) return "Play until stability hits zero to end a run.";
  return [
    `score: ${formatInt(run.score)}`,
    `time: ${formatMs(run.durationMs)}`,
    `moves: ${run.moves} (${run.validMoves} valid / ${run.invalidMoves} invalid)`,
    `accuracy: ${Math.round(run.accuracy * 100)}%`,
    `seed: ${run.seed}`,
    `end: ${run.endReason ?? "-"}`,
    `max tension: ${Number(run.maxTension ?? 0).toFixed(3)}`,
    ``,
    `Submit: automatic on run end.`,
  ].join("\n");
}

export function createScoreboard({ leaderboardEl, runSummaryEl }) {
  let lastRun = null;

  async function refreshLeaderboard() {
    const settings = loadSettings();
    if (!isConfigured(settings)) {
      leaderboardEl.textContent = "Scoreboard disabled.\nOpen Settings to configure Supabase.";
      return;
    }
    try {
      const rows = await fetchLeaderboard({
        supabaseUrl: settings.supabaseUrl,
        supabaseAnonKey: settings.supabaseAnonKey,
        limit: 20,
      });
      leaderboardEl.textContent = formatLeaderboard(rows);
    } catch (e) {
      leaderboardEl.textContent = `Leaderboard error:\n${String(e?.message ?? e)}`;
    }
  }

  function setRunSummary(runSummary) {
    lastRun = runSummary;
    runSummaryEl.textContent = formatRun(runSummary);
    void maybeAutoSubmit();
  }

  async function maybeAutoSubmit() {
    if (!lastRun) return;
    const settings = loadSettings();
    if (!isConfigured(settings)) return;

    try {
      const runHash = await lastRun.runHashPromise;
      await submitScore({
        supabaseUrl: settings.supabaseUrl,
        supabaseAnonKey: settings.supabaseAnonKey,
        record: {
          name: settings.playerName || "Anonymous",
          score: Math.round(lastRun.score),
          seed: lastRun.seed >>> 0,
          duration_ms: Math.round(lastRun.durationMs),
          moves: Math.round(lastRun.moves),
          accuracy: lastRun.accuracy,
          run_hash: runHash,
        },
      });
    } catch (e) {
      runSummaryEl.textContent = `${formatRun(lastRun)}\n\nsubmit error:\n${String(e?.message ?? e)}`;
    }
  }

  runSummaryEl.textContent = formatRun(null);

  return {
    refreshLeaderboard,
    setRunSummary,
  };
}
