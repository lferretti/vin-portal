import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CommitWorkerService } from './commit-worker.service';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { AuditService } from '../audit/audit.service';
import { ELIGIBILITY_ADAPTER, ASSOCIATION_ADAPTER } from '../../adapters/adapter.tokens';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';

describe('CommitWorkerService', () => {
  let service: CommitWorkerService;
  let requestRepo: Record<string, jest.Mock>;
  let contractRepo: Record<string, jest.Mock>;
  let eligibilityAdapter: Record<string, jest.Mock>;
  let associationAdapter: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  const configMap: Record<string, unknown> = {
    'app.workerMaxRetries': 5,
    'app.workerEnabled': true,
  };

  beforeEach(async () => {
    const qbMock = {
      setLock: jest.fn().mockReturnThis(),
      setOnLocked: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    requestRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    contractRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({}),
    };

    eligibilityAdapter = {
      check: jest.fn().mockResolvedValue({
        allowed: true,
        reasonCode: 'OK',
      }),
    };

    associationAdapter = {
      associate: jest.fn().mockResolvedValue({
        associationReferenceId: 'assoc-1',
        confirmed: true,
      }),
    };

    auditService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommitWorkerService,
        { provide: getRepositoryToken(VinAddRequest), useValue: requestRepo },
        { provide: getRepositoryToken(ContractContext), useValue: contractRepo },
        { provide: ELIGIBILITY_ADAPTER, useValue: eligibilityAdapter },
        { provide: ASSOCIATION_ADAPTER, useValue: associationAdapter },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configMap[key]),
          },
        },
      ],
    }).compile();

    service = module.get<CommitWorkerService>(CommitWorkerService);
  });

  describe('processNextBatch', () => {
    it('should query for PENDING requests ready for retry', async () => {
      await service.processNextBatch();
      const repo = dataSource.getRepository(VinAddRequest);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should not process any requests when batch is empty', async () => {
      await service.processNextBatch();
      expect(eligibilityAdapter.check).not.toHaveBeenCalled();
      expect(associationAdapter.associate).not.toHaveBeenCalled();
    });

    it('should process each request in the batch', async () => {
      const requests = [
        {
          id: 'req-1',
          contractContextId: 'ctx-1',
          vin: '1HGBH41JXMN109186',
          decoded: { year: 2023, make: 'Honda', model: 'Civic' },
          retryCount: 0,
          status: VinAddStatus.PENDING,
        },
      ];

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue(requests);

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
        status: VinAddStatus.PENDING,
      });

      await service.processNextBatch();
      expect(eligibilityAdapter.check).toHaveBeenCalledWith('ext-1', '1HGBH41JXMN109186');
      expect(associationAdapter.associate).toHaveBeenCalled();
    });
  });

  describe('processRequest - success flow', () => {
    const request = {
      id: 'req-1',
      contractContextId: 'ctx-1',
      vin: '1HGBH41JXMN109186',
      decoded: { year: 2023, make: 'Honda', model: 'Civic' },
      retryCount: 0,
      status: VinAddStatus.PENDING,
    };

    const contractContext = {
      id: 'ctx-1',
      externalContractId: 'ext-1',
      status: VinAddStatus.PENDING,
    };

    beforeEach(() => {
      contractRepo.findOne.mockResolvedValue({ ...contractContext });
    });

    it('should check eligibility then associate', async () => {
      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([{ ...request }]);

      await service.processNextBatch();
      expect(eligibilityAdapter.check).toHaveBeenCalledWith('ext-1', '1HGBH41JXMN109186');
      expect(associationAdapter.associate).toHaveBeenCalledWith('ext-1', '1HGBH41JXMN109186', 'req-1');
    });

    it('should update request status to COMMITTED_LOCKED on success', async () => {
      const req = { ...request };
      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([req]);

      await service.processNextBatch();
      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: VinAddStatus.COMMITTED_LOCKED }),
      );
    });

    it('should update contract context on success', async () => {
      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([{ ...request }]);

      await service.processNextBatch();
      expect(contractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: VinAddStatus.COMMITTED_LOCKED,
          committedVin: '1HGBH41JXMN109186',
        }),
      );
    });

    it('should emit VIN_COMMIT_SUCCESS audit event', async () => {
      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([{ ...request }]);

      await service.processNextBatch();
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VIN_COMMIT_SUCCESS',
          actorType: 'WORKER',
        }),
      );
    });
  });

  describe('processRequest - ineligible', () => {
    it('should mark request FAILED_INELIGIBLE and release contract lock', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-1',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 0,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
        status: VinAddStatus.PENDING,
      });

      eligibilityAdapter.check.mockResolvedValue({
        allowed: false,
        reasonCode: 'YEAR_TOO_OLD',
      });

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: VinAddStatus.FAILED_INELIGIBLE,
          eligibilityAllowed: false,
        }),
      );
      expect(contractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: VinAddStatus.NOT_USED }),
      );
    });
  });

  describe('processRequest - dependency failure with retry', () => {
    it('should increment retryCount and set nextRetryAt', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-1',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 0,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
      });

      eligibilityAdapter.check.mockRejectedValue(new Error('timeout'));

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 1,
          lastDependencyError: 'timeout',
        }),
      );
    });

    it('should emit WORKER_RETRY audit event on retry', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-1',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 0,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
      });

      eligibilityAdapter.check.mockRejectedValue(new Error('timeout'));

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'WORKER_RETRY' }),
      );
    });
  });

  describe('processRequest - max retries reached', () => {
    it('should mark request FAILED_DEPENDENCY and release soft lock', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-1',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 4,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
      });

      eligibilityAdapter.check.mockRejectedValue(new Error('timeout'));

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: VinAddStatus.FAILED_DEPENDENCY,
          retryCount: 5,
        }),
      );
      expect(contractRepo.update).toHaveBeenCalledWith('ctx-1', {
        status: VinAddStatus.NOT_USED,
      });
    });

    it('should emit WORKER_FINAL_FAILURE audit event', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-1',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 4,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue({
        id: 'ctx-1',
        externalContractId: 'ext-1',
      });

      eligibilityAdapter.check.mockRejectedValue(new Error('timeout'));

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();
      expect(auditService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'WORKER_FINAL_FAILURE' }),
      );
    });
  });

  describe('processRequest - contract context not found', () => {
    it('should skip processing when contract context not found', async () => {
      const request = {
        id: 'req-1',
        contractContextId: 'ctx-missing',
        vin: '1HGBH41JXMN109186',
        decoded: {},
        retryCount: 0,
        status: VinAddStatus.PENDING,
      };

      contractRepo.findOne.mockResolvedValue(null);

      const qbMock = dataSource.getRepository(VinAddRequest).createQueryBuilder();
      qbMock.getMany.mockResolvedValue([request]);

      await service.processNextBatch();
      expect(eligibilityAdapter.check).not.toHaveBeenCalled();
      expect(associationAdapter.associate).not.toHaveBeenCalled();
    });
  });
});
