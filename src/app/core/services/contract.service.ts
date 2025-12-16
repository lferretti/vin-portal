import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiEnvelope, AuthenticateContractRequest, AuthenticateSuccessData } from '@core/models';

/**
 * Service for contract authentication operations
 */
@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly api = inject(ApiService);

  /**
   * Authenticate with contract details
   * @param request Contract authentication credentials
   * @returns Observable with authentication result or OTP requirement
   */
  authenticate(
    request: AuthenticateContractRequest
  ): Observable<ApiEnvelope<AuthenticateSuccessData>> {
    return this.api.post<AuthenticateSuccessData>('/contract/authenticate', {
      contractNumber: request.contractNumber.trim(),
      lastName: request.lastName.trim().toUpperCase(),
      zip: request.zip.trim(),
    });
  }
}

