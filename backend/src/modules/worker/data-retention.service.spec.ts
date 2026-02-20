import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DataRetentionService } from './data-retention.service';

describe('DataRetentionService', () => {
  let service: DataRetentionService;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockResolvedValue([[], 0]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataRetentionService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DataRetentionService>(DataRetentionService);
  });

  describe('purgeExpiredRecords', () => {
    it('should call purge for auth attempts', async () => {
      await service.purgeExpiredRecords();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "auth_attempt"'),
        expect.arrayContaining([expect.any(Date)]),
      );
    });

    it('should call purge for expired OTP challenges', async () => {
      await service.purgeExpiredRecords();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "otp_challenge"'),
        expect.arrayContaining([expect.any(Date)]),
      );
    });

    it('should execute both purge operations', async () => {
      await service.purgeExpiredRecords();
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('should use 90-day retention for auth attempts', async () => {
      const now = new Date();
      jest.spyOn(Date.prototype, 'setDate');

      await service.purgeExpiredRecords();

      const authCall = dataSource.query.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('auth_attempt'),
      );
      expect(authCall).toBeDefined();
      const cutoffDate = authCall![1][0] as Date;
      // The cutoff should be approximately 90 days ago
      const daysDiff = (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(90, 0);
    });

    it('should use 30-day retention for OTP challenges', async () => {
      const now = new Date();

      await service.purgeExpiredRecords();

      const otpCall = dataSource.query.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('otp_challenge'),
      );
      expect(otpCall).toBeDefined();
      const cutoffDate = otpCall![1][0] as Date;
      const daysDiff = (now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(30, 0);
    });

    it('should only delete OTP challenges in terminal statuses', async () => {
      await service.purgeExpiredRecords();

      const otpCall = dataSource.query.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('otp_challenge'),
      );
      const sql = otpCall![0] as string;
      expect(sql).toContain('EXPIRED');
      expect(sql).toContain('LOCKED_OUT');
      expect(sql).toContain('VERIFIED');
    });

    it('should not throw when query fails (logs error instead)', async () => {
      dataSource.query.mockRejectedValue(new Error('DB error'));
      await expect(service.purgeExpiredRecords()).resolves.toBeUndefined();
    });
  });
});
