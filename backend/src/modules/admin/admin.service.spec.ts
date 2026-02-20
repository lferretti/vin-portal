import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { AuditEvent } from '../../database/entities/audit-event.entity';
import { AuditService } from '../audit/audit.service';
import { ErrorCodes } from '../../common/constants/error-codes';

describe('AdminService', () => {
  let service: AdminService;
  let contractRepo: Record<string, jest.Mock>;
  let requestRepo: Record<string, jest.Mock>;
  let auditEventRepo: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  const correlationId = 'corr-1';
  const sourceIp = '127.0.0.1';
  const userAgent = 'admin-agent';

  const configMap: Record<string, unknown> = {
    'app.contractHashSalt': 'test-salt',
  };

  beforeEach(async () => {
    const qbMock = {
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    contractRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };

    requestRepo = {
      findOne: jest.fn(),
    };

    auditEventRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    auditService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(ContractContext), useValue: contractRepo },
        { provide: getRepositoryToken(VinAddRequest), useValue: requestRepo },
        { provide: getRepositoryToken(AuditEvent), useValue: auditEventRepo },
        { provide: AuditService, useValue: auditService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('searchContracts', () => {
    it('should throw 400 when no search criteria provided', async () => {
      await expect(
        service.searchContracts({}, 'corr', '127.0.0.1', 'agent'),
      ).rejects.toThrow('At least one search criterion is required');
    });

    it('should return empty results when no contracts match', async () => {
      const result = await service.searchContracts({ externalContractId: 'ext-0' }, correlationId, sourceIp, userAgent);
      expect(result.results).toEqual([]);
    });

    it('should emit ADMIN_VIEW audit event', async () => {
      await service.searchContracts({ externalContractId: 'ext-0' }, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ADMIN_VIEW',
          actorType: 'ADMIN',
          eventData: expect.objectContaining({ action: 'search' }),
        }),
      );
    });

    it('should apply contractNumber hash filter when provided', async () => {
      await service.searchContracts(
        { contractNumber: 'CONTRACT-001' },
        correlationId,
        sourceIp,
        userAgent,
      );
      const qb = contractRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'cc.contractNumberHash = :hash',
        expect.objectContaining({ hash: expect.any(String) }),
      );
    });

    it('should apply externalContractId filter when provided', async () => {
      await service.searchContracts(
        { externalContractId: 'ext-1' },
        correlationId,
        sourceIp,
        userAgent,
      );
      const qb = contractRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'cc.externalContractId = :extId',
        { extId: 'ext-1' },
      );
    });

    it('should apply requestId filter using innerJoin when provided', async () => {
      await service.searchContracts(
        { requestId: 'req-1' },
        correlationId,
        sourceIp,
        userAgent,
      );
      const qb = contractRepo.createQueryBuilder();
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'cc.vinAddRequests',
        'req',
        'req.id = :reqId',
        { reqId: 'req-1' },
      );
    });

    it('should map contract entities to response DTOs', async () => {
      const qbMock = contractRepo.createQueryBuilder();
      qbMock.getMany.mockResolvedValue([
        {
          id: 'ctx-1',
          externalContractId: 'ext-1',
          status: 'COMMITTED_LOCKED',
          committedVinMasked: '1HG******1234',
          committedAt: new Date('2026-01-15'),
        },
      ]);

      const result = await service.searchContracts({ externalContractId: 'ext-1' }, correlationId, sourceIp, userAgent);
      expect(result.results).toEqual([
        {
          contractContextId: 'ctx-1',
          externalContractId: 'ext-1',
          status: 'COMMITTED_LOCKED',
          committedVinMasked: '1HG******1234',
          committedAt: '2026-01-15T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('getRequestDetail', () => {
    const mockRequest = {
      id: 'req-1',
      contractContextId: 'ctx-1',
      status: 'PENDING',
      vin: '1HGBH41JXMN109186',
      decoded: { year: 2023, make: 'Honda', model: 'Civic' },
      eligibilityAllowed: null,
      eligibilityReasonCode: null,
      lastDependencyError: null,
    };

    it('should return request detail with audit events', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      auditEventRepo.find.mockResolvedValue([
        {
          eventType: 'VIN_DECODED',
          createdAt: new Date('2026-01-01'),
          actorType: 'CONSUMER',
          sourceIp: '127.0.0.1',
          userAgent: 'test',
          eventData: {},
        },
      ]);

      const result = await service.getRequestDetail('req-1', correlationId, sourceIp, userAgent);
      expect(result.requestId).toBe('req-1');
      expect(result.audit).toHaveLength(1);
      expect(result.audit[0].eventType).toBe('VIN_DECODED');
    });

    it('should throw 404 when request not found', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      try {
        await service.getRequestDetail('req-nonexist', correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.NOT_FOUND);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.CONTRACT_NOT_FOUND);
      }
    });

    it('should emit ADMIN_VIEW audit event', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await service.getRequestDetail('req-1', correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ADMIN_VIEW',
          requestId: 'req-1',
        }),
      );
    });

    it('should query audit events for both requestId and contractContextId', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await service.getRequestDetail('req-1', correlationId, sourceIp, userAgent);
      expect(auditEventRepo.find).toHaveBeenCalledWith({
        where: [
          { requestId: 'req-1' },
          { contractContextId: 'ctx-1' },
        ],
        order: { createdAt: 'ASC' },
      });
    });

    it('should return all request fields', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      const result = await service.getRequestDetail('req-1', correlationId, sourceIp, userAgent);
      expect(result.status).toBe('PENDING');
      expect(result.vin).toBe('1HGBH41JXMN109186');
      expect(result.decoded).toEqual({ year: 2023, make: 'Honda', model: 'Civic' });
    });
  });

  describe('addNote', () => {
    const mockRequest = {
      id: 'req-1',
      contractContextId: 'ctx-1',
    };

    it('should emit ADMIN_NOTE audit event with note in eventData', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await service.addNote('req-1', { note: 'Test note' }, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ADMIN_NOTE',
          actorType: 'ADMIN',
          requestId: 'req-1',
          eventData: { note: 'Test note' },
        }),
      );
    });

    it('should return { requestId, noteSaved: true }', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      const result = await service.addNote('req-1', { note: 'Note' }, correlationId, sourceIp, userAgent);
      expect(result).toEqual({ requestId: 'req-1', noteSaved: true });
    });

    it('should throw 404 when request not found', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      try {
        await service.addNote('req-nonexist', { note: 'Note' }, correlationId, sourceIp, userAgent);
        fail('Expected HttpException');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.NOT_FOUND);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body['code']).toBe(ErrorCodes.CONTRACT_NOT_FOUND);
      }
    });

    it('should include contractContextId in the audit event', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await service.addNote('req-1', { note: 'Note' }, correlationId, sourceIp, userAgent);
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          contractContextId: 'ctx-1',
        }),
      );
    });

    it('should pass correlationId, sourceIp, and userAgent to audit', async () => {
      requestRepo.findOne.mockResolvedValue(mockRequest);
      await service.addNote('req-1', { note: 'Note' }, 'admin-corr', '10.0.0.1', 'AdminBrowser');
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'admin-corr',
          sourceIp: '10.0.0.1',
          userAgent: 'AdminBrowser',
        }),
      );
    });
  });
});
