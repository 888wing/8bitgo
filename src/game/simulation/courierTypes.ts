export type Direction = "up" | "right" | "down" | "left";
export type CourierStatus = "planning" | "running" | "won" | "lost";
export type RouteCommandType = "turn" | "boost" | "wait" | "firewall";
export type HazardKind = "bugPatrol" | "glitchPulse";

export interface Vec2 {
  x: number;
  y: number;
}

export interface DirectionVector extends Vec2 {
  direction: Direction;
}

export interface CourierStart {
  cell: Vec2;
  direction: Direction;
}

export interface CommandBudget {
  turn: number;
  boost: number;
  wait: number;
  firewall: number;
  reroute: number;
  pausePulse: number;
}

export interface BugPatrolDefinition {
  id: string;
  kind: "bugPatrol";
  path: Vec2[];
  stepEveryTicks: number;
}

export interface GlitchPulseDefinition {
  id: string;
  kind: "glitchPulse";
  cell: Vec2;
  activeTicks: number;
  inactiveTicks: number;
  phaseOffsetTicks?: number;
}

export type HazardDefinition = BugPatrolDefinition | GlitchPulseDefinition;

export interface CourierLevelDefinition {
  id: string;
  title: string;
  premium: boolean;
  gridSize: {
    width: number;
    height: number;
  };
  start: CourierStart;
  exit: Vec2;
  packets: Vec2[];
  terminals: Vec2[];
  walls: Vec2[];
  hazards: HazardDefinition[];
  commandBudget: CommandBudget;
  parTicks: number;
  briefing: string;
}

export interface PacketState {
  id: number;
  cell: Vec2;
  collected: boolean;
}

export interface TerminalState {
  id: number;
  cell: Vec2;
}

export interface RouteCommand {
  id: number;
  type: RouteCommandType;
  at: Vec2;
  direction?: Direction;
  beats?: 1 | 2;
  used: boolean;
}

export interface CourierAgentState {
  cell: Vec2;
  direction: Direction;
  hp: number;
  maxHp: number;
  carriedPackets: number;
  deliveredPackets: number;
}

export interface BugPatrolState {
  id: string;
  kind: "bugPatrol";
  path: Vec2[];
  pathIndex: number;
  pathDirection: 1 | -1;
  stepEveryTicks: number;
  cell: Vec2;
  active: boolean;
}

export interface GlitchPulseState {
  id: string;
  kind: "glitchPulse";
  cell: Vec2;
  activeTicks: number;
  inactiveTicks: number;
  phaseOffsetTicks: number;
  active: boolean;
}

export type HazardState = BugPatrolState | GlitchPulseState;

export interface CourierGameState {
  level: CourierLevelDefinition;
  status: CourierStatus;
  phaseLabel: string;
  message: string;
  tick: number;
  elapsedMs: number;
  accumulatorMs: number;
  beatMs: number;
  courier: CourierAgentState;
  packets: PacketState[];
  terminals: TerminalState[];
  commands: RouteCommand[];
  hazards: HazardState[];
  nextCommandId: number;
  waitTicksRemaining: number;
  shieldTicksRemaining: number;
  pausePulseTicksRemaining: number;
  reroutesRemaining: number;
  pausePulsesRemaining: number;
}

export type CourierAction =
  | {
      type: "placeCommand";
      commandType: RouteCommandType;
      at: Vec2;
      direction?: Direction;
    }
  | {
      type: "removeCommand";
      at: Vec2;
    }
  | {
      type: "startRun";
    }
  | {
      type: "pausePulse";
    }
  | {
      type: "reroute";
      direction: Direction;
    };

export interface CourierActionResult {
  ok: boolean;
  message: string;
}

export function directionVector(direction: Direction): Vec2 {
  if (direction === "up") {
    return { x: 0, y: -1 };
  }

  if (direction === "right") {
    return { x: 1, y: 0 };
  }

  if (direction === "down") {
    return { x: 0, y: 1 };
  }

  return { x: -1, y: 0 };
}

export function directionGlyph(direction: Direction): string {
  if (direction === "up") {
    return "^";
  }

  if (direction === "right") {
    return ">";
  }

  if (direction === "down") {
    return "v";
  }

  return "<";
}

export function sameCell(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function cellKey(cell: Vec2): string {
  return `${cell.x},${cell.y}`;
}
