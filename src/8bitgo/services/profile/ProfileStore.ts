import type { BaseProfile, ProfileStatKey, ProfileStore } from "./profileTypes";

function nowIso(): string {
  return new Date().toISOString();
}

function createDefaultProfile(): BaseProfile {
  const createdAt = nowIso();

  return {
    schemaVersion: 1,
    premiumUnlocked: false,
    createdAt,
    updatedAt: createdAt,
    selectedLevelId: "free-sector",
    completedLevelIds: [],
    stats: {
      totalStarts: 0,
      totalWins: 0,
      paywallViews: 0,
      purchases: 0,
      restores: 0
    },
    flags: {}
  };
}

function normalizeProfile(candidate: Partial<BaseProfile> | null): BaseProfile {
  const fallback = createDefaultProfile();

  if (!candidate) {
    return fallback;
  }

  return {
    ...fallback,
    ...candidate,
    schemaVersion: 1,
    completedLevelIds: Array.isArray(candidate.completedLevelIds)
      ? candidate.completedLevelIds.filter((id): id is string => typeof id === "string")
      : [],
    stats: {
      ...fallback.stats,
      ...(candidate.stats ?? {})
    },
    flags:
      candidate.flags && typeof candidate.flags === "object" && !Array.isArray(candidate.flags)
        ? { ...candidate.flags }
        : {}
  };
}

export class LocalProfileStore implements ProfileStore {
  private readonly storageKey: string;
  private profile: BaseProfile;

  constructor(
    private readonly storage: Storage,
    gameId: string
  ) {
    this.storageKey = `${gameId}.profile.v1`;
    this.profile = this.read();
  }

  get(): BaseProfile {
    return structuredClone(this.profile);
  }

  set(next: BaseProfile): void {
    this.profile = normalizeProfile({
      ...next,
      updatedAt: nowIso()
    });
    this.persist();
  }

  patch(patch: Partial<BaseProfile>): void {
    this.set({
      ...this.profile,
      ...patch
    });
  }

  setPremiumAccess(active: boolean): void {
    if (this.profile.premiumUnlocked === active) {
      return;
    }

    this.patch({
      premiumUnlocked: active
    });
  }

  hasPremiumAccess(): boolean {
    return this.profile.premiumUnlocked;
  }

  markLevelCompleted(levelId: string): void {
    if (this.profile.completedLevelIds.includes(levelId)) {
      return;
    }

    this.patch({
      completedLevelIds: [...this.profile.completedLevelIds, levelId]
    });
  }

  isLevelCompleted(levelId: string): boolean {
    return this.profile.completedLevelIds.includes(levelId);
  }

  setSelectedLevel(levelId: string): void {
    this.patch({
      selectedLevelId: levelId
    });
  }

  incrementStat(key: ProfileStatKey): void {
    this.patch({
      stats: {
        ...this.profile.stats,
        [key]: this.profile.stats[key] + 1
      }
    });
  }

  reset(): void {
    this.profile = createDefaultProfile();
    this.persist();
  }

  private read(): BaseProfile {
    const raw = this.storage.getItem(this.storageKey);

    if (!raw) {
      const profile = createDefaultProfile();
      this.storage.setItem(this.storageKey, JSON.stringify(profile));
      return profile;
    }

    try {
      return normalizeProfile(JSON.parse(raw) as Partial<BaseProfile>);
    } catch {
      const profile = createDefaultProfile();
      this.storage.setItem(this.storageKey, JSON.stringify(profile));
      return profile;
    }
  }

  private persist(): void {
    this.storage.setItem(this.storageKey, JSON.stringify(this.profile));
  }
}

