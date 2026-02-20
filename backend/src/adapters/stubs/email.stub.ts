import { Injectable, Logger } from '@nestjs/common';
import { EmailAdapter, EmailSendResult } from '../interfaces/email.adapter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailStub implements EmailAdapter {
  private readonly logger = new Logger(EmailStub.name);

  async send(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>,
  ): Promise<EmailSendResult> {
    const messageId = `stub-${uuidv4()}`;
    this.logger.log(
      `[STUB] Email sent — to=${to}, subject="${subject}", ` +
        `bodyLength=${body.length}, attachments=${attachments?.length ?? 0}, messageId=${messageId}`,
    );
    return { messageId, sent: true };
  }
}
