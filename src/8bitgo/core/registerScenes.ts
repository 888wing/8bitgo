import Phaser from "phaser";

import { SampleGameScene } from "../../game/phaser/SampleGameScene";
import type { AnalyticsService } from "../services/analytics/AnalyticsService";
import type { BillingService } from "../services/billing/billingTypes";
import type { ProfileStore } from "../services/profile/profileTypes";
import { HudRoot } from "../ui/HudRoot";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";

export interface SceneDependencies {
  ui: HudRoot;
  profileStore: ProfileStore;
  billing: BillingService;
  analytics: AnalyticsService;
}

export function registerScenes(dependencies: SceneDependencies): Phaser.Scene[] {
  return [
    new BootScene(dependencies.ui),
    new MenuScene(dependencies),
    new SampleGameScene(dependencies)
  ];
}

