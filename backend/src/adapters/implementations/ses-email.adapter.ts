import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { EmailAdapter, EmailSendResult } from '../interfaces/email.adapter';

@Injectable()
export class SesEmailAdapter implements EmailAdapter {
  private readonly logger = new Logger(SesEmailAdapter.name);
  private readonly client: SESv2Client;
  private readonly fromAddress: string;
  private readonly replyTo: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_SES_REGION', 'us-east-1');
    this.fromAddress = this.configService.getOrThrow<string>('EMAIL_FROM_ADDRESS');
    this.replyTo = this.configService.get<string>('EMAIL_REPLY_TO', this.fromAddress);
    this.client = new SESv2Client({ region });
  }

  async send(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>,
  ): Promise<EmailSendResult> {
    try {
      const command = new SendEmailCommand({
        FromEmailAddress: this.fromAddress,
        Destination: {
          ToAddresses: [to],
        },
        ReplyToAddresses: [this.replyTo],
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: body, Charset: 'UTF-8' },
            },
            Attachments: attachments?.map((att) => ({
              RawContent: att.content,
              FileName: att.filename,
              ContentType: att.contentType,
              ContentDisposition: 'ATTACHMENT' as const,
              ContentTransferEncoding: 'BASE64' as const,
            })),
          },
        },
      });

      const response = await this.client.send(command);
      const messageId = response.MessageId ?? 'unknown';

      this.logger.log(`Email sent via SES — to=${to}, messageId=${messageId}`);
      return { messageId, sent: true };
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email via SES — to=${to}, error=${errMessage}`);
      throw error;
    }
  }
}
