import type { AppTheme, PaywallCopy } from "../config/appConfig";
import type { BillingSnapshot } from "../services/billing/billingTypes";
import type { BaseProfile } from "../services/profile/profileTypes";

export interface HudRootOptions {
  title: string;
  theme: AppTheme;
  paywall: PaywallCopy;
}

export interface MenuViewOptions {
  profile: BaseProfile;
  billing: BillingSnapshot;
  onStartFree: () => void;
  onStartPremium: () => void;
  onOpenPaywall: () => void;
  onRestore: () => void;
}

export interface HudSnapshot {
  levelLabel: string;
  hpLabel: string;
  gemsLabel: string;
  objectiveLabel: string;
  timeLabel: string;
}

export interface GameHudOptions {
  onPause: () => void;
  onRestart: () => void;
}

export interface ResultViewOptions {
  title: string;
  subtitle: string;
  meta: string;
  premiumPrompt: boolean;
  onRetry: () => void;
  onMenu: () => void;
  onNext: () => void;
  onUnlock: () => void;
}

export interface PaywallViewOptions {
  billing: BillingSnapshot;
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buttonHtml(
  id: string,
  title: string,
  subtitle: string,
  tone: "primary" | "secondary" | "warning" | "danger" = "primary",
  disabled = false
): string {
  const toneClass = tone === "primary" ? "" : ` ${tone}`;
  return `
    <button id="${id}" class="pixel-button${toneClass}" ${disabled ? "disabled" : ""}>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle)}</span>
    </button>
  `;
}

function statusToneClass(billing: BillingSnapshot): string {
  if (billing.isBusy) {
    return "busy";
  }

  if (billing.status === "error" || billing.status === "unconfigured" || billing.errorMessage) {
    return "error";
  }

  if (billing.premiumActive) {
    return "success";
  }

  return "";
}

export class HudRoot {
  private hudSnapshot: HudSnapshot | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: HudRootOptions
  ) {
    this.applyTheme();
  }

  showBooting(label: string): void {
    this.root.innerHTML = `
      <div class="screen">
        <div class="panel menu-panel">
          <span class="kicker">8bitgo</span>
          <h1 class="title">Loading</h1>
          <p class="subtitle">${escapeHtml(label)}</p>
        </div>
        <div class="scanline"></div>
      </div>
    `;
  }

  showMenu(options: MenuViewOptions): void {
    const price = options.billing.priceLabel ?? "Device only";
    const premiumLine = options.profile.premiumUnlocked
      ? "Premium unlocked on this profile"
      : `Full unlock ${price}`;

    this.root.innerHTML = `
      <div class="screen">
        <div class="panel menu-panel">
          <span class="kicker">Phaser iOS starter</span>
          <h1 class="title">${escapeHtml(this.options.title)}</h1>
          <p class="subtitle">A reusable 8bit-style game shell with Phaser, Capacitor, profile saves, and IAP wiring.</p>
          <div class="button-grid">
            ${buttonHtml("start-free", "Start Free Sector", `${options.profile.stats.totalStarts} runs recorded`)}
            ${buttonHtml(
              "start-premium",
              "Start Premium Sector",
              premiumLine,
              "warning",
              !options.profile.premiumUnlocked
            )}
            ${buttonHtml("open-paywall", "Unlock Full Game", options.billing.statusLabel, "secondary")}
            ${buttonHtml(
              "restore",
              "Restore Purchases",
              "Use on TestFlight or App Store build",
              "primary",
              !options.billing.canRestore
            )}
          </div>
        </div>
        <div class="scanline"></div>
      </div>
    `;

    this.bind("start-free", options.onStartFree);
    this.bind("start-premium", options.onStartPremium);
    this.bind("open-paywall", options.onOpenPaywall);
    this.bind("restore", options.onRestore);
  }

  showGameHud(options: GameHudOptions): void {
    this.root.innerHTML = `
      <div class="screen">
        <div class="hud">
          <div class="hud-row">
            <div id="hud-level" class="chip">Level</div>
            <div id="hud-time" class="chip">0:00</div>
          </div>
          <div class="hud-row">
            <div id="hud-hp" class="chip">HP</div>
            <div id="hud-gems" class="chip">Gems</div>
          </div>
          <div id="hud-objective" class="chip">Objective</div>
        </div>
        <div class="hud-actions">
          ${buttonHtml("pause", "Menu", "Return to title", "secondary")}
          ${buttonHtml("restart", "Restart", "Fresh board", "danger")}
        </div>
        <div class="scanline"></div>
      </div>
    `;

    this.bind("pause", options.onPause);
    this.bind("restart", options.onRestart);

    if (this.hudSnapshot) {
      this.updateHud(this.hudSnapshot);
    }
  }

  updateHud(snapshot: HudSnapshot): void {
    this.hudSnapshot = snapshot;
    this.setText("hud-level", snapshot.levelLabel);
    this.setText("hud-hp", snapshot.hpLabel);
    this.setText("hud-gems", snapshot.gemsLabel);
    this.setText("hud-objective", snapshot.objectiveLabel);
    this.setText("hud-time", snapshot.timeLabel);
  }

  showResult(options: ResultViewOptions): void {
    this.root.innerHTML = `
      <div class="screen">
        <div class="panel result-panel">
          <span class="kicker">Run result</span>
          <h1 class="title">${escapeHtml(options.title)}</h1>
          <p class="subtitle">${escapeHtml(options.subtitle)}</p>
          <p class="status-line">${escapeHtml(options.meta)}</p>
          <div class="button-grid">
            ${
              options.premiumPrompt
                ? buttonHtml("unlock", "Unlock Next Sector", "Open the premium level", "warning")
                : buttonHtml("next", "Next Sector", "Continue", "warning")
            }
            ${buttonHtml("retry", "Retry", "Play this level again")}
            ${buttonHtml("menu", "Main Menu", "Back to title", "secondary")}
          </div>
        </div>
        <div class="scanline"></div>
      </div>
    `;

    if (options.premiumPrompt) {
      this.bind("unlock", options.onUnlock);
    } else {
      this.bind("next", options.onNext);
    }

    this.bind("retry", options.onRetry);
    this.bind("menu", options.onMenu);
  }

  showPaywall(options: PaywallViewOptions): void {
    const billing = options.billing;
    const primaryDisabled = !billing.canPurchase && !billing.premiumActive;
    const secondaryDisabled = !billing.canRestore;
    const primaryLabel = billing.premiumActive
      ? "Already Unlocked"
      : billing.priceLabel
        ? `${this.options.paywall.purchaseLabel} - ${billing.priceLabel}`
        : this.options.paywall.purchaseLabel;

    this.root.innerHTML = `
      <div class="screen">
        <div class="panel paywall-panel">
          <span class="kicker">IAP product route</span>
          <h1 class="title">${escapeHtml(this.options.paywall.title)}</h1>
          <p class="subtitle">${escapeHtml(this.options.paywall.subtitle)}</p>
          <ul class="paywall-list">
            ${this.options.paywall.bulletPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
          <p class="status-line ${statusToneClass(billing)}">${escapeHtml(billing.statusLabel)}</p>
          <div class="button-grid">
            ${buttonHtml("purchase", primaryLabel, "StoreKit via RevenueCat", "warning", primaryDisabled)}
            ${buttonHtml("restore", this.options.paywall.restoreLabel, "Required for App Review", "primary", secondaryDisabled)}
            ${buttonHtml("close", "Close", "Back", "secondary")}
          </div>
        </div>
        <div class="scanline"></div>
      </div>
    `;

    this.bind("purchase", options.onPurchase);
    this.bind("restore", options.onRestore);
    this.bind("close", options.onClose);
  }

  clear(): void {
    this.root.innerHTML = "";
  }

  private bind(id: string, handler: () => void): void {
    const element = this.root.querySelector<HTMLButtonElement>(`#${id}`);
    if (!element) {
      return;
    }

    element.onclick = handler;
  }

  private setText(id: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  private applyTheme(): void {
    const style = this.root.style;
    style.setProperty("--bg", this.options.theme.background);
    style.setProperty("--panel", this.options.theme.panel);
    style.setProperty("--ink", this.options.theme.ink);
    style.setProperty("--muted", this.options.theme.muted);
    style.setProperty("--cyan", this.options.theme.cyan);
    style.setProperty("--pink", this.options.theme.pink);
    style.setProperty("--amber", this.options.theme.amber);
    style.setProperty("--lime", this.options.theme.lime);
    style.setProperty("--danger", this.options.theme.danger);
  }
}

