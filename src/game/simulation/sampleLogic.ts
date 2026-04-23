import { collectedGemCount, type SampleAction, type SampleGameState, type Vec2 } from "./sampleState";

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(current: Vec2, target: Vec2, maxDistance: number): Vec2 {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const length = Math.hypot(dx, dy);

  if (length <= maxDistance || length <= 0.001) {
    return { ...target };
  }

  return {
    x: current.x + (dx / length) * maxDistance,
    y: current.y + (dy / length) * maxDistance
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applySampleAction(state: SampleGameState, action: SampleAction): void {
  if (action.type === "moveTo") {
    state.moveTarget = {
      x: clamp(action.x, 58, state.width - 58),
      y: clamp(action.y, 126, state.height - 126)
    };
    return;
  }

  state.moveTarget = null;
}

export function updateSampleState(state: SampleGameState, deltaMs: number): void {
  if (state.status !== "playing") {
    return;
  }

  state.timeMs += deltaMs;
  const dt = deltaMs / 1000;

  if (state.moveTarget) {
    const next = moveToward(state.player, state.moveTarget, state.player.speed * dt);
    state.player.x = next.x;
    state.player.y = next.y;

    if (distance(state.player, state.moveTarget) < 2) {
      state.moveTarget = null;
    }
  }

  for (const enemy of state.enemies) {
    enemy.x += enemy.vx * enemy.speed * dt;
    enemy.y += enemy.vy * enemy.speed * dt;
    enemy.hitCooldownMs = Math.max(0, enemy.hitCooldownMs - deltaMs);

    if (enemy.x < 72 || enemy.x > state.width - 72) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, 72, state.width - 72);
    }

    if (enemy.y < 220 || enemy.y > state.height - 120) {
      enemy.vy *= -1;
      enemy.y = clamp(enemy.y, 220, state.height - 120);
    }

    if (enemy.hitCooldownMs <= 0 && distance(enemy, state.player) < enemy.radius + state.player.radius) {
      enemy.hitCooldownMs = 900;
      state.player.hp -= 1;
      state.message = "Bug hit. Keep moving.";

      if (state.player.hp <= 0) {
        state.player.hp = 0;
        state.status = "lost";
        state.message = "Signal lost. Retry the sector.";
        return;
      }
    }
  }

  for (const gem of state.gems) {
    if (!gem.collected && distance(gem, state.player) < 28) {
      gem.collected = true;
      state.message = `Chip ${collectedGemCount(state)} / ${state.requiredGems}`;
    }
  }

  if (!state.exit.active && collectedGemCount(state) >= state.requiredGems) {
    state.exit.active = true;
    state.message = "Exit open. Reach the gate.";
  }

  if (state.exit.active && distance(state.exit, state.player) < state.exit.radius + state.player.radius) {
    state.status = "won";
    state.message = "Sector cleared.";
  }
}

