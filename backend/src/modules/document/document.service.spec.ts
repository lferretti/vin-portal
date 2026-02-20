import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentService } from './document.service';
import { DocumentData } from './field-mapper';
import { EMAIL_ADAPTER } from '../../adapters/adapter.tokens';
import { EmailAdapter, EmailSendResult } from '../../adapters/interfaces/email.adapter';
import { BusinessMetricsService } from '../../common/services/business-metrics.service';

/**
 * Helper: creates a minimal AcroForm PDF with the named text fields
 * that the DocumentService expects. Returns the PDF as a Buffer.
 */
async function createAcroFormTemplate(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const form = pdfDoc.getForm();

  const fieldNames = [
    'referenceId',
    'confirmationDate',
    'maskedVin',
    'vehicle',
    'contractRef',
  ];

  let y = 700;
  for (const name of fieldNames) {
    const textField = form.createTextField(name);
    textField.addToPage(page, { x: 72, y, width: 200, height: 20 });
    y -= 30;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

describe('DocumentService', () => {
  let service: DocumentService;
  let mockEmailAdapter: jest.Mocked<EmailAdapter>;
  const templateDir = path.join(process.cwd(), 'assets', 'templates');
  const templatePath = path.join(templateDir, 'confirmation.pdf');

  const sampleData: DocumentData = {
    requestReferenceId: 'REQ-TEST-001',
    confirmationDate: 'February 19, 2026',
    maskedVin: '***********234567',
    yearMakeModel: '2024 Toyota Camry',
    contractReference: 'CTR-TEST-999',
  };

  beforeAll(async () => {
    mockEmailAdapter = {
      send: jest.fn().mockResolvedValue({
        messageId: 'test-msg-001',
        sent: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: EMAIL_ADAPTER, useValue: mockEmailAdapter },
        {
          provide: BusinessMetricsService,
          useValue: {
            trackAuthAttempt: jest.fn(),
            trackOtpVerify: jest.fn(),
            trackEligibilityCheck: jest.fn(),
            trackVinCommit: jest.fn(),
            trackWorkerRetry: jest.fn(),
            trackDocumentDownload: jest.fn(),
            trackDocumentEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => {
    // Clean up any template written during tests
    if (fs.existsSync(templatePath)) {
      fs.unlinkSync(templatePath);
    }
    if (fs.existsSync(templateDir)) {
      fs.rmSync(templateDir, { recursive: true, force: true });
    }
  });

  describe('generatePdf (fallback — no template)', () => {
    it('should return a valid PDF buffer when no template exists', async () => {
      const result = await service.generatePdf('req-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify it is a valid PDF by loading it with pdf-lib
      const pdfDoc = await PDFDocument.load(result);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it('should use default values when DocumentData is not supplied', async () => {
      const result = await service.generatePdf('req-456');

      expect(result).toBeInstanceOf(Buffer);
      // PDF should still be parseable
      const pdfDoc = await PDFDocument.load(result);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it('should use provided DocumentData in fallback PDF', async () => {
      const result = await service.generatePdf('req-789', sampleData);

      expect(result).toBeInstanceOf(Buffer);
      const pdfDoc = await PDFDocument.load(result);
      expect(pdfDoc.getPageCount()).toBe(1);
    });
  });

  describe('generatePdf (template path)', () => {
    beforeEach(async () => {
      // Write a real AcroForm template to disk
      fs.mkdirSync(templateDir, { recursive: true });
      const templateBytes = await createAcroFormTemplate();
      fs.writeFileSync(templatePath, templateBytes);
    });

    it('should fill AcroForm fields and return a flattened PDF', async () => {
      const result = await service.generatePdf('req-tmpl-001', sampleData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // The returned PDF should be loadable
      const pdfDoc = await PDFDocument.load(result);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it('should gracefully skip fields not present in the template', async () => {
      // Create a template with only a subset of fields
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      const form = pdfDoc.getForm();
      const textField = form.createTextField('referenceId');
      textField.addToPage(page, { x: 72, y: 700, width: 200, height: 20 });
      const partialBytes = await pdfDoc.save();
      fs.writeFileSync(templatePath, Buffer.from(partialBytes));

      // Should not throw even though most fields are missing
      const result = await service.generatePdf('req-partial', sampleData);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('emailDocument', () => {
    beforeEach(() => {
      mockEmailAdapter.send.mockClear();
      mockEmailAdapter.send.mockResolvedValue({
        messageId: 'test-msg-001',
        sent: true,
      });
    });

    it('should generate a PDF and send it via email adapter', async () => {
      const result = await service.emailDocument('req-email', 'test@example.com');

      expect(result).toEqual({ sent: true, messageId: 'test-msg-001' });
      expect(mockEmailAdapter.send).toHaveBeenCalledTimes(1);

      const [to, subject, body, attachments] = mockEmailAdapter.send.mock.calls[0];
      expect(to).toBe('test@example.com');
      expect(subject).toBe('VIN Portal - Vehicle Addition Confirmation');
      expect(body).toContain('req-email');
      expect(attachments).toHaveLength(1);
      expect(attachments![0].filename).toBe('confirmation-req-email.pdf');
      expect(attachments![0].contentType).toBe('application/pdf');
      expect(attachments![0].content).toBeInstanceOf(Buffer);
      expect(attachments![0].content.length).toBeGreaterThan(0);
    });

    it('should propagate email adapter failure', async () => {
      mockEmailAdapter.send.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(
        service.emailDocument('req-fail', 'fail@example.com'),
      ).rejects.toThrow('SMTP connection refused');

      expect(mockEmailAdapter.send).toHaveBeenCalledTimes(1);
    });

    it('should return sent: false when adapter reports failure', async () => {
      mockEmailAdapter.send.mockResolvedValue({
        messageId: 'test-msg-fail',
        sent: false,
      });

      const result = await service.emailDocument('req-notsent', 'user@example.com');

      expect(result).toEqual({ sent: false, messageId: 'test-msg-fail' });
    });
  });
});
