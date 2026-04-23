import { getSampleLevel } from "../content/sampleLevels";
import {
  collectedGemCount,
  createInitialSampleState,
  type SampleAction,
  type SampleGameState
} from "../simulation/sampleState";
import { applySampleAction, updateSampleState } from "../simulation/sampleLogic";
import type { HudSnapshot } from "../../8bitgo/ui/HudRoot";

export interface SampleGameBridgeOptions {
  levelId: string;
}

export class SampleGameBridge {
  private readonly state: SampleGameState;

  constructor(options: SampleGameBridgeOptions) {
    this.state = createInitialSampleState(getSampleLevel(options.levelId));
  }

  getState(): SampleGameState {
    return this.state;
  }

  tick(deltaMs: number): void {
    updateSampleState(this.state, Math.min(deltaMs, 80));
  }

  handleAction(action: SampleAction): void {
    applySampleAction(this.state, action);
  }

  getHudSnapshot(): HudSnapshot {
    const seconds = Math.floor(this.state.timeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, "0");

    return {
      levelLabel: this.state.levelTitle,
      hpLabel: `HP ${this.state.player.hp}/${this.state.player.maxHp}`,
      gemsLabel: `CHIP ${collectedGemCount(this.state)}/${this.state.requiredGems}`,
      objectiveLabel: this.state.message,
      timeLabel: `${minutes}:${remainingSeconds}`
    };
  }
}

