import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { AdminDevLoginDto } from './dto/admin-login.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('dev-login')
  devLogin(@Body() dto: AdminDevLoginDto) {
    const env = this.configService.get<string>('app.nodeEnv');
    if (env === 'production') {
      throw new ForbiddenException('Dev login is not available in production');
    }

    const isAdmin = dto.role === 'admin';
    const payload = {
      adminUserId: isAdmin ? 'dev-admin-001' : 'dev-support-001',
      email: isAdmin ? 'admin@dev.local' : 'support@dev.local',
      role: dto.role,
    };

    const { token, expiresAt } = this.authService.createAdminToken(payload);

    return {
      token,
      expiresAt,
      email: payload.email,
      role: dto.role,
      displayName: isAdmin ? 'Dev Admin' : 'Dev Support',
    };
  }

  @Post('sso-callback')
  ssoCallback() {
    // TODO: Implement SSO callback when enterprise IdP (Okta / Azure AD) is configured.
    throw new ForbiddenException('SSO callback not yet implemented');
  }
}
