import { Injectable, Logger } from '@nestjs/common';

/**
 * Generates confirmation documents.
 * Currently produces a stub PDF with PDFKit.
 * When DocuSign is integrated, swap this implementation
 * to call the DocuSign eSignature API instead.
 */
@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  /**
   * Generate a confirmation PDF for the given request.
   * Returns a Buffer containing the PDF bytes.
   */
  async generatePdf(requestId: string): Promise<Buffer> {
    // Lazy-import PDFKit so it's only loaded when needed
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).text('VIN Portal', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).text('Vehicle Addition Confirmation', { align: 'center' });
      doc.moveDown(2);

      // Details
      doc.fontSize(12);
      doc.text(`Reference ID: ${requestId}`);
      doc.moveDown(0.5);
      doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      doc.moveDown(2);

      // Body
      doc.text(
        'This document confirms that an additional vehicle has been successfully added to your warranty contract. ' +
        'Please retain this document for your records.',
      );
      doc.moveDown(2);

      // Footer
      doc.fontSize(10).fillColor('#666666');
      doc.text(
        'This is an automatically generated confirmation document. ' +
        'For questions, please contact customer support.',
        { align: 'center' },
      );

      doc.end();
    });
  }

  /**
   * Email the confirmation PDF to the specified address.
   * Stub implementation — logs to console and returns success.
   * When DocuSign is integrated, use DocuSign's built-in email delivery.
   */
  async emailDocument(requestId: string, email: string): Promise<{ sent: boolean }> {
    this.logger.log(`[STUB] Would email document for request ${requestId} to ${email}`);
    return { sent: true };
  }
}
