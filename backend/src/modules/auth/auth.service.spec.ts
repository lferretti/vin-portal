import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, ConsumerTokenPayload, AdminTokenPayload } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const configMap: Record<string, unknown> = {
    'jwt.ttlSeconds': 900,
    'jwt.adminSecret': 'admin-secret-key',
    'jwt.issuer': 'vin-portal',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('createConsumerToken', () => {
    const payload: ConsumerTokenPayload = {
      contractContextId: 'ctx-123',
      externalContractId: 'ext-456',
      riskTier: 'low',
    };

    it('should return a token string', () => {
      const result = service.createConsumerToken(payload);
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return an expiresAt ISO string', () => {
      const result = service.createConsumerToken(payload);
      expect(result.expiresAt).toBeDefined();
      expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
    });

    it('should sign with the payload', () => {
      service.createConsumerToken(payload);
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
    });

    it('should use TTL from config to calculate expiresAt', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = service.createConsumerToken(payload);
      const expectedExpiry = new Date(now + 900 * 1000).toISOString();
      expect(result.expiresAt).toBe(expectedExpiry);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should default TTL to 900 seconds when config returns undefined', () => {
      configService.get.mockReturnValue(undefined);
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = service.createConsumerToken(payload);
      const expectedExpiry = new Date(now + 900 * 1000).toISOString();
      expect(result.expiresAt).toBe(expectedExpiry);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('createAdminToken', () => {
    const payload: AdminTokenPayload = {
      adminUserId: 'admin-1',
      email: 'admin@test.com',
      role: 'superadmin',
    };

    it('should return a token string', () => {
      const result = service.createAdminToken(payload);
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should sign with admin secret, expiresIn, and issuer', () => {
      service.createAdminToken(payload);
      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'admin-secret-key',
        expiresIn: '900s',
        issuer: 'vin-portal',
      });
    });

    it('should return an expiresAt ISO string', () => {
      const result = service.createAdminToken(payload);
      expect(result.expiresAt).toBeDefined();
      expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
    });

    it('should use config values for secret and issuer', () => {
      service.createAdminToken(payload);
      expect(configService.get).toHaveBeenCalledWith('jwt.adminSecret');
      expect(configService.get).toHaveBeenCalledWith('jwt.issuer');
    });

    it('should use TTL from config to calculate expiresAt', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = service.createAdminToken(payload);
      const expectedExpiry = new Date(now + 900 * 1000).toISOString();
      expect(result.expiresAt).toBe(expectedExpiry);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });
});
