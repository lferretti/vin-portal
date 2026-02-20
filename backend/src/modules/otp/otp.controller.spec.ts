import { Test, TestingModule } from '@nestjs/testing';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';

describe('OtpController', () => {
  let controller: OtpController;
  let otpService: Record<string, jest.Mock>;

  beforeEach(async () => {
    otpService = {
      send: jest.fn().mockResolvedValue({
        otpChallengeId: 'otp-1',
        status: 'SENT',
        expiresAt: '2026-01-01T00:10:00.000Z',
      }),
      verify: jest.fn().mockResolvedValue({
        contractContextId: 'ctx-1',
        sessionToken: 'mock-token',
        sessionExpiresAt: '2026-01-01T00:15:00.000Z',
        otp: { status: 'VERIFIED' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        { provide: OtpService, useValue: otpService },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
  });

  describe('send', () => {
    const dto = { otpChallengeId: 'otp-1' };
    const correlationId = 'corr-1';
    const ip = '127.0.0.1';
    const userAgent = 'test-agent';

    it('should call otpService.send with correct arguments', async () => {
      await controller.send(dto as any, correlationId, ip, userAgent);
      expect(otpService.send).toHaveBeenCalledWith(dto, correlationId, ip, userAgent);
    });

    it('should return the service response', async () => {
      const result = await controller.send(dto as any, correlationId, ip, userAgent);
      expect(result.otpChallengeId).toBe('otp-1');
      expect(result.status).toBe('SENT');
    });

    it('should pass through the correlation ID', async () => {
      await controller.send(dto as any, 'custom-corr', ip, userAgent);
      expect(otpService.send).toHaveBeenCalledWith(dto, 'custom-corr', ip, userAgent);
    });

    it('should pass through the source IP', async () => {
      await controller.send(dto as any, correlationId, '10.0.0.1', userAgent);
      expect(otpService.send).toHaveBeenCalledWith(dto, correlationId, '10.0.0.1', userAgent);
    });

    it('should propagate service errors', async () => {
      otpService.send.mockRejectedValue(new Error('Send failed'));
      await expect(
        controller.send(dto as any, correlationId, ip, userAgent),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('verify', () => {
    const dto = { otpChallengeId: 'otp-1', code: '123456' };
    const correlationId = 'corr-1';
    const ip = '127.0.0.1';
    const userAgent = 'test-agent';

    it('should call otpService.verify with correct arguments', async () => {
      await controller.verify(dto as any, correlationId, ip, userAgent);
      expect(otpService.verify).toHaveBeenCalledWith(dto, correlationId, ip, userAgent);
    });

    it('should return the service response', async () => {
      const result = await controller.verify(dto as any, correlationId, ip, userAgent);
      expect(result.sessionToken).toBe('mock-token');
      expect(result.otp.status).toBe('VERIFIED');
    });

    it('should pass through the user agent', async () => {
      await controller.verify(dto as any, correlationId, ip, 'CustomAgent/2.0');
      expect(otpService.verify).toHaveBeenCalledWith(dto, correlationId, ip, 'CustomAgent/2.0');
    });

    it('should propagate service errors', async () => {
      otpService.verify.mockRejectedValue(new Error('Verify failed'));
      await expect(
        controller.verify(dto as any, correlationId, ip, userAgent),
      ).rejects.toThrow('Verify failed');
    });

    it('should pass the full dto including code', async () => {
      const fullDto = { otpChallengeId: 'otp-2', code: '654321' };
      await controller.verify(fullDto as any, correlationId, ip, userAgent);
      expect(otpService.verify).toHaveBeenCalledWith(fullDto, correlationId, ip, userAgent);
    });
  });
});
