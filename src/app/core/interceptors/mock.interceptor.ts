import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, switchMap } from 'rxjs';
import { environment } from '@env';
import { MockApiService } from '../services/mock-api.service';

/**
 * HTTP interceptor that routes requests to the mock API service
 * Only active when environment.features.mockApi is true
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip if mock API is disabled
  if (!environment.features.mockApi) {
    return next(req);
  }

  const mockApi = inject(MockApiService);
  const url = req.url;
  const method = req.method;
  const body = req.body as Record<string, unknown>;

  // Route to appropriate mock handler
  if (url.includes('/contract/authenticate') && method === 'POST') {
    return mockApi
      .authenticateContract(
        body['contractNumber'] as string,
        body['lastName'] as string,
        body['zip'] as string
      )
      .pipe(
        switchMap((response) =>
          of(
            new HttpResponse({
              status: response.success ? 200 : getErrorStatus(response.error?.code),
              body: response,
            })
          )
        )
      );
  }

  if (url.includes('/otp/send') && method === 'POST') {
    return mockApi.sendOtp(body['otpChallengeId'] as string).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  if (url.includes('/otp/verify') && method === 'POST') {
    return mockApi
      .verifyOtp(body['otpChallengeId'] as string, body['code'] as string)
      .pipe(
        switchMap((response) =>
          of(
            new HttpResponse({
              status: response.success ? 200 : getErrorStatus(response.error?.code),
              body: response,
            })
          )
        )
      );
  }

  if (url.includes('/vin/decode') && method === 'POST') {
    return mockApi.decodeVin(body['vin'] as string).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  if (url.includes('/vin/eligibility') && method === 'POST') {
    return mockApi.checkEligibility(body['vin'] as string).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  if (url.includes('/vin/commit') && method === 'POST') {
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || '';
    return mockApi
      .commitVin(body['vin'] as string, body['acceptIrreversible'] as boolean, idempotencyKey)
      .pipe(
        switchMap((response) =>
          of(
            new HttpResponse({
              status: response.success ? 200 : getErrorStatus(response.error?.code),
              body: response,
            })
          )
        )
      );
  }

  if (url.match(/\/vin\/request\/[^/]+$/) && method === 'GET') {
    const requestId = url.split('/').pop() || '';
    return mockApi.getRequestStatus(requestId).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  // Admin endpoints
  if (url.includes('/admin/contracts') && method === 'GET') {
    const urlObj = new URL(url, window.location.origin);
    return mockApi
      .searchContracts({
        contractNumber: urlObj.searchParams.get('contractNumber') || undefined,
        externalContractId: urlObj.searchParams.get('externalContractId') || undefined,
        requestId: urlObj.searchParams.get('requestId') || undefined,
      })
      .pipe(
        switchMap((response) =>
          of(
            new HttpResponse({
              status: response.success ? 200 : getErrorStatus(response.error?.code),
              body: response,
            })
          )
        )
      );
  }

  if (url.match(/\/admin\/requests\/[^/]+$/) && method === 'GET') {
    const requestId = url.split('/').pop() || '';
    return mockApi.getRequestDetail(requestId).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  if (url.match(/\/admin\/requests\/[^/]+\/note$/) && method === 'POST') {
    const parts = url.split('/');
    const requestId = parts[parts.length - 2];
    return mockApi.addNote(requestId, body['note'] as string).pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
  }

  // If no mock handler matches, pass through to real API
  return next(req);
};

/**
 * Map error codes to HTTP status codes
 */
function getErrorStatus(code?: string): number {
  const statusMap: Record<string, number> = {
    AUTH_NO_MATCH: 401,
    AUTH_OTP_REQUIRED: 403,
    AUTH_EXPIRED: 401,
    AUTH_INVALID: 401,
    RATE_LIMITED: 429,
    OTP_INVALID: 400,
    OTP_EXPIRED: 400,
    OTP_LOCKED_OUT: 429,
    VIN_INVALID_FORMAT: 400,
    VIN_DECODE_FAILED: 400,
    VIN_INELIGIBLE: 422,
    VIN_ALREADY_COMMITTED: 409,
    CONTRACT_LOCKED: 409,
    CONTRACT_NOT_FOUND: 404,
    DEPENDENCY_UNAVAILABLE: 503,
    INTERNAL_ERROR: 500,
  };

  return statusMap[code || ''] || 500;
}

