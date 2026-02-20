import { Controller, Post, Body, Ip, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContractService } from './contract.service';
import { AuthenticateContractDto } from './dto/authenticate-contract.dto';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post('authenticate')
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  authenticate(
    @Body() dto: AuthenticateContractDto,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.contractService.authenticate(dto, correlationId, ip, userAgent);
  }
}
