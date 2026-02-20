import { Injectable, Inject, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { maskVin } from '../../common/utils/mask.util';
import { ELIGIBILITY_ADAPTER, ASSOCIATION_ADAPTER } from '../../adapters/adapter.tokens';
import { EligibilityAdapter } from '../../adapters/interfaces/eligibility.adapter';
import { AssociationAdapter } from '../../adapters/interfaces/association.adapter';
import { AuditService } from '../audit/audit.service';
import { BusinessMetricsService } from '../../common/services/business-metrics.service';

// Backoff schedule in milliseconds
const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];

@Injectable()
export class CommitWorkerService {
  private readonly logger = new Logger(CommitWorkerService.name);
  private readonly maxRetries: number;
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(VinAddRequest)
    private readonly requestRepo: Repository<VinAddRequest>,
    @InjectRepository(ContractContext)
    private readonly contractRepo: Repository<ContractContext>,
    @Inject(ELIGIBILITY_ADAPTER)
    private readonly eligibilityAdapter: EligibilityAdapter,
    @Inject(ASSOCIATION_ADAPTER)
    private readonly associationAdapter: AssociationAdapter,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {
    this.maxRetries = this.configService.get<number>('app.workerMaxRetries') ?? 5;
    this.enabled = this.configService.get<boolean>('app.workerEnabled') ?? true;
  }

  @Interval(30000)
  async processPendingRequests(): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.processNextBatch();
    } catch (error) {
      this.logger.error(
        'Worker batch processing failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async processNextBatch(): Promise<void> {
    const now = new Date();

    // Use raw query with FOR UPDATE SKIP LOCKED for worker safety
    const requests = await this.dataSource
      .getRepository(VinAddRequest)
      .createQueryBuilder('req')
      .setLock('pessimistic_write', undefined, ['req'])
      .setOnLocked('skip_locked')
      .where('req.status = :status', { status: VinAddStatus.PENDING })
      .andWhere('req.nextRetryAt <= :now', { now })
      .andWhere('req.retryCount < :max', { max: this.maxRetries })
      .limit(10)
      .getMany();

    for (const request of requests) {
      await this.processRequest(request);
    }
  }

  private async processRequest(request: VinAddRequest): Promise<void> {
    try {
      // Load contract context
      const contractContext = await this.contractRepo.findOne({
        where: { id: request.contractContextId },
      });

      if (!contractContext) {
        this.logger.warn(`Contract context not found for request ${request.id}`);
        return;
      }

      // Check eligibility
      const eligibility = await this.eligibilityAdapter.check(
        contractContext.externalContractId ?? '',
        request.vin,
      );

      if (!eligibility.allowed) {
        // Ineligible — fail the request
        request.status = VinAddStatus.FAILED_INELIGIBLE;
        request.eligibilityAllowed = false;
        request.eligibilityReasonCode = eligibility.reasonCode;
        await this.requestRepo.save(request);

        contractContext.status = VinAddStatus.NOT_USED;
        await this.contractRepo.save(contractContext);

        await this.auditService.emit({
          eventType: EventTypes.VIN_COMMIT_FAILED,
          actorType: ActorType.WORKER,
          contractContextId: contractContext.id,
          requestId: request.id,
          eventData: { reason: 'INELIGIBLE', reasonCode: eligibility.reasonCode },
        });

        this.businessMetrics.trackVinCommit('async', 'failed');
        return;
      }

      // Attempt association
      await this.associationAdapter.associate(
        contractContext.externalContractId ?? '',
        request.vin,
        request.id,
      );

      // Success
      const now = new Date();
      request.status = VinAddStatus.COMMITTED_LOCKED;
      request.eligibilityAllowed = true;
      request.eligibilityReasonCode = 'OK';
      await this.requestRepo.save(request);

      contractContext.status = VinAddStatus.COMMITTED_LOCKED;
      contractContext.committedVin = request.vin;
      contractContext.committedVinMasked = maskVin(request.vin);
      contractContext.committedVinDecoded = request.decoded;
      contractContext.committedAt = now;
      await this.contractRepo.save(contractContext);

      await this.auditService.emit({
        eventType: EventTypes.VIN_COMMIT_SUCCESS,
        actorType: ActorType.WORKER,
        contractContextId: contractContext.id,
        requestId: request.id,
        eventData: { vin: maskVin(request.vin), decoded: request.decoded },
      });

      this.businessMetrics.trackVinCommit('async', 'committed');

      this.logger.log(`Request ${request.id} committed successfully by worker`);
    } catch (error) {
      // Dependency failure — increment retry
      request.retryCount += 1;
      request.lastDependencyError =
        error instanceof Error ? error.message : 'Unknown error';

      if (request.retryCount >= this.maxRetries) {
        request.status = VinAddStatus.FAILED_DEPENDENCY;
        await this.requestRepo.save(request);

        // Release soft lock
        await this.contractRepo.update(request.contractContextId, {
          status: VinAddStatus.NOT_USED,
        });

        await this.auditService.emit({
          eventType: EventTypes.WORKER_FINAL_FAILURE,
          actorType: ActorType.WORKER,
          contractContextId: request.contractContextId,
          requestId: request.id,
          eventData: {
            retryCount: request.retryCount,
            lastError: request.lastDependencyError,
          },
        });

        this.businessMetrics.trackWorkerRetry(request.retryCount, 'failed');

        this.logger.warn(`Request ${request.id} failed after ${request.retryCount} retries`);
      } else {
        const backoffIndex = Math.min(request.retryCount - 1, BACKOFF_MS.length - 1);
        request.nextRetryAt = new Date(Date.now() + BACKOFF_MS[backoffIndex]);
        await this.requestRepo.save(request);

        await this.auditService.emit({
          eventType: EventTypes.WORKER_RETRY,
          actorType: ActorType.WORKER,
          contractContextId: request.contractContextId,
          requestId: request.id,
          eventData: {
            retryCount: request.retryCount,
            nextRetryAt: request.nextRetryAt.toISOString(),
          },
        });

        this.businessMetrics.trackWorkerRetry(request.retryCount);
      }
    }
  }
}
