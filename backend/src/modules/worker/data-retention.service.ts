import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  private readonly AUTH_ATTEMPT_RETENTION_DAYS = 90;
  private readonly EXPIRED_OTP_RETENTION_DAYS = 30;

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredRecords(): Promise<void> {
    try {
      const authResult = await this.purgeOldAuthAttempts();
      const otpResult = await this.purgeExpiredOtpChallenges();

      this.logger.log(
        `Data retention cleanup complete: ${authResult} auth attempts, ${otpResult} OTP challenges purged`,
      );
    } catch (error) {
      this.logger.error(
        'Data retention cleanup failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async purgeOldAuthAttempts(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.AUTH_ATTEMPT_RETENTION_DAYS);

    const result = await this.dataSource.query(
      `DELETE FROM "auth_attempt" WHERE "created_at" < $1`,
      [cutoff],
    );
    return result[1] ?? 0;
  }

  private async purgeExpiredOtpChallenges(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.EXPIRED_OTP_RETENTION_DAYS);

    const result = await this.dataSource.query(
      `DELETE FROM "otp_challenge" WHERE "expires_at" < $1 AND "status" IN ('EXPIRED', 'LOCKED_OUT', 'VERIFIED')`,
      [cutoff],
    );
    return result[1] ?? 0;
  }
}
