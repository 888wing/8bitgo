export type BillingPlatform = "web" | "ios" | "android";
export type BillingProvider = "revenuecat";
export type ProductType = "non_consumable";

export interface BillingProductConfig {
  productId: string;
  type: ProductType;
  title: string;
  description: string;
}

export interface BillingConfig {
  provider: BillingProvider;
  entitlementId: string;
  offeringId: string | null;
  packageId: string | null;
  appleApiKey: string;
  androidApiKey: string;
  devPreviewEnabled: boolean;
  products: {
    fullUnlock: BillingProductConfig;
  };
}

function readEnv(name: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export const billingConfig: BillingConfig = {
  provider: "revenuecat",
  entitlementId: readEnv("VITE_8BITGO_ENTITLEMENT_ID") || "pixel_courier_premium",
  offeringId: readEnv("VITE_8BITGO_OFFERING_ID") || "launch",
  packageId: readEnv("VITE_8BITGO_PACKAGE_ID") || "$rc_lifetime",
  appleApiKey: readEnv("VITE_REVENUECAT_APPLE_API_KEY"),
  androidApiKey: readEnv("VITE_REVENUECAT_ANDROID_API_KEY"),
  devPreviewEnabled:
    import.meta.env.DEV && readEnv("VITE_DEV_PREMIUM_PREVIEW") !== "false",
  products: {
    fullUnlock: {
      productId:
        readEnv("VITE_8BITGO_FULL_UNLOCK_PRODUCT_ID") ||
        "com.eightbitgo.pixelcourier.full_unlock",
      type: "non_consumable",
      title: "Premium Sectors Unlock",
      description: "Unlock premium Pixel Courier sectors."
    }
  }
};

export function resolveRevenueCatApiKey(
  config: BillingConfig,
  platform: BillingPlatform
): string {
  if (platform === "ios") {
    return config.appleApiKey;
  }

  if (platform === "android") {
    return config.androidApiKey;
  }

  return "";
}
