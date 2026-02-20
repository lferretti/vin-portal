import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: Record<string, jest.Mock>;

  const correlationId = 'corr-1';
  const ip = '127.0.0.1';
  const userAgent = 'admin-agent';

  beforeEach(async () => {
    adminService = {
      searchContracts: jest.fn().mockResolvedValue({ results: [] }),
      getContractDetail: jest.fn().mockResolvedValue({
        contractContextId: 'ctx-1',
        externalContractId: 'EXT-001',
        status: 'NOT_USED',
        committedVinMasked: null,
        committedAt: null,
        requests: [],
      }),
      getRequestDetail: jest.fn().mockResolvedValue({
        requestId: 'req-1',
        status: 'PENDING',
        audit: [],
      }),
      addNote: jest.fn().mockResolvedValue({ requestId: 'req-1', noteSaved: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('searchContracts', () => {
    it('should call adminService.searchContracts with correct arguments', async () => {
      const query = { contractNumber: 'CONTRACT-001' };
      await controller.searchContracts(query as any, correlationId, ip, userAgent);
      expect(adminService.searchContracts).toHaveBeenCalledWith(query, correlationId, ip, userAgent);
    });

    it('should return the service response', async () => {
      const result = await controller.searchContracts({} as any, correlationId, ip, userAgent);
      expect(result.results).toEqual([]);
    });

    it('should pass empty query when no filters provided', async () => {
      await controller.searchContracts({} as any, correlationId, ip, userAgent);
      expect(adminService.searchContracts).toHaveBeenCalledWith({}, correlationId, ip, userAgent);
    });

    it('should propagate service errors', async () => {
      adminService.searchContracts.mockRejectedValue(new Error('Search failed'));
      await expect(
        controller.searchContracts({} as any, correlationId, ip, userAgent),
      ).rejects.toThrow('Search failed');
    });

    it('should pass correlation ID to service', async () => {
      await controller.searchContracts({} as any, 'admin-corr', ip, userAgent);
      expect(adminService.searchContracts).toHaveBeenCalledWith({}, 'admin-corr', ip, userAgent);
    });
  });

  describe('getContractDetail', () => {
    it('should call adminService.getContractDetail with correct arguments', async () => {
      await controller.getContractDetail('ctx-1', correlationId, ip, userAgent);
      expect(adminService.getContractDetail).toHaveBeenCalledWith('ctx-1', correlationId, ip, userAgent);
    });

    it('should return the service response', async () => {
      const result = await controller.getContractDetail('ctx-1', correlationId, ip, userAgent);
      expect(result.contractContextId).toBe('ctx-1');
      expect(result.requests).toEqual([]);
    });

    it('should propagate service errors', async () => {
      adminService.getContractDetail.mockRejectedValue(new Error('Contract not found'));
      await expect(
        controller.getContractDetail('ctx-missing', correlationId, ip, userAgent),
      ).rejects.toThrow('Contract not found');
    });
  });

  describe('getRequestDetail', () => {
    const defaultReq = { user: { role: 'support' } };

    it('should call adminService.getRequestDetail with requestId', async () => {
      await controller.getRequestDetail('req-1', correlationId, ip, userAgent, defaultReq);
      expect(adminService.getRequestDetail).toHaveBeenCalledWith('req-1', correlationId, ip, userAgent, 'support');
    });

    it('should return the service response', async () => {
      const result = await controller.getRequestDetail('req-1', correlationId, ip, userAgent, defaultReq);
      expect(result.requestId).toBe('req-1');
    });

    it('should propagate service errors', async () => {
      adminService.getRequestDetail.mockRejectedValue(new Error('Not found'));
      await expect(
        controller.getRequestDetail('req-1', correlationId, ip, userAgent, defaultReq),
      ).rejects.toThrow('Not found');
    });

    it('should pass caller role from request user', async () => {
      const req = { user: { role: 'admin' } };
      await controller.getRequestDetail('req-1', correlationId, ip, userAgent, req as never);
      expect(adminService.getRequestDetail).toHaveBeenCalledWith('req-1', correlationId, ip, userAgent, 'admin');
    });

    it('should default to support role when user has no role', async () => {
      const req = { user: {} };
      await controller.getRequestDetail('req-1', correlationId, ip, userAgent, req as never);
      expect(adminService.getRequestDetail).toHaveBeenCalledWith('req-1', correlationId, ip, userAgent, 'support');
    });
  });

  describe('addNote', () => {
    it('should call adminService.addNote with all arguments', async () => {
      const dto = { note: 'Test note' };
      await controller.addNote('req-1', dto as any, correlationId, ip, userAgent);
      expect(adminService.addNote).toHaveBeenCalledWith('req-1', dto, correlationId, ip, userAgent);
    });

    it('should return { requestId, noteSaved: true }', async () => {
      const result = await controller.addNote('req-1', { note: 'Note' } as any, correlationId, ip, userAgent);
      expect(result).toEqual({ requestId: 'req-1', noteSaved: true });
    });

    it('should propagate service errors', async () => {
      adminService.addNote.mockRejectedValue(new Error('Note failed'));
      await expect(
        controller.addNote('req-1', { note: 'Note' } as any, correlationId, ip, userAgent),
      ).rejects.toThrow('Note failed');
    });

    it('should pass the full DTO to the service', async () => {
      const dto = { note: 'A longer note with details' };
      await controller.addNote('req-1', dto as any, correlationId, ip, userAgent);
      expect(adminService.addNote).toHaveBeenCalledWith(
        'req-1',
        dto,
        correlationId,
        ip,
        userAgent,
      );
    });

    it('should pass source IP and user agent', async () => {
      await controller.addNote('req-1', { note: 'X' } as any, correlationId, '10.0.0.1', 'AdminBrowser');
      expect(adminService.addNote).toHaveBeenCalledWith(
        'req-1',
        { note: 'X' },
        correlationId,
        '10.0.0.1',
        'AdminBrowser',
      );
    });
  });
});
