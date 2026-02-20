import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiEnvelope, EmailDocumentData } from '@core/models';

/**
 * Service for downloading and emailing confirmation documents.
 * Backend currently generates a stub PDF; when DocuSign is integrated,
 * only the backend implementation changes — this service stays the same.
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(ApiService);

  /**
   * Download the confirmation PDF for a given request
   */
  downloadPdf(requestId: string): Observable<Blob> {
    return this.api.getBlob(`/document/request/${requestId}/pdf`);
  }

  /**
   * Email the confirmation PDF to the given address
   */
  emailDocument(requestId: string, email: string): Observable<ApiEnvelope<EmailDocumentData>> {
    return this.api.post<EmailDocumentData>(`/document/request/${requestId}/email`, { email });
  }
}
