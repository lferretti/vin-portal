import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { AuditEvent } from '../../database/entities/audit-event.entity';
import { ErrorCodes } from '../../common/constants/error-codes';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { hashContractNumber } from '../../common/utils/hash.util';
import { AdminSearchQueryDto } from './dto/admin-search-query.dto';
import { AdminNoteDto } from './dto/admin-note.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(ContractContext)
    private readonly contractRepo: Repository<ContractContext>,
    @InjectRepository(VinAddRequest)
    private readonly requestRepo: Repository<VinAddRequest>,
    @InjectRepository(AuditEvent)
    private readonly auditEventRepo: Repository<AuditEvent>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async searchContracts(
    query: AdminSearchQueryDto,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const qb = this.contractRepo.createQueryBuilder('cc');

    if (query.contractNumber) {
      const salt = this.configService.get<string>('app.contractHashSalt')!;
      const hash = hashContractNumber(query.contractNumber, salt);
      qb.andWhere('cc.contractNumberHash = :hash', { hash });
    }

    if (query.externalContractId) {
      qb.andWhere('cc.externalContractId = :extId', {
        extId: query.externalContractId,
      });
    }

    if (query.requestId) {
      qb.innerJoin('cc.vinAddRequests', 'req', 'req.id = :reqId', {
        reqId: query.requestId,
      });
    }

    const contracts = await qb.getMany();

    await this.auditService.emit({
      eventType: EventTypes.ADMIN_VIEW,
      actorType: ActorType.ADMIN,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { action: 'search', resultCount: contracts.length },
    });

    return {
      results: contracts.map((c) => ({
        contractContextId: c.id,
        externalContractId: c.externalContractId,
        status: c.status,
        committedVinMasked: c.committedVinMasked,
        committedAt: c.committedAt?.toISOString() ?? null,
      })),
    };
  }

  async getContractDetail(
    contractContextId: string,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const contract = await this.contractRepo.findOne({
      where: { id: contractContextId },
    });

    if (!contract) {
      throw new HttpException(
        { code: ErrorCodes.CONTRACT_NOT_FOUND, message: 'Contract not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    const requests = await this.requestRepo.find({
      where: { contractContextId },
      order: { createdAt: 'DESC' },
    });

    await this.auditService.emit({
      eventType: EventTypes.ADMIN_VIEW,
      actorType: ActorType.ADMIN,
      contractContextId,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { action: 'contract_detail' },
    });

    return {
      contractContextId: contract.id,
      externalContractId: contract.externalContractId,
      status: contract.status,
      committedVinMasked: contract.committedVinMasked,
      committedAt: contract.committedAt?.toISOString() ?? null,
      requests: requests.map((r) => ({
        requestId: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getRequestDetail(
    requestId: string,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
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

    // Get audit events for this request and its contract context
    const auditEvents = await this.auditEventRepo.find({
      where: [
        { requestId },
        { contractContextId: request.contractContextId },
      ],
      order: { createdAt: 'ASC' },
    });

    await this.auditService.emit({
      eventType: EventTypes.ADMIN_VIEW,
      actorType: ActorType.ADMIN,
      contractContextId: request.contractContextId,
      requestId,
      correlationId,
      sourceIp,
      userAgent,
    });

    return {
      requestId: request.id,
      contractContextId: request.contractContextId,
      status: request.status,
      vin: request.vin,
      decoded: request.decoded,
      eligibilityAllowed: request.eligibilityAllowed,
      eligibilityReasonCode: request.eligibilityReasonCode,
      lastDependencyError: request.lastDependencyError,
      audit: auditEvents.map((e) => ({
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
        actorType: e.actorType,
        sourceIp: e.sourceIp,
        userAgent: e.userAgent,
        eventData: e.eventData,
      })),
    };
  }

  async addNote(
    requestId: string,
    dto: AdminNoteDto,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
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

    await this.auditService.emit({
      eventType: EventTypes.ADMIN_NOTE,
      actorType: ActorType.ADMIN,
      contractContextId: request.contractContextId,
      requestId,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { note: dto.note },
    });

    return {
      requestId,
      noteSaved: true,
    };
  }
}
