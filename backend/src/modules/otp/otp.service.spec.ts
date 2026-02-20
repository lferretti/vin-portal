import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { OtpStatus } from '../../common/enums/otp-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { hashOtpCode } from '../../common/utils/hash.util';

describe('OtpService', () => {
  let service: OtpService;
  let otpRepo: Record<string, jest.Mock>;
  let contractRepo: Record<string, jest.Mock>;
  let authService: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  const correlationId = 'corr-1';
  const sourceIp = '127.0.0.1';
  const userAgent = 'test-agent';

  const configMap: Record<string, unknown> = {
    'app.otpTtlMinutes': 10,
  };

  beforeEach(async () => {
    otpRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    contractRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
      }),
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
        OtpService,
        { provide: getRepositoryToken(OtpChallenge), useValue: otpRepo },
        { provide: getRepositoryToken(ContractContext), useValue: contractRepo },
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

    service = module.get<OtpService>(OtpService);
  });

  describe('send', () => {
    const validChallenge = {
      id: 'otp-1',
      contractContextId: 'ctx-1',
      codeHash: '',
      codeSalt: 'old-salt',
      maskedDestination: '***-***-4567',
      channel: 'sms',
      status: OtpStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    it('should generate code, hash it, and save the challenge', async () => {
      otpRepo.findOne.mockResolvedValue({ ...validChallenge });

      const result = await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);
      expect(result.status).toBe('SENT');
      expect(result.otpChallengeId).toBe('otp-1');
      expect(otpRepo.save).toHaveBeenCalled();
    });

    it('should update challenge status to SENT', async () => {
      otpRepo.findOne.mockResolvedValue({ ...validChallenge });
      await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);

      const savedChallenge = (otpRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedChallenge.status).toBe(OtpStatus.SENT);
    });

    it('should set a new codeHash and codeSalt', async () => {
      otpRepo.findOne.mockResolvedValue({ ...validChallenge });
      await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);

      const savedChallenge = (otpRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedChallenge.codeHash).toBeTruthy();
      expect(savedChallenge.codeHash).not.toBe('');
      expect(savedChallenge.codeSalt).toBeTruthy();
      expect(savedChallenge.codeSalt).not.toBe('old-salt');
    });

    it('should throw 400 when challenge not found', async () => {
      otpRepo.findOne.mockResolvedValue(null);
      try {
        await service.send({ otpChallengeId: 'otp-nonexist' }, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_EXPIRED);
      }
    });

    it('should throw 429 when challenge is LOCKED_OUT', async () => {
      otpRepo.findOne.mockResolvedValue({
        ...validChallenge,
        status: OtpStatus.LOCKED_OUT,
      });
      try {
        await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_LOCKED_OUT);
      }
    });

    it('should throw 400 when challenge is expired', async () => {
      otpRepo.findOne.mockResolvedValue({
        ...validChallenge,
        expiresAt: new Date(Date.now() - 1000),
      });
      try {
        await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should emit OTP_SENT audit event', async () => {
      otpRepo.findOne.mockResolvedValue({ ...validChallenge });
      await service.send({ otpChallengeId: 'otp-1' }, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'OTP_SENT',
          actorType: 'CONSUMER',
          contractContextId: 'ctx-1',
        }),
      );
    });
  });

  describe('verify', () => {
    const makeChallengeWithCode = (code: string, salt: string) => ({
      id: 'otp-1',
      contractContextId: 'ctx-1',
      codeHash: hashOtpCode(code, salt),
      codeSalt: salt,
      maskedDestination: '***-***-4567',
      channel: 'sms',
      status: OtpStatus.SENT,
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    it('should return session token on successful verification', async () => {
      otpRepo.findOne.mockResolvedValue(makeChallengeWithCode('123456', 'test-salt'));

      const result = await service.verify(
        { otpChallengeId: 'otp-1', code: '123456' },
        correlationId,
        sourceIp,
        userAgent,
      );
      expect(result.sessionToken).toBe('mock-token');
      expect(result.contractContextId).toBe('ctx-1');
      expect(result.otp.status).toBe('VERIFIED');
    });

    it('should create consumer token with medium risk tier', async () => {
      otpRepo.findOne.mockResolvedValue(makeChallengeWithCode('123456', 'test-salt'));

      await service.verify(
        { otpChallengeId: 'otp-1', code: '123456' },
        correlationId,
        sourceIp,
        userAgent,
      );
      expect(authService.createConsumerToken).toHaveBeenCalledWith(
        expect.objectContaining({ riskTier: 'medium' }),
      );
    });

    it('should throw 401 OTP_INVALID when code is wrong', async () => {
      otpRepo.findOne.mockResolvedValue(makeChallengeWithCode('123456', 'test-salt'));

      try {
        await service.verify(
          { otpChallengeId: 'otp-1', code: '999999' },
          correlationId,
          sourceIp,
          userAgent,
        );
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_INVALID);
      }
    });

    it('should throw 400 when challenge not found', async () => {
      otpRepo.findOne.mockResolvedValue(null);
      try {
        await service.verify(
          { otpChallengeId: 'otp-nonexist', code: '123456' },
          correlationId,
          sourceIp,
          userAgent,
        );
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_EXPIRED);
      }
    });

    it('should throw 400 when challenge is expired', async () => {
      const challenge = makeChallengeWithCode('123456', 'test-salt');
      challenge.expiresAt = new Date(Date.now() - 1000);
      otpRepo.findOne.mockResolvedValue(challenge);

      try {
        await service.verify(
          { otpChallengeId: 'otp-1', code: '123456' },
          correlationId,
          sourceIp,
          userAgent,
        );
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_EXPIRED);
      }
    });

    it('should throw 429 OTP_LOCKED_OUT when too many attempts', async () => {
      const challenge = makeChallengeWithCode('123456', 'test-salt');
      challenge.attemptCount = 5;
      challenge.maxAttempts = 5;
      otpRepo.findOne.mockResolvedValue(challenge);

      try {
        await service.verify(
          { otpChallengeId: 'otp-1', code: '999999' },
          correlationId,
          sourceIp,
          userAgent,
        );
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.OTP_LOCKED_OUT);
      }
    });

    it('should throw 429 when challenge status is already LOCKED_OUT', async () => {
      const challenge = makeChallengeWithCode('123456', 'test-salt');
      challenge.status = OtpStatus.LOCKED_OUT;
      otpRepo.findOne.mockResolvedValue(challenge);

      try {
        await service.verify(
          { otpChallengeId: 'otp-1', code: '123456' },
          correlationId,
          sourceIp,
          userAgent,
        );
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should increment attempt count on wrong code', async () => {
      const challenge = makeChallengeWithCode('123456', 'test-salt');
      otpRepo.findOne.mockResolvedValue(challenge);

      await expect(
        service.verify({ otpChallengeId: 'otp-1', code: '999999' }, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);

      expect(challenge.attemptCount).toBe(1);
    });

    it('should emit OTP_VERIFIED audit event on success', async () => {
      otpRepo.findOne.mockResolvedValue(makeChallengeWithCode('123456', 'test-salt'));
      await service.verify({ otpChallengeId: 'otp-1', code: '123456' }, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'OTP_VERIFIED' }),
      );
    });

    it('should emit OTP_FAILED audit event on wrong code', async () => {
      otpRepo.findOne.mockResolvedValue(makeChallengeWithCode('123456', 'test-salt'));
      await expect(
        service.verify({ otpChallengeId: 'otp-1', code: '999999' }, correlationId, sourceIp, userAgent),
      ).rejects.toThrow(HttpException);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'OTP_FAILED' }),
      );
    });
  });
});
