import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommitService } from './commit.service';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { AuditService } from '../audit/audit.service';
import { BusinessMetricsService } from '../../common/services/business-metrics.service';
import { VIN_DECODE_ADAPTER, ELIGIBILITY_ADAPTER } from '../../adapters/adapter.tokens';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { SessionPayload } from '../../common/decorators/current-session.decorator';

describe('CommitService', () => {
  let service: CommitService;
  let contractRepo: Record<string, jest.Mock>;
  let requestRepo: Record<string, jest.Mock>;
  let vinDecodeAdapter: Record<string, jest.Mock>;
  let eligibilityAdapter: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  const session: SessionPayload = {
    contractContextId: 'ctx-1',
    externalContractId: 'ext-1',
    riskTier: 'low',
  };

  const correlationId = 'corr-1';
  const sourceIp = '127.0.0.1';
  const userAgent = 'test-agent';
  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

  const dto = {
    vin: '1HGBH41JXMN109186',
    acceptIrreversible: true,
  };

  beforeEach(async () => {
    const mockTransactionManager = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === ContractContext) {
          return {
            createQueryBuilder: jest.fn().mockReturnValue({
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue({
                id: 'ctx-1',
                status: VinAddStatus.NOT_USED,
              }),
            }),
            save: jest.fn().mockResolvedValue({}),
          };
        }
        if (entity === VinAddRequest) {
          return {
            create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
              id: 'req-1',
              ...data,
            })),
            save: jest.fn().mockImplementation((data: Record<string, unknown>) =>
              Promise.resolve({ id: 'req-1', ...data }),
            ),
          };
        }
        return {};
      }),
    };

    contractRepo = {
      update: jest.fn().mockResolvedValue({}),
    };

    requestRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'req-1', ...data })),
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
        rawPayload: { status: 'approved' },
      }),
    };

    auditService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (manager: unknown) => unknown) => {
        return cb(mockTransactionManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitService,
        { provide: getRepositoryToken(ContractContext), useValue: contractRepo },
        { provide: getRepositoryToken(VinAddRequest), useValue: requestRepo },
        { provide: VIN_DECODE_ADAPTER, useValue: vinDecodeAdapter },
        { provide: ELIGIBILITY_ADAPTER, useValue: eligibilityAdapter },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: BusinessMetricsService,
          useValue: {
            trackAuthAttempt: jest.fn(),
            trackOtpVerify: jest.fn(),
            trackEligibilityCheck: jest.fn(),
            trackVinCommit: jest.fn(),
            trackWorkerRetry: jest.fn(),
            trackDocumentDownload: jest.fn(),
            trackDocumentEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommitService>(CommitService);
  });

  describe('commit - successful flow', () => {
    it('should decode the VIN before creating a request', async () => {
      const result = await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(vinDecodeAdapter.decode).toHaveBeenCalledWith('1HGBH41JXMN109186');
      expect(result.vin).toBe('1HGBH41JXMN109186');
    });

    it('should return COMMITTED_LOCKED status on success', async () => {
      const result = await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(result.status).toBe(VinAddStatus.COMMITTED_LOCKED);
      expect(result.message).toBe('Vehicle successfully added.');
    });

    it('should return requestId and decoded data', async () => {
      const result = await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(result.requestId).toBe('req-1');
      expect(result.decoded).toEqual({ year: 2023, make: 'Honda', model: 'Civic' });
    });

    it('should emit VIN_COMMIT_REQUESTED audit event', async () => {
      await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_COMMIT_REQUESTED',
          actorType: 'CONSUMER',
        }),
      );
    });

    it('should emit VIN_COMMIT_SUCCESS audit event', async () => {
      await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_COMMIT_SUCCESS',
          actorType: 'SYSTEM',
        }),
      );
    });

    it('should run inside a database transaction', async () => {
      await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('commit - idempotency', () => {
    it('should return existing request when idempotency key matches', async () => {
      const existingRequest = {
        id: 'req-existing',
        status: VinAddStatus.COMMITTED_LOCKED,
        vin: '1HGBH41JXMN109186',
        decoded: { year: 2023, make: 'Honda', model: 'Civic' },
        updatedAt: new Date('2026-01-15'),
      };
      requestRepo.findOne.mockResolvedValue(existingRequest);

      const result = await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(result.requestId).toBe('req-existing');
      expect(result.status).toBe(VinAddStatus.COMMITTED_LOCKED);
      expect(result.committedAt).toBe('2026-01-15T00:00:00.000Z');
    });

    it('should not call decode adapter when idempotency key is found', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-existing',
        status: VinAddStatus.PENDING,
        vin: '1HGBH41JXMN109186',
        decoded: {},
        updatedAt: new Date(),
      });

      await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(vinDecodeAdapter.decode).not.toHaveBeenCalled();
    });
  });

  describe('commit - validation errors', () => {
    it('should throw 400 when acceptIrreversible is false', async () => {
      const badDto = { vin: '1HGBH41JXMN109186', acceptIrreversible: false };
      try {
        await service.commit(badDto, session, correlationId, sourceIp, userAgent, idempotencyKey);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should throw 400 when idempotency key is empty', async () => {
      try {
        await service.commit(dto, session, correlationId, sourceIp, userAgent, '');
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('commit - ineligible VIN', () => {
    it('should throw 409 with VIN_INELIGIBLE when not eligible', async () => {
      eligibilityAdapter.check.mockResolvedValue({
        allowed: false,
        reasonCode: 'YEAR_TOO_OLD',
      });

      try {
        await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.CONFLICT);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.VIN_INELIGIBLE);
      }
    });

    it('should release the soft lock on ineligible VIN', async () => {
      eligibilityAdapter.check.mockResolvedValue({
        allowed: false,
        reasonCode: 'YEAR_TOO_OLD',
      });

      await expect(
        service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey),
      ).rejects.toThrow(HttpException);

      expect(contractRepo.update).toHaveBeenCalledWith('ctx-1', {
        status: VinAddStatus.NOT_USED,
      });
    });
  });

  describe('commit - dependency failure', () => {
    it('should return PENDING status when eligibility adapter throws a non-HttpException', async () => {
      eligibilityAdapter.check.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(result.status).toBe(VinAddStatus.PENDING);
      expect(result.message).toBe('Request is being processed.');
    });

    it('should emit VIN_COMMIT_PENDING audit event on dependency failure', async () => {
      eligibilityAdapter.check.mockRejectedValue(new Error('timeout'));

      await service.commit(dto, session, correlationId, sourceIp, userAgent, idempotencyKey);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_COMMIT_PENDING',
          eventData: { reason: 'DEPENDENCY_UNAVAILABLE' },
        }),
      );
    });
  });
});
