import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import {
  ApiEnvelope,
  VinDecodeRequest,
  VinDecodeData,
  VinEligibilityRequest,
  VinEligibilityData,
  VinCommitRequest,
  VinCommitData,
  VinRequestStatusData,
} from '@core/models';

/**
 * Service for VIN operations (decode, eligibility, commit)
 */
@Injectable({ providedIn: 'root' })
export class VinService {
  private readonly api = inject(ApiService);

  /**
   * Decode a VIN to get Year/Make/Model
   * @param request VIN decode request
   * @returns Observable with decoded VIN information
   */
  decode(request: VinDecodeRequest): Observable<ApiEnvelope<VinDecodeData>> {
    const normalizedVin = this.normalizeVin(request.vin);
    return this.api.post<VinDecodeData>('/vin/decode', { vin: normalizedVin });
  }

  /**
   * Check if a VIN is eligible for the authenticated contract
   * @param request VIN eligibility request
   * @returns Observable with eligibility result
   */
  checkEligibility(request: VinEligibilityRequest): Observable<ApiEnvelope<VinEligibilityData>> {
    const normalizedVin = this.normalizeVin(request.vin);
    return this.api.post<VinEligibilityData>('/vin/eligibility', { vin: normalizedVin });
  }

  /**
   * Commit a VIN to the contract (irreversible)
   * @param request VIN commit request
   * @param idempotencyKey Unique key to ensure idempotent commits
   * @returns Observable with commit result
   */
  commit(request: VinCommitRequest, idempotencyKey: string): Observable<ApiEnvelope<VinCommitData>> {
    const normalizedVin = this.normalizeVin(request.vin);
    const headers = new HttpHeaders().set('X-Idempotency-Key', idempotencyKey);

    return this.api.post<VinCommitData>(
      '/vin/commit',
      {
        vin: normalizedVin,
        acceptIrreversible: request.acceptIrreversible,
      },
      { headers }
    );
  }

  /**
   * Get the status of a VIN add request
   * @param requestId Request ID from commit response
   * @returns Observable with request status
   */
  getStatus(requestId: string): Observable<ApiEnvelope<VinRequestStatusData>> {
    return this.api.get<VinRequestStatusData>(`/vin/request/${requestId}`);
  }

  /**
   * Normalize VIN to uppercase without spaces
   */
  private normalizeVin(vin: string): string {
    return vin.toUpperCase().replace(/\s/g, '');
  }
}

