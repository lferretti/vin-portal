import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from '../auth/auth.service';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  const mockToken = {
    token: 'mock-jwt-token',
    expiresAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    authService = {
      createAdminToken: jest.fn().mockReturnValue(mockToken),
    };

    configService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  describe('devLogin', () => {
    it('should return a token for admin role', () => {
      const result = controller.devLogin({ role: 'admin' });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.expiresAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.role).toBe('admin');
      expect(authService.createAdminToken).toHaveBeenCalledWith({
        adminUserId: 'dev-admin-001',
        email: 'admin@dev.local',
        role: 'admin',
      });
    });

    it('should return a token for support role', () => {
      const result = controller.devLogin({ role: 'support' });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.expiresAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.role).toBe('support');
      expect(authService.createAdminToken).toHaveBeenCalledWith({
        adminUserId: 'dev-support-001',
        email: 'support@dev.local',
        role: 'support',
      });
    });

    it('should include displayName and email for admin role', () => {
      const result = controller.devLogin({ role: 'admin' });

      expect(result.displayName).toBe('Dev Admin');
      expect(result.email).toBe('admin@dev.local');
    });

    it('should include displayName and email for support role', () => {
      const result = controller.devLogin({ role: 'support' });

      expect(result.displayName).toBe('Dev Support');
      expect(result.email).toBe('support@dev.local');
    });

    it('should throw ForbiddenException in production', () => {
      configService.get.mockReturnValue('production');

      expect(() => controller.devLogin({ role: 'admin' })).toThrow(
        ForbiddenException,
      );
      expect(() => controller.devLogin({ role: 'admin' })).toThrow(
        'Dev login is not available in production',
      );
    });

    it('should allow dev-login in development environment', () => {
      configService.get.mockReturnValue('development');

      const result = controller.devLogin({ role: 'admin' });

      expect(result.token).toBeDefined();
    });

    it('should allow dev-login in test environment', () => {
      configService.get.mockReturnValue('test');

      const result = controller.devLogin({ role: 'admin' });

      expect(result.token).toBeDefined();
    });
  });

  describe('ssoCallback', () => {
    it('should throw ForbiddenException', () => {
      expect(() => controller.ssoCallback()).toThrow(ForbiddenException);
      expect(() => controller.ssoCallback()).toThrow(
        'SSO callback not yet implemented',
      );
    });
  });
});
