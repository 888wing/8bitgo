import "./style.css";

import { billingConfig } from "./8bitgo/config/billingConfig";
import { appConfig } from "./8bitgo/config/appConfig";
import { create8bitgoGame } from "./8bitgo/core/createGame";
import { registerScenes } from "./8bitgo/core/registerScenes";
import { ConsoleAnalyticsService } from "./8bitgo/services/analytics/ConsoleAnalyticsService";
import { RevenueCatBillingService } from "./8bitgo/services/billing/RevenueCatBillingService";
import { LocalProfileStore } from "./8bitgo/services/profile/ProfileStore";
import { HudRoot } from "./8bitgo/ui/HudRoot";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <main class="app-shell">
    <section class="cabinet" aria-label="${appConfig.title}">
      <div id="game-root" class="game-root"></div>
      <div id="overlay-root" class="overlay-root"></div>
    </section>
  </main>
`;

const gameRoot = document.querySelector<HTMLDivElement>("#game-root");
const overlayRoot = document.querySelector<HTMLDivElement>("#overlay-root");

if (!gameRoot || !overlayRoot) {
  throw new Error("8bitgo mount nodes were not created.");
}

const gameMount = gameRoot;
const overlayMount = overlayRoot;
const profileStore = new LocalProfileStore(window.localStorage, appConfig.gameId);
const analytics = new ConsoleAnalyticsService(appConfig.gameId);
const billing = new RevenueCatBillingService({
  config: billingConfig,
  profileStore,
  analytics
});
const ui = new HudRoot(overlayMount, {
  title: appConfig.title,
  theme: appConfig.theme,
  paywall: appConfig.paywall
});

ui.showBooting("Booting 8bitgo...");

async function bootstrap(): Promise<void> {
  await billing.initialize();

  create8bitgoGame({
    mountNode: gameMount,
    virtualSize: appConfig.virtualSize,
    backgroundColor: appConfig.theme.background,
    scenes: registerScenes({
      ui,
      profileStore,
      billing,
      analytics
    })
  });
}

void bootstrap();
