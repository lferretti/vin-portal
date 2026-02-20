import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'consumer-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'dev-jwt-secret',
        signOptions: {
          expiresIn: `${config.get<number>('jwt.ttlSeconds') ?? 900}s`,
          issuer: config.get<string>('jwt.issuer') ?? 'vin-portal',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, AdminJwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
