import Phaser from "phaser";

export function applyPixelSceneDefaults(scene: Phaser.Scene): void {
  scene.cameras.main.roundPixels = true;

  const canvas = scene.game.canvas;
  canvas.style.imageRendering = "pixelated";
  canvas.style.touchAction = "none";
}

export function snapPixel(value: number): number {
  return Math.round(value);
}

export function snapObjectToPixel(object: Phaser.GameObjects.Components.Transform): void {
  object.x = snapPixel(object.x);
  object.y = snapPixel(object.y);
}

