import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SessionPayload } from '../../common/decorators/current-session.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'consumer-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') ?? 'dev-jwt-secret',
      issuer: configService.get<string>('jwt.issuer') ?? 'vin-portal',
    });
  }

  validate(payload: Record<string, unknown>): SessionPayload {
    return {
      contractContextId: payload.contractContextId as string,
      externalContractId: payload.externalContractId as string | undefined,
      riskTier: payload.riskTier as 'low' | 'medium' | 'high' | undefined,
    };
  }
}
