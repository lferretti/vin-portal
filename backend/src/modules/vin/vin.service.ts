import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { ErrorCodes } from '../../common/constants/error-codes';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { VIN_DECODE_ADAPTER, ELIGIBILITY_ADAPTER } from '../../adapters/adapter.tokens';
import { VinDecodeAdapter } from '../../adapters/interfaces/vin-decode.adapter';
import { EligibilityAdapter } from '../../adapters/interfaces/eligibility.adapter';
import { VinDecodeDto } from './dto/vin-decode.dto';
import { VinEligibilityDto } from './dto/vin-eligibility.dto';
import { SessionPayload } from '../../common/decorators/current-session.decorator';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VinService {
  private readonly logger = new Logger(VinService.name);

  constructor(
    @InjectRepository(VinAddRequest)
    private readonly requestRepo: Repository<VinAddRequest>,
    @Inject(VIN_DECODE_ADAPTER)
    private readonly vinDecodeAdapter: VinDecodeAdapter,
    @Inject(ELIGIBILITY_ADAPTER)
    private readonly eligibilityAdapter: EligibilityAdapter,
    private readonly auditService: AuditService,
  ) {}

  async decode(
    dto: VinDecodeDto,
    session: SessionPayload,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const vin = dto.vin.toUpperCase();
    const decoded = await this.vinDecodeAdapter.decode(vin);

    await this.auditService.emit({
      eventType: EventTypes.VIN_DECODED,
      actorType: ActorType.CONSUMER,
      contractContextId: session.contractContextId,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { vin, decoded },
    });

    return { vin, decoded };
  }

  async checkEligibility(
    dto: VinEligibilityDto,
    session: SessionPayload,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const vin = dto.vin.toUpperCase();
    const externalContractId = session.externalContractId ?? '';

    const result = await this.eligibilityAdapter.check(externalContractId, vin);

    await this.auditService.emit({
      eventType: EventTypes.VIN_ELIGIBILITY_CHECKED,
      actorType: ActorType.CONSUMER,
      contractContextId: session.contractContextId,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { vin, eligible: result.allowed, reasonCode: result.reasonCode },
    });

    return {
      vin,
      eligible: result.allowed,
      reasonCode: result.reasonCode,
    };
  }

  async getRequestStatus(requestId: string, session: SessionPayload) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new HttpException(
        {
          code: ErrorCodes.CONTRACT_NOT_FOUND,
          message: 'Request not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.contractContextId !== session.contractContextId) {
      throw new HttpException(
        {
          code: ErrorCodes.AUTH_INVALID,
          message: 'Request does not belong to this session.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      requestId: request.id,
      status: request.status,
      vin: request.vin,
      decoded: request.decoded,
      lastUpdatedAt: request.updatedAt.toISOString(),
      eligibilityAllowed: request.eligibilityAllowed,
      eligibilityReasonCode: request.eligibilityReasonCode,
    };
  }
}
