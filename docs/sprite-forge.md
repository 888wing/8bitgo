# Agent Sprite Forge Integration

`8bitgo` integrates [0x0funky/agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) as an offline sprite pipeline. The external repo is pinned in `sprite-forge.config.json` and is cloned into `tools/agent-sprite-forge`, which is intentionally ignored by git.

## Setup

```sh
npm run sprite:setup
```

This creates a local Python virtualenv under `tools/.sprite-forge-venv` and installs the processor dependencies from the pinned `agent-sprite-forge` checkout.

## Workflow

1. Build a prompt:

```sh
npm run sprite:prompt -- \
  --target player \
  --mode player_sheet \
  --name scout \
  --prompt "top-down 4x4 player sheet for a small cyber courier with cyan visor and orange jacket"
```

2. Use Codex image generation with the generated prompt in `tmp/sprite-forge/scout/prompt-used.txt`.

3. Save the raw generated PNG, then process it:

```sh
npm run sprite:process -- \
  --input /absolute/path/to/raw-sheet.png \
  --target player \
  --mode player_sheet \
  --name scout \
  --cell-size 96 \
  --align feet \
  --shared-scale \
  --component-mode largest \
  --reject-edge-touch
```

4. The processed asset is written to:

```text
public/generated/sprites/scout/
```

5. The Phaser manifest is regenerated at:

```text
src/assets/spriteForge.generated.ts
```

## Runtime Use

Generated sheets become normal Phaser preload assets through `src/assets/manifest.ts`.

For a `player_sheet` named `scout`, the loader creates:

- spritesheet key: `forge.scout`
- animations: `forge.scout.down`, `forge.scout.left`, `forge.scout.right`, `forge.scout.up`

For other multi-frame sheets, the default animation key is:

```text
forge.<name>.<mode>
```

## Commands

- `npm run sprite:setup`: clone/pin `agent-sprite-forge` and install Python dependencies into a local venv.
- `npm run sprite:options`: print supported targets, modes, frame labels, and processor options.
- `npm run sprite:prompt`: write a generation prompt and metadata into `tmp/sprite-forge/<name>`.
- `npm run sprite:process`: clean magenta background, split frames, export transparent sheet/GIF, and refresh manifest.
- `npm run sprite:manifest`: rescan `public/generated/sprites` and rewrite `src/assets/spriteForge.generated.ts`.

## Important Rules

- Raw generated sheets must use solid `#FF00FF` background.
- Prefer full-strip generation over frame-by-frame generation.
- Use `--shared-scale` for character animation consistency.
- Use `--align feet` or `--align bottom` for walk/idle actors.
- Commit only accepted assets under `public/generated/sprites`; keep rejected raw images in `tmp/`.
