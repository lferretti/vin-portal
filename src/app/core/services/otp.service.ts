import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiEnvelope,
  OtpSendRequest,
  OtpSendData,
  OtpVerifyRequest,
  OtpVerifySuccessData,
} from '@core/models';

/**
 * Service for OTP (One-Time Password) operations
 */
@Injectable({ providedIn: 'root' })
export class OtpService {
  private readonly api = inject(ApiService);

  /**
   * Send OTP to the masked destination
   * @param request OTP send request with challenge ID
   * @returns Observable with send confirmation
   */
  send(request: OtpSendRequest): Observable<ApiEnvelope<OtpSendData>> {
    return this.api.post<OtpSendData>('/otp/send', request);
  }

  /**
   * Verify OTP code
   * @param request OTP verification request with challenge ID and code
   * @returns Observable with verification result and session token
   */
  verify(request: OtpVerifyRequest): Observable<ApiEnvelope<OtpVerifySuccessData>> {
    return this.api.post<OtpVerifySuccessData>('/otp/verify', request);
  }
}

