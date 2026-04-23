import type { BillingPlatform } from "../../config/billingConfig";

export type BillingStatus =
  | "loading"
  | "ready"
  | "unavailable"
  | "unconfigured"
  | "error";

export type BillingActionKind =
  | "purchased"
  | "restored"
  | "cancelled"
  | "unavailable"
  | "error";

export interface BillingActionResult {
  kind: BillingActionKind;
  message: string;
}

export interface BillingSnapshot {
  initialized: boolean;
  platform: BillingPlatform;
  status: BillingStatus;
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

export type BillingListener = (snapshot: BillingSnapshot) => void;

export interface BillingService {
  initialize(): Promise<void>;
  getSnapshot(): BillingSnapshot;
  subscribe(listener: BillingListener): () => void;
  purchaseFullUnlock(): Promise<BillingActionResult>;
  restorePurchases(): Promise<BillingActionResult>;
}

