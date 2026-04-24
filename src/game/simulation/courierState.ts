import type {
  BugPatrolState,
  CourierGameState,
  CourierLevelDefinition,
  GlitchPulseState,
  HazardState,
  PacketState,
  TerminalState,
  Vec2
} from "./courierTypes";

function cloneCell(cell: Vec2): Vec2 {
  return { x: cell.x, y: cell.y };
}

function createPacketStates(level: CourierLevelDefinition): PacketState[] {
  return level.packets.map((cell, index) => ({
    id: index + 1,
    cell: cloneCell(cell),
    collected: false
  }));
}

function createTerminalStates(level: CourierLevelDefinition): TerminalState[] {
  return level.terminals.map((cell, index) => ({
    id: index + 1,
    cell: cloneCell(cell)
  }));
}

function createHazardStates(level: CourierLevelDefinition): HazardState[] {
  return level.hazards.map((hazard): HazardState => {
    if (hazard.kind === "bugPatrol") {
      const state: BugPatrolState = {
        id: hazard.id,
        kind: "bugPatrol",
        path: hazard.path.map(cloneCell),
        pathIndex: 0,
        pathDirection: 1,
        stepEveryTicks: hazard.stepEveryTicks,
        cell: cloneCell(hazard.path[0]),
        active: true
      };
      return state;
    }

    const state: GlitchPulseState = {
      id: hazard.id,
      kind: "glitchPulse",
      cell: cloneCell(hazard.cell),
      activeTicks: hazard.activeTicks,
      inactiveTicks: hazard.inactiveTicks,
      phaseOffsetTicks: hazard.phaseOffsetTicks ?? 0,
      active: false
    };
    return state;
  });
}

export function createInitialCourierState(level: CourierLevelDefinition): CourierGameState {
  return {
    level,
    status: "planning",
    phaseLabel: "PLAN",
    message: level.briefing,
    tick: 0,
    elapsedMs: 0,
    accumulatorMs: 0,
    beatMs: 360,
    courier: {
      cell: cloneCell(level.start.cell),
      direction: level.start.direction,
      hp: 3,
      maxHp: 3,
      carriedPackets: 0,
      deliveredPackets: 0
    },
    packets: createPacketStates(level),
    terminals: createTerminalStates(level),
    commands: [],
    hazards: createHazardStates(level),
    nextCommandId: 1,
    waitTicksRemaining: 0,
    shieldTicksRemaining: 0,
    pausePulseTicksRemaining: 0,
    reroutesRemaining: level.commandBudget.reroute,
    pausePulsesRemaining: level.commandBudget.pausePulse
  };
}

export function totalPacketCount(state: CourierGameState): number {
  return state.packets.length;
}

export function collectedPacketCount(state: CourierGameState): number {
  return state.packets.filter((packet) => packet.collected).length;
}

export function deliveredPacketCount(state: CourierGameState): number {
  return state.courier.deliveredPackets;
}
