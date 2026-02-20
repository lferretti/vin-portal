import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { VinService } from './vin.service';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { AuditService } from '../audit/audit.service';
import { VIN_DECODE_ADAPTER, ELIGIBILITY_ADAPTER } from '../../adapters/adapter.tokens';
import { ErrorCodes } from '../../common/constants/error-codes';
import { SessionPayload } from '../../common/decorators/current-session.decorator';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';

describe('VinService', () => {
  let service: VinService;
  let requestRepo: Record<string, jest.Mock>;
  let vinDecodeAdapter: Record<string, jest.Mock>;
  let eligibilityAdapter: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  const session: SessionPayload = {
    contractContextId: 'ctx-1',
    externalContractId: 'ext-1',
    riskTier: 'low',
  };

  const correlationId = 'corr-1';
  const sourceIp = '127.0.0.1';
  const userAgent = 'test-agent';

  beforeEach(async () => {
    requestRepo = {
      findOne: jest.fn(),
    };

    vinDecodeAdapter = {
      decode: jest.fn().mockResolvedValue({
        year: 2023,
        make: 'Honda',
        model: 'Civic',
      }),
    };

    eligibilityAdapter = {
      check: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCode: 'OK',
      }),
    };

    auditService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VinService,
        { provide: getRepositoryToken(VinAddRequest), useValue: requestRepo },
        { provide: VIN_DECODE_ADAPTER, useValue: vinDecodeAdapter },
        { provide: ELIGIBILITY_ADAPTER, useValue: eligibilityAdapter },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<VinService>(VinService);
  });

  describe('decode', () => {
    const dto = { vin: '1HGBH41JXMN109186' };

    it('should call the VIN decode adapter with uppercased VIN', async () => {
      await service.decode({ vin: '1hgbh41jxmn109186' }, session, correlationId, sourceIp, userAgent);
      expect(vinDecodeAdapter.decode).toHaveBeenCalledWith('1HGBH41JXMN109186');
    });

    it('should return VIN and decoded info', async () => {
      const result = await service.decode(dto, session, correlationId, sourceIp, userAgent);
      expect(result.vin).toBe('1HGBH41JXMN109186');
      expect(result.decoded).toEqual({ year: 2023, make: 'Honda', model: 'Civic' });
    });

    it('should emit VIN_DECODED audit event', async () => {
      await service.decode(dto, session, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_DECODED',
          actorType: 'CONSUMER',
          contractContextId: 'ctx-1',
          correlationId,
        }),
      );
    });

    it('should include vin and decoded in audit event data', async () => {
      await service.decode(dto, session, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventData: {
            vin: '1HGBH41JXMN109186',
            decoded: { year: 2023, make: 'Honda', model: 'Civic' },
          },
        }),
      );
    });

    it('should propagate adapter errors', async () => {
      vinDecodeAdapter.decode.mockRejectedValue(new Error('Decode failed'));
      await expect(
        service.decode(dto, session, correlationId, sourceIp, userAgent),
      ).rejects.toThrow('Decode failed');
    });
  });

  describe('checkEligibility', () => {
    const dto = { vin: '1HGBH41JXMN109186' };

    it('should call eligibility adapter with externalContractId and VIN', async () => {
      await service.checkEligibility(dto, session, correlationId, sourceIp, userAgent);
      expect(eligibilityAdapter.check).toHaveBeenCalledWith('ext-1', '1HGBH41JXMN109186');
    });

    it('should return eligibility result', async () => {
      const result = await service.checkEligibility(dto, session, correlationId, sourceIp, userAgent);
      expect(result.vin).toBe('1HGBH41JXMN109186');
      expect(result.eligible).toBe(true);
      expect(result.reasonCode).toBe('OK');
    });

    it('should emit VIN_ELIGIBILITY_CHECKED audit event', async () => {
      await service.checkEligibility(dto, session, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_ELIGIBILITY_CHECKED',
          eventData: expect.objectContaining({
            eligible: true,
            reasonCode: 'OK',
          }),
        }),
      );
    });

    it('should use empty string for externalContractId when not set', async () => {
      const sessionNoExt: SessionPayload = { contractContextId: 'ctx-1' };
      await service.checkEligibility(dto, sessionNoExt, correlationId, sourceIp, userAgent);
      expect(eligibilityAdapter.check).toHaveBeenCalledWith('', '1HGBH41JXMN109186');
    });

    it('should uppercase VIN before checking', async () => {
      await service.checkEligibility({ vin: 'abc12345678901234' }, session, correlationId, sourceIp, userAgent);
      expect(eligibilityAdapter.check).toHaveBeenCalledWith('ext-1', 'ABC12345678901234');
    });
  });

  describe('getRequestStatus', () => {
    const mockRequest = {
      id: 'req-1',
      contractContextId: 'ctx-1',
      status: VinAddStatus.PENDING,
      vin: '1HGBH41JXMN109186',
      decoded: { year: 2023, make: 'Honda', model: 'Civic' },
      updatedAt: new Date('2026-01-01'),
      eligibilityAllowed: null,
      eligibilityReasonCode: null,
    };

    it('should return request status when found and owned by session', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      const result = await service.getRequestStatus('req-1', session);
      expect(result.requestId).toBe('req-1');
      expect(result.status).toBe(VinAddStatus.PENDING);
      expect(result.vin).toBe('1HGBH41JXMN109186');
    });

    it('should throw 404 when request not found', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      try {
        await service.getRequestStatus('req-nonexistent', session);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.NOT_FOUND);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.CONTRACT_NOT_FOUND);
      }
    });

    it('should throw 403 when request belongs to different session', async () => {
      requestRepo.findOne.mockResolvedValue({
        ...mockRequest,
        contractContextId: 'ctx-other',
      });
      try {
        await service.getRequestStatus('req-1', session);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.FORBIDDEN);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.AUTH_INVALID);
      }
    });

    it('should return lastUpdatedAt as ISO string', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      const result = await service.getRequestStatus('req-1', session);
      expect(result.lastUpdatedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should return eligibility fields', async () => {
      requestRepo.findOne.mockResolvedValue({
        ...mockRequest,
        eligibilityAllowed: true,
        eligibilityReasonCode: 'OK',
      });
      const result = await service.getRequestStatus('req-1', session);
      expect(result.eligibilityAllowed).toBe(true);
      expect(result.eligibilityReasonCode).toBe('OK');
    });
  });
});
