import Phaser from "phaser";

export type AssetKind = "image" | "spritesheet" | "audio";

export interface BaseAssetDescriptor {
  key: string;
  path: string;
  kind: AssetKind;
}

export interface ImageAssetDescriptor extends BaseAssetDescriptor {
  kind: "image";
}

export interface AudioAssetDescriptor extends BaseAssetDescriptor {
  kind: "audio";
}

export interface SpriteSheetAssetDescriptor extends BaseAssetDescriptor {
  kind: "spritesheet";
  frameWidth: number;
  frameHeight: number;
}

export type AssetDescriptor =
  | ImageAssetDescriptor
  | AudioAssetDescriptor
  | SpriteSheetAssetDescriptor;

export interface AssetManifest {
  assets: AssetDescriptor[];
}

export function preloadManifest(scene: Phaser.Scene, manifest: AssetManifest): void {
  for (const asset of manifest.assets) {
    if (asset.kind === "image") {
      scene.load.image(asset.key, asset.path);
      continue;
    }

    if (asset.kind === "audio") {
      scene.load.audio(asset.key, asset.path);
      continue;
    }

    scene.load.spritesheet(asset.key, asset.path, {
      frameWidth: asset.frameWidth,
      frameHeight: asset.frameHeight
    });
  }
}

