import Phaser from "phaser";

import { ensureStarterPixelTextures } from "../../8bitgo/art/pixelTextureFactory";
import type { SceneDependencies } from "../../8bitgo/core/registerScenes";
import { applyPixelSceneDefaults, snapObjectToPixel } from "../../8bitgo/core/pixelScale";
import { collectedGemCount, type EnemyState, type GemState } from "../simulation/sampleState";
import { SampleGameBridge } from "./SampleGameBridge";

interface SampleGameSceneData {
  levelId?: string;
}

export class SampleGameScene extends Phaser.Scene {
  private bridge: SampleGameBridge | null = null;
  private player!: Phaser.GameObjects.Image;
  private exit!: Phaser.GameObjects.Image;
  private readonly gemViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly enemyViews = new Map<number, Phaser.GameObjects.Image>();
  private resultShown = false;

  constructor(private readonly dependencies: SceneDependencies) {
    super("SampleGameScene");
  }

  create(data: SampleGameSceneData = {}): void {
    applyPixelSceneDefaults(this);
    ensureStarterPixelTextures(this);
    this.resultShown = false;
    this.bridge = new SampleGameBridge({
      levelId: data.levelId ?? "free-sector"
    });
    const state = this.bridge.getState();

    this.cameras.main.setBackgroundColor("#060813");
    this.drawArena();

    this.exit = this.add
      .image(state.exit.x, state.exit.y, "8bitgo.exit.closed")
      .setScale(5)
      .setAlpha(0.9);
    this.player = this.add
      .image(state.player.x, state.player.y, "8bitgo.player")
      .setScale(4);

    for (const gem of state.gems) {
      this.gemViews.set(gem.id, this.createGem(gem));
    }

    for (const enemy of state.enemies) {
      this.enemyViews.set(enemy.id, this.createEnemy(enemy));
    }

    this.input.on("pointerdown", this.handlePointer, this);
    this.input.on("pointermove", this.handlePointer, this);
    this.input.on("pointerup", this.clearPointer, this);
    this.input.on("pointerupoutside", this.clearPointer, this);

    this.dependencies.profileStore.incrementStat("totalStarts");
    this.dependencies.ui.showGameHud({
      onPause: () => this.scene.start("MenuScene"),
      onRestart: () => this.scene.restart({
        levelId: state.levelId
      })
    });
    this.dependencies.ui.updateHud(this.bridge.getHudSnapshot());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", this.handlePointer, this);
      this.input.off("pointermove", this.handlePointer, this);
      this.input.off("pointerup", this.clearPointer, this);
      this.input.off("pointerupoutside", this.clearPointer, this);
      this.gemViews.clear();
      this.enemyViews.clear();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.bridge || this.resultShown) {
      return;
    }

    this.bridge.tick(delta);
    this.syncView();
    this.dependencies.ui.updateHud(this.bridge.getHudSnapshot());

    const state = this.bridge.getState();
    if (state.status !== "playing") {
      this.resultShown = true;
      this.showResult();
    }
  }

  private drawArena(): void {
    if (!this.bridge) {
      return;
    }

    const state = this.bridge.getState();
    const graphics = this.add.graphics();
    graphics.fillStyle(state.arenaTint, 1);
    graphics.fillRect(42, 112, state.width - 84, state.height - 190);
    graphics.lineStyle(4, 0x34e7ff, 0.75);
    graphics.strokeRect(42, 112, state.width - 84, state.height - 190);

    for (let y = 140; y < state.height - 110; y += 42) {
      graphics.lineStyle(1, 0x34e7ff, 0.12);
      graphics.lineBetween(58, y, state.width - 58, y);
    }

    for (let x = 72; x < state.width - 58; x += 42) {
      graphics.lineStyle(1, 0xf45dff, 0.1);
      graphics.lineBetween(x, 130, x, state.height - 122);
    }
  }

  private createGem(gem: GemState): Phaser.GameObjects.Image {
    return this.add.image(gem.x, gem.y, "8bitgo.gem").setScale(4);
  }

  private createEnemy(enemy: EnemyState): Phaser.GameObjects.Image {
    return this.add.image(enemy.x, enemy.y, "8bitgo.enemy").setScale(4);
  }

  private handlePointer(pointer: Phaser.Input.Pointer): void {
    if (!this.bridge || pointer.y < 112) {
      return;
    }

    this.bridge.handleAction({
      type: "moveTo",
      x: pointer.x,
      y: pointer.y
    });
  }

  private clearPointer(): void {
    this.bridge?.handleAction({
      type: "clearMove"
    });
  }

  private syncView(): void {
    if (!this.bridge) {
      return;
    }

    const state = this.bridge.getState();
    this.player.setPosition(state.player.x, state.player.y);
    snapObjectToPixel(this.player);

    this.exit
      .setTexture(state.exit.active ? "8bitgo.exit.open" : "8bitgo.exit.closed")
      .setAlpha(state.exit.active ? 1 : 0.9);
    snapObjectToPixel(this.exit);

    for (const gem of state.gems) {
      const view = this.gemViews.get(gem.id);
      if (!view) {
        continue;
      }
      view.setVisible(!gem.collected);
    }

    for (const enemy of state.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view) {
        continue;
      }
      view.setPosition(enemy.x, enemy.y);
      snapObjectToPixel(view);
    }
  }

  private showResult(): void {
    if (!this.bridge) {
      return;
    }

    const state = this.bridge.getState();
    const won = state.status === "won";
    const premiumPrompt =
      won && state.levelId === "free-sector" && !this.dependencies.profileStore.hasPremiumAccess();

    if (won) {
      this.dependencies.profileStore.incrementStat("totalWins");
      this.dependencies.profileStore.markLevelCompleted(state.levelId);
    }

    this.dependencies.analytics.track(won ? "level_completed" : "level_failed", {
      levelId: state.levelId,
      gems: collectedGemCount(state)
    });

    this.dependencies.ui.showResult({
      title: won ? "Sector Clear" : "Signal Lost",
      subtitle: won ? "The route is stable." : "The bugs collapsed the line.",
      meta: `${state.levelTitle} // chips ${collectedGemCount(state)}/${state.requiredGems}`,
      premiumPrompt,
      onRetry: () => this.scene.restart({
        levelId: state.levelId
      }),
      onMenu: () => this.scene.start("MenuScene"),
      onNext: () => {
        const nextLevelId = state.levelId === "free-sector" ? "premium-sector" : "free-sector";
        if (nextLevelId === "premium-sector" && !this.dependencies.profileStore.hasPremiumAccess()) {
          this.scene.start("MenuScene");
          return;
        }
        this.scene.start("SampleGameScene", {
          levelId: nextLevelId
        });
      },
      onUnlock: () => this.scene.start("MenuScene")
    });
  }
}
