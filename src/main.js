import { attachUI } from "./ui.js";
import { createGame } from "./game/game.js";
import { createScoreboard } from "./scoreboard/scoreboard.js";

const canvas = document.getElementById("game");
const hud = document.getElementById("hud");
const leaderboardEl = document.getElementById("leaderboard");
const activeRulesEl = document.getElementById("active-rules");
const rulebookEl = document.getElementById("rulebook");
const runSummaryEl = document.getElementById("run-summary");
const hintEl = document.getElementById("hint");

const scoreboard = createScoreboard({
  leaderboardEl,
  runSummaryEl,
});

const game = createGame({
  canvas,
  hud,
  activeRulesEl,
  rulebookEl,
  onRunEnd: async (runSummary) => {
    scoreboard.setRunSummary(runSummary);
    await scoreboard.refreshLeaderboard();
  },
});

attachUI({
  game,
  scoreboard,
  hintEl,
});

game.start();
scoreboard.refreshLeaderboard();
