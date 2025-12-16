import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiEnvelope,
  AdminContractSearchData,
  AdminRequestDetailData,
  AdminNoteRequest,
  AdminNoteResponseData,
} from '@core/models';

/**
 * Service for admin/support operations
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  /**
   * Search for contracts
   * @param params Search parameters (at least one required)
   * @returns Observable with search results
   */
  searchContracts(params: {
    contractNumber?: string;
    externalContractId?: string;
    requestId?: string;
  }): Observable<ApiEnvelope<AdminContractSearchData>> {
    const queryParams = new URLSearchParams();

    if (params.contractNumber) {
      queryParams.set('contractNumber', params.contractNumber);
    }
    if (params.externalContractId) {
      queryParams.set('externalContractId', params.externalContractId);
    }
    if (params.requestId) {
      queryParams.set('requestId', params.requestId);
    }

    const queryString = queryParams.toString();
    const path = queryString ? `/admin/contracts?${queryString}` : '/admin/contracts';

    return this.api.get<AdminContractSearchData>(path);
  }

  /**
   * Get detailed information about a request
   * @param requestId Request ID
   * @returns Observable with request details including audit trail
   */
  getRequestDetail(requestId: string): Observable<ApiEnvelope<AdminRequestDetailData>> {
    return this.api.get<AdminRequestDetailData>(`/admin/requests/${requestId}`);
  }

  /**
   * Add a note to a request
   * @param requestId Request ID
   * @param note Note content
   * @returns Observable with note save confirmation
   */
  addNote(requestId: string, note: string): Observable<ApiEnvelope<AdminNoteResponseData>> {
    const request: AdminNoteRequest = { note };
    return this.api.post<AdminNoteResponseData>(`/admin/requests/${requestId}/note`, request);
  }
}

