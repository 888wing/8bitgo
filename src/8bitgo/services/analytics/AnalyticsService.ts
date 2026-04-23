export type AnalyticsProperties = Record<string, string | number | boolean | null>;

export interface AnalyticsService {
  track(eventName: string, properties?: AnalyticsProperties): void;
}

