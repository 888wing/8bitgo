import type { AnalyticsProperties, AnalyticsService } from "./AnalyticsService";

export class ConsoleAnalyticsService implements AnalyticsService {
  constructor(private readonly namespace: string) {}

  track(eventName: string, properties: AnalyticsProperties = {}): void {
    if (!import.meta.env.DEV) {
      return;
    }

    console.info(`[${this.namespace}] ${eventName}`, properties);
  }
}

