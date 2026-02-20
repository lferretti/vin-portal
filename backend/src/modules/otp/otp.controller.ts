import { Controller, Post, Body, Ip, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { OtpSendDto } from './dto/otp-send.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @Throttle({ default: { ttl: 600000, limit: 5 } })
  send(
    @Body() dto: OtpSendDto,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.otpService.send(dto, correlationId, ip, userAgent);
  }

  @Post('verify')
  @Throttle({ default: { ttl: 600000, limit: 10 } })
  verify(
    @Body() dto: OtpVerifyDto,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.otpService.verify(dto, correlationId, ip, userAgent);
  }
}
