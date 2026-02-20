import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Ip,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { VinService } from './vin.service';
import { CommitService } from './commit.service';
import { VinDecodeDto } from './dto/vin-decode.dto';
import { VinEligibilityDto } from './dto/vin-eligibility.dto';
import { VinCommitDto } from './dto/vin-commit.dto';
import { ConsumerAuthGuard } from '../../common/guards/consumer-auth.guard';
import { CurrentSession, SessionPayload } from '../../common/decorators/current-session.decorator';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('vin')
@UseGuards(ConsumerAuthGuard)
export class VinController {
  constructor(
    private readonly vinService: VinService,
    private readonly commitService: CommitService,
  ) {}

  @Post('decode')
  decode(
    @Body() dto: VinDecodeDto,
    @CurrentSession() session: SessionPayload,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.vinService.decode(dto, session, correlationId, ip, userAgent);
  }

  @Post('eligibility')
  eligibility(
    @Body() dto: VinEligibilityDto,
    @CurrentSession() session: SessionPayload,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.vinService.checkEligibility(dto, session, correlationId, ip, userAgent);
  }

  @Post('commit')
  commit(
    @Body() dto: VinCommitDto,
    @CurrentSession() session: SessionPayload,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (idempotencyKey && !UUID_REGEX.test(idempotencyKey)) {
      throw new BadRequestException('x-idempotency-key must be a valid UUID');
    }
    return this.commitService.commit(dto, session, correlationId, ip, userAgent, idempotencyKey);
  }

  @Get('request/:requestId')
  getRequestStatus(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.vinService.getRequestStatus(requestId, session);
  }
}
