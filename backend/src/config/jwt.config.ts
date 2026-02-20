import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
  adminSecret: process.env.JWT_ADMIN_SECRET ?? 'dev-admin-jwt-secret',
  ttlSeconds: parseInt(process.env.JWT_TTL_SECONDS ?? '900', 10),
  issuer: process.env.JWT_ISSUER ?? 'vin-portal',
}));
