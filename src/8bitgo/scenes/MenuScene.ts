import Phaser from "phaser";

import {
  getFirstFreeCourierLevelId,
  getFirstPremiumCourierLevelId
} from "../../game/content/courierLevels";
import type { SceneDependencies } from "../core/registerScenes";

export class MenuScene extends Phaser.Scene {
  private unsubscribeBilling: (() => void) | null = null;

  constructor(private readonly dependencies: SceneDependencies) {
    super("MenuScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#060813");
    this.unsubscribeBilling = this.dependencies.billing.subscribe(() => {
      if (this.scene.isActive("MenuScene")) {
        this.render();
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeBilling?.();
      this.unsubscribeBilling = null;
    });
    this.render();
  }

  private render(): void {
    const { ui, profileStore, billing, analytics } = this.dependencies;
    const freeLevelId = getFirstFreeCourierLevelId();
    const premiumLevelId = getFirstPremiumCourierLevelId();

    ui.showMenu({
      profile: profileStore.get(),
      billing: billing.getSnapshot(),
      onStartFree: () => {
        analytics.track("level_started", {
          levelId: freeLevelId
        });
        profileStore.setSelectedLevel(freeLevelId);
        this.scene.start("CourierGameScene", {
          levelId: freeLevelId
        });
      },
      onStartPremium: () => {
        if (!profileStore.hasPremiumAccess()) {
          this.openPaywall("premium_button");
          return;
        }

        analytics.track("level_started", {
          levelId: premiumLevelId
        });
        profileStore.setSelectedLevel(premiumLevelId);
        this.scene.start("CourierGameScene", {
          levelId: premiumLevelId
        });
      },
      onOpenPaywall: () => this.openPaywall("menu"),
      onRestore: () => {
        void this.restorePurchases();
      }
    });
  }

  private openPaywall(source: string): void {
    const { analytics, profileStore, ui, billing } = this.dependencies;
    analytics.track("paywall_viewed", {
      source
    });
    profileStore.incrementStat("paywallViews");

    ui.showPaywall({
      billing: billing.getSnapshot(),
      onPurchase: () => {
        void this.purchase();
      },
      onRestore: () => {
        void this.restorePurchases();
      },
      onClose: () => this.render()
    });
  }

  private async purchase(): Promise<void> {
    const { billing, ui, profileStore } = this.dependencies;
    const result = await billing.purchaseFullUnlock();

    if (result.kind === "purchased") {
      const premiumLevelId = getFirstPremiumCourierLevelId();
      profileStore.setSelectedLevel(premiumLevelId);
      this.scene.start("CourierGameScene", {
        levelId: premiumLevelId
      });
      return;
    }

    ui.showPaywall({
      billing: billing.getSnapshot(),
      onPurchase: () => {
        void this.purchase();
      },
      onRestore: () => {
        void this.restorePurchases();
      },
      onClose: () => this.render()
    });
  }

  private async restorePurchases(): Promise<void> {
    const { billing, ui } = this.dependencies;
    await billing.restorePurchases();
    ui.showPaywall({
      billing: billing.getSnapshot(),
      onPurchase: () => {
        void this.purchase();
      },
      onRestore: () => {
        void this.restorePurchases();
      },
      onClose: () => this.render()
    });
  }
}
