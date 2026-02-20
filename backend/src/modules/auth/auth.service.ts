import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface ConsumerTokenPayload {
  contractContextId: string;
  externalContractId?: string;
  riskTier?: 'low' | 'medium' | 'high';
}

export interface AdminTokenPayload {
  adminUserId: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createConsumerToken(payload: ConsumerTokenPayload): {
    token: string;
    expiresAt: string;
  } {
    const ttl = this.configService.get<number>('jwt.ttlSeconds') ?? 900;
    const token = this.jwtService.sign(payload);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return { token, expiresAt };
  }

  createAdminToken(payload: AdminTokenPayload): {
    token: string;
    expiresAt: string;
  } {
    const ttl = this.configService.get<number>('jwt.ttlSeconds') ?? 900;
    const secret = this.configService.get<string>('jwt.adminSecret');
    const issuer = this.configService.get<string>('jwt.issuer');
    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: `${ttl}s`,
      issuer,
    });
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return { token, expiresAt };
  }
}
