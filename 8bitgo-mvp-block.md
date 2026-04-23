# 8bitgo MVP Build Block

## Mission

Build `8bitgo` as a Phaser-based iOS game production starter, not as a new game engine.

The purpose of `8bitgo` MVP is to let one developer produce small, polished, App Store-ready 8bit-style games faster by standardizing the parts that repeat across games:

- Phaser + TypeScript + Vite project setup
- Capacitor iOS wrapper
- RevenueCat / StoreKit-backed in-app purchase flow
- save/profile/progression storage
- paywall and premium unlock UX
- pixel-style UI kit
- pixel-perfect Phaser defaults
- release/build guards
- App Store screenshot/review packet workflow

`8bitgo` must not try to replace Phaser. Phaser remains the game framework. `8bitgo` is the production layer above Phaser.

The core question for MVP is:

> Can 8bitgo reduce the time needed to create the next iOS Phaser game by at least 50%, while preserving a consistent 8bit visual identity and reusable IAP pipeline?

## Product Position

`8bitgo` is an opinionated starter kit and internal framework for making 8bit-inspired mobile web games packaged as iOS apps.

It should be described as:

> A Phaser-powered 8bit iOS game starter with built-in pixel styling, IAP, profile saves, paywalls, and release automation.

It should not be described as:

- a Phaser replacement
- a new renderer
- a full game engine
- a no-code editor
- a fantasy console
- a general-purpose framework for every genre

The first version exists to support fast production of small games similar in scope to `Loopline` and `Orbit Stack`.

## Hard Constraints

The MVP must obey these constraints:

- Use Phaser as the rendering, scene, input, camera, timing, animation, and optional physics layer.
- Use TypeScript.
- Use Vite for local dev and web build.
- Use Capacitor for iOS packaging.
- Use RevenueCat Capacitor SDK for IAP unless there is a strong reason to write direct StoreKit code later.
- Treat App Store build safety as a first-class feature.
- Keep gameplay rules outside Phaser scenes wherever practical.
- Keep dense menus and paywalls in DOM unless a game specifically needs full in-canvas UI.
- Make pixel consistency a default, not a guideline.
- Do not build a visual editor in MVP.
- Do not build a marketplace in MVP.
- Do not support Android in MVP beyond keeping the architecture compatible.
- Do not support remote game loading or a game portal model in MVP.
- Do not download new executable game logic from a server.
- Each shipped game should be its own iOS app binary.

## MVP Outcome

At the end of MVP, running:

```bash
npm create 8bitgo my-game
cd my-game
npm run dev
npm run build
npm run ios:prepare
npm run ios:verify
```

should produce a working Phaser game starter with:

- portrait mobile canvas
- 8bitgo shell UI
- main menu
- playable sample game scene
- result screen
- paywall
- restore purchases action
- profile save
- premium entitlement flag
- Capacitor iOS project
- RevenueCat configuration seam
- release guard scripts
- placeholder App Store review notes
- screenshot capture harness

The sample game can be simple. The reusable structure is more important than game depth.

## Recommended MVP Template

Use `Loopline` as the main architecture source because it already has better separation:

- `main.ts` creates DOM shell, HUD root, profile service, billing service, and Phaser game.
- `createGame.ts` owns Phaser config.
- `registerScenes.ts` injects UI/profile/billing into scenes.
- `BootScene` loads asset manifest.
- `MenuScene` owns start/continue/paywall entry.
- `RunScene` adapts simulation state into Phaser objects.
- `SceneBridge` owns deterministic simulation ticking and semantic input.
- `RevenueCatBillingService` owns store initialization, purchase, restore, and entitlement state.
- `ProfileService` owns local save/profile/premium status.

Use `Orbit Stack` as evidence of what must be avoided:

- single giant scene
- IAP, profile, progression, map, paywall, rendering, input, analytics all inside one class
- game-specific strings and product names hardcoded deep in logic

The MVP should extract the reusable shape from `Loopline`, then allow games like `Orbit Stack` to plug in their own game scene and content.

## Directory Structure

Create the MVP template with this structure:

```text
8bitgo-template-phaser-ios/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  capacitor.config.ts
  src/
    main.ts
    style.css
    8bitgo/
      config/
        gameConfig.ts
        billingConfig.ts
        appConfig.ts
      core/
        createGame.ts
        registerScenes.ts
        pixelScale.ts
        assetManifest.ts
      services/
        billing/
          BillingService.ts
          RevenueCatBillingService.ts
          billingTypes.ts
        profile/
          ProfileStore.ts
          profileTypes.ts
        analytics/
          AnalyticsService.ts
          ConsoleAnalyticsService.ts
      scenes/
        BootScene.ts
        MenuScene.ts
        SampleGameScene.ts
        ResultScene.ts
      ui/
        HudRoot.ts
        components/
          PixelButton.ts
          PixelPanel.ts
          PaywallView.ts
          ResultView.ts
          MenuView.ts
      release/
        releaseTypes.ts
    game/
      content/
        sampleLevels.ts
      simulation/
        sampleState.ts
        sampleLogic.ts
      phaser/
        SampleGameScene.ts
    assets/
      manifest.ts
  public/
    assets/
      ui/
      sprites/
    audio/
  scripts/
    create-game.mjs
    validate-billing.mjs
    verify-ios-bundle.mjs
    capture-screenshots.mjs
    build-review-packet.mjs
  docs/
    app-store-checklist.md
    revenuecat-setup.md
    mvp-architecture.md
```

In MVP, `src/8bitgo/` is not necessarily published as a separate npm package yet. It can start as template source code. Extract into a package only after two or three more games prove the API shape.

## Game Config

Every generated game should be controlled by one high-level config object.

Example:

```ts
export const appConfig = {
  gameId: "my_game",
  title: "My 8bit Game",
  bundleId: "com.yourstudio.mygame",
  sku: "com.yourstudio.mygame",
  version: "0.1.0",
  orientation: "portrait",
  virtualSize: {
    width: 540,
    height: 960
  },
  theme: {
    background: "#060813",
    panel: "#101827",
    ink: "#f7fbff",
    cyan: "#34e7ff",
    pink: "#f45dff",
    amber: "#ffd454",
    lime: "#b8ff61"
  }
} as const;
```

This config should feed:

- Phaser scale config
- CSS frame size
- Capacitor config generation later
- screenshot labels
- review packet text
- storage keys
- analytics event namespace
- RevenueCat product defaults

## Billing Config

IAP configuration must be explicit and game-specific.

Example:

```ts
export const billingConfig = {
  provider: "revenuecat",
  entitlementId: "my_game_full",
  offeringId: "launch",
  packageId: "$rc_lifetime",
  products: {
    fullUnlock: {
      productId: "com.yourstudio.mygame.full_unlock",
      type: "non_consumable",
      title: "Full Game Unlock",
      description: "Unlock all premium levels and modes."
    }
  },
  devPreviewEnabled: import.meta.env.DEV
} as const;
```

The MVP should support one product type first:

- non-consumable full game unlock

Do not support subscriptions, consumable coins, ads, or battle passes in MVP. Those can be added after the first template proves stable.

## Billing Service API

The reusable billing layer should expose a small stable API:

```ts
export interface BillingSnapshot {
  initialized: boolean;
  platform: "web" | "ios" | "android";
  status: "loading" | "ready" | "unavailable" | "unconfigured" | "error";
  premiumActive: boolean;
  isBusy: boolean;
  canPurchase: boolean;
  canRestore: boolean;
  priceLabel: string | null;
  packageTitle: string | null;
  managementUrl: string | null;
  statusLabel: string;
  errorMessage: string | null;
  previewEnabled: boolean;
}

export interface BillingService {
  initialize(): Promise<void>;
  getSnapshot(): BillingSnapshot;
  subscribe(listener: (snapshot: BillingSnapshot) => void): () => void;
  purchaseFullUnlock(): Promise<BillingActionResult>;
  restorePurchases(): Promise<BillingActionResult>;
}
```

The service should not know the specific game name, paywall copy, campaign structure, or scene names.

It may update `ProfileStore` through a generic entitlement method:

```ts
profileStore.setEntitlement("premium", true);
```

Avoid hardcoded text like:

- `Full Run`
- `Full Orbit`
- `Null Warden`
- `Premium Route`

Those belong in game config or UI copy config.

## Profile Store API

The MVP should ship a generic localStorage-backed profile store.

Required responsibilities:

- load profile
- save profile
- set premium entitlement
- track first launch
- track total starts
- track total wins
- track paywall views
- track purchases
- track restores
- store last selected level or mode

Suggested API:

```ts
export interface BaseProfile {
  schemaVersion: number;
  premiumUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalStarts: number;
    totalWins: number;
    paywallViews: number;
    purchases: number;
    restores: number;
  };
  flags: Record<string, boolean>;
}

export interface ProfileStore<TProfile extends BaseProfile = BaseProfile> {
  get(): TProfile;
  set(next: TProfile): void;
  patch(patch: Partial<TProfile>): void;
  setPremiumAccess(active: boolean): void;
  incrementStat(key: keyof TProfile["stats"]): void;
  reset(): void;
}
```

Game-specific profiles can extend this, but the base template should not require each game to rewrite storage and migration logic.

## Pixel Rules

8bitgo must make pixel consistency visible and enforceable.

MVP pixel rules:

- Phaser canvas uses fixed virtual resolution.
- Phaser scale mode uses `FIT`.
- camera `roundPixels` defaults to `true`.
- CSS disables page scrolling and touch callouts.
- canvas is the only interactive game surface except DOM overlay.
- image rendering uses pixelated CSS where applicable.
- UI components use blocky borders, hard shadows, no blurry glass effects by default.
- default font should be a pixel-like font stack or bundled bitmap/pixel font.
- generated assets should be loaded through manifest keys, not scattered paths.

MVP does not need a full asset validator yet, but it should include a first simple validation script:

- reject missing manifest files
- warn on SVG usage if the game claims strict pixel mode
- warn on image dimensions not divisible by expected tile size
- warn on non-PNG raster assets for sprites
- warn if no pixel font is configured

## Phaser Config

MVP should standardize this:

```ts
export function create8bitgoGame(options: CreateGameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.mountNode,
    width: options.virtualSize.width,
    height: options.virtualSize.height,
    backgroundColor: options.backgroundColor,
    input: {
      activePointers: 1
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: options.virtualSize.width,
      height: options.virtualSize.height
    },
    physics: options.physics ?? undefined,
    pixelArt: true,
    roundPixels: true,
    scene: options.scenes
  });
}
```

The template should allow physics to be optional. Not every 8bitgo game needs Arcade Physics.

## Scene Contract

8bitgo scenes should follow this pattern:

```text
BootScene
  loads manifest assets
  initializes minimal loading screen
  starts MenuScene

MenuScene
  reads profile
  shows start/continue/full unlock
  opens paywall
  starts game scene

GameScene
  game-specific
  owns Phaser objects
  talks to simulation or game logic through a bridge
  emits result

ResultScene or Result UI
  shows win/loss
  offers retry/menu/next/paywall
```

For MVP, it is acceptable for the sample game scene to be simple, but its structure must demonstrate the intended boundary.

## Simulation Boundary

The MVP should include a minimal sample bridge, even if the sample game is small.

The pattern:

```ts
export class SampleGameBridge {
  private state: SampleGameState;

  constructor(options: SampleGameBridgeOptions) {
    this.state = createInitialSampleState(options);
  }

  getState(): SampleGameState {
    return this.state;
  }

  tick(deltaMs: number): void {
    // deterministic gameplay update
  }

  handleAction(action: SampleAction): void {
    // semantic input only
  }

  getHudSnapshot(): SampleHudSnapshot {
    // UI-safe view of state
  }
}
```

This is important because `Orbit Stack` shows how fast a Phaser scene becomes unmanageable when everything lives in one class.

## UI Kit

MVP should ship a small 8bitgo UI kit.

Required components:

- `PixelButton`
- `PixelPanel`
- `MenuView`
- `PaywallView`
- `ResultView`
- `HudRoot`

These can be DOM components implemented with plain TypeScript and CSS, not React.

Required paywall props:

```ts
export interface PaywallViewOptions {
  title: string;
  subtitle: string;
  bulletPoints: string[];
  priceLabel: string | null;
  statusLabel: string;
  statusTone: "neutral" | "busy" | "success" | "error";
  primaryLabel: string;
  primaryDisabled: boolean;
  secondaryLabel: string;
  secondaryDisabled: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
}
```

The paywall should be reusable across games. Game-specific copy should be config-driven.

## Starter Sample Game

The MVP needs one tiny playable game, not a full commercial title.

Recommended sample:

> A one-screen 8bit survival/collection game where the player moves around a small arena, collects 8 gems, avoids simple enemies, and reaches an exit.

Why this sample:

- demonstrates Phaser sprite movement
- demonstrates input
- demonstrates result flow
- demonstrates premium gating
- avoids complex content
- avoids needing a full level editor
- easy to reskin

Minimum sample game features:

- player block sprite
- collectible gems
- one enemy type
- exit portal
- win/loss state
- pause button
- result screen
- premium locked second level placeholder

Do not spend MVP time making the sample game deep. The template infrastructure is the product.

## Premium Flow

MVP premium flow:

```text
Free user starts game
Free user can play Level 1
After win, result screen shows Level 2 locked
User taps Unlock Full Game
Paywall opens
RevenueCat purchase or dev preview unlocks premium
Profile premium flag updates
Level 2 button becomes available
Restore purchases available from paywall/menu
```

Required states:

- store loading
- store unavailable in browser
- missing RevenueCat key
- ready with price
- purchase cancelled
- purchase completed
- restore completed
- no previous purchase found
- error

Do not hide these states. App Review and TestFlight debugging need them visible.

## Release Pipeline

MVP scripts:

```json
{
  "dev": "vite",
  "build:web": "npm run validate:billing && tsc --noEmit && vite build",
  "build": "npm run build:web",
  "cap:sync": "npx cap sync",
  "ios:prepare": "npm run build:web && npx cap sync ios && npm run verify:ios-bundle",
  "ios:open": "npm run ios:prepare && npx cap open ios",
  "ios:verify": "npm run ios:prepare && xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build",
  "capture:screenshots": "node scripts/capture-screenshots.mjs",
  "review:packet": "node scripts/build-review-packet.mjs"
}
```

MVP release guards:

- RevenueCat Apple public SDK key exists for production.
- entitlement id exists in runtime config.
- offering id exists in runtime config.
- package id exists in runtime config.
- Capacitor iOS public bundle matches latest `dist`.
- built JavaScript bundle contains expected RevenueCat markers.
- app id and app name are not starter placeholders.
- dev premium preview is not enabled in production builds.

Later release guards:

- App Store Connect app id matches bundle id.
- IAP product exists and is non-consumable.
- RevenueCat product exists.
- RevenueCat entitlement exists.
- RevenueCat offering/package attach the correct product.
- screenshot set exists.
- review notes generated.

Do not overbuild ASC automation in MVP unless the template itself is already usable.

## Environment Variables

Required MVP env variables:

```bash
VITE_REVENUECAT_APPLE_API_KEY=appl_xxx
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_8BITGO_ENTITLEMENT_ID=my_game_full
VITE_8BITGO_OFFERING_ID=launch
VITE_8BITGO_PACKAGE_ID=$rc_lifetime
VITE_DEV_PREMIUM_PREVIEW=true
```

Optional release env variables:

```bash
ASC_ISSUER_ID=
ASC_KEY_ID=
ASC_P8_FILE_PATH=
ASC_APP_ID=
ASC_BUNDLE_ID=
ASC_IAP_PRODUCT_ID=
REVENUECAT_SECRET_API_KEY=
REVENUECAT_PROJECT_ID=
REVENUECAT_APP_ID=
```

MVP should not require ASC variables for local development.

## App Store Review Safety

The generated app must avoid common rejection risks:

- Do not be a web portal for multiple remote games.
- Do not load game code from a remote server.
- Do not bypass IAP for digital unlocks.
- Do not use Stripe for in-game digital goods.
- Do not hide premium functionality from reviewer.
- Include restore purchases for non-consumable unlocks.
- Keep the game playable offline after install.
- Include visible app-like UI, not just an embedded webpage.
- Keep App Review notes clear and specific.

The MVP should generate a basic review note:

```text
This app is a standalone Phaser-based game packaged with Capacitor.
All game code and primary assets are bundled in the app.
The app offers one non-consumable in-app purchase to unlock premium levels.
Use the Restore Purchases button on the paywall to restore the unlock.
No remote executable code or external game catalog is loaded.
```

## What To Extract From Existing Games

Extract from `Loopline`:

- DOM shell creation
- `createGame` shape
- scene registration with dependency injection
- `BootScene` asset manifest loading
- `MenuScene` purchase-aware start flow
- `RevenueCatBillingService`
- `ProfileService`
- iOS prepare/verify scripts
- screenshot harness approach
- architecture rule: simulation outside scenes

Extract from `Orbit Stack`:

- campaign/premium map concept
- in-canvas pixel UI visual language
- paywall source analytics
- App Store / RevenueCat release automation direction
- daily challenge concept as future premium feature

Do not directly extract:

- `OrbitStackScene` as base class
- game-specific campaign logic
- game-specific product names
- hardcoded `Full Orbit` copy
- hardcoded card game UI

## MVP Milestones

### Milestone 1: Template Skeleton

Deliver:

- Vite + TypeScript + Phaser app
- Capacitor iOS config
- app shell DOM
- fixed portrait canvas
- Boot/Menu/SampleGame scenes
- sample profile store

Acceptance:

- `npm run dev` works
- `npm run build` works
- Phaser canvas scales correctly
- no game-specific hardcoded Loopline or Orbit Stack names

### Milestone 2: Pixel UI Shell

Deliver:

- 8bitgo CSS theme
- menu view
- HUD view
- result view
- paywall view
- pixel button/panel components

Acceptance:

- UI looks intentionally pixel/arcade
- DOM overlay works on mobile viewport
- no browser scroll
- touch targets are usable

### Milestone 3: Billing

Deliver:

- generic RevenueCat billing service
- config-driven entitlement/offering/package
- purchase full unlock
- restore purchases
- browser dev preview mode
- billing status labels

Acceptance:

- web build does not crash without native store
- iOS build can initialize RevenueCat when key is set
- missing key shows visible unconfigured state
- purchase and restore handlers are reusable

### Milestone 4: Sample Game

Deliver:

- small playable Phaser game
- bridge/state pattern
- win/loss
- premium locked second level
- result screen routes to paywall

Acceptance:

- game can be completed in under 2 minutes
- premium gate appears at the right time
- premium flag unlocks second level
- gameplay code is separate from reusable 8bitgo services

### Milestone 5: iOS Pipeline

Deliver:

- `ios:prepare`
- `ios:verify`
- billing guard
- iOS bundle sync guard
- placeholder icon path
- review packet generator

Acceptance:

- `npm run ios:prepare` builds and syncs Capacitor
- `npm run ios:verify` compiles simulator target with signing disabled
- stale iOS public bundle is detected
- missing RevenueCat production config fails production build

### Milestone 6: Documentation

Deliver:

- README
- RevenueCat setup doc
- App Store checklist
- architecture doc
- guide: making a new game from template

Acceptance:

- a future game can be created by editing config, replacing sample scene, and changing assets
- docs clearly say Phaser is the engine and 8bitgo is the production layer

## Non-Goals

Do not build these in MVP:

- custom renderer
- custom physics engine
- visual editor
- tilemap editor
- asset marketplace
- remote config service
- multi-game launcher
- Android release pipeline
- subscriptions
- consumable currency
- ad network integration
- cloud saves
- multiplayer
- user accounts
- procedural asset generator
- full App Store Connect submission automation

These may be valid later, but adding them now will blur the MVP.

## Quality Bar

MVP quality requirements:

- TypeScript strict enough to catch service contract mistakes.
- No reusable service should import a specific game scene.
- No reusable service should contain game-specific copy.
- No scene should own billing implementation details.
- Billing and profile should be testable without Phaser.
- Build scripts should fail loudly with clear messages.
- Generated starter should run without private keys in browser dev mode.
- Production build should not silently ship with placeholder IAP config.

## Success Metrics

MVP is successful if:

- A new Phaser iOS game can be started from the template in under 10 minutes.
- A simple game can be reskinned and renamed in one day.
- RevenueCat full unlock can be wired by config, not custom scene code.
- Capacitor iOS build can be prepared with one command.
- The third game made with this template takes less than half the setup time of the first two.
- The template prevents repeating the same IAP, profile, paywall, and release guard code.

MVP fails if:

- It becomes a Phaser clone.
- It requires rewriting Phaser concepts.
- It only helps visually but not with App Store/IAP production.
- Every new game still needs custom billing, custom profile storage, custom paywall, and custom release scripts.
- Scenes keep growing into 2000-line monoliths.

## First Implementation Order

Build in this order:

1. Create the template project.
2. Port the Loopline shell structure into generic `8bitgo` names.
3. Replace all Loopline-specific text with config.
4. Generalize `RevenueCatBillingService`.
5. Generalize `ProfileService`.
6. Add 8bitgo CSS and UI components.
7. Add the tiny sample game.
8. Add premium locked second level.
9. Add Capacitor iOS config.
10. Add billing/build guards.
11. Add screenshot/review packet placeholders.
12. Document the workflow.

Do not start with CLI packaging. First prove the template works as a copied project. After the template has produced at least one more game, wrap it in `npm create 8bitgo`.

## Implementation Principle

The MVP should optimize for shipping games, not for framework elegance.

The reusable layer should be small, boring, and hard to misuse.

If a feature is not needed by the next actual game, do not add it.

If a feature already exists in Phaser, do not recreate it.

If a feature is repeated across Loopline, Orbit Stack, and the next game, extract it.

If a feature appears in only one game, leave it in that game.

The first version of 8bitgo should feel like a disciplined production template, not a grand engine project.

