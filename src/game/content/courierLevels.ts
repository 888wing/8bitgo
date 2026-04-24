import type { CourierLevelDefinition } from "../simulation/courierTypes";

const baseBudget = {
  turn: 3,
  boost: 1,
  wait: 1,
  firewall: 1,
  reroute: 1,
  pausePulse: 1
};

export const courierLevels: CourierLevelDefinition[] = [
  {
    id: "sector-01",
    title: "Sector 01: First Route",
    premium: false,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "up" },
    exit: { x: 5, y: 2 },
    packets: [{ x: 1, y: 5 }],
    terminals: [{ x: 5, y: 5 }],
    walls: [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 6 },
      { x: 6, y: 6 }
    ],
    hazards: [],
    commandBudget: { ...baseBudget, turn: 2, boost: 0, wait: 0, firewall: 0 },
    parTicks: 11,
    briefing: "Pick up the packet, turn into the terminal, then route to the output port."
  },
  {
    id: "sector-02",
    title: "Sector 02: Pulse Timing",
    premium: false,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "up" },
    exit: { x: 6, y: 2 },
    packets: [{ x: 1, y: 5 }],
    terminals: [{ x: 6, y: 5 }],
    walls: [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 7 }
    ],
    hazards: [
      {
        id: "glitch-a",
        kind: "glitchPulse",
        cell: { x: 4, y: 5 },
        activeTicks: 1,
        inactiveTicks: 2,
        phaseOffsetTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 2, boost: 0, wait: 1, firewall: 0 },
    parTicks: 14,
    briefing: "Use WAIT to let the glitch pulse fade before crossing the bus."
  },
  {
    id: "sector-03",
    title: "Sector 03: Patrol Fork",
    premium: false,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 2, y: 8 }, direction: "up" },
    exit: { x: 6, y: 1 },
    packets: [
      { x: 2, y: 5 },
      { x: 5, y: 6 }
    ],
    terminals: [{ x: 6, y: 6 }],
    walls: [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 7 },
      { x: 5, y: 7 }
    ],
    hazards: [
      {
        id: "bug-a",
        kind: "bugPatrol",
        path: [
          { x: 4, y: 5 },
          { x: 5, y: 5 },
          { x: 6, y: 5 }
        ],
        stepEveryTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 3, boost: 1, wait: 1, firewall: 0 },
    parTicks: 18,
    briefing: "Collect both packets and slip past the bug patrol."
  },
  {
    id: "sector-04",
    title: "Sector 04: Firewall Drill",
    premium: false,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "right" },
    exit: { x: 6, y: 2 },
    packets: [
      { x: 4, y: 8 },
      { x: 6, y: 6 }
    ],
    terminals: [{ x: 6, y: 4 }],
    walls: [
      { x: 2, y: 6 },
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 3 }
    ],
    hazards: [
      {
        id: "bug-b",
        kind: "bugPatrol",
        path: [
          { x: 5, y: 8 },
          { x: 5, y: 7 },
          { x: 5, y: 6 }
        ],
        stepEveryTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 3, boost: 1, wait: 0, firewall: 1 },
    parTicks: 18,
    briefing: "Firewall absorbs one bad contact. Use it to cross a patrol lane."
  },
  {
    id: "sector-05",
    title: "Premium 05: Broken Cache",
    premium: true,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "up" },
    exit: { x: 6, y: 1 },
    packets: [
      { x: 1, y: 5 },
      { x: 4, y: 5 }
    ],
    terminals: [{ x: 6, y: 5 }],
    walls: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 5, y: 7 },
      { x: 6, y: 7 }
    ],
    hazards: [
      {
        id: "glitch-b",
        kind: "glitchPulse",
        cell: { x: 3, y: 5 },
        activeTicks: 2,
        inactiveTicks: 2
      },
      {
        id: "bug-c",
        kind: "bugPatrol",
        path: [
          { x: 5, y: 4 },
          { x: 6, y: 4 },
          { x: 6, y: 5 }
        ],
        stepEveryTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 4, boost: 1, wait: 1, firewall: 1 },
    parTicks: 22,
    briefing: "Premium cache routes combine pulse timing and patrol prediction."
  },
  {
    id: "sector-06",
    title: "Premium 06: Dead Router",
    premium: true,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 6, y: 8 }, direction: "left" },
    exit: { x: 1, y: 2 },
    packets: [
      { x: 3, y: 8 },
      { x: 1, y: 6 },
      { x: 5, y: 4 }
    ],
    terminals: [{ x: 2, y: 4 }],
    walls: [
      { x: 4, y: 6 },
      { x: 4, y: 7 },
      { x: 2, y: 7 },
      { x: 3, y: 2 },
      { x: 4, y: 2 }
    ],
    hazards: [
      {
        id: "bug-d",
        kind: "bugPatrol",
        path: [
          { x: 2, y: 5 },
          { x: 3, y: 5 },
          { x: 4, y: 5 },
          { x: 5, y: 5 }
        ],
        stepEveryTicks: 2
      }
    ],
    commandBudget: { ...baseBudget, turn: 5, boost: 1, wait: 1, firewall: 1 },
    parTicks: 28,
    briefing: "Longer routes need command economy, not reflex dodging."
  },
  {
    id: "sector-07",
    title: "Premium 07: Checksum Ghost",
    premium: true,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "right" },
    exit: { x: 6, y: 2 },
    packets: [
      { x: 4, y: 8 },
      { x: 6, y: 6 },
      { x: 2, y: 4 }
    ],
    terminals: [{ x: 5, y: 4 }],
    walls: [
      { x: 3, y: 6 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 1, y: 5 },
      { x: 6, y: 7 }
    ],
    hazards: [
      {
        id: "glitch-c",
        kind: "glitchPulse",
        cell: { x: 5, y: 8 },
        activeTicks: 1,
        inactiveTicks: 1
      },
      {
        id: "bug-e",
        kind: "bugPatrol",
        path: [
          { x: 2, y: 3 },
          { x: 3, y: 3 },
          { x: 4, y: 3 }
        ],
        stepEveryTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 5, boost: 2, wait: 1, firewall: 1 },
    parTicks: 28,
    briefing: "Fast boosts save time but can throw the route into a ghost pulse."
  },
  {
    id: "sector-08",
    title: "Premium 08: Output Storm",
    premium: true,
    gridSize: { width: 8, height: 10 },
    start: { cell: { x: 1, y: 8 }, direction: "up" },
    exit: { x: 6, y: 1 },
    packets: [
      { x: 1, y: 6 },
      { x: 4, y: 6 },
      { x: 6, y: 4 }
    ],
    terminals: [{ x: 6, y: 6 }],
    walls: [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 8 },
      { x: 5, y: 7 }
    ],
    hazards: [
      {
        id: "glitch-d",
        kind: "glitchPulse",
        cell: { x: 3, y: 6 },
        activeTicks: 2,
        inactiveTicks: 1
      },
      {
        id: "bug-f",
        kind: "bugPatrol",
        path: [
          { x: 5, y: 5 },
          { x: 6, y: 5 },
          { x: 6, y: 4 },
          { x: 5, y: 4 }
        ],
        stepEveryTicks: 1
      }
    ],
    commandBudget: { ...baseBudget, turn: 5, boost: 2, wait: 2, firewall: 1, reroute: 2 },
    parTicks: 32,
    briefing: "The final MVP sector mixes every mechanic without needing a bigger engine."
  }
];

export function getCourierLevel(levelId: string): CourierLevelDefinition {
  return courierLevels.find((level) => level.id === levelId) ?? courierLevels[0];
}

export function getFirstFreeCourierLevelId(): string {
  return courierLevels.find((level) => !level.premium)?.id ?? courierLevels[0].id;
}

export function getFirstPremiumCourierLevelId(): string {
  return courierLevels.find((level) => level.premium)?.id ?? courierLevels[0].id;
}

export function getNextCourierLevelId(levelId: string): string {
  const index = courierLevels.findIndex((level) => level.id === levelId);
  if (index === -1) {
    return courierLevels[0].id;
  }

  return courierLevels[(index + 1) % courierLevels.length].id;
}
