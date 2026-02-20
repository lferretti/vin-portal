import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContractService } from './contract.service';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { AuthAttempt } from '../../database/entities/auth-attempt.entity';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { CONTRACT_VERIFICATION_ADAPTER } from '../../adapters/adapter.tokens';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AuthenticateContractDto } from './dto/authenticate-contract.dto';

describe('ContractService', () => {
  let service: ContractService;
  let contractRepo: Record<string, jest.Mock>;
  let authAttemptRepo: Record<string, jest.Mock>;
  let otpChallengeRepo: Record<string, jest.Mock>;
  let verificationAdapter: Record<string, jest.Mock>;
  let authService: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let configService: jest.Mocked<ConfigService>;

  const configMap: Record<string, unknown> = {
    'app.contractHashSalt': 'test-salt',
    'app.contractRateLimitTtlSeconds': 600,
    'app.contractRateLimitMax': 5,
    'app.otpTtlMinutes': 10,
    'app.otpMaxAttempts': 5,
  };

  const dto: AuthenticateContractDto = {
    vin7: '1234567',
    lastName: 'SMITH',
    zip: '30301',
  };

  const correlationId = 'corr-123';
  const sourceIp = '127.0.0.1';
  const userAgent = 'test-agent';

  beforeEach(async () => {
    contractRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ id: 'ctx-1', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'ctx-1', ...entity })),
    };

    authAttemptRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue({}),
    };

    otpChallengeRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: 'otp-1', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'otp-1', ...entity })),
    };

    verificationAdapter = {
      verify: jest.fn(),
    };

    authService = {
      createConsumerToken: jest.fn().mockReturnValue({
        token: 'mock-token',
        expiresAt: '2026-01-01T00:00:00.000Z',
      }),
    };

    auditService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: getRepositoryToken(ContractContext), useValue: contractRepo },
        { provide: getRepositoryToken(AuthAttempt), useValue: authAttemptRepo },
        { provide: getRepositoryToken(OtpChallenge), useValue: otpChallengeRepo },
        { provide: CONTRACT_VERIFICATION_ADAPTER, useValue: verificationAdapter },
        { provide: AuthService, useValue: authService },
        { provide: AuditService, useValue: auditService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('authenticate - direct auth (no OTP)', () => {
    beforeEach(() => {
      verificationAdapter.verify.mockResolvedValue({
        matched: true,
        externalContractId: 'ext-1',
        primaryVinMasked: '1HG******1234',
        hasAdditionalVin: false,
        requiresOtp: false,
      });
      contractRepo.findOne.mockResolvedValue(null); // new contract context
    });

    it('should return session token on successful direct auth', async () => {
      const result = await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(result.sessionToken).toBe('mock-token');
      expect(result.sessionExpiresAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should return contractContextId', async () => {
      const result = await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(result.contractContextId).toBe('ctx-1');
    });

    it('should return otp status NOT_REQUIRED', async () => {
      const result = await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(result.otp.status).toBe('NOT_REQUIRED');
      expect(result.otp.otpChallengeId).toBeNull();
    });

    it('should create a consumer token with correct payload', async () => {
      await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(authService.createConsumerToken).toHaveBeenCalledWith({
        contractContextId: 'ctx-1',
        externalContractId: 'ext-1',
        riskTier: 'low',
      });
    });

    it('should record a successful auth attempt', async () => {
      await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(authAttemptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          failureReason: null,
          correlationId,
        }),
      );
      expect(authAttemptRepo.save).toHaveBeenCalled();
    });

    it('should emit AUTH_SUCCESS audit event', async () => {
      await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_SUCCESS',
          actorType: 'CONSUMER',
        }),
      );
    });

    it('should upsert contract context (create new if not found)', async () => {
      await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(contractRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: VinAddStatus.NOT_USED,
          externalContractId: 'ext-1',
        }),
      );
      expect(contractRepo.save).toHaveBeenCalled();
    });

    it('should use existing contract context if found', async () => {
      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-existing',
        status: VinAddStatus.NOT_USED,
        primaryVinMasked: '1HG******9999',
      });
      const result = await service.authenticate(dto, correlationId, sourceIp, userAgent);
      expect(result.contractContextId).toBe('ctx-existing');
      expect(contractRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('authenticate - AUTH_NO_MATCH', () => {
    beforeEach(() => {
      verificationAdapter.verify.mockResolvedValue({ matched: false });
    });

    it('should throw 401 with AUTH_NO_MATCH code', async () => {
      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.AUTH_NO_MATCH);
      }
    });

    it('should record a failed auth attempt', async () => {
      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(authAttemptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          failureReason: ErrorCodes.AUTH_NO_MATCH,
        }),
      );
    });

    it('should emit AUTH_FAILURE audit event', async () => {
      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_FAILURE',
          eventData: { reason: ErrorCodes.AUTH_NO_MATCH },
        }),
      );
    });
  });

  describe('authenticate - CONTRACT_LOCKED', () => {
    it('should throw 409 when hasAdditionalVin is true', async () => {
      verificationAdapter.verify.mockResolvedValue({
        matched: true,
        hasAdditionalVin: true,
        requiresOtp: false,
      });
      contractRepo.findOne.mockResolvedValue(null);

      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.CONFLICT);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.CONTRACT_LOCKED);
      }
    });

    it('should throw 409 when contract status is COMMITTED_LOCKED', async () => {
      verificationAdapter.verify.mockResolvedValue({
        matched: true,
        hasAdditionalVin: false,
        requiresOtp: false,
      });
      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        status: VinAddStatus.COMMITTED_LOCKED,
      });

      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('authenticate - OTP required', () => {
    beforeEach(() => {
      verificationAdapter.verify.mockResolvedValue({
        matched: true,
        externalContractId: 'ext-1',
        hasAdditionalVin: false,
        requiresOtp: true,
        maskedDestination: '***-***-4567',
        channel: 'sms',
      });
      contractRepo.findOne.mockResolvedValue(null);
    });

    it('should throw 401 with AUTH_OTP_REQUIRED code', async () => {
      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.AUTH_OTP_REQUIRED);
      }
    });

    it('should include OTP challenge details in error response', async () => {
      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        const body = httpError.getResponse() as Record<string, unknown>;
        const details = body['details'] as Record<string, unknown>;
        expect(details['otpChallengeId']).toBe('otp-1');
        expect(details['maskedDestination']).toBe('***-***-4567');
        expect(details['channel']).toBe('sms');
      }
    });

    it('should create an OTP challenge entity', async () => {
      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(otpChallengeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maskedDestination: '***-***-4567',
          channel: 'sms',
          status: 'PENDING',
          maxAttempts: 5,
        }),
      );
    });

    it('should emit AUTH_OTP_TRIGGERED audit event', async () => {
      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_OTP_TRIGGERED',
        }),
      );
    });
  });

  describe('authenticate - RATE_LIMITED', () => {
    it('should throw 429 when too many attempts', async () => {
      authAttemptRepo.count.mockResolvedValue(5);

      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.RATE_LIMITED);
      }
    });

    it('should not call verification adapter when rate limited', async () => {
      authAttemptRepo.count.mockResolvedValue(10);
      await expect(
        service.authenticate(dto, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(verificationAdapter.verify).not.toHaveBeenCalled();
    });

    it('should include retryAfterSeconds in rate limit error', async () => {
      authAttemptRepo.count.mockResolvedValue(5);
      try {
        await service.authenticate(dto, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        const body = httpError.getResponse() as Record<string, unknown>;
        const details = body['details'] as Record<string, unknown>;
        expect(details['retryAfterSeconds']).toBe(600);
      }
    });
  });
});
