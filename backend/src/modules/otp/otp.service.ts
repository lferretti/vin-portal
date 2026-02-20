import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { OtpStatus } from '../../common/enums/otp-status.enum';
import { ErrorCodes } from '../../common/constants/error-codes';
import { EventTypes } from '../../common/constants/event-types';
import { ActorType } from '../../common/enums/actor-type.enum';
import { hashOtpCode } from '../../common/utils/hash.util';
import { OtpSendDto } from './dto/otp-send.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpChallenge)
    private readonly otpRepo: Repository<OtpChallenge>,
    @InjectRepository(ContractContext)
    private readonly contractRepo: Repository<ContractContext>,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async send(
    dto: OtpSendDto,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const challenge = await this.otpRepo.findOne({
      where: { id: dto.otpChallengeId },
    });

    if (!challenge) {
      throw new HttpException(
        {
          code: ErrorCodes.OTP_EXPIRED,
          message: 'OTP challenge not found or expired.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (challenge.status === OtpStatus.LOCKED_OUT) {
      throw new HttpException(
        {
          code: ErrorCodes.OTP_LOCKED_OUT,
          message: 'Too many failed attempts. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (challenge.expiresAt < new Date()) {
      challenge.status = OtpStatus.EXPIRED;
      await this.otpRepo.save(challenge);
      throw new HttpException(
        {
          code: ErrorCodes.OTP_EXPIRED,
          message: 'OTP challenge has expired.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Generate 6-digit code (in stub mode: always "123456")
    const code = '123456';
    const salt = uuidv4();
    const otpTtl = this.configService.get<number>('app.otpTtlMinutes') ?? 10;

    challenge.codeHash = hashOtpCode(code, salt);
    challenge.codeSalt = salt;
    challenge.status = OtpStatus.SENT;
    challenge.expiresAt = new Date(Date.now() + otpTtl * 60 * 1000);
    await this.otpRepo.save(challenge);

    await this.auditService.emit({
      eventType: EventTypes.OTP_SENT,
      actorType: ActorType.CONSUMER,
      contractContextId: challenge.contractContextId,
      correlationId,
      sourceIp,
      userAgent,
    });

    return {
      otpChallengeId: challenge.id,
      status: 'SENT',
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async verify(
    dto: OtpVerifyDto,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const challenge = await this.otpRepo.findOne({
      where: { id: dto.otpChallengeId },
    });

    if (!challenge) {
      throw new HttpException(
        {
          code: ErrorCodes.OTP_EXPIRED,
          message: 'OTP challenge not found or expired.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (challenge.expiresAt < new Date()) {
      challenge.status = OtpStatus.EXPIRED;
      await this.otpRepo.save(challenge);
      throw new HttpException(
        {
          code: ErrorCodes.OTP_EXPIRED,
          message: 'OTP code has expired.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (challenge.status === OtpStatus.LOCKED_OUT) {
      throw new HttpException(
        {
          code: ErrorCodes.OTP_LOCKED_OUT,
          message: 'Too many failed attempts.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment attempt count
    challenge.attemptCount += 1;

    if (challenge.attemptCount > challenge.maxAttempts) {
      challenge.status = OtpStatus.LOCKED_OUT;
      challenge.lockedOutUntil = new Date(Date.now() + 30 * 60 * 1000);
      await this.otpRepo.save(challenge);

      await this.auditService.emit({
        eventType: EventTypes.OTP_LOCKED_OUT,
        actorType: ActorType.CONSUMER,
        contractContextId: challenge.contractContextId,
        correlationId,
        sourceIp,
        userAgent,
      });

      throw new HttpException(
        {
          code: ErrorCodes.OTP_LOCKED_OUT,
          message: 'Too many failed attempts.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verify code
    const codeHash = hashOtpCode(dto.code, challenge.codeSalt);
    if (codeHash !== challenge.codeHash) {
      await this.otpRepo.save(challenge);

      await this.auditService.emit({
        eventType: EventTypes.OTP_FAILED,
        actorType: ActorType.CONSUMER,
        contractContextId: challenge.contractContextId,
        correlationId,
        sourceIp,
        userAgent,
        eventData: { attemptCount: challenge.attemptCount },
      });

      throw new HttpException(
        {
          code: ErrorCodes.OTP_INVALID,
          message: 'Invalid OTP code.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Success
    challenge.status = OtpStatus.VERIFIED;
    await this.otpRepo.save(challenge);

    // Load contract context
    const contractContext = await this.contractRepo.findOne({
      where: { id: challenge.contractContextId },
    });

    const { token, expiresAt } = this.authService.createConsumerToken({
      contractContextId: challenge.contractContextId,
      externalContractId: contractContext?.externalContractId ?? undefined,
      riskTier: 'medium',
    });

    await this.auditService.emit({
      eventType: EventTypes.OTP_VERIFIED,
      actorType: ActorType.CONSUMER,
      contractContextId: challenge.contractContextId,
      correlationId,
      sourceIp,
      userAgent,
    });

    return {
      contractContextId: challenge.contractContextId,
      sessionToken: token,
      sessionExpiresAt: expiresAt,
      otp: {
        status: 'VERIFIED',
        otpChallengeId: challenge.id,
        maskedDestination: challenge.maskedDestination,
        channel: challenge.channel,
      },
    };
  }
}
