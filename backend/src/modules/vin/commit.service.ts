import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { maskVin } from '../../common/utils/mask.util';
import {
  VIN_DECODE_ADAPTER,
  ELIGIBILITY_ADAPTER,
} from '../../adapters/adapter.tokens';
import { VinDecodeAdapter } from '../../adapters/interfaces/vin-decode.adapter';
import { EligibilityAdapter } from '../../adapters/interfaces/eligibility.adapter';
import { VinCommitDto } from './dto/vin-commit.dto';
import { SessionPayload } from '../../common/decorators/current-session.decorator';
import { AuditService } from '../audit/audit.service';
import { BusinessMetricsService } from '../../common/services/business-metrics.service';

@Injectable()
export class CommitService {
  private readonly logger = new Logger(CommitService.name);

  constructor(
    @InjectRepository(ContractContext)
    private readonly contractRepo: Repository<ContractContext>,
    @InjectRepository(VinAddRequest)
    private readonly requestRepo: Repository<VinAddRequest>,
    @Inject(VIN_DECODE_ADAPTER)
    private readonly vinDecodeAdapter: VinDecodeAdapter,
    @Inject(ELIGIBILITY_ADAPTER)
    private readonly eligibilityAdapter: EligibilityAdapter,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async commit(
    dto: VinCommitDto,
    session: SessionPayload,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
    idempotencyKey: string,
  ) {
    if (!dto.acceptIrreversible) {
      throw new HttpException(
        {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Must accept irreversible terms.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!idempotencyKey) {
      throw new HttpException(
        {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'X-Idempotency-Key header is required.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const vin = dto.vin.toUpperCase();

    // Check idempotency
    const existingRequest = await this.requestRepo.findOne({
      where: { idempotencyKey },
    });

    if (existingRequest) {
      return {
        requestId: existingRequest.id,
        status: existingRequest.status,
        vin: existingRequest.vin,
        decoded: existingRequest.decoded,
        committedAt: existingRequest.status === VinAddStatus.COMMITTED_LOCKED
          ? existingRequest.updatedAt.toISOString()
          : undefined,
        message: this.statusMessage(existingRequest.status),
      };
    }

    // Decode VIN first
    const decoded = await this.vinDecodeAdapter.decode(vin);

    // Transaction: lock contract context and create request
    const request = await this.dataSource.transaction(async (manager) => {
      const contractContext = await manager
        .getRepository(ContractContext)
        .createQueryBuilder('cc')
        .setLock('pessimistic_write')
        .where('cc.id = :id', { id: session.contractContextId })
        .getOne();

      if (!contractContext) {
        throw new HttpException(
          {
            code: ErrorCodes.CONTRACT_NOT_FOUND,
            message: 'Contract context not found.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (contractContext.status === VinAddStatus.COMMITTED_LOCKED) {
        throw new HttpException(
          {
            code: ErrorCodes.CONTRACT_LOCKED,
            message: 'This contract already has an additional vehicle registered.',
          },
          HttpStatus.CONFLICT,
        );
      }

      // Create request
      const newRequest = manager.getRepository(VinAddRequest).create({
        contractContextId: session.contractContextId,
        vin,
        decoded,
        status: VinAddStatus.PENDING,
        idempotencyKey,
        eligibilityAllowed: null,
        eligibilityReasonCode: null,
        retryCount: 0,
      });
      const saved = await manager.getRepository(VinAddRequest).save(newRequest);

      // Soft lock the contract
      contractContext.status = VinAddStatus.PENDING;
      await manager.getRepository(ContractContext).save(contractContext);

      return saved;
    });

    await this.auditService.emit({
      eventType: EventTypes.VIN_COMMIT_REQUESTED,
      actorType: ActorType.CONSUMER,
      contractContextId: session.contractContextId,
      requestId: request.id,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { vin, decoded },
    });

    // Synchronous attempt
    try {
      const eligibility = await this.eligibilityAdapter.check(
        session.externalContractId ?? '',
        vin,
      );

      if (!eligibility.allowed) {
        // Ineligible — fail the request, release soft lock
        request.status = VinAddStatus.FAILED_INELIGIBLE;
        request.eligibilityAllowed = false;
        request.eligibilityReasonCode = eligibility.reasonCode;
        request.eligibilityRaw = eligibility.rawPayload ?? null;
        await this.requestRepo.save(request);

        await this.contractRepo.update(session.contractContextId, {
          status: VinAddStatus.NOT_USED,
        });

        await this.auditService.emit({
          eventType: EventTypes.VIN_COMMIT_FAILED,
          actorType: ActorType.SYSTEM,
          contractContextId: session.contractContextId,
          requestId: request.id,
          correlationId,
          eventData: {
            reason: 'INELIGIBLE',
            reasonCode: eligibility.reasonCode,
          },
        });

        this.businessMetrics.trackVinCommit('sync', 'failed');

        throw new HttpException(
          {
            code: ErrorCodes.VIN_INELIGIBLE,
            message: `VIN is not eligible: ${eligibility.reasonCode}`,
            details: {
              requestId: request.id,
              reasonCode: eligibility.reasonCode,
            },
          },
          HttpStatus.CONFLICT,
        );
      }

      // Eligible — commit immediately
      const now = new Date();
      request.status = VinAddStatus.COMMITTED_LOCKED;
      request.eligibilityAllowed = true;
      request.eligibilityReasonCode = 'OK';
      request.eligibilityRaw = eligibility.rawPayload ?? null;
      await this.requestRepo.save(request);

      await this.contractRepo.update(session.contractContextId, {
        status: VinAddStatus.COMMITTED_LOCKED,
        committedVin: vin,
        committedVinMasked: maskVin(vin),
        committedVinDecoded: decoded,
        committedAt: now,
      });

      await this.auditService.emit({
        eventType: EventTypes.VIN_COMMIT_SUCCESS,
        actorType: ActorType.SYSTEM,
        contractContextId: session.contractContextId,
        requestId: request.id,
        correlationId,
        eventData: { vin: maskVin(vin), decoded },
      });

      this.businessMetrics.trackVinCommit('sync', 'committed');

      return {
        requestId: request.id,
        status: VinAddStatus.COMMITTED_LOCKED,
        vin,
        decoded,
        committedAt: now.toISOString(),
        message: 'Vehicle successfully added.',
      };
    } catch (error) {
      // If it's our own HttpException, re-throw
      if (error instanceof HttpException) {
        throw error;
      }

      // Dependency unavailable — keep PENDING for worker
      this.logger.warn(
        `Dependency unavailable during commit for request ${request.id}`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      request.nextRetryAt = new Date(Date.now() + 60 * 1000);
      request.lastDependencyError =
        error instanceof Error ? error.message : 'Unknown error';
      await this.requestRepo.save(request);

      await this.auditService.emit({
        eventType: EventTypes.VIN_COMMIT_PENDING,
        actorType: ActorType.SYSTEM,
        contractContextId: session.contractContextId,
        requestId: request.id,
        correlationId,
        eventData: {
          reason: 'DEPENDENCY_UNAVAILABLE',
        },
      });

      this.businessMetrics.trackVinCommit('sync', 'pending');

      return {
        requestId: request.id,
        status: VinAddStatus.PENDING,
        vin,
        decoded,
        message: 'Request is being processed.',
      };
    }
  }

  private statusMessage(status: VinAddStatus): string {
    switch (status) {
      case VinAddStatus.COMMITTED_LOCKED:
        return 'Vehicle successfully added.';
      case VinAddStatus.PENDING:
        return 'Request is being processed.';
      case VinAddStatus.FAILED_INELIGIBLE:
        return 'VIN was not eligible.';
      case VinAddStatus.FAILED_DEPENDENCY:
        return 'Request failed due to a system issue.';
      default:
        return 'Request status unknown.';
    }
  }
}
