import { Test, TestingModule } from '@nestjs/testing';
import { EmailStub } from './email.stub';
import { EmailSendResult } from '../interfaces/email.adapter';

describe('EmailStub', () => {
  let stub: EmailStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailStub],
    }).compile();

    stub = module.get<EmailStub>(EmailStub);
  });

  it('should be defined', () => {
    expect(stub).toBeDefined();
  });

  describe('send', () => {
    it('should return a successful result with a stub message ID', async () => {
      const result: EmailSendResult = await stub.send(
        'test@example.com',
        'Test Subject',
        '<p>Hello</p>',
      );

      expect(result.sent).toBe(true);
      expect(result.messageId).toMatch(/^stub-[0-9a-f-]{36}$/);
    });

    it('should return unique message IDs on each call', async () => {
      const result1 = await stub.send('a@example.com', 'Sub1', 'Body1');
      const result2 = await stub.send('b@example.com', 'Sub2', 'Body2');

      expect(result1.messageId).not.toBe(result2.messageId);
    });

    it('should handle attachments without error', async () => {
      const attachments = [
        {
          filename: 'report.pdf',
          content: Buffer.from('fake-pdf-content'),
          contentType: 'application/pdf',
        },
      ];

      const result = await stub.send(
        'test@example.com',
        'With Attachment',
        '<p>See attached</p>',
        attachments,
      );

      expect(result.sent).toBe(true);
      expect(result.messageId).toMatch(/^stub-/);
    });

    it('should handle empty attachments array', async () => {
      const result = await stub.send(
        'test@example.com',
        'No Attachments',
        '<p>Plain email</p>',
        [],
      );

      expect(result.sent).toBe(true);
    });

    it('should handle undefined attachments', async () => {
      const result = await stub.send(
        'test@example.com',
        'No Attachments',
        '<p>Plain email</p>',
        undefined,
      );

      expect(result.sent).toBe(true);
    });
  });
});
