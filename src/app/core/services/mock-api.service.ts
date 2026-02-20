import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, throwError, timer, map } from 'rxjs';
import {
  ApiEnvelope,
  ApiErrorCodes,
  AuthenticateSuccessData,
  OtpSendData,
  OtpVerifySuccessData,
  VinDecodeData,
  VinEligibilityData,
  VinCommitData,
  VinRequestStatusData,
  VinAddStatus,
  AdminContractSearchData,
  AdminRequestDetailData,
  AdminNoteResponseData,
  ContractSummary,
  VinDecoded,
} from '@core/models';

/**
 * Mock API Service for development and testing
 * Simulates backend responses with realistic delays
 */
@Injectable({ providedIn: 'root' })
export class MockApiService {
  // Simulated database state
  private readonly _contracts = signal<Map<string, MockContract>>(new Map());
  private readonly _requests = signal<Map<string, MockVinRequest>>(new Map());
  private readonly _otpChallenges = signal<Map<string, MockOtpChallenge>>(new Map());

  // Track authentication attempts for rate limiting simulation
  private authAttempts = 0;
  private lastAuthAttemptTime = 0;

  constructor() {
    this.initializeMockData();
  }

  // ============== Contract Authentication ==============

  authenticateContract(
    vin7: string,
    lastName: string,
    zip: string
  ): Observable<ApiEnvelope<AuthenticateSuccessData>> {
    return of(null).pipe(
      delay(this.randomDelay(500, 1500)),
      map(() => {
        // Simulate rate limiting
        const now = Date.now();
        if (now - this.lastAuthAttemptTime < 1000) {
          this.authAttempts++;
          if (this.authAttempts > 5) {
            return this.errorResponse<AuthenticateSuccessData>(
              ApiErrorCodes.RATE_LIMITED,
              'Too many attempts. Please wait.',
              { retryAfterSeconds: 60 }
            );
          }
        } else {
          this.authAttempts = 1;
        }
        this.lastAuthAttemptTime = now;

        // Check for valid test credentials
        const validCredentials: Record<string, { lastName: string; zip: string }> = {
          '1234567': { lastName: 'SMITH', zip: '30301' },
          '7654321': { lastName: 'JONES', zip: '10001' },
          '0TP7654': { lastName: 'TESTUSER', zip: '12345' },
          'LOCKED1': { lastName: 'LOCKED', zip: '99999' },
        };

        const normalized = vin7.toUpperCase();
        const expected = validCredentials[normalized];
        if (!expected) {
          return this.errorResponse<AuthenticateSuccessData>(
            ApiErrorCodes.AUTH_NO_MATCH,
            'No contract found matching the provided information.'
          );
        }

        if (lastName.toUpperCase() !== expected.lastName || zip !== expected.zip) {
          return this.errorResponse<AuthenticateSuccessData>(
            ApiErrorCodes.AUTH_NO_MATCH,
            'No contract found matching the provided information.'
          );
        }

        // Check if contract requires OTP
        if (normalized === '0TP7654') {
          const challengeId = this.generateId('otp');
          this._otpChallenges.update((m) => {
            m.set(challengeId, {
              id: challengeId,
              contractContextId: 'ctx-otp',
              code: '123456',
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
              attempts: 0,
            });
            return new Map(m);
          });

          return this.errorResponse<AuthenticateSuccessData>(
            ApiErrorCodes.AUTH_OTP_REQUIRED,
            'OTP verification required.',
            {
              contractContextId: 'ctx-otp',
              otpChallengeId: challengeId,
              maskedDestination: '***-***-1234',
              channel: 'sms',
            }
          );
        }

        // Check if contract is locked
        if (normalized === 'LOCKED1') {
          return this.errorResponse<AuthenticateSuccessData>(
            ApiErrorCodes.CONTRACT_LOCKED,
            'This contract already has an additional vehicle registered.'
          );
        }

        // Successful authentication
        const contractContextId = `ctx-${normalized}`;
        const contract = this.getOrCreateContract(contractContextId, normalized);

        return this.successResponse<AuthenticateSuccessData>({
          contractContextId,
          sessionToken: this.generateMockJwt(contractContextId),
          sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          otp: {
            status: 'NOT_REQUIRED',
            otpChallengeId: null,
            maskedDestination: null,
            channel: null,
          },
          contractSummary: {
            primaryVinMasked: contract.primaryVinMasked,
            hasAdditionalVin: contract.hasAdditionalVin,
          },
        });
      })
    );
  }

  // ============== OTP ==============

  sendOtp(otpChallengeId: string): Observable<ApiEnvelope<OtpSendData>> {
    return of(null).pipe(
      delay(this.randomDelay(300, 800)),
      map(() => {
        const challenge = this._otpChallenges().get(otpChallengeId);
        if (!challenge) {
          return this.errorResponse<OtpSendData>(
            ApiErrorCodes.OTP_EXPIRED,
            'OTP challenge not found or expired.'
          );
        }

        // Regenerate code
        challenge.code = '123456'; // Fixed for testing
        challenge.expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        return this.successResponse<OtpSendData>({
          otpChallengeId,
          status: 'SENT',
          expiresAt: challenge.expiresAt.toISOString(),
        });
      })
    );
  }

  verifyOtp(
    otpChallengeId: string,
    code: string
  ): Observable<ApiEnvelope<OtpVerifySuccessData>> {
    return of(null).pipe(
      delay(this.randomDelay(400, 1000)),
      map(() => {
        const challenge = this._otpChallenges().get(otpChallengeId);
        if (!challenge) {
          return this.errorResponse<OtpVerifySuccessData>(
            ApiErrorCodes.OTP_EXPIRED,
            'OTP challenge not found or expired.'
          );
        }

        if (challenge.expiresAt < new Date()) {
          return this.errorResponse<OtpVerifySuccessData>(
            ApiErrorCodes.OTP_EXPIRED,
            'OTP code has expired.'
          );
        }

        challenge.attempts++;
        if (challenge.attempts > 3) {
          return this.errorResponse<OtpVerifySuccessData>(
            ApiErrorCodes.OTP_LOCKED_OUT,
            'Too many failed attempts.'
          );
        }

        if (code !== challenge.code) {
          return this.errorResponse<OtpVerifySuccessData>(
            ApiErrorCodes.OTP_INVALID,
            'Invalid OTP code.'
          );
        }

        // Success
        return this.successResponse<OtpVerifySuccessData>({
          contractContextId: challenge.contractContextId,
          sessionToken: this.generateMockJwt(challenge.contractContextId),
          sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          otp: {
            status: 'VERIFIED',
            otpChallengeId,
            maskedDestination: '***-***-1234',
            channel: 'sms',
          },
        });
      })
    );
  }

  // ============== VIN Operations ==============

  decodeVin(vin: string): Observable<ApiEnvelope<VinDecodeData>> {
    return of(null).pipe(
      delay(this.randomDelay(300, 700)),
      map(() => {
        const normalized = vin.toUpperCase().replace(/\s/g, '');

        // Invalid format
        if (normalized.length !== 17 || /[IOQ]/.test(normalized)) {
          return this.errorResponse<VinDecodeData>(
            ApiErrorCodes.VIN_INVALID_FORMAT,
            'Invalid VIN format.'
          );
        }

        // Mock VIN database
        const mockVins: Record<string, VinDecoded> = {
          '1HGCM82633A123456': { year: 2003, make: 'Honda', model: 'Accord' },
          '1HGCM56787A123456': { year: 2007, make: 'Honda', model: 'Civic' },
          '5FNRL38437B123456': { year: 2007, make: 'Honda', model: 'Odyssey' },
          'WVWZZZ3CZWE123456': { year: 2022, make: 'Volkswagen', model: 'Golf' },
          '1G1YY22G965123456': { year: 2006, make: 'Chevrolet', model: 'Corvette' },
          '3N1AB7AP5KY123456': { year: 2019, make: 'Nissan', model: 'Sentra' },
        };

        const decoded = mockVins[normalized];
        if (!decoded) {
          // Generate random decode for unknown VINs
          const randomDecoded: VinDecoded = {
            year: 2020 + Math.floor(Math.random() * 5),
            make: ['Toyota', 'Ford', 'Chevrolet', 'Honda'][Math.floor(Math.random() * 4)],
            model: ['Sedan', 'SUV', 'Truck', 'Coupe'][Math.floor(Math.random() * 4)],
          };
          return this.successResponse<VinDecodeData>({ vin: normalized, decoded: randomDecoded });
        }

        return this.successResponse<VinDecodeData>({ vin: normalized, decoded });
      })
    );
  }

  checkEligibility(vin: string): Observable<ApiEnvelope<VinEligibilityData>> {
    return of(null).pipe(
      delay(this.randomDelay(400, 1000)),
      map(() => {
        const normalized = vin.toUpperCase().replace(/\s/g, '');

        // Simulate different eligibility scenarios
        if (normalized === '1G1YY22G965123456') {
          // Corvette - too high class
          return this.successResponse<VinEligibilityData>({
            vin: normalized,
            eligible: false,
            reasonCode: 'CLASS_TOO_HIGH',
          });
        }

        if (normalized.startsWith('5FNRL')) {
          // Odyssey - already used
          return this.successResponse<VinEligibilityData>({
            vin: normalized,
            eligible: false,
            reasonCode: 'VIN_ALREADY_USED',
          });
        }

        // All others are eligible
        return this.successResponse<VinEligibilityData>({
          vin: normalized,
          eligible: true,
          reasonCode: 'OK',
        });
      })
    );
  }

  commitVin(
    vin: string,
    acceptIrreversible: boolean,
    idempotencyKey: string
  ): Observable<ApiEnvelope<VinCommitData>> {
    return of(null).pipe(
      delay(this.randomDelay(800, 2000)),
      map(() => {
        if (!acceptIrreversible) {
          return this.errorResponse<VinCommitData>(
            ApiErrorCodes.INTERNAL_ERROR,
            'Must accept irreversible terms.'
          );
        }

        const normalized = vin.toUpperCase().replace(/\s/g, '');
        const requestId = `req-${Date.now()}`;

        // Check for idempotent retry
        const existingRequest = Array.from(this._requests().values()).find(
          (r) => r.idempotencyKey === idempotencyKey
        );

        if (existingRequest) {
          return this.successResponse<VinCommitData>({
            requestId: existingRequest.id,
            status: existingRequest.status,
            vin: existingRequest.vin,
            decoded: existingRequest.decoded,
          });
        }

        // Simulate random PENDING vs immediate success (80% immediate success)
        const status =
          Math.random() < 0.8 ? VinAddStatus.COMMITTED_LOCKED : VinAddStatus.PENDING;

        const decoded: VinDecoded = {
          year: 2023,
          make: 'Test',
          model: 'Vehicle',
        };

        const request: MockVinRequest = {
          id: requestId,
          contractContextId: 'ctx-001',
          vin: normalized,
          decoded,
          status,
          idempotencyKey,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        };

        this._requests.update((m) => {
          m.set(requestId, request);
          return new Map(m);
        });

        // If PENDING, simulate async completion after a few seconds
        if (status === VinAddStatus.PENDING) {
          timer(5000).subscribe(() => {
            this._requests.update((m) => {
              const req = m.get(requestId);
              if (req && req.status === VinAddStatus.PENDING) {
                req.status = VinAddStatus.COMMITTED_LOCKED;
                req.lastUpdatedAt = new Date();
              }
              return new Map(m);
            });
          });
        }

        return this.successResponse<VinCommitData>({
          requestId,
          status,
          vin: normalized,
          decoded,
          message:
            status === VinAddStatus.PENDING
              ? 'Request is being processed.'
              : 'Vehicle successfully added.',
        });
      })
    );
  }

  getRequestStatus(requestId: string): Observable<ApiEnvelope<VinRequestStatusData>> {
    return of(null).pipe(
      delay(this.randomDelay(200, 500)),
      map(() => {
        const request = this._requests().get(requestId);
        if (!request) {
          return this.errorResponse<VinRequestStatusData>(
            ApiErrorCodes.CONTRACT_NOT_FOUND,
            'Request not found.'
          );
        }

        return this.successResponse<VinRequestStatusData>({
          requestId: request.id,
          status: request.status,
          vin: request.vin,
          decoded: request.decoded,
          lastUpdatedAt: request.lastUpdatedAt.toISOString(),
          eligibilityAllowed: true,
          eligibilityReasonCode: 'OK',
        });
      })
    );
  }

  // ============== Admin Operations ==============

  searchContracts(params: {
    contractNumber?: string;
    externalContractId?: string;
    requestId?: string;
  }): Observable<ApiEnvelope<AdminContractSearchData>> {
    return of(null).pipe(
      delay(this.randomDelay(300, 800)),
      map(() => {
        const results = Array.from(this._contracts().values())
          .filter((c) => {
            if (params.contractNumber && !c.contractNumber.includes(params.contractNumber)) {
              return false;
            }
            if (params.externalContractId && c.externalContractId !== params.externalContractId) {
              return false;
            }
            return true;
          })
          .map((c) => ({
            contractContextId: c.id,
            externalContractId: c.externalContractId,
            status: c.hasAdditionalVin ? VinAddStatus.COMMITTED_LOCKED : VinAddStatus.NOT_USED,
            committedVinMasked: c.additionalVinMasked,
            committedAt: c.additionalVinCommittedAt,
          }));

        return this.successResponse<AdminContractSearchData>({ results });
      })
    );
  }

  getRequestDetail(requestId: string): Observable<ApiEnvelope<AdminRequestDetailData>> {
    return of(null).pipe(
      delay(this.randomDelay(300, 800)),
      map(() => {
        const request = this._requests().get(requestId);
        if (!request) {
          return this.errorResponse<AdminRequestDetailData>(
            ApiErrorCodes.CONTRACT_NOT_FOUND,
            'Request not found.'
          );
        }

        return this.successResponse<AdminRequestDetailData>({
          requestId: request.id,
          contractContextId: request.contractContextId,
          status: request.status,
          vin: request.vin,
          decoded: request.decoded,
          eligibilityAllowed: true,
          eligibilityReasonCode: 'OK',
          audit: [
            {
              eventType: 'VIN_COMMIT_REQUESTED',
              createdAt: request.createdAt.toISOString(),
              actorType: 'CONSUMER',
            },
            {
              eventType:
                request.status === VinAddStatus.COMMITTED_LOCKED
                  ? 'VIN_COMMIT_SUCCESS'
                  : 'VIN_COMMIT_PENDING',
              createdAt: request.lastUpdatedAt.toISOString(),
              actorType: 'SYSTEM',
            },
          ],
        });
      })
    );
  }

  addNote(requestId: string, note: string): Observable<ApiEnvelope<AdminNoteResponseData>> {
    return of(null).pipe(
      delay(this.randomDelay(200, 500)),
      map(() => {
        const request = this._requests().get(requestId);
        if (!request) {
          return this.errorResponse<AdminNoteResponseData>(
            ApiErrorCodes.CONTRACT_NOT_FOUND,
            'Request not found.'
          );
        }

        // In a real app, we'd store the note
        return this.successResponse<AdminNoteResponseData>({
          requestId,
          noteSaved: true,
        });
      })
    );
  }

  // ============== Document Operations ==============

  generateDocument(requestId: string): Observable<Blob> {
    return of(null).pipe(
      delay(this.randomDelay(300, 800)),
      map(() => {
        // Generate a minimal valid PDF
        const pdfContent = [
          '%PDF-1.4',
          '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
          '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
          '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
          '4 0 obj<</Length 136>>stream',
          'BT /F1 24 Tf 100 700 Td (VIN Portal - Confirmation) Tj ET',
          `BT /F1 12 Tf 100 660 Td (Reference: ${requestId}) Tj ET`,
          `BT /F1 12 Tf 100 640 Td (Date: ${new Date().toISOString()}) Tj ET`,
          'BT /F1 12 Tf 100 600 Td (This is a confirmation stub document.) Tj ET',
          'endstream endobj',
          '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
          'xref',
          'trailer<</Size 6/Root 1 0 R>>',
          '%%EOF',
        ].join('\n');

        return new Blob([pdfContent], { type: 'application/pdf' });
      })
    );
  }

  emailDocument(
    requestId: string,
    email: string
  ): Observable<ApiEnvelope<{ requestId: string; sent: boolean }>> {
    return of(null).pipe(
      delay(this.randomDelay(500, 1200)),
      map(() => {
        console.log(`[MockAPI] Document for request ${requestId} emailed to ${email}`);
        return this.successResponse({ requestId, sent: true });
      })
    );
  }

  // ============== Helpers ==============

  private initializeMockData(): void {
    const contracts: MockContract[] = [
      {
        id: 'ctx-1234567',
        contractNumber: '1234567',
        externalContractId: 'EXT-001',
        primaryVinMasked: '1HG******1234',
        hasAdditionalVin: false,
      },
      {
        id: 'ctx-7654321',
        contractNumber: '7654321',
        externalContractId: 'EXT-002',
        primaryVinMasked: '5FN******5678',
        hasAdditionalVin: true,
        additionalVinMasked: '3N1******9012',
        additionalVinCommittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    this._contracts.set(new Map(contracts.map((c) => [c.id, c])));
  }

  private getOrCreateContract(id: string, contractNumber: string): MockContract {
    const existing = this._contracts().get(id);
    if (existing) return existing;

    const newContract: MockContract = {
      id,
      contractNumber,
      externalContractId: `EXT-${contractNumber}`,
      primaryVinMasked: '1XX******' + Math.random().toString().slice(2, 6),
      hasAdditionalVin: false,
    };

    this._contracts.update((m) => {
      m.set(id, newContract);
      return new Map(m);
    });

    return newContract;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateMockJwt(contractContextId: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        contractContextId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      })
    );
    const signature = btoa('mock-signature');
    return `${header}.${payload}.${signature}`;
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private successResponse<T>(data: T): ApiEnvelope<T> {
    return {
      correlationId: this.generateId('corr'),
      success: true,
      data,
      error: null,
    };
  }

  private errorResponse<T>(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ApiEnvelope<T> {
    return {
      correlationId: this.generateId('corr'),
      success: false,
      data: null,
      error: { code, message, details },
    };
  }
}

// ============== Mock Types ==============

interface MockContract {
  id: string;
  contractNumber: string;
  externalContractId: string;
  primaryVinMasked: string;
  hasAdditionalVin: boolean;
  additionalVinMasked?: string;
  additionalVinCommittedAt?: string;
}

interface MockVinRequest {
  id: string;
  contractContextId: string;
  vin: string;
  decoded: VinDecoded;
  status: VinAddStatus;
  idempotencyKey: string;
  createdAt: Date;
  lastUpdatedAt: Date;
}

interface MockOtpChallenge {
  id: string;
  contractContextId: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

