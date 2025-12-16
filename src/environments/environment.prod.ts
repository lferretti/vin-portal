import { Environment } from './environment';

/**
 * Production environment configuration
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  sessionTtlMinutes: 15,
  features: {
    captchaEnabled: true,
    otpSimulation: false,
    mockApi: false,
  },
  polling: {
    initialIntervalMs: 10000,
    slowIntervalMs: 30000,
    maxDurationMs: 180000,
  },
};

