export type SampleLevelId = "free-sector" | "premium-sector";

export interface SampleLevelDefinition {
  id: SampleLevelId;
  title: string;
  premium: boolean;
  requiredGems: number;
  enemyCount: number;
  arenaTint: number;
  hint: string;
}

export const sampleLevels: SampleLevelDefinition[] = [
  {
    id: "free-sector",
    title: "Free Sector",
    premium: false,
    requiredGems: 8,
    enemyCount: 2,
    arenaTint: 0x0b1730,
    hint: "Collect 8 chips, dodge bugs, reach the exit."
  },
  {
    id: "premium-sector",
    title: "Premium Sector",
    premium: true,
    requiredGems: 12,
    enemyCount: 4,
    arenaTint: 0x21153a,
    hint: "A denser board that proves the unlock path."
  }
];

export function getSampleLevel(levelId: string): SampleLevelDefinition {
  return sampleLevels.find((level) => level.id === levelId) ?? sampleLevels[0];
}

