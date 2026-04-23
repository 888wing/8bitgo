export interface BaseProfileStats {
  totalStarts: number;
  totalWins: number;
  paywallViews: number;
  purchases: number;
  restores: number;
}

export interface BaseProfile {
  schemaVersion: number;
  premiumUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
  selectedLevelId: string;
  completedLevelIds: string[];
  stats: BaseProfileStats;
  flags: Record<string, boolean>;
}

export type ProfileStatKey = keyof BaseProfileStats;

export interface ProfileStore<TProfile extends BaseProfile = BaseProfile> {
  get(): TProfile;
  set(next: TProfile): void;
  patch(patch: Partial<TProfile>): void;
  setPremiumAccess(active: boolean): void;
  hasPremiumAccess(): boolean;
  markLevelCompleted(levelId: string): void;
  isLevelCompleted(levelId: string): boolean;
  setSelectedLevel(levelId: string): void;
  incrementStat(key: ProfileStatKey): void;
  reset(): void;
}

