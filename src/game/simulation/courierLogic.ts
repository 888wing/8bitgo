import type {
  CourierAction,
  CourierActionResult,
  CourierGameState,
  Direction,
  HazardState,
  RouteCommand,
  RouteCommandType,
  Vec2
} from "./courierTypes";
import { directionVector, sameCell } from "./courierTypes";

const success = (message: string): CourierActionResult => ({ ok: true, message });
const failure = (message: string): CourierActionResult => ({ ok: false, message });

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function isInsideGrid(state: CourierGameState, cell: Vec2): boolean {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < state.level.gridSize.width &&
    cell.y < state.level.gridSize.height
  );
}

function isWall(state: CourierGameState, cell: Vec2): boolean {
  return state.level.walls.some((wall) => sameCell(wall, cell));
}

export function isPassableCell(state: CourierGameState, cell: Vec2): boolean {
  return isInsideGrid(state, cell) && !isWall(state, cell);
}

export function commandAt(state: CourierGameState, cell: Vec2): RouteCommand | null {
  return state.commands.find((command) => sameCell(command.at, cell)) ?? null;
}

export function usedBudget(state: CourierGameState, type: RouteCommandType): number {
  return state.commands.filter((command) => command.type === type).length;
}

export function remainingBudget(state: CourierGameState, type: RouteCommandType): number {
  return Math.max(0, state.level.commandBudget[type] - usedBudget(state, type));
}

function setMessage(state: CourierGameState, message: string): CourierActionResult {
  state.message = message;
  return success(message);
}

function placeCommand(state: CourierGameState, action: Extract<CourierAction, { type: "placeCommand" }>): CourierActionResult {
  if (state.status !== "planning") {
    return failure("Route is already running.");
  }

  if (!isPassableCell(state, action.at)) {
    return failure("Cannot place a command on a blocked node.");
  }

  if (sameCell(action.at, state.level.start.cell)) {
    return failure("Start node cannot hold a command.");
  }

  if (commandAt(state, action.at)) {
    return failure("This node already has a command.");
  }

  if (remainingBudget(state, action.commandType) <= 0) {
    return failure(`No ${action.commandType.toUpperCase()} commands left.`);
  }

  if (action.commandType === "turn" && !action.direction) {
    return failure("TURN requires a direction.");
  }

  state.commands.push({
    id: state.nextCommandId,
    type: action.commandType,
    at: { ...action.at },
    direction: action.direction,
    beats: action.commandType === "wait" ? 1 : undefined,
    used: false
  });
  state.nextCommandId += 1;
  return setMessage(state, `${action.commandType.toUpperCase()} command placed.`);
}

function removeCommand(state: CourierGameState, cell: Vec2): CourierActionResult {
  if (state.status !== "planning") {
    return failure("Cannot edit commands while running.");
  }

  const before = state.commands.length;
  state.commands = state.commands.filter((command) => !sameCell(command.at, cell));

  if (state.commands.length === before) {
    return failure("No command on this node.");
  }

  return setMessage(state, "Command removed.");
}

function startRun(state: CourierGameState): CourierActionResult {
  if (state.status !== "planning") {
    return failure("Route has already started.");
  }

  state.status = "running";
  state.phaseLabel = "RUN";
  state.message = "Courier executing route.";
  return success(state.message);
}

function pausePulse(state: CourierGameState): CourierActionResult {
  if (state.status !== "running") {
    return failure("Pause pulse is only available while running.");
  }

  if (state.pausePulsesRemaining <= 0) {
    return failure("No pause pulses left.");
  }

  state.pausePulsesRemaining -= 1;
  state.pausePulseTicksRemaining = 2;
  return setMessage(state, "Hazards frozen for two beats.");
}

function reroute(state: CourierGameState, direction: Direction): CourierActionResult {
  if (state.status !== "running") {
    return failure("Reroute is only available while running.");
  }

  if (state.reroutesRemaining <= 0) {
    return failure("No reroutes left.");
  }

  state.reroutesRemaining -= 1;
  state.courier.direction = direction;
  return setMessage(state, "Emergency reroute injected.");
}

export function applyCourierAction(state: CourierGameState, action: CourierAction): CourierActionResult {
  if (action.type === "placeCommand") {
    return placeCommand(state, action);
  }

  if (action.type === "removeCommand") {
    return removeCommand(state, action.at);
  }

  if (action.type === "startRun") {
    return startRun(state);
  }

  if (action.type === "pausePulse") {
    return pausePulse(state);
  }

  return reroute(state, action.direction);
}

function updateBugPatrol(hazard: Extract<HazardState, { kind: "bugPatrol" }>, tick: number): void {
  if (tick % hazard.stepEveryTicks !== 0 || hazard.path.length <= 1) {
    return;
  }

  let nextIndex = hazard.pathIndex + hazard.pathDirection;
  if (nextIndex >= hazard.path.length || nextIndex < 0) {
    hazard.pathDirection = hazard.pathDirection === 1 ? -1 : 1;
    nextIndex = hazard.pathIndex + hazard.pathDirection;
  }

  hazard.pathIndex = nextIndex;
  hazard.cell = { ...hazard.path[hazard.pathIndex] };
}

function updateGlitchPulse(hazard: Extract<HazardState, { kind: "glitchPulse" }>, tick: number): void {
  const cycle = hazard.activeTicks + hazard.inactiveTicks;
  const position = (tick + hazard.phaseOffsetTicks) % cycle;
  hazard.active = position < hazard.activeTicks;
}

function updateHazards(state: CourierGameState): void {
  if (state.pausePulseTicksRemaining > 0) {
    state.pausePulseTicksRemaining -= 1;
    return;
  }

  for (const hazard of state.hazards) {
    if (hazard.kind === "bugPatrol") {
      updateBugPatrol(hazard, state.tick);
    } else {
      updateGlitchPulse(hazard, state.tick);
    }
  }
}

function hazardHitsCourier(state: CourierGameState): boolean {
  return state.hazards.some((hazard) => hazard.active && sameCell(hazard.cell, state.courier.cell));
}

function resolveCollision(state: CourierGameState): void {
  if (!hazardHitsCourier(state)) {
    return;
  }

  if (state.shieldTicksRemaining > 0) {
    state.shieldTicksRemaining = 0;
    state.message = "Firewall burned the malware contact.";
    return;
  }

  state.courier.hp -= 1;
  state.message = "Packet collision. Signal damaged.";

  if (state.courier.hp <= 0) {
    state.courier.hp = 0;
    state.status = "lost";
    state.phaseLabel = "FAIL";
    state.message = "Route corrupted. Replan the sector.";
  }
}

function collectAndDeliver(state: CourierGameState): void {
  for (const packet of state.packets) {
    if (!packet.collected && sameCell(packet.cell, state.courier.cell)) {
      packet.collected = true;
      state.courier.carriedPackets += 1;
      state.message = "Packet buffered.";
    }
  }

  const onTerminal = state.terminals.some((terminal) => sameCell(terminal.cell, state.courier.cell));
  if (onTerminal && state.courier.carriedPackets > 0) {
    state.courier.deliveredPackets += state.courier.carriedPackets;
    state.courier.carriedPackets = 0;
    state.message = "Packets delivered to terminal.";
  }

  if (sameCell(state.level.exit, state.courier.cell)) {
    if (state.courier.deliveredPackets >= state.packets.length) {
      state.status = "won";
      state.phaseLabel = "CLEAR";
      state.message = "Output port reached. Route complete.";
      return;
    }

    state.message = "Output locked. Deliver packets first.";
  }
}

function triggerCommand(state: CourierGameState): number {
  if (state.waitTicksRemaining > 0) {
    state.waitTicksRemaining -= 1;
    state.message = "Courier waiting on beat.";
    return 0;
  }

  const command = commandAt(state, state.courier.cell);
  if (!command || command.used) {
    return 1;
  }

  command.used = true;

  if (command.type === "turn" && command.direction) {
    state.courier.direction = command.direction;
    state.message = `Turn ${command.direction.toUpperCase()} executed.`;
    return 1;
  }

  if (command.type === "boost") {
    state.message = "Boost command executed.";
    return 2;
  }

  if (command.type === "wait") {
    state.waitTicksRemaining = command.beats ?? 1;
    state.message = "Wait command executed.";
    return 0;
  }

  state.shieldTicksRemaining = 3;
  state.message = "Firewall armed.";
  return 1;
}

function moveCourierOneCell(state: CourierGameState): void {
  const next = add(state.courier.cell, directionVector(state.courier.direction));

  if (!isPassableCell(state, next)) {
    state.status = "lost";
    state.phaseLabel = "FAIL";
    state.message = "Courier hit a dead node.";
    return;
  }

  state.courier.cell = next;
  collectAndDeliver(state);
}

function stepRoute(state: CourierGameState): void {
  state.tick += 1;
  updateHazards(state);
  resolveCollision(state);

  if (state.status !== "running") {
    return;
  }

  const moveCount = triggerCommand(state);
  for (let index = 0; index < moveCount; index += 1) {
    moveCourierOneCell(state);
    resolveCollision(state);
    if (state.status !== "running") {
      return;
    }
  }

  if (state.shieldTicksRemaining > 0) {
    state.shieldTicksRemaining -= 1;
  }
}

export function updateCourierState(state: CourierGameState, deltaMs: number): void {
  if (state.status !== "running") {
    return;
  }

  state.elapsedMs += deltaMs;
  state.accumulatorMs += deltaMs;

  while (state.accumulatorMs >= state.beatMs && state.status === "running") {
    state.accumulatorMs -= state.beatMs;
    stepRoute(state);
  }
}
