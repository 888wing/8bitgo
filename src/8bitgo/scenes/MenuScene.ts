import Phaser from "phaser";

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
    ui.showMenu({
      profile: profileStore.get(),
      billing: billing.getSnapshot(),
      onStartFree: () => {
        analytics.track("level_started", {
          levelId: "free-sector"
        });
        profileStore.setSelectedLevel("free-sector");
        this.scene.start("SampleGameScene", {
          levelId: "free-sector"
        });
      },
      onStartPremium: () => {
        if (!profileStore.hasPremiumAccess()) {
          this.openPaywall("premium_button");
          return;
        }

        analytics.track("level_started", {
          levelId: "premium-sector"
        });
        profileStore.setSelectedLevel("premium-sector");
        this.scene.start("SampleGameScene", {
          levelId: "premium-sector"
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
      profileStore.setSelectedLevel("premium-sector");
      this.scene.start("SampleGameScene", {
        levelId: "premium-sector"
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

