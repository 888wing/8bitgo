import Phaser from "phaser";

export interface VirtualSize {
  width: number;
  height: number;
}

export interface CreateGameOptions {
  mountNode: HTMLElement;
  virtualSize: VirtualSize;
  backgroundColor: string;
  scenes: Phaser.Scene[];
  physics?: Phaser.Types.Core.PhysicsConfig;
}

export function create8bitgoGame(options: CreateGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.mountNode,
    width: options.virtualSize.width,
    height: options.virtualSize.height,
    backgroundColor: options.backgroundColor,
    input: {
      activePointers: 2
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: options.virtualSize.width,
      height: options.virtualSize.height
    },
    physics: options.physics,
    pixelArt: true,
    roundPixels: true,
    scene: options.scenes
  });
}

