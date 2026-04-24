# Pixel Courier MVP Technical Plan

## Product Position

`Pixel Courier: Route Before Run` is the first serious `8bitgo` tech demo. It should prove that the framework can ship a small but differentiated iOS game, not just a Phaser template.

The game is not a Temple Run clone. The core fantasy is packet routing inside a corrupted 8bit network. The player plans a route, then watches the courier execute it while using limited emergency actions to survive.

## MVP Goal

Build one complete vertical slice:

- 1 free tutorial sector.
- 1 premium sector behind IAP.
- 6-8 handmade route-planning levels.
- One controllable courier sprite sheet.
- Two enemy or hazard types.
- One paywall and restore flow.
- Local progression save.
- iOS build path through Capacitor.

The success metric is not content volume. The success metric is whether a new small game can be built by mostly replacing `src/game` while keeping `8bitgo` core stable.

## Core Loop

1. Player sees a compact grid network.
2. Player places limited route commands before execution.
3. Player taps `RUN`.
4. Courier moves automatically on the planned route.
5. During execution, player has 1-2 emergency actions.
6. Courier must collect packets, avoid bugs, and exit through the output port.
7. Win awards stars/chips. Loss resets the level quickly.
8. Clearing the free sector prompts premium unlock.

## Differentiation Rules

- No endless forward movement.
- No three-lane dodge layout.
- No swipe-runner structure.
- No coin-grind as the main loop.
- Every level must ask a routing question: timing, path order, command limit, hazard cycle, or packet priority.

## Technical Architecture

Follow the existing `8bitgo` boundary:

- `src/game/simulation`: source of truth for grid, commands, courier state, hazard state, win/loss.
- `src/game/phaser`: render adapter, pointer input, grid drawing, sprite animation playback, camera effects.
- `src/game/content`: level definitions, command budgets, hazard layouts, premium flags.
- `src/8bitgo/ui`: DOM menu, HUD, route command tray, result/paywall surface.
- `src/assets`: generated sprite manifest from `agent-sprite-forge`.

Phaser scenes must stay thin. Simulation owns the game. Phaser displays the current state and forwards player actions.

## Proposed File Shape

```text
src/game/content/
  courierLevels.ts
  courierCampaign.ts

src/game/simulation/
  courierTypes.ts
  courierState.ts
  courierCommands.ts
  courierHazards.ts
  courierLogic.ts
  courierScoring.ts

src/game/phaser/
  CourierGameBridge.ts
  CourierGameScene.ts
  CourierGridRenderer.ts
  CourierSpriteRenderer.ts

src/game/ui/
  courierHudTypes.ts
```

For MVP, this can replace the current sample game rather than live beside it. If we want to keep the sample, register both scenes and route through MenuScene.

## Simulation Model

Grid:

```ts
interface CourierGrid {
  width: number;
  height: number;
  tiles: CourierTile[];
}
```

Tile types:

- `empty`: passable.
- `wall`: blocked.
- `packet`: objective pickup.
- `terminal`: required delivery point.
- `exit`: clear condition after packets are delivered.
- `hazard`: static danger.
- `router`: optional forced direction tile.

Courier:

```ts
interface CourierState {
  cell: Vec2;
  direction: Direction;
  hp: number;
  carriedPackets: number;
  deliveredPackets: number;
  moveProgress: number;
  status: "planning" | "running" | "won" | "lost";
}
```

Commands:

```ts
type RouteCommand =
  | { type: "turn"; at: Vec2; direction: Direction }
  | { type: "boost"; at: Vec2 }
  | { type: "wait"; at: Vec2; beats: 1 | 2 }
  | { type: "firewall"; at: Vec2 };
```

Emergency actions:

- `pausePulse`: freeze hazards briefly.
- `reroute`: change direction once while running.

Keep emergency actions scarce. They are there to create tension, not to turn the game into free movement.

## Level Schema

```ts
interface CourierLevelDefinition {
  id: string;
  title: string;
  premium: boolean;
  gridSize: { width: number; height: number };
  start: { cell: Vec2; direction: Direction };
  exit: Vec2;
  packets: Vec2[];
  terminals: Vec2[];
  walls: Vec2[];
  hazards: HazardDefinition[];
  commandBudget: {
    turn: number;
    boost: number;
    wait: number;
    firewall: number;
    reroute: number;
  };
  parTicks: number;
}
```

Hardcode 6-8 levels first. Do not build a level editor for MVP.

## Hazard Types

MVP should only have two:

- `bugPatrol`: moves between two or more cells on a beat cycle.
- `glitchPulse`: turns dangerous on/off every few beats.

This is enough to show timing, routing, and animation without building a large enemy system.

## Phaser Scene Responsibilities

`CourierGameScene`:

- Build grid visuals from simulation state.
- Convert pointer taps into command placement.
- Show command previews before `RUN`.
- Call bridge `tick(deltaMs)`.
- Play courier and hazard animations from manifest keys.
- Trigger shake, flash, and result transitions.

`CourierGameBridge`:

- Own `CourierGameState`.
- Expose `getState()`.
- Expose `getHudSnapshot()`.
- Accept actions:
  - `placeCommand`
  - `removeCommand`
  - `startRun`
  - `emergencyAction`
  - `restart`

## Input Design

Planning phase:

- Tap command button in DOM tray.
- Tap grid cell to place command.
- Tap existing command to remove.
- Tap `RUN` to execute.

Running phase:

- Tap emergency action button.
- Optional tap adjacent direction only when `reroute` is available.

This keeps mobile controls simple and avoids virtual joystick complexity.

## UI/HUD

DOM HUD should show:

- Level title.
- Phase: `PLAN` or `RUN`.
- Packet count.
- Command budget.
- Emergency action count.
- Restart/Menu buttons.

Canvas should show:

- Grid.
- Courier.
- Packets/terminals/exit.
- Hazards.
- Placed commands as pixel icons.
- Movement path preview.

## Sprite Pipeline

Use `agent-sprite-forge` through the existing scripts:

```sh
npm run sprite:setup
npm run sprite:prompt -- \
  --target player \
  --mode player_sheet \
  --name courier \
  --prompt "top-down 4x4 player sheet for a tiny neon packet courier with cyan visor and orange jacket"
```

After image generation:

```sh
npm run sprite:process -- \
  --input /absolute/path/to/raw-courier.png \
  --target player \
  --mode player_sheet \
  --name courier \
  --cell-size 96 \
  --align feet \
  --shared-scale \
  --component-mode largest \
  --reject-edge-touch
```

Runtime animation keys:

- `forge.courier.down`
- `forge.courier.left`
- `forge.courier.right`
- `forge.courier.up`

For hazards, use `asset` target:

```sh
npm run sprite:prompt -- \
  --target asset \
  --mode idle \
  --name bug-patrol \
  --prompt "small corrupted malware bug, sharp 8bit pixel art, readable at 32 pixels"
```

## IAP Integration

Free sector:

- Levels `sector-01` to `sector-04`.
- After completion, show result screen with premium prompt.

Premium sector:

- Levels `sector-05` to `sector-08`.
- Gated by `profileStore.hasPremiumAccess()`.
- Purchase and restore already exist through `RevenueCatBillingService`.

Do not add subscriptions or consumables in this tech demo. Keep the product route as one non-consumable full unlock.

## MVP Development Flow

### Phase 1: Replace Sample With Route Planning Skeleton

Deliverables:

- `CourierGameState`.
- One hardcoded 8x10 level.
- Planning/running phases.
- Courier auto-moves cell by cell.
- Win/loss states.

Exit criteria:

- Player can place a simple turn command and finish one level.

### Phase 2: Command System

Deliverables:

- `turn`, `boost`, `wait`, `firewall`.
- Command budget validation.
- Command preview icons.
- Remove/re-place command UX.

Exit criteria:

- Level can require at least two different command types.

### Phase 3: Hazards And Timing

Deliverables:

- `bugPatrol`.
- `glitchPulse`.
- Beat-based hazard updates.
- Collision and HP/loss logic.

Exit criteria:

- Player must solve both path and timing, not just draw a route.

### Phase 4: Real Pixel Assets

Deliverables:

- Courier spritesheet via sprite forge.
- Bug/hazard spritesheet or image.
- Packet, terminal, exit icons.
- Manifest preload and Phaser animation playback.

Exit criteria:

- No core actor is still a placeholder rectangle.

### Phase 5: Campaign And Progression

Deliverables:

- 4 free levels.
- 4 premium levels.
- Level completion saved in profile.
- Basic stars: clear, under par, no damage.

Exit criteria:

- Free-to-premium flow is testable in one session.

### Phase 6: IAP And App Review Pass

Deliverables:

- Paywall copy tailored to Pixel Courier.
- RevenueCat product IDs configured.
- Restore purchase tested.
- `review:packet` copy updated.
- `release:guard`, `ios:prepare`, `ios:verify`.

Exit criteria:

- TestFlight-ready build can be produced.

## MVP Cutline

Must have:

- Route planning.
- Auto-run execution.
- Command budgets.
- Two hazard types.
- Free/premium gate.
- Generated spritesheet pipeline.
- iOS build verification.

Should not have yet:

- Level editor.
- Random generation.
- Online leaderboard.
- Multiple characters.
- Consumable currency.
- Complex upgrade tree.
- More than one IAP product.

## First Implementation Task

Start by replacing `SampleGameState` and `SampleGameScene` with a single Courier level:

1. Add `courierTypes.ts`.
2. Add `courierState.ts`.
3. Add `courierLogic.ts`.
4. Add `CourierGameBridge.ts`.
5. Add `CourierGameScene.ts`.
6. Register `CourierGameScene` in `registerScenes.ts`.
7. Keep MenuScene and BillingService unchanged.

This is the fastest path to prove the gameplay without expanding `8bitgo` core prematurely.
