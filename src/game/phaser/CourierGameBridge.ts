import {
  getCourierLevel,
  getNextCourierLevelId
} from "../content/courierLevels";
import {
  applyCourierAction,
  remainingBudget,
  updateCourierState
} from "../simulation/courierLogic";
import {
  collectedPacketCount,
  createInitialCourierState,
  deliveredPacketCount,
  totalPacketCount
} from "../simulation/courierState";
import type {
  CourierAction,
  CourierActionResult,
  CourierGameState,
  RouteCommandType
} from "../simulation/courierTypes";
import type { HudSnapshot } from "../../8bitgo/ui/HudRoot";

export interface CourierGameBridgeOptions {
  levelId: string;
}

export class CourierGameBridge {
  private readonly state: CourierGameState;

  constructor(options: CourierGameBridgeOptions) {
    this.state = createInitialCourierState(getCourierLevel(options.levelId));
  }

  getState(): CourierGameState {
    return this.state;
  }

  getNextLevelId(): string {
    return getNextCourierLevelId(this.state.level.id);
  }

  tick(deltaMs: number): void {
    updateCourierState(this.state, Math.min(deltaMs, 80));
  }

  handleAction(action: CourierAction): CourierActionResult {
    const result = applyCourierAction(this.state, action);
    if (!result.ok) {
      this.state.message = result.message;
    }
    return result;
  }

  getHudSnapshot(): HudSnapshot {
    const packets = totalPacketCount(this.state);
    const delivered = deliveredPacketCount(this.state);
    const collected = collectedPacketCount(this.state);

    return {
      levelLabel: this.state.level.title,
      hpLabel: `HP ${this.state.courier.hp}/${this.state.courier.maxHp}`,
      gemsLabel: `PKT ${delivered}/${packets} BUF ${this.state.courier.carriedPackets}`,
      objectiveLabel: this.state.message,
      timeLabel: `${this.state.phaseLabel} ${this.state.tick}/${this.state.level.parTicks}`,
      commandLabel: this.commandLabel(),
      emergencyLabel: `Pulse ${this.state.pausePulsesRemaining} // Reroute ${this.state.reroutesRemaining}`,
      phaseLabel: this.state.phaseLabel,
      collectedLabel: `Collected ${collected}/${packets}`
    };
  }

  private commandLabel(): string {
    const types: RouteCommandType[] = ["turn", "boost", "wait", "firewall"];
    return types
      .map((type) => `${type.toUpperCase()} ${remainingBudget(this.state, type)}`)
      .join(" // ");
  }
}
