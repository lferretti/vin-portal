import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerAuthGuard } from './consumer-auth.guard';

describe('ConsumerAuthGuard', () => {
  let guard: ConsumerAuthGuard;
  let mockCtx: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumerAuthGuard],
    }).compile();

    guard = module.get<ConsumerAuthGuard>(ConsumerAuthGuard);

    mockCtx = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers: {} }),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should be an instance of ConsumerAuthGuard', () => {
    expect(guard).toBeInstanceOf(ConsumerAuthGuard);
  });

  it('should have a canActivate method', () => {
    expect(typeof guard.canActivate).toBe('function');
  });

  it('should have a handleRequest method', () => {
    expect(typeof guard.handleRequest).toBe('function');
  });

  describe('handleRequest', () => {
    it('should return the user when authentication succeeds', () => {
      const user = {
        contractContextId: 'ctx-123',
        externalContractId: 'ext-456',
        riskTier: 'low',
      };

      const result = guard.handleRequest(null, user, null, mockCtx);
      expect(result).toEqual(user);
    });

    it('should return the user object with all its properties intact', () => {
      const user = {
        contractContextId: 'ctx-abc',
        externalContractId: 'ext-def',
        riskTier: 'high',
      };

      const result = guard.handleRequest(null, user, null, mockCtx);
      expect(result.contractContextId).toBe('ctx-abc');
      expect(result.externalContractId).toBe('ext-def');
      expect(result.riskTier).toBe('high');
    });

    it('should throw when err is provided (re-throws the original error)', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null, mockCtx)).toThrow(
        error,
      );
    });

    it('should throw UnauthorizedException when user is falsy and no error', () => {
      expect(() => guard.handleRequest(null, null, null, mockCtx)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is undefined and no error', () => {
      expect(() =>
        guard.handleRequest(null, undefined, null, mockCtx),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is false and no error', () => {
      expect(() => guard.handleRequest(null, false, null, mockCtx)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw the provided error even when user is present', () => {
      const error = new Error('JWT malformed');
      const user = { contractContextId: 'ctx-1' };

      expect(() => guard.handleRequest(error, user, null, mockCtx)).toThrow(
        error,
      );
    });

    it('should pass through info parameter without affecting result', () => {
      const user = { contractContextId: 'ctx-1' };
      const info = { message: 'No auth token' };

      const result = guard.handleRequest(null, user, info, mockCtx);
      expect(result).toEqual(user);
    });
  });

  describe('strategy binding', () => {
    it('should attempt to use the "consumer-jwt" Passport strategy on canActivate', async () => {
      // Without the "consumer-jwt" strategy registered in Passport,
      // canActivate will throw "Unknown authentication strategy".
      // This verifies the guard is wired to the correct strategy name.
      await expect(guard.canActivate(mockCtx)).rejects.toThrow(
        /Unknown authentication strategy "consumer-jwt"/,
      );
    });
  });
});
