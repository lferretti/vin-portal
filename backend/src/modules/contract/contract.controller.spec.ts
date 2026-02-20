import { Test, TestingModule } from '@nestjs/testing';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

describe('ContractController', () => {
  let controller: ContractController;
  let contractService: Record<string, jest.Mock>;

  beforeEach(async () => {
    contractService = {
      authenticate: jest.fn().mockResolvedValue({
        contractContextId: 'ctx-1',
        sessionToken: 'mock-token',
        sessionExpiresAt: '2026-01-01T00:00:00.000Z',
        otp: { status: 'NOT_REQUIRED' },
        contractSummary: { primaryVinMasked: '1HG******1234', hasAdditionalVin: false },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractController],
      providers: [
        { provide: ContractService, useValue: contractService },
      ],
    }).compile();

    controller = module.get<ContractController>(ContractController);
  });

  describe('authenticate', () => {
    const dto = {
      vin7: '1234567',
      lastName: 'SMITH',
      zip: '30301',
    };
    const correlationId = 'corr-1';
    const ip = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    it('should call contractService.authenticate with all args', async () => {
      await controller.authenticate(dto as any, correlationId, ip, userAgent);
      expect(contractService.authenticate).toHaveBeenCalledWith(
        dto,
        correlationId,
        ip,
        userAgent,
      );
    });

    it('should return the service response', async () => {
      const result = await controller.authenticate(dto as any, correlationId, ip, userAgent);
      expect(result.contractContextId).toBe('ctx-1');
      expect(result.sessionToken).toBe('mock-token');
    });

    it('should pass the correlation ID from the decorator', async () => {
      await controller.authenticate(dto as any, 'custom-corr-id', ip, userAgent);
      expect(contractService.authenticate).toHaveBeenCalledWith(
        dto,
        'custom-corr-id',
        ip,
        userAgent,
      );
    });

    it('should pass the IP from the @Ip decorator', async () => {
      await controller.authenticate(dto as any, correlationId, '10.0.0.1', userAgent);
      expect(contractService.authenticate).toHaveBeenCalledWith(
        dto,
        correlationId,
        '10.0.0.1',
        userAgent,
      );
    });

    it('should pass the user agent from headers', async () => {
      await controller.authenticate(dto as any, correlationId, ip, 'CustomAgent/1.0');
      expect(contractService.authenticate).toHaveBeenCalledWith(
        dto,
        correlationId,
        ip,
        'CustomAgent/1.0',
      );
    });

    it('should propagate errors from the service', async () => {
      contractService.authenticate.mockRejectedValue(new Error('Service error'));
      await expect(
        controller.authenticate(dto as any, correlationId, ip, userAgent),
      ).rejects.toThrow('Service error');
    });
  });
});
