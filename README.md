# 8bitgo

`8bitgo` is a Phaser + Capacitor starter for shipping small 8bit-style iOS games with an IAP product route. It is not trying to replace Phaser. The MVP wraps Phaser with a strict pixel-art presentation layer, a thin game-state boundary, profile saving, RevenueCat purchase wiring, and iOS release checks.

## What This MVP Includes

- Phaser 3 + TypeScript + Vite game runtime.
- Capacitor iOS packaging path.
- Pixel-perfect default renderer settings: `pixelArt`, `roundPixels`, nearest-neighbor canvas rendering, fixed virtual resolution.
- Generated low-resolution pixel textures that are scaled up in-game.
- DOM overlay HUD, menu, result screen, and paywall.
- Local profile persistence for starts, wins, unlock state, purchases, and restores.
- RevenueCat-backed non-consumable full unlock service with web preview mode.
- Sample two-level game proving free-to-premium flow.
- Release guard scripts for billing, assets, iOS bundle sync, screenshots packet, and App Review notes.

## Quick Start

```sh
npm install
npm run dev
```

For a production web build:

```sh
npm run build
```

For iOS preparation:

```sh
npm run ios:prepare
```

Open the native project after sync:

```sh
npm run ios:open
```

## Environment

Copy `.env.example` to `.env.local` and replace values before TestFlight or App Store builds.

```sh
VITE_REVENUECAT_APPLE_API_KEY=appl_xxx
VITE_8BITGO_ENTITLEMENT_ID=8bitgo_starter_full
VITE_8BITGO_OFFERING_ID=launch
VITE_8BITGO_PACKAGE_ID=\$rc_lifetime
VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID=com.eightbitgo.starter.full_unlock
```

`VITE_DEV_PREMIUM_PREVIEW=true` enables browser-only purchase preview during development. Do not treat it as a real transaction.

## Scripts

- `npm run dev`: start Vite.
- `npm run build`: validate billing in non-strict mode, typecheck, and build web assets.
- `npm run release:guard`: strict billing and pixel-art asset checks.
- `npm run ios:prepare`: build, add iOS platform if missing, sync Capacitor, and verify iOS bundle output.
- `npm run ios:verify`: run iOS build through `xcodebuild` with code signing disabled.
- `npm run review:packet`: generate App Review notes under `tmp/review-packet`.
- `npm run capture:screenshots`: create screenshot capture checklist under `tmp/screenshots`.
- `npm run sprite:setup`: install the pinned `agent-sprite-forge` processor into a local tool checkout.
- `npm run sprite:prompt`: generate an image-generation prompt for a sprite sheet.
- `npm run sprite:process`: convert a raw generated sheet into transparent frames, GIF, spritesheet, and Phaser manifest entries.

See [docs/sprite-forge.md](docs/sprite-forge.md) for the full animation and spritesheet workflow.

For the first proposed game tech demo, see [docs/pixel-courier-mvp.md](docs/pixel-courier-mvp.md).

## Architecture

The starter follows the Phaser skill split:

- `src/8bitgo/core`: renderer, scene registration, asset manifest, and pixel helpers.
- `src/8bitgo/art`: generated tiny pixel textures.
- `src/8bitgo/services`: billing, analytics, and local profile persistence.
- `src/8bitgo/ui`: DOM HUD/menu/paywall.
- `src/game/simulation`: framework-independent sample game state and rules.
- `src/game/phaser`: Phaser scene bridge and rendering adapter.

Gameplay rules stay outside Phaser scenes. Phaser owns rendering, input, timing, and scene lifecycle only.

## Product Stance

The recommended route is open-source core plus paid game products. `8bitgo` should stay a fast internal/open toolkit for producing many small iOS games. Revenue should come from the games and IAP products, not from charging developers before the framework has proven repeatable production value.

## License

MIT
