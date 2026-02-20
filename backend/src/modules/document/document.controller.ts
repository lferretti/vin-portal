import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { EmailDocumentDto } from './dto/email-document.dto';
import { ConsumerAuthGuard } from '../../common/guards/consumer-auth.guard';

@Controller('document')
@UseGuards(ConsumerAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get('request/:requestId/pdf')
  async downloadPdf(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.documentService.generatePdf(requestId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="confirmation-${requestId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  }

  @Post('request/:requestId/email')
  async emailDocument(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: EmailDocumentDto,
  ) {
    const result = await this.documentService.emailDocument(requestId, dto.email);
    return { requestId, ...result };
  }
}
