import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthGuard } from './admin-auth.guard';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let mockCtx: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminAuthGuard],
    }).compile();

    guard = module.get<AdminAuthGuard>(AdminAuthGuard);

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

  it('should be an instance of AdminAuthGuard', () => {
    expect(guard).toBeInstanceOf(AdminAuthGuard);
  });

  it('should have a canActivate method', () => {
    expect(typeof guard.canActivate).toBe('function');
  });

  it('should have a handleRequest method', () => {
    expect(typeof guard.handleRequest).toBe('function');
  });

  describe('handleRequest', () => {
    it('should return the admin user when authentication succeeds', () => {
      const user = {
        adminUserId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };

      const result = guard.handleRequest(null, user, null, mockCtx);
      expect(result).toEqual(user);
    });

    it('should return the user object with all admin properties intact', () => {
      const user = {
        adminUserId: 'admin-99',
        email: 'supervisor@example.com',
        role: 'supervisor',
      };

      const result = guard.handleRequest(null, user, null, mockCtx);
      expect(result.adminUserId).toBe('admin-99');
      expect(result.email).toBe('supervisor@example.com');
      expect(result.role).toBe('supervisor');
    });

    it('should throw when err is provided (re-throws the original error)', () => {
      const error = new Error('Admin token expired');

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
      const error = new Error('Invalid admin credentials');
      const user = { adminUserId: 'admin-1', email: 'a@b.com', role: 'admin' };

      expect(() => guard.handleRequest(error, user, null, mockCtx)).toThrow(
        error,
      );
    });

    it('should pass through info parameter without affecting result', () => {
      const user = {
        adminUserId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
      };
      const info = { message: 'jwt expired' };

      const result = guard.handleRequest(null, user, info, mockCtx);
      expect(result).toEqual(user);
    });
  });

  describe('strategy binding', () => {
    it('should attempt to use the "admin-jwt" Passport strategy on canActivate', async () => {
      // Without the "admin-jwt" strategy registered in Passport,
      // canActivate will throw "Unknown authentication strategy".
      // This verifies the guard is wired to the correct strategy name.
      await expect(guard.canActivate(mockCtx)).rejects.toThrow(
        /Unknown authentication strategy "admin-jwt"/,
      );
    });
  });
});
