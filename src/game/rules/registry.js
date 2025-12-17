export const RULE_DOCS = [
  {
    id: "boundary",
    label: "stay inside bounds",
    description: "Your destination must remain inside the play area (a fixed margin from the edges).",
  },
  {
    id: "no_short_cycle",
    label: "no 4-step cycle",
    description: "After the first 4 moves, you can’t land exactly where you were 4 moves ago (stops looping like up→right→down→left).",
  },
  {
    id: "avoid_edges",
    label: "avoid edges",
    description: "Your destination must stay at least N pixels away from the nearest edge (N can tighten later).",
  },
  {
    id: "alternate_axis",
    label: "alternate axis",
    description: "Horizontal moves must alternate with vertical moves (the first move is always allowed).",
  },
  {
    id: "no_reversal",
    label: "no immediate reversal",
    description: "You cannot immediately reverse direction (left→right, right→left, up→down, down→up).",
  },
  {
    id: "momentum",
    label: "momentum",
    description: "Repeating the same direction too many times becomes invalid (a max-repeat cap).",
  },
  {
    id: "axis_balance",
    label: "axis balance",
    description:
      "In the last W moves, horizontal and vertical counts must stay close (difference must be ≤ Δ). Example: W=8, Δ=2 means in your last 8 moves you can’t have more than 5 vs 3 of one axis.",
  },
  {
    id: "local_density_axis",
    label: "dense area axis lock",
    description:
      "If your destination is inside a dense orb cluster (≥T within radius R), one axis is locked (only the other axis is allowed).",
  },
  {
    id: "orb_parity",
    label: "orb parity",
    description:
      "Look at the 5 closest orbs within the radius at your *destination*: rings count as 0, dots count as 1. Count the dots. If it’s move #1/#3/#5… dots must be odd (1/3/5); if it’s move #2/#4/#6… dots must be even (0/2/4).",
  },
];
