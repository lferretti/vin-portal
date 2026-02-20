import { Environment } from './environment.model';

/**
 * Production environment configuration
 *
 * Datadog RUM credentials are build-time only. Replace the placeholder values
 * before building for production using one of these methods:
 *
 * 1. CI/CD pipeline: Use `sed` to replace placeholders before `npm run build`
 *    sed -i "s/REPLACE_WITH_DATADOG_CLIENT_TOKEN/$DD_CLIENT_TOKEN/g" src/environments/environment.prod.ts
 *    sed -i "s/REPLACE_WITH_DATADOG_APP_ID/$DD_APPLICATION_ID/g" src/environments/environment.prod.ts
 *
 * 2. Angular file replacements: Create environment.prod.local.ts with real values
 *    and use angular.json fileReplacements.
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  sessionTtlMinutes: 15,
  features: {
    captchaEnabled: false,
    otpSimulation: false,
    mockApi: false,
  },
  polling: {
    initialIntervalMs: 10000,
    slowIntervalMs: 30000,
    maxDurationMs: 180000,
  },
  datadog: {
    enabled: true,
    clientToken: 'REPLACE_WITH_DATADOG_CLIENT_TOKEN',
    applicationId: 'REPLACE_WITH_DATADOG_APP_ID',
    site: 'datadoghq.com',
    service: 'vin-portal',
    env: 'prod',
    sampleRate: 100,
    trackInteractions: true,
    trackResources: true,
  },
};

