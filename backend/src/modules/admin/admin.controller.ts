import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Ip,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminSearchQueryDto } from './dto/admin-search-query.dto';
import { AdminNoteDto } from './dto/admin-note.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('contracts')
  searchContracts(
    @Query() query: AdminSearchQueryDto,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.searchContracts(query, correlationId, ip, userAgent);
  }

  @Get('contracts/:contractContextId')
  getContractDetail(
    @Param('contractContextId', ParseUUIDPipe) contractContextId: string,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.getContractDetail(contractContextId, correlationId, ip, userAgent);
  }

  @Get('requests/:requestId')
  getRequestDetail(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: { user?: { role?: string } },
  ) {
    const callerRole = req.user?.role ?? 'support';
    return this.adminService.getRequestDetail(requestId, correlationId, ip, userAgent, callerRole);
  }

  @Post('requests/:requestId/note')
  addNote(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: AdminNoteDto,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.addNote(requestId, dto, correlationId, ip, userAgent);
  }
}
