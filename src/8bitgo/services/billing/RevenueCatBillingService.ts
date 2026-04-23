import { Capacitor } from "@capacitor/core";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

import {
  type BillingConfig,
  type BillingPlatform,
  resolveRevenueCatApiKey
} from "../../config/billingConfig";
import type { AnalyticsService } from "../analytics/AnalyticsService";
import type { ProfileStore } from "../profile/profileTypes";
import type {
  BillingActionResult,
  BillingListener,
  BillingService,
  BillingSnapshot
} from "./billingTypes";

interface RevenueCatBillingServiceOptions {
  config: BillingConfig;
  profileStore: ProfileStore;
  analytics: AnalyticsService;
}

type RevenueCatModule = typeof import("@revenuecat/purchases-capacitor");

function normalizePlatform(platform: string): BillingPlatform {
  if (platform === "ios" || platform === "android") {
    return platform;
  }

  return "web";
}

function describePlatform(platform: BillingPlatform): string {
  if (platform === "ios") {
    return "App Store";
  }

  if (platform === "android") {
    return "Play Store";
  }

  return "Browser";
}

function parseErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function isCancelledPurchase(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; userCancelled?: unknown };
  return (
    candidate.userCancelled === true ||
    (typeof candidate.code === "string" &&
      candidate.code.toUpperCase().includes("PURCHASE_CANCELLED"))
  );
}

export class RevenueCatBillingService implements BillingService {
  private readonly listeners = new Set<BillingListener>();
  private readonly config: BillingConfig;
  private readonly profileStore: ProfileStore;
  private readonly analytics: AnalyticsService;
  private readonly platform = normalizePlatform(Capacitor.getPlatform());
  private snapshot: BillingSnapshot;
  private initializePromise: Promise<void> | null = null;
  private purchases: RevenueCatModule | null = null;
  private selectedPackage: PurchasesPackage | null = null;

  constructor(options: RevenueCatBillingServiceOptions) {
    this.config = options.config;
    this.profileStore = options.profileStore;
    this.analytics = options.analytics;

    this.snapshot = {
      initialized: false,
      platform: this.platform,
      status: "loading",
      premiumActive: this.profileStore.hasPremiumAccess(),
      isBusy: false,
      canPurchase: false,
      canRestore: false,
      priceLabel: null,
      packageTitle: null,
      managementUrl: null,
      statusLabel: "Store booting...",
      errorMessage: null,
      previewEnabled: this.platform === "web" && this.config.devPreviewEnabled
    };
  }

  getSnapshot(): BillingSnapshot {
    return { ...this.snapshot };
  }

  subscribe(listener: BillingListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.initializeInternal();
    return this.initializePromise;
  }

  async purchaseFullUnlock(): Promise<BillingActionResult> {
    await this.initialize();

    if (this.platform === "web") {
      if (!this.snapshot.previewEnabled) {
        return {
          kind: "unavailable",
          message: "Purchases are only available on device builds."
        };
      }

      this.profileStore.setPremiumAccess(true);
      this.profileStore.incrementStat("purchases");
      this.analytics.track("purchase_completed", {
        platform: "web_preview"
      });
      this.updateSnapshot({
        premiumActive: true,
        canPurchase: false,
        statusLabel: "Browser preview unlocked."
      });
      return {
        kind: "purchased",
        message: "Browser preview unlocked."
      };
    }

    if (!this.purchases || !this.selectedPackage || !this.snapshot.canPurchase) {
      return {
        kind: "unavailable",
        message: this.snapshot.errorMessage ?? "Store is not ready."
      };
    }

    this.updateSnapshot({
      isBusy: true,
      canPurchase: false,
      canRestore: false,
      errorMessage: null,
      statusLabel: "Opening store sheet..."
    });

    try {
      const result = await this.purchases.Purchases.purchasePackage({
        aPackage: this.selectedPackage
      });

      this.applyCustomerInfo(result.customerInfo);
      this.profileStore.incrementStat("purchases");
      this.analytics.track("purchase_completed", {
        platform: this.platform
      });
      this.updateSnapshot({
        isBusy: false,
        statusLabel: "Full game unlocked."
      });

      return {
        kind: "purchased",
        message: "Full game unlocked."
      };
    } catch (error) {
      if (isCancelledPurchase(error)) {
        this.restoreIdleState("Purchase cancelled.", null);
        return {
          kind: "cancelled",
          message: "Purchase cancelled."
        };
      }

      const message = parseErrorMessage(error, "Purchase failed.");
      this.restoreIdleState(message, message);
      return {
        kind: "error",
        message
      };
    }
  }

  async restorePurchases(): Promise<BillingActionResult> {
    await this.initialize();

    if (this.platform === "web" || !this.purchases) {
      return {
        kind: "unavailable",
        message: "Restore is only available on a store-backed device."
      };
    }

    this.updateSnapshot({
      isBusy: true,
      canPurchase: false,
      canRestore: false,
      errorMessage: null,
      statusLabel: "Restoring purchases..."
    });

    try {
      const result = await this.purchases.Purchases.restorePurchases();
      const restored = this.hasActiveEntitlement(result.customerInfo);
      this.applyCustomerInfo(result.customerInfo);

      if (restored) {
        this.profileStore.incrementStat("restores");
        this.analytics.track("restore_completed", {
          platform: this.platform
        });
        this.updateSnapshot({
          isBusy: false,
          statusLabel: "Purchase restored."
        });
        return {
          kind: "restored",
          message: "Purchase restored."
        };
      }

      this.restoreIdleState("No previous purchase found.", null);
      return {
        kind: "unavailable",
        message: "No previous purchase found."
      };
    } catch (error) {
      const message = parseErrorMessage(error, "Restore failed.");
      this.restoreIdleState(message, message);
      return {
        kind: "error",
        message
      };
    }
  }

  private async initializeInternal(): Promise<void> {
    if (this.platform === "web") {
      this.updateSnapshot({
        initialized: true,
        status: this.config.devPreviewEnabled ? "ready" : "unavailable",
        canPurchase: this.config.devPreviewEnabled && !this.snapshot.premiumActive,
        canRestore: false,
        statusLabel: this.config.devPreviewEnabled
          ? "Browser premium preview is active."
          : "Purchases are only available on device builds."
      });
      return;
    }

    const apiKey = resolveRevenueCatApiKey(this.config, this.platform);

    if (!apiKey) {
      this.updateSnapshot({
        initialized: true,
        status: "unconfigured",
        canPurchase: false,
        canRestore: false,
        statusLabel: "RevenueCat API key missing.",
        errorMessage: `Set ${this.platform === "ios" ? "VITE_REVENUECAT_APPLE_API_KEY" : "VITE_REVENUECAT_ANDROID_API_KEY"}.`
      });
      return;
    }

    try {
      this.purchases = await import("@revenuecat/purchases-capacitor");
      const rc = this.purchases;

      if (import.meta.env.DEV) {
        await rc.Purchases.setLogLevel({
          level: rc.LOG_LEVEL.DEBUG
        });
      }

      await rc.Purchases.configure({
        apiKey,
        entitlementVerificationMode: rc.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
        storeKitVersion:
          this.platform === "ios" ? rc.STOREKIT_VERSION.STOREKIT_2 : rc.STOREKIT_VERSION.DEFAULT
      });

      await rc.Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        this.applyCustomerInfo(customerInfo);
      });

      await this.loadOfferings(rc);

      const { customerInfo } = await rc.Purchases.getCustomerInfo();
      this.applyCustomerInfo(customerInfo);

      this.updateSnapshot({
        initialized: true,
        status: this.selectedPackage ? "ready" : "error",
        canPurchase: Boolean(this.selectedPackage) && !this.snapshot.premiumActive,
        canRestore: true,
        statusLabel: this.selectedPackage
          ? this.snapshot.premiumActive
            ? "Full game already unlocked."
            : `${describePlatform(this.platform)} ready${this.snapshot.priceLabel ? ` - ${this.snapshot.priceLabel}` : ""}`
          : "RevenueCat offering has no package.",
        errorMessage: this.selectedPackage
          ? null
          : "Create an offering/package for the configured full unlock product."
      });
    } catch (error) {
      const message = parseErrorMessage(error, "RevenueCat failed to initialize.");
      this.updateSnapshot({
        initialized: true,
        status: "error",
        canPurchase: false,
        canRestore: false,
        statusLabel: message,
        errorMessage: message
      });
    }
  }

  private async loadOfferings(rc: RevenueCatModule): Promise<void> {
    const offerings = await rc.Purchases.getOfferings();
    const offering = this.config.offeringId
      ? (offerings.all?.[this.config.offeringId] ?? null)
      : offerings.current;
    const packages = offering?.availablePackages ?? [];

    this.selectedPackage =
      packages.find((candidate) => candidate.identifier === this.config.packageId) ??
      offering?.lifetime ??
      packages.find((candidate) => candidate.packageType === "LIFETIME") ??
      packages[0] ??
      null;

    this.updateSnapshot({
      priceLabel: this.selectedPackage?.product?.priceString ?? null,
      packageTitle: this.selectedPackage?.product?.title ?? null
    });
  }

  private hasActiveEntitlement(customerInfo: unknown): boolean {
    const candidate = customerInfo as {
      entitlements?: {
        active?: Record<string, { isActive?: boolean }>;
      };
    };

    return Boolean(candidate.entitlements?.active?.[this.config.entitlementId]?.isActive);
  }

  private applyCustomerInfo(customerInfo: unknown): void {
    const premiumActive = this.hasActiveEntitlement(customerInfo);
    const managementUrl =
      customerInfo && typeof customerInfo === "object" && "managementURL" in customerInfo
        ? ((customerInfo as { managementURL?: string | null }).managementURL ?? null)
        : null;

    this.profileStore.setPremiumAccess(premiumActive);
    this.updateSnapshot({
      premiumActive,
      managementUrl,
      canPurchase: Boolean(this.selectedPackage) && !premiumActive && !this.snapshot.isBusy,
      canRestore: this.platform !== "web" && !this.snapshot.isBusy
    });
  }

  private restoreIdleState(statusLabel: string, errorMessage: string | null): void {
    this.updateSnapshot({
      isBusy: false,
      statusLabel,
      errorMessage,
      canPurchase:
        this.platform === "web"
          ? this.snapshot.previewEnabled && !this.snapshot.premiumActive
          : Boolean(this.selectedPackage) && !this.snapshot.premiumActive,
      canRestore: this.platform !== "web"
    });
  }

  private updateSnapshot(next: Partial<BillingSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...next
    };

    for (const listener of this.listeners) {
      listener(this.getSnapshot());
    }
  }
}
