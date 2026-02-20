import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { AuthAttempt } from '../../database/entities/auth-attempt.entity';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { OtpStatus } from '../../common/enums/otp-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { hashContractNumber, hashOtpCode } from '../../common/utils/hash.util';
import { AuthenticateContractDto } from './dto/authenticate-contract.dto';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import {
  CONTRACT_VERIFICATION_ADAPTER,
} from '../../adapters/adapter.tokens';
import {
  ContractVerificationAdapter,
} from '../../adapters/interfaces/contract-verification.adapter';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(ContractContext)
    private readonly contractRepo: Repository<ContractContext>,
    @InjectRepository(AuthAttempt)
    private readonly authAttemptRepo: Repository<AuthAttempt>,
    @InjectRepository(OtpChallenge)
    private readonly otpChallengeRepo: Repository<OtpChallenge>,
    @Inject(CONTRACT_VERIFICATION_ADAPTER)
    private readonly verificationAdapter: ContractVerificationAdapter,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async authenticate(
    dto: AuthenticateContractDto,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    // Extract last 7 characters (user may provide 7-17 chars)
    const vin7 = dto.vin7.slice(-7).toUpperCase();

    const salt = this.configService.get<string>('app.contractHashSalt')!;
    const contractHash = hashContractNumber(vin7, salt);

    // Rate limiting check
    await this.checkRateLimit(contractHash);

    // Verify with external adapter
    const result = await this.verificationAdapter.verify(
      vin7,
      dto.lastName,
      dto.zip,
    );

    if (!result.matched) {
      // Record failed attempt
      await this.recordAuthAttempt({
        contractNumberHash: contractHash,
        contractContextId: null,
        sourceIp,
        userAgent,
        success: false,
        failureReason: ErrorCodes.AUTH_NO_MATCH,
        correlationId,
      });

      await this.auditService.emit({
        eventType: EventTypes.AUTH_FAILURE,
        actorType: ActorType.CONSUMER,
        correlationId,
        sourceIp,
        userAgent,
        eventData: { reason: ErrorCodes.AUTH_NO_MATCH },
      });

      throw new HttpException(
        {
          code: ErrorCodes.AUTH_NO_MATCH,
          message: 'No contract found matching the provided information.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Upsert contract context
    let contractContext = await this.contractRepo.findOne({
      where: { contractNumberHash: contractHash },
    });

    if (!contractContext) {
      contractContext = this.contractRepo.create({
        contractNumberHash: contractHash,
        externalContractId: result.externalContractId ?? null,
        status: VinAddStatus.NOT_USED,
        primaryVinMasked: result.primaryVinMasked ?? null,
      });
      contractContext = await this.contractRepo.save(contractContext);
    }

    // Check if contract is already locked
    if (
      result.hasAdditionalVin ||
      contractContext.status === VinAddStatus.COMMITTED_LOCKED
    ) {
      await this.recordAuthAttempt({
        contractNumberHash: contractHash,
        contractContextId: contractContext.id,
        sourceIp,
        userAgent,
        success: false,
        failureReason: ErrorCodes.CONTRACT_LOCKED,
        correlationId,
      });

      throw new HttpException(
        {
          code: ErrorCodes.CONTRACT_LOCKED,
          message: 'This contract already has an additional vehicle registered.',
        },
        HttpStatus.CONFLICT,
      );
    }

    // OTP required?
    if (result.requiresOtp) {
      const otpSalt = uuidv4();
      const otpTtl = this.configService.get<number>('app.otpTtlMinutes') ?? 10;
      const maxAttempts = this.configService.get<number>('app.otpMaxAttempts') ?? 5;

      const challenge = this.otpChallengeRepo.create({
        contractContextId: contractContext.id,
        codeHash: '',
        codeSalt: otpSalt,
        maskedDestination: result.maskedDestination ?? '***-***-0000',
        channel: result.channel ?? 'sms',
        status: OtpStatus.PENDING,
        attemptCount: 0,
        maxAttempts,
        expiresAt: new Date(Date.now() + otpTtl * 60 * 1000),
      });
      const savedChallenge = await this.otpChallengeRepo.save(challenge);

      await this.recordAuthAttempt({
        contractNumberHash: contractHash,
        contractContextId: contractContext.id,
        sourceIp,
        userAgent,
        success: false,
        failureReason: ErrorCodes.AUTH_OTP_REQUIRED,
        correlationId,
      });

      await this.auditService.emit({
        eventType: EventTypes.AUTH_OTP_TRIGGERED,
        actorType: ActorType.CONSUMER,
        contractContextId: contractContext.id,
        correlationId,
        sourceIp,
        userAgent,
      });

      throw new HttpException(
        {
          code: ErrorCodes.AUTH_OTP_REQUIRED,
          message: 'Additional verification is required.',
          details: {
            contractContextId: contractContext.id,
            otpChallengeId: savedChallenge.id,
            maskedDestination: savedChallenge.maskedDestination,
            channel: savedChallenge.channel,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Direct auth success
    const { token, expiresAt } = this.authService.createConsumerToken({
      contractContextId: contractContext.id,
      externalContractId: result.externalContractId,
      riskTier: 'low',
    });

    await this.recordAuthAttempt({
      contractNumberHash: contractHash,
      contractContextId: contractContext.id,
      sourceIp,
      userAgent,
      success: true,
      failureReason: null,
      correlationId,
    });

    await this.auditService.emit({
      eventType: EventTypes.AUTH_SUCCESS,
      actorType: ActorType.CONSUMER,
      contractContextId: contractContext.id,
      correlationId,
      sourceIp,
      userAgent,
    });

    return {
      contractContextId: contractContext.id,
      sessionToken: token,
      sessionExpiresAt: expiresAt,
      otp: {
        status: 'NOT_REQUIRED',
        otpChallengeId: null,
        maskedDestination: null,
        channel: null,
      },
      contractSummary: {
        primaryVinMasked: result.primaryVinMasked ?? contractContext.primaryVinMasked,
        hasAdditionalVin: false,
      },
    };
  }

  private async checkRateLimit(contractHash: string): Promise<void> {
    const ttlSeconds =
      this.configService.get<number>('app.contractRateLimitTtlSeconds') ?? 600;
    const maxAttempts =
      this.configService.get<number>('app.contractRateLimitMax') ?? 5;

    const since = new Date(Date.now() - ttlSeconds * 1000);
    const count = await this.authAttemptRepo.count({
      where: {
        contractNumberHash: contractHash,
        createdAt: MoreThan(since),
      },
    });

    if (count >= maxAttempts) {
      throw new HttpException(
        {
          code: ErrorCodes.RATE_LIMITED,
          message: 'Too many attempts. Please wait.',
          details: { retryAfterSeconds: ttlSeconds },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordAuthAttempt(data: {
    contractNumberHash: string;
    contractContextId: string | null;
    sourceIp: string;
    userAgent: string;
    success: boolean;
    failureReason: string | null;
    correlationId: string;
  }): Promise<void> {
    const attempt = this.authAttemptRepo.create({
      contractNumberHash: data.contractNumberHash,
      contractContextId: data.contractContextId,
      sourceIp: data.sourceIp,
      userAgent: data.userAgent,
      success: data.success,
      failureReason: data.failureReason,
      correlationId: data.correlationId,
    });
    await this.authAttemptRepo.save(attempt);
  }
}
