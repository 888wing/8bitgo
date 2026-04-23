import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eightbitgo.starter",
  appName: "8bitgo Starter",
  webDir: "dist",
  backgroundColor: "#060813",
  zoomEnabled: false,
  ios: {
    scheme: "App",
    backgroundColor: "#060813",
    contentInset: "never",
    scrollEnabled: false
  }
};

export default config;

