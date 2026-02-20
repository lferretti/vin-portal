export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  sessionTtlMinutes: number;
  features: {
    captchaEnabled: boolean;
    otpSimulation: boolean;
    mockApi: boolean;
  };
  polling: {
    initialIntervalMs: number;
    slowIntervalMs: number;
    maxDurationMs: number;
  };
  datadog: {
    enabled: boolean;
    clientToken: string;
    applicationId: string;
    site: string;
    service: string;
    env: string;
    sampleRate: number;
    trackInteractions: boolean;
    trackResources: boolean;
  };
}
