import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const configMap: Record<string, unknown> = {
    'jwt.secret': 'test-jwt-secret',
    'jwt.issuer': 'vin-portal-test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return a SessionPayload with contractContextId', () => {
      const payload = {
        contractContextId: 'ctx-123',
        externalContractId: 'ext-456',
        riskTier: 'low',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        contractContextId: 'ctx-123',
        externalContractId: 'ext-456',
        riskTier: 'low',
      });
    });

    it('should handle payload with only contractContextId', () => {
      const payload = {
        contractContextId: 'ctx-789',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        contractContextId: 'ctx-789',
        externalContractId: undefined,
        riskTier: undefined,
      });
    });

    it('should handle payload with undefined optional fields', () => {
      const payload = {
        contractContextId: 'ctx-abc',
        externalContractId: undefined,
        riskTier: undefined,
      };

      const result = strategy.validate(payload);

      expect(result.contractContextId).toBe('ctx-abc');
      expect(result.externalContractId).toBeUndefined();
      expect(result.riskTier).toBeUndefined();
    });

    it('should return externalContractId when present', () => {
      const payload = {
        contractContextId: 'ctx-100',
        externalContractId: 'ext-200',
      };

      const result = strategy.validate(payload);

      expect(result.externalContractId).toBe('ext-200');
    });

    it('should return riskTier when present', () => {
      const payload = {
        contractContextId: 'ctx-100',
        riskTier: 'high',
      };

      const result = strategy.validate(payload);

      expect(result.riskTier).toBe('high');
    });

    it('should pass through all valid riskTier values', () => {
      const tiers = ['low', 'medium', 'high'] as const;

      for (const tier of tiers) {
        const result = strategy.validate({
          contractContextId: 'ctx-1',
          riskTier: tier,
        });
        expect(result.riskTier).toBe(tier);
      }
    });

    it('should only return contractContextId, externalContractId, and riskTier', () => {
      const payload = {
        contractContextId: 'ctx-1',
        externalContractId: 'ext-1',
        riskTier: 'low',
        iat: 1234567890,
        exp: 1234567890,
        iss: 'vin-portal',
        extraField: 'should-not-appear',
      };

      const result = strategy.validate(payload);

      expect(Object.keys(result)).toEqual([
        'contractContextId',
        'externalContractId',
        'riskTier',
      ]);
    });

    it('should handle empty payload gracefully', () => {
      const payload = {};

      const result = strategy.validate(payload);

      expect(result).toEqual({
        contractContextId: undefined,
        externalContractId: undefined,
        riskTier: undefined,
      });
    });
  });

  describe('constructor configuration', () => {
    it('should use default secret when config returns undefined', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const strategyWithDefaults = module.get<JwtStrategy>(JwtStrategy);
      expect(strategyWithDefaults).toBeDefined();
    });

    it('should use config values when provided', async () => {
      const configGet = jest.fn((key: string) => configMap[key]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: { get: configGet },
          },
        ],
      }).compile();

      const strategyWithConfig = module.get<JwtStrategy>(JwtStrategy);
      expect(strategyWithConfig).toBeDefined();
      expect(configGet).toHaveBeenCalledWith('jwt.secret');
      expect(configGet).toHaveBeenCalledWith('jwt.issuer');
    });
  });
});
