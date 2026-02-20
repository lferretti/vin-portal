import { Test, TestingModule } from '@nestjs/testing';
import { BusinessMetricsService } from './business-metrics.service';

// Mock dd-trace before importing the service
const mockIncrement = jest.fn();
jest.mock('dd-trace', () => ({
  dogstatsd: {
    increment: mockIncrement,
  },
}));

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  beforeEach(async () => {
    mockIncrement.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessMetricsService],
    }).compile();

    service = module.get<BusinessMetricsService>(BusinessMetricsService);
  });

  describe('trackAuthAttempt', () => {
    it('should increment vin_portal.auth.attempt with result tag', () => {
      service.trackAuthAttempt('success');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.auth.attempt',
        ['result:success'],
      );
    });

    it.each<'success' | 'no_match' | 'otp_required' | 'rate_limited' | 'locked'>([
      'success',
      'no_match',
      'otp_required',
      'rate_limited',
      'locked',
    ])('should accept result=%s', (result) => {
      service.trackAuthAttempt(result);
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.auth.attempt',
        [`result:${result}`],
      );
    });
  });

  describe('trackOtpVerify', () => {
    it('should increment vin_portal.otp.verify with result tag', () => {
      service.trackOtpVerify('success');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.otp.verify',
        ['result:success'],
      );
    });

    it.each<'success' | 'invalid' | 'expired' | 'locked_out'>([
      'success',
      'invalid',
      'expired',
      'locked_out',
    ])('should accept result=%s', (result) => {
      service.trackOtpVerify(result);
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.otp.verify',
        [`result:${result}`],
      );
    });
  });

  describe('trackEligibilityCheck', () => {
    it('should increment vin_portal.eligibility.check with result and reason_code tags', () => {
      service.trackEligibilityCheck('allowed', 'OK');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.eligibility.check',
        ['result:allowed', 'reason_code:OK'],
      );
    });

    it('should handle denied result with reason code', () => {
      service.trackEligibilityCheck('denied', 'VEHICLE_TOO_OLD');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.eligibility.check',
        ['result:denied', 'reason_code:VEHICLE_TOO_OLD'],
      );
    });
  });

  describe('trackVinCommit', () => {
    it('should increment vin_portal.vin.commit with path and result tags', () => {
      service.trackVinCommit('sync', 'committed');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.vin.commit',
        ['path:sync', 'result:committed'],
      );
    });

    it('should handle async pending', () => {
      service.trackVinCommit('async', 'pending');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.vin.commit',
        ['path:async', 'result:pending'],
      );
    });

    it('should handle sync failed', () => {
      service.trackVinCommit('sync', 'failed');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.vin.commit',
        ['path:sync', 'result:failed'],
      );
    });
  });

  describe('trackWorkerRetry', () => {
    it('should increment vin_portal.worker.retry with attempt tag', () => {
      service.trackWorkerRetry(3);
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.worker.retry',
        ['attempt:3'],
      );
    });

    it('should include final_status tag when provided', () => {
      service.trackWorkerRetry(5, 'failed');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.worker.retry',
        ['attempt:5', 'final_status:failed'],
      );
    });

    it('should not include final_status tag when not provided', () => {
      service.trackWorkerRetry(2);
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.worker.retry',
        ['attempt:2'],
      );
    });
  });

  describe('trackDocumentDownload', () => {
    it('should increment vin_portal.document.download with no tags', () => {
      service.trackDocumentDownload();
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.document.download',
        [],
      );
    });
  });

  describe('trackDocumentEmail', () => {
    it('should increment vin_portal.document.email with result:sent', () => {
      service.trackDocumentEmail('sent');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.document.email',
        ['result:sent'],
      );
    });

    it('should increment vin_portal.document.email with result:failed', () => {
      service.trackDocumentEmail('failed');
      expect(mockIncrement).toHaveBeenCalledWith(
        'vin_portal.document.email',
        ['result:failed'],
      );
    });
  });
});

describe('BusinessMetricsService (no dd-trace)', () => {
  let service: BusinessMetricsService;

  beforeEach(async () => {
    // Temporarily override the dd-trace mock to simulate it not being available
    jest.resetModules();
    jest.doMock('dd-trace', () => {
      throw new Error('Cannot find module dd-trace');
    });

    // Re-import the service after mocking
    const { BusinessMetricsService: FreshService } = await import(
      './business-metrics.service'
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [FreshService],
    }).compile();

    service = module.get(FreshService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not throw when dd-trace is unavailable', () => {
    expect(() => service.trackAuthAttempt('success')).not.toThrow();
  });

  it('should still log metrics when dd-trace is unavailable', () => {
    // Should complete without error — metrics are logged via NestJS Logger
    service.trackOtpVerify('success');
    service.trackEligibilityCheck('allowed', 'OK');
    service.trackVinCommit('sync', 'committed');
    service.trackWorkerRetry(1);
    service.trackDocumentDownload();
    service.trackDocumentEmail('sent');
  });
});
