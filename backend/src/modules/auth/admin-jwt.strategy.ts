import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// TODO: SSO Integration — Replace JWT-only admin auth with enterprise IdP (Okta / Azure AD).
// The expected flow:
// 1. Admin authenticates via SSO provider → receives IdP token
// 2. Backend exchanges/validates IdP token → issues short-lived admin JWT
// 3. Admin JWT is scoped with role claims from IdP
// Until SSO is wired, admin JWT is issued via AuthService.createAdminToken().

export interface AdminSessionPayload {
  adminUserId: string;
  email: string;
  role: string;
}

const VALID_ADMIN_ROLES = ['admin', 'supervisor', 'readonly', 'support'] as const;

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private readonly logger = new Logger(AdminJwtStrategy.name);

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('jwt.adminSecret');
    if (!secret || secret === 'dev-admin-jwt-secret') {
      const logger = new Logger(AdminJwtStrategy.name);
      logger.warn('Admin JWT secret is using dev default — DO NOT use in production');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ?? 'dev-admin-jwt-secret',
      issuer: configService.get<string>('jwt.issuer') ?? 'vin-portal',
    });
  }

  validate(payload: Record<string, unknown>): AdminSessionPayload {
    if (
      typeof payload.adminUserId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      this.logger.warn('Admin JWT payload missing required fields');
      throw new UnauthorizedException('Invalid admin token payload');
    }

    if (!VALID_ADMIN_ROLES.includes(payload.role as (typeof VALID_ADMIN_ROLES)[number])) {
      this.logger.warn(`Admin JWT has invalid role: ${payload.role}`);
      throw new UnauthorizedException('Invalid admin role');
    }

    return {
      adminUserId: payload.adminUserId,
      email: payload.email,
      role: payload.role,
    };
  }
}
