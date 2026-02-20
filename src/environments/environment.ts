import { Environment } from './environment.model';

export type { Environment };

export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  sessionTtlMinutes: 15,
  features: {
    captchaEnabled: false,
    otpSimulation: true,
    mockApi: true,
  },
  polling: {
    initialIntervalMs: 10000,
    slowIntervalMs: 30000,
    maxDurationMs: 180000,
  },
  datadog: {
    enabled: false,
    clientToken: '',
    applicationId: '',
    site: 'datadoghq.com',
    service: 'vin-portal',
    env: 'dev',
    sampleRate: 100,
    trackInteractions: true,
    trackResources: true,
  },
};

