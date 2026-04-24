import Phaser from "phaser";

import { ensureStarterPixelTextures } from "../../8bitgo/art/pixelTextureFactory";
import type { SceneDependencies } from "../../8bitgo/core/registerScenes";
import { applyPixelSceneDefaults, snapObjectToPixel } from "../../8bitgo/core/pixelScale";
import type { CourierToolId } from "../../8bitgo/ui/HudRoot";
import { getCourierLevel } from "../content/courierLevels";
import { CourierGameBridge } from "./CourierGameBridge";
import {
  directionGlyph,
  sameCell,
  type CourierAction,
  type CourierGameState,
  type Direction,
  type RouteCommand,
  type RouteCommandType,
  type Vec2
} from "../simulation/courierTypes";
import { commandAt } from "../simulation/courierLogic";

interface CourierGameSceneData {
  levelId?: string;
}

interface ToolCommand {
  commandType: RouteCommandType;
  direction?: Direction;
}

const CELL_SIZE = 46;
const GRID_TOP = 178;
const COURIER_SCALE = 3.4;
const HAZARD_SCALE = 2.7;
const TOKEN_SCALE = 3.2;

function toolToCommand(tool: CourierToolId): ToolCommand {
  if (tool === "turn-up") {
    return { commandType: "turn", direction: "up" };
  }

  if (tool === "turn-right") {
    return { commandType: "turn", direction: "right" };
  }

  if (tool === "turn-down") {
    return { commandType: "turn", direction: "down" };
  }

  if (tool === "turn-left") {
    return { commandType: "turn", direction: "left" };
  }

  return { commandType: tool };
}

function rerouteDirection(tool: CourierToolId): Direction | null {
  if (tool === "turn-up") {
    return "up";
  }

  if (tool === "turn-right") {
    return "right";
  }

  if (tool === "turn-down") {
    return "down";
  }

  if (tool === "turn-left") {
    return "left";
  }

  return null;
}

function commandGlyph(command: RouteCommand): string {
  if (command.type === "turn" && command.direction) {
    return directionGlyph(command.direction);
  }

  if (command.type === "boost") {
    return "B";
  }

  if (command.type === "wait") {
    return "W";
  }

  return "#";
}

export class CourierGameScene extends Phaser.Scene {
  private bridge: CourierGameBridge | null = null;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private courier!: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  private exit!: Phaser.GameObjects.Image;
  private readonly packetViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly terminalViews = new Map<number, Phaser.GameObjects.Image>();
  private readonly hazardViews = new Map<string, Phaser.GameObjects.Image>();
  private readonly commandLabels: Phaser.GameObjects.Text[] = [];
  private selectedTool: CourierToolId = "turn-right";
  private resultShown = false;
  private gridLeft = 78;

  constructor(private readonly dependencies: SceneDependencies) {
    super("CourierGameScene");
  }

  create(data: CourierGameSceneData = {}): void {
    applyPixelSceneDefaults(this);
    ensureStarterPixelTextures(this);
    this.resultShown = false;
    this.packetViews.clear();
    this.terminalViews.clear();
    this.hazardViews.clear();
    this.destroyCommandLabels();

    this.bridge = new CourierGameBridge({
      levelId: data.levelId ?? "sector-01"
    });

    const state = this.bridge.getState();
    this.gridLeft = Math.round((state.level.gridSize.width * -CELL_SIZE + 540) / 2);
    this.cameras.main.setBackgroundColor("#060813");

    this.gridGraphics = this.add.graphics();
    this.createTokenViews(state);
    this.createInputHandlers();

    this.dependencies.profileStore.incrementStat("totalStarts");
    this.dependencies.ui.showCourierHud({
      selectedTool: this.selectedTool,
      onRun: () => this.handleBridgeAction({ type: "startRun" }),
      onPausePulse: () => this.handleBridgeAction({ type: "pausePulse" }),
      onSelectTool: (tool) => {
        this.selectedTool = tool;
        this.refreshHud();
      },
      onPause: () => this.scene.start("MenuScene"),
      onRestart: () => this.scene.restart({
        levelId: state.level.id
      })
    });

    this.syncView();
    this.refreshHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", this.handlePointerDown, this);
      this.destroyCommandLabels();
      this.packetViews.clear();
      this.terminalViews.clear();
      this.hazardViews.clear();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.bridge || this.resultShown) {
      return;
    }

    this.bridge.tick(delta);
    this.syncView();
    this.dependencies.ui.updateHud(this.bridge.getHudSnapshot());

    const status = this.bridge.getState().status;
    if (status === "won" || status === "lost") {
      this.resultShown = true;
      this.showResult();
    }
  }

  private createInputHandlers(): void {
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  private createTokenViews(state: CourierGameState): void {
    this.exit = this.add
      .image(0, 0, "8bitgo.exit.closed")
      .setScale(4.2)
      .setAlpha(0.95);

    for (const packet of state.packets) {
      this.packetViews.set(
        packet.id,
        this.add.image(0, 0, "8bitgo.gem").setScale(TOKEN_SCALE)
      );
    }

    for (const terminal of state.terminals) {
      this.terminalViews.set(
        terminal.id,
        this.add.image(0, 0, "8bitgo.terminal").setScale(TOKEN_SCALE)
      );
    }

    for (const hazard of state.hazards) {
      this.hazardViews.set(
        hazard.id,
        this.add
          .image(0, 0, hazard.kind === "bugPatrol" ? "8bitgo.enemy" : "8bitgo.glitch")
          .setScale(HAZARD_SCALE)
      );
    }

    if (this.textures.exists("forge.courier")) {
      this.courier = this.add
        .sprite(0, 0, "forge.courier")
        .setScale(0.48)
        .setDepth(10);
      return;
    }

    this.courier = this.add.image(0, 0, "8bitgo.player").setScale(COURIER_SCALE).setDepth(10);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.bridge) {
      return;
    }

    const cell = this.pointerToCell(pointer);
    if (!cell) {
      return;
    }

    const state = this.bridge.getState();
    if (state.status === "planning") {
      const existing = commandAt(state, cell);
      if (existing) {
        this.handleBridgeAction({ type: "removeCommand", at: cell });
        return;
      }

      const toolCommand = toolToCommand(this.selectedTool);
      this.handleBridgeAction({
        type: "placeCommand",
        at: cell,
        ...toolCommand
      });
      return;
    }

    if (state.status === "running") {
      const direction = rerouteDirection(this.selectedTool);
      if (direction) {
        this.handleBridgeAction({ type: "reroute", direction });
      }
    }
  }

  private handleBridgeAction(action: CourierAction): void {
    if (!this.bridge) {
      return;
    }

    const result = this.bridge.handleAction(action);
    this.dependencies.analytics.track("courier_action", {
      action: action.type,
      ok: result.ok
    });
    this.syncView();
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.bridge) {
      return;
    }

    this.dependencies.ui.showCourierHud({
      selectedTool: this.selectedTool,
      onRun: () => this.handleBridgeAction({ type: "startRun" }),
      onPausePulse: () => this.handleBridgeAction({ type: "pausePulse" }),
      onSelectTool: (tool) => {
        this.selectedTool = tool;
        this.refreshHud();
      },
      onPause: () => this.scene.start("MenuScene"),
      onRestart: () => this.scene.restart({
        levelId: this.bridge?.getState().level.id
      })
    });
    this.dependencies.ui.updateHud(this.bridge.getHudSnapshot());
  }

  private syncView(): void {
    if (!this.bridge) {
      return;
    }

    const state = this.bridge.getState();
    this.drawGrid(state);
    this.syncTokens(state);
    this.drawCommands(state);
  }

  private drawGrid(state: CourierGameState): void {
    this.gridGraphics.clear();

    for (let y = 0; y < state.level.gridSize.height; y += 1) {
      for (let x = 0; x < state.level.gridSize.width; x += 1) {
        const cell = { x, y };
        const topLeft = this.cellTopLeft(cell);
        const wall = state.level.walls.some((candidate) => sameCell(candidate, cell));
        const isExit = sameCell(state.level.exit, cell);
        const delivered = state.courier.deliveredPackets >= state.packets.length;
        const fill = wall ? 0x16233a : isExit && delivered ? 0x193c1c : 0x0b1730;

        this.gridGraphics.fillStyle(fill, 0.92);
        this.gridGraphics.fillRect(topLeft.x + 2, topLeft.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        this.gridGraphics.lineStyle(1, wall ? 0x607597 : 0x34e7ff, wall ? 0.5 : 0.26);
        this.gridGraphics.strokeRect(topLeft.x + 2, topLeft.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }
  }

  private syncTokens(state: CourierGameState): void {
    this.exit
      .setTexture(
        state.courier.deliveredPackets >= state.packets.length
          ? "8bitgo.exit.open"
          : "8bitgo.exit.closed"
      )
      .setPosition(this.cellCenter(state.level.exit).x, this.cellCenter(state.level.exit).y);

    for (const packet of state.packets) {
      const view = this.packetViews.get(packet.id);
      if (!view) {
        continue;
      }
      const center = this.cellCenter(packet.cell);
      view.setPosition(center.x, center.y).setVisible(!packet.collected);
    }

    for (const terminal of state.terminals) {
      const view = this.terminalViews.get(terminal.id);
      if (!view) {
        continue;
      }
      const center = this.cellCenter(terminal.cell);
      view.setPosition(center.x, center.y).setAlpha(0.9);
    }

    for (const hazard of state.hazards) {
      const view = this.hazardViews.get(hazard.id);
      if (!view) {
        continue;
      }
      const center = this.cellCenter(hazard.cell);
      view
        .setPosition(center.x, center.y)
        .setAlpha(hazard.active ? 1 : 0.25)
        .setTint(hazard.kind === "glitchPulse" && hazard.active ? 0xf45dff : 0xffffff);
    }

    const courierCenter = this.cellCenter(state.courier.cell);
    this.courier
      .setPosition(courierCenter.x, courierCenter.y)
      .setAngle(this.directionAngle(state.courier.direction));
    this.playCourierAnimation(state.courier.direction);
    snapObjectToPixel(this.courier);
  }

  private playCourierAnimation(direction: Direction): void {
    if (!(this.courier instanceof Phaser.GameObjects.Sprite)) {
      return;
    }

    const animationKey = `forge.courier.${direction}`;
    if (!this.anims.exists(animationKey)) {
      return;
    }

    this.courier.setAngle(0);
    this.courier.play(animationKey, true);
  }

  private drawCommands(state: CourierGameState): void {
    this.destroyCommandLabels();

    for (const command of state.commands) {
      const center = this.cellCenter(command.at);
      const label = this.add
        .text(center.x, center.y, commandGlyph(command), {
          color: command.used ? "#607597" : "#ffd454",
          fontFamily: "Courier New, monospace",
          fontSize: "22px",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12);
      this.commandLabels.push(label);
    }
  }

  private destroyCommandLabels(): void {
    while (this.commandLabels.length > 0) {
      this.commandLabels.pop()?.destroy();
    }
  }

  private pointerToCell(pointer: Phaser.Input.Pointer): Vec2 | null {
    if (!this.bridge) {
      return null;
    }

    const state = this.bridge.getState();
    const x = Math.floor((pointer.x - this.gridLeft) / CELL_SIZE);
    const y = Math.floor((pointer.y - GRID_TOP) / CELL_SIZE);

    if (x < 0 || y < 0 || x >= state.level.gridSize.width || y >= state.level.gridSize.height) {
      return null;
    }

    return { x, y };
  }

  private cellTopLeft(cell: Vec2): Vec2 {
    return {
      x: this.gridLeft + cell.x * CELL_SIZE,
      y: GRID_TOP + cell.y * CELL_SIZE
    };
  }

  private cellCenter(cell: Vec2): Vec2 {
    const topLeft = this.cellTopLeft(cell);
    return {
      x: topLeft.x + CELL_SIZE / 2,
      y: topLeft.y + CELL_SIZE / 2
    };
  }

  private directionAngle(direction: Direction): number {
    if (direction === "right") {
      return 90;
    }

    if (direction === "down") {
      return 180;
    }

    if (direction === "left") {
      return 270;
    }

    return 0;
  }

  private showResult(): void {
    if (!this.bridge) {
      return;
    }

    const state = this.bridge.getState();
    const won = state.status === "won";
    const nextLevelId = this.bridge.getNextLevelId();
    const nextLevel = getCourierLevel(nextLevelId);
    const premiumPrompt = won && nextLevel.premium && !this.dependencies.profileStore.hasPremiumAccess();

    if (won) {
      this.dependencies.profileStore.incrementStat("totalWins");
      this.dependencies.profileStore.markLevelCompleted(state.level.id);
    }

    this.dependencies.analytics.track(won ? "courier_level_completed" : "courier_level_failed", {
      levelId: state.level.id,
      tick: state.tick,
      hp: state.courier.hp
    });

    this.dependencies.ui.showResult({
      title: won ? "Route Clear" : "Route Corrupt",
      subtitle: won ? "Packets reached the output port." : "The courier needs a cleaner plan.",
      meta: `${state.level.title} // tick ${state.tick}/${state.level.parTicks} // hp ${state.courier.hp}`,
      premiumPrompt,
      primaryTitle: won ? "Next Sector" : "Replan Route",
      primarySubtitle: won ? nextLevel.title : "Return to planning",
      retryTitle: "Reset Sector",
      retrySubtitle: "Clear commands and try again",
      onRetry: () => this.scene.restart({
        levelId: state.level.id
      }),
      onMenu: () => this.scene.start("MenuScene"),
      onNext: () => {
        if (!won) {
          this.scene.restart({
            levelId: state.level.id
          });
          return;
        }

        if (nextLevel.premium && !this.dependencies.profileStore.hasPremiumAccess()) {
          this.scene.start("MenuScene");
          return;
        }

        this.dependencies.profileStore.setSelectedLevel(nextLevelId);
        this.scene.start("CourierGameScene", {
          levelId: nextLevelId
        });
      },
      onUnlock: () => this.scene.start("MenuScene")
    });
  }
}
