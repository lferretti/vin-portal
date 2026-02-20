export interface EmailSendResult {
  messageId: string;
  sent: boolean;
}

export interface EmailAdapter {
  send(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>,
  ): Promise<EmailSendResult>;
}
