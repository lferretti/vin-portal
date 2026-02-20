import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminJwtStrategy, AdminSessionPayload } from './admin-jwt.strategy';

describe('AdminJwtStrategy', () => {
  let strategy: AdminJwtStrategy;
  let loggerWarnSpy: jest.SpyInstance;

  const configMap: Record<string, unknown> = {
    'jwt.adminSecret': 'test-admin-secret',
    'jwt.issuer': 'vin-portal-test',
  };

  beforeEach(async () => {
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminJwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    strategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return AdminSessionPayload for a valid payload', () => {
      const payload = {
        adminUserId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        adminUserId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('should accept "supervisor" role', () => {
      const payload = {
        adminUserId: 'admin-2',
        email: 'supervisor@example.com',
        role: 'supervisor',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        adminUserId: 'admin-2',
        email: 'supervisor@example.com',
        role: 'supervisor',
      });
    });

    it('should accept "readonly" role', () => {
      const payload = {
        adminUserId: 'admin-3',
        email: 'readonly@example.com',
        role: 'readonly',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        adminUserId: 'admin-3',
        email: 'readonly@example.com',
        role: 'readonly',
      });
    });

    it('should only return adminUserId, email, and role', () => {
      const payload = {
        adminUserId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 1234567890,
        iss: 'vin-portal',
        extraField: 'should-not-appear',
      };

      const result = strategy.validate(payload);

      expect(Object.keys(result)).toEqual(['adminUserId', 'email', 'role']);
    });

    describe('missing required fields', () => {
      it('should throw UnauthorizedException when adminUserId is missing', () => {
        const payload = {
          email: 'admin@example.com',
          role: 'admin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
        expect(() => strategy.validate(payload)).toThrow(
          'Invalid admin token payload',
        );
      });

      it('should throw UnauthorizedException when email is missing', () => {
        const payload = {
          adminUserId: 'admin-1',
          role: 'admin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when role is missing', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when all fields are missing', () => {
        const payload = {};

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should log a warning when required fields are missing', () => {
        const payload = { email: 'admin@example.com' };

        try {
          strategy.validate(payload);
        } catch {
          // expected
        }

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'Admin JWT payload missing required fields',
        );
      });
    });

    describe('invalid field types', () => {
      it('should throw UnauthorizedException when adminUserId is a number', () => {
        const payload = {
          adminUserId: 123,
          email: 'admin@example.com',
          role: 'admin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when email is a number', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 456,
          role: 'admin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when role is a number', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: 789,
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException when adminUserId is null', () => {
        const payload = {
          adminUserId: null,
          email: 'admin@example.com',
          role: 'admin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('invalid roles', () => {
      it('should throw UnauthorizedException for invalid role "superadmin"', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: 'superadmin',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
        expect(() => strategy.validate(payload)).toThrow('Invalid admin role');
      });

      it('should throw UnauthorizedException for invalid role "user"', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: 'user',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException for empty string role', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: '',
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });

      it('should log a warning when role is invalid', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: 'hacker',
        };

        try {
          strategy.validate(payload);
        } catch {
          // expected
        }

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'Admin JWT has invalid role: hacker',
        );
      });

      it('should be case-sensitive for role validation', () => {
        const payload = {
          adminUserId: 'admin-1',
          email: 'admin@example.com',
          role: 'Admin', // uppercase A — should fail
        };

        expect(() => strategy.validate(payload)).toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('constructor configuration', () => {
    it('should use default secret when config returns undefined', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const strategyWithDefaults =
        module.get<AdminJwtStrategy>(AdminJwtStrategy);
      expect(strategyWithDefaults).toBeDefined();
    });

    it('should warn when using dev default secret', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'jwt.adminSecret') return 'dev-admin-jwt-secret';
                if (key === 'jwt.issuer') return 'vin-portal';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DO NOT use in production'),
      );

      warnSpy.mockRestore();
    });

    it('should warn when admin secret is undefined (falsy)', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DO NOT use in production'),
      );

      warnSpy.mockRestore();
    });

    it('should NOT warn when a proper admin secret is configured', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'jwt.adminSecret')
                  return 'strong-production-secret-key';
                if (key === 'jwt.issuer') return 'vin-portal';
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      // The warning should not have been called with the DO NOT use message.
      // Note: loggerWarnSpy from beforeEach may also be active; check warnSpy specifically.
      const doNotUseCalls = warnSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('DO NOT use in production'),
      );
      expect(doNotUseCalls).toHaveLength(0);

      warnSpy.mockRestore();
    });

    it('should use config values for issuer', async () => {
      const configGet = jest.fn((key: string) => configMap[key]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminJwtStrategy,
          {
            provide: ConfigService,
            useValue: { get: configGet },
          },
        ],
      }).compile();

      const strategyWithConfig =
        module.get<AdminJwtStrategy>(AdminJwtStrategy);
      expect(strategyWithConfig).toBeDefined();
      expect(configGet).toHaveBeenCalledWith('jwt.adminSecret');
      expect(configGet).toHaveBeenCalledWith('jwt.issuer');
    });
  });
});
