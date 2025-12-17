import { loadSettings, saveSettings, clearSettings } from "./util/settings.js";

export function attachUI({ game, scoreboard, hintEl }) {
  const dialog = document.getElementById("settings");
  const btnSettings = document.getElementById("btn-settings");
  const btnHint = document.getElementById("btn-hint");
  const btnRestart = document.getElementById("btn-restart");
  const playerName = document.getElementById("player-name");
  const supabaseUrl = document.getElementById("supabase-url");
  const supabaseAnonKey = document.getElementById("supabase-anon-key");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const btnClearSettings = document.getElementById("btn-clear-settings");

  function populate() {
    const settings = loadSettings();
    playerName.value = settings.playerName ?? "";
    supabaseUrl.value = settings.supabaseUrl ?? "";
    supabaseAnonKey.value = settings.supabaseAnonKey ?? "";
  }

  btnSettings.addEventListener("click", () => {
    populate();
    dialog.showModal();
  });

  btnRestart.addEventListener("click", () => {
    game.restart();
    if (hintEl) hintEl.textContent = "Press Hint to reveal acceptable directions (costs max tension for 3 moves).";
  });

  btnHint.addEventListener("click", () => {
    const hint = game.requestHint?.();
    if (!hintEl) return;
    if (!hint) {
      hintEl.textContent = "Hint unavailable (run not active).";
      return;
    }
    const lines = [];
    if (!hint.directions.length) {
      lines.push("acceptable: (none)");
    } else {
      lines.push("acceptable:");
      for (const item of hint.directions) {
        const dir = item.dir.toUpperCase();
        if (Number.isFinite(item.dots) && Number.isFinite(item.nearest)) {
          lines.push(`- ${dir}  (orb parity: dots ${item.dots}/${item.nearest})`);
        } else {
          lines.push(`- ${dir}`);
        }
      }
    }
    lines.push(`penalty: max tension for ${hint.penaltyMoves} moves`);
    hintEl.textContent = lines.join("\n");
  });

  btnSaveSettings.addEventListener("click", () => {
    saveSettings({
      playerName: playerName.value,
      supabaseUrl: supabaseUrl.value,
      supabaseAnonKey: supabaseAnonKey.value,
    });
    scoreboard.refreshLeaderboard();
  });

  btnClearSettings.addEventListener("click", () => {
    clearSettings();
    populate();
    scoreboard.refreshLeaderboard();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialog.open) dialog.close();
  });
}
