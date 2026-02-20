import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VinController } from './vin.controller';
import { VinService } from './vin.service';
import { CommitService } from './commit.service';
import { SessionPayload } from '../../common/decorators/current-session.decorator';

describe('VinController', () => {
  let controller: VinController;
  let vinService: Record<string, jest.Mock>;
  let commitService: Record<string, jest.Mock>;

  const session: SessionPayload = {
    contractContextId: 'ctx-1',
    externalContractId: 'ext-1',
  };

  const correlationId = 'corr-1';
  const ip = '127.0.0.1';
  const userAgent = 'test-agent';

  beforeEach(async () => {
    vinService = {
      decode: jest.fn().mockResolvedValue({
        vin: '1HGBH41JXMN109186',
        decoded: { year: 2023, make: 'Honda', model: 'Civic' },
      }),
      checkEligibility: jest.fn().mockResolvedValue({
        vin: '1HGBH41JXMN109186',
        eligible: true,
        reasonCode: 'OK',
      }),
      getRequestStatus: jest.fn().mockResolvedValue({
        requestId: 'req-1',
        status: 'PENDING',
      }),
    };

    commitService = {
      commit: jest.fn().mockResolvedValue({
        requestId: 'req-1',
        status: 'COMMITTED_LOCKED',
        vin: '1HGBH41JXMN109186',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VinController],
      providers: [
        { provide: VinService, useValue: vinService },
        { provide: CommitService, useValue: commitService },
      ],
    }).compile();

    controller = module.get<VinController>(VinController);
  });

  describe('decode', () => {
    it('should call vinService.decode with correct arguments', async () => {
      const dto = { vin: '1HGBH41JXMN109186' };
      await controller.decode(dto as any, session, correlationId, ip, userAgent);
      expect(vinService.decode).toHaveBeenCalledWith(dto, session, correlationId, ip, userAgent);
    });

    it('should return decoded VIN data', async () => {
      const result = await controller.decode({ vin: '1HGBH41JXMN109186' } as any, session, correlationId, ip, userAgent);
      expect(result.vin).toBe('1HGBH41JXMN109186');
      expect(result.decoded.year).toBe(2023);
    });

    it('should propagate service errors', async () => {
      vinService.decode.mockRejectedValue(new Error('Decode failed'));
      await expect(
        controller.decode({ vin: 'BAD' } as any, session, correlationId, ip, userAgent),
      ).rejects.toThrow('Decode failed');
    });
  });

  describe('eligibility', () => {
    it('should call vinService.checkEligibility with correct arguments', async () => {
      const dto = { vin: '1HGBH41JXMN109186' };
      await controller.eligibility(dto as any, session, correlationId, ip, userAgent);
      expect(vinService.checkEligibility).toHaveBeenCalledWith(dto, session, correlationId, ip, userAgent);
    });

    it('should return eligibility result', async () => {
      const result = await controller.eligibility({ vin: '1HGBH41JXMN109186' } as any, session, correlationId, ip, userAgent);
      expect(result.eligible).toBe(true);
    });
  });

  describe('commit', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('should call commitService.commit with correct arguments', async () => {
      const dto = { vin: '1HGBH41JXMN109186', acceptIrreversible: true };
      await controller.commit(dto as any, session, correlationId, ip, userAgent, validUuid);
      expect(commitService.commit).toHaveBeenCalledWith(
        dto, session, correlationId, ip, userAgent, validUuid,
      );
    });

    it('should throw BadRequestException for invalid UUID idempotency key', () => {
      const dto = { vin: '1HGBH41JXMN109186', acceptIrreversible: true };
      expect(() =>
        controller.commit(dto as any, session, correlationId, ip, userAgent, 'not-a-uuid'),
      ).toThrow(BadRequestException);
    });

    it('should accept request with no idempotency key (empty string passes UUID check)', async () => {
      const dto = { vin: '1HGBH41JXMN109186', acceptIrreversible: true };
      // Empty string is falsy so UUID_REGEX.test is not called
      await controller.commit(dto as any, session, correlationId, ip, userAgent, '');
      expect(commitService.commit).toHaveBeenCalledWith(
        dto, session, correlationId, ip, userAgent, '',
      );
    });

    it('should return commit result', async () => {
      const dto = { vin: '1HGBH41JXMN109186', acceptIrreversible: true };
      const result = await controller.commit(dto as any, session, correlationId, ip, userAgent, validUuid);
      expect(result.requestId).toBe('req-1');
      expect(result.status).toBe('COMMITTED_LOCKED');
    });

    it('should accept valid UUID v4 format', async () => {
      const dto = { vin: '1HGBH41JXMN109186', acceptIrreversible: true };
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      await controller.commit(dto as any, session, correlationId, ip, userAgent, uuid);
      expect(commitService.commit).toHaveBeenCalledWith(
        dto, session, correlationId, ip, userAgent, uuid,
      );
    });
  });

  describe('getRequestStatus', () => {
    it('should call vinService.getRequestStatus with requestId and session', async () => {
      await controller.getRequestStatus('req-1', session);
      expect(vinService.getRequestStatus).toHaveBeenCalledWith('req-1', session);
    });

    it('should return request status', async () => {
      const result = await controller.getRequestStatus('req-1', session);
      expect(result.requestId).toBe('req-1');
      expect(result.status).toBe('PENDING');
    });

    it('should propagate service errors', async () => {
      vinService.getRequestStatus.mockRejectedValue(new Error('Not found'));
      await expect(controller.getRequestStatus('req-1', session)).rejects.toThrow('Not found');
    });
  });
});
