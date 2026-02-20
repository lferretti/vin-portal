import { Inject, Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentData, mapFields } from './field-mapper';
import { EMAIL_ADAPTER } from '../../adapters/adapter.tokens';
import { EmailAdapter } from '../../adapters/interfaces/email.adapter';
import { BusinessMetricsService } from '../../common/services/business-metrics.service';

/** Path to the AcroForm PDF template (provided by the design team). */
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'assets',
  'templates',
  'confirmation.pdf',
);

/**
 * Generates confirmation documents.
 *
 * When a real AcroForm template exists at {@link TEMPLATE_PATH} the service
 * loads it, fills the named form fields via {@link mapFields}, flattens the
 * form, and returns the resulting PDF bytes.
 *
 * Until the template is delivered by the design team a fallback path
 * generates a basic PDF with the same information using pdf-lib directly.
 */
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @Inject(EMAIL_ADAPTER) private readonly emailAdapter: EmailAdapter,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  /**
   * Generate a confirmation PDF for the given request.
   * Returns a Buffer containing the PDF bytes.
   */
  async generatePdf(requestId: string, data?: DocumentData): Promise<Buffer> {
    const documentData: DocumentData = data ?? {
      requestReferenceId: requestId,
      confirmationDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      maskedVin: '***',
      yearMakeModel: 'N/A',
      contractReference: 'N/A',
    };

    this.businessMetrics.trackDocumentDownload();

    if (this.templateExists()) {
      return this.fillTemplate(documentData);
    }

    this.logger.warn(
      'AcroForm template not found — generating fallback PDF',
    );
    return this.generateFallbackPdf(documentData);
  }

  /**
   * Email the confirmation PDF to the specified address.
   * Generates the PDF and sends it via the injected email adapter.
   */
  async emailDocument(
    requestId: string,
    email: string,
  ): Promise<{ sent: boolean; messageId: string }> {
    const pdfBuffer = await this.generatePdf(requestId);

    const result = await this.emailAdapter.send(
      email,
      'VIN Portal - Vehicle Addition Confirmation',
      `<html><body>
        <h1>Vehicle Addition Confirmation</h1>
        <p>Your vehicle addition request <strong>${requestId}</strong> has been processed.</p>
        <p>Please find the confirmation document attached.</p>
      </body></html>`,
      [
        {
          filename: `confirmation-${requestId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    );

    this.logger.log(
      `Email sent for request ${requestId} to ${email} — messageId=${result.messageId}`,
    );

    this.businessMetrics.trackDocumentEmail(result.sent ? 'sent' : 'failed');

    return { sent: result.sent, messageId: result.messageId };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Check whether the AcroForm template file is present on disk. */
  private templateExists(): boolean {
    return fs.existsSync(TEMPLATE_PATH);
  }

  /**
   * Load the AcroForm template, fill named fields, flatten, and return bytes.
   */
  private async fillTemplate(data: DocumentData): Promise<Buffer> {
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const fields = mapFields(data);

    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
      } catch {
        this.logger.warn(
          `Template field "${fieldName}" not found — skipping`,
        );
      }
    }

    form.flatten();

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Generate a simple confirmation PDF without a template.
   * Mirrors the information that was previously produced by the PDFKit stub.
   */
  private async generateFallbackPdf(data: DocumentData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // LETTER
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 72;
    let y = 720;

    // Header
    const titleText = 'VIN Portal';
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 24);
    page.drawText(titleText, {
      x: (612 - titleWidth) / 2,
      y,
      size: 24,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    const subtitleText = 'Vehicle Addition Confirmation';
    const subtitleWidth = helveticaBold.widthOfTextAtSize(subtitleText, 18);
    page.drawText(subtitleText, {
      x: (612 - subtitleWidth) / 2,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 50;

    // Details
    const details = [
      `Reference ID: ${data.requestReferenceId}`,
      `Date: ${data.confirmationDate}`,
      `Vehicle: ${data.yearMakeModel}`,
      `VIN: ${data.maskedVin}`,
      `Contract: ${data.contractReference}`,
    ];

    for (const line of details) {
      page.drawText(line, {
        x: margin,
        y,
        size: 12,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      y -= 20;
    }
    y -= 20;

    // Body
    const bodyText =
      'This document confirms that an additional vehicle has been ' +
      'successfully added to your warranty contract. Please retain ' +
      'this document for your records.';
    page.drawText(bodyText, {
      x: margin,
      y,
      size: 12,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: 612 - margin * 2,
      lineHeight: 16,
    });
    y -= 60;

    // Footer
    const footerText =
      'This is an automatically generated confirmation document. ' +
      'For questions, please contact customer support.';
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 10);
    page.drawText(footerText, {
      x: Math.max(margin, (612 - footerWidth) / 2),
      y: 72,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: 612 - margin * 2,
      lineHeight: 14,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
