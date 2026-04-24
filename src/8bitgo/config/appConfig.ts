import type { VirtualSize } from "../core/createGame";

export interface AppTheme {
  background: string;
  panel: string;
  ink: string;
  muted: string;
  cyan: string;
  pink: string;
  amber: string;
  lime: string;
  danger: string;
}

export interface PaywallCopy {
  title: string;
  subtitle: string;
  bulletPoints: string[];
  purchaseLabel: string;
  restoreLabel: string;
}

export interface AppConfig {
  gameId: string;
  title: string;
  bundleId: string;
  sku: string;
  version: string;
  orientation: "portrait";
  virtualSize: VirtualSize;
  theme: AppTheme;
  paywall: PaywallCopy;
}

export const appConfig: AppConfig = {
  gameId: "pixel_courier",
  title: "Pixel Courier",
  bundleId: "com.eightbitgo.pixelcourier",
  sku: "com.eightbitgo.pixelcourier",
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
    muted: "#99aac7",
    cyan: "#34e7ff",
    pink: "#f45dff",
    amber: "#ffd454",
    lime: "#b8ff61",
    danger: "#ff6b86"
  },
  paywall: {
    title: "Unlock Premium Sectors",
    subtitle: "Route deeper corrupted networks with denser hazards and harder command budgets.",
    bulletPoints: [
      "Four premium route-planning sectors",
      "Restore purchases support",
      "Config-driven RevenueCat product",
      "One-time full unlock for this game"
    ],
    purchaseLabel: "Unlock Premium",
    restoreLabel: "Restore Purchases"
  }
};
