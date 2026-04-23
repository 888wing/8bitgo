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
  gameId: "8bitgo_starter",
  title: "8bitgo Starter",
  bundleId: "com.eightbitgo.starter",
  sku: "com.eightbitgo.starter",
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
    title: "Unlock Full Game",
    subtitle: "Open the premium sector and keep the same 8bitgo purchase flow.",
    bulletPoints: [
      "Premium level access",
      "Restore purchases support",
      "Config-driven RevenueCat product",
      "Bundled game code for App Review safety"
    ],
    purchaseLabel: "Unlock Full Game",
    restoreLabel: "Restore Purchases"
  }
};

