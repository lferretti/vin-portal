/**
 * Development environment configuration
 */
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
}

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
};

