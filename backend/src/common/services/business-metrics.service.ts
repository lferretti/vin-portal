import { Injectable, Logger } from '@nestjs/common';

type AuthAttemptResult =
  | 'success'
  | 'no_match'
  | 'otp_required'
  | 'rate_limited'
  | 'locked';

type OtpVerifyResult = 'success' | 'invalid' | 'expired' | 'locked_out';

type EligibilityResult = 'allowed' | 'denied';

type VinCommitPath = 'sync' | 'async';
type VinCommitResult = 'committed' | 'pending' | 'failed';

type DocumentEmailResult = 'sent' | 'failed';

@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);
  private dogstatsd: {
    increment: (metric: string, tags?: string[]) => void;
  } | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tracer = require('dd-trace');
      this.dogstatsd = tracer.dogstatsd;
    } catch {
      this.logger.warn('dd-trace not available, metrics will be logged only');
    }
  }

  private increment(metric: string, tags: string[] = []): void {
    this.dogstatsd?.increment(metric, tags);
    this.logger.debug(`metric: ${metric} [${tags.join(', ')}]`);
  }

  trackAuthAttempt(result: AuthAttemptResult): void {
    this.increment('vin_portal.auth.attempt', [`result:${result}`]);
  }

  trackOtpVerify(result: OtpVerifyResult): void {
    this.increment('vin_portal.otp.verify', [`result:${result}`]);
  }

  trackEligibilityCheck(result: EligibilityResult, reasonCode: string): void {
    this.increment('vin_portal.eligibility.check', [
      `result:${result}`,
      `reason_code:${reasonCode}`,
    ]);
  }

  trackVinCommit(path: VinCommitPath, result: VinCommitResult): void {
    this.increment('vin_portal.vin.commit', [
      `path:${path}`,
      `result:${result}`,
    ]);
  }

  trackWorkerRetry(attemptNumber: number, finalStatus?: string): void {
    const tags = [`attempt:${attemptNumber}`];
    if (finalStatus) {
      tags.push(`final_status:${finalStatus}`);
    }
    this.increment('vin_portal.worker.retry', tags);
  }

  trackDocumentDownload(): void {
    this.increment('vin_portal.document.download');
  }

  trackDocumentEmail(result: DocumentEmailResult): void {
    this.increment('vin_portal.document.email', [`result:${result}`]);
  }
}
