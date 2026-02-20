import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  rateLimitTtlSeconds: parseInt(process.env.RATE_LIMIT_TTL_SECONDS ?? '60', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '20', 10),
  contractRateLimitTtlSeconds: parseInt(process.env.CONTRACT_RATE_LIMIT_TTL_SECONDS ?? '600', 10),
  contractRateLimitMax: parseInt(process.env.CONTRACT_RATE_LIMIT_MAX ?? '5', 10),
  contractHashSalt: process.env.CONTRACT_HASH_SALT ?? 'dev-contract-salt',
  otpHashSalt: process.env.OTP_HASH_SALT ?? 'dev-otp-salt',
  otpTtlMinutes: parseInt(process.env.OTP_TTL_MINUTES ?? '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
  workerEnabled: process.env.WORKER_ENABLED !== 'false',
  workerIntervalMs: parseInt(process.env.WORKER_INTERVAL_MS ?? '30000', 10),
  workerMaxRetries: parseInt(process.env.WORKER_MAX_RETRIES ?? '5', 10),
}));
