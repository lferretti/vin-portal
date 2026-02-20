import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService, AuditEventInput } from './audit.service';
import { AuditEvent } from '../../database/entities/audit-event.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditRepo: jest.Mocked<Partial<Repository<AuditEvent>>>;

  beforeEach(async () => {
    auditRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: 'evt-1', ...data })),
      save: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: auditRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('emit', () => {
    const input: AuditEventInput = {
      eventType: 'AUTH_SUCCESS',
      actorType: 'CONSUMER',
      contractContextId: 'ctx-1',
      requestId: 'req-1',
      correlationId: 'corr-1',
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent',
      eventData: { key: 'value' },
    };

    it('should create and save an audit event entity', async () => {
      await service.emit(input);
      expect(auditRepo.create).toHaveBeenCalledWith({
        eventType: 'AUTH_SUCCESS',
        actorType: 'CONSUMER',
        contractContextId: 'ctx-1',
        requestId: 'req-1',
        correlationId: 'corr-1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
        eventData: { key: 'value' },
      });
      expect(auditRepo.save).toHaveBeenCalled();
    });

    it('should default optional fields to null when not provided', async () => {
      await service.emit({ eventType: 'TEST', actorType: 'SYSTEM' });
      expect(auditRepo.create).toHaveBeenCalledWith({
        eventType: 'TEST',
        actorType: 'SYSTEM',
        contractContextId: null,
        requestId: null,
        correlationId: null,
        sourceIp: null,
        userAgent: null,
        eventData: null,
      });
    });

    it('should not throw when save fails (swallow errors)', async () => {
      (auditRepo.save as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(service.emit(input)).resolves.toBeUndefined();
    });

    it('should not throw when create throws', async () => {
      (auditRepo.create as jest.Mock).mockImplementation(() => {
        throw new Error('create error');
      });
      await expect(service.emit(input)).resolves.toBeUndefined();
    });

    it('should call save with the created entity', async () => {
      const entity = { id: 'evt-1', eventType: 'AUTH_SUCCESS' };
      (auditRepo.create as jest.Mock).mockReturnValue(entity);
      await service.emit(input);
      expect(auditRepo.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('findByContractContext', () => {
    it('should query audit events by contractContextId ordered by createdAt ASC', async () => {
      const events = [{ id: '1' }, { id: '2' }];
      (auditRepo.find as jest.Mock).mockResolvedValue(events);
      const result = await service.findByContractContext('ctx-1');
      expect(auditRepo.find).toHaveBeenCalledWith({
        where: { contractContextId: 'ctx-1' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(events);
    });

    it('should return empty array when no events found', async () => {
      (auditRepo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findByContractContext('ctx-nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('findByRequestId', () => {
    it('should query audit events by requestId ordered by createdAt ASC', async () => {
      const events = [{ id: '3' }];
      (auditRepo.find as jest.Mock).mockResolvedValue(events);
      const result = await service.findByRequestId('req-1');
      expect(auditRepo.find).toHaveBeenCalledWith({
        where: { requestId: 'req-1' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(events);
    });
  });
});
