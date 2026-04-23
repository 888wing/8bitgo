import Phaser from "phaser";

import { assetManifest } from "../../assets/manifest";
import { preloadManifest } from "../core/assetManifest";
import { applyPixelSceneDefaults } from "../core/pixelScale";
import { HudRoot } from "../ui/HudRoot";

export class BootScene extends Phaser.Scene {
  constructor(private readonly ui: HudRoot) {
    super("BootScene");
  }

  preload(): void {
    applyPixelSceneDefaults(this);
    preloadManifest(this, assetManifest);
  }

  create(): void {
    this.ui.showBooting("Preparing cabinet...");
    this.scene.start("MenuScene");
  }
}

