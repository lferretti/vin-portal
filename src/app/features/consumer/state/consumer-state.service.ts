import { Injectable, signal, computed } from '@angular/core';
import {
  ContractSummary,
  VinDecoded,
  VinEligibilityData,
  VinAddStatus,
  VinCommitData,
  OtpSummary,
} from '@core/models';

/**
 * Service for managing consumer wizard flow state
 * Maintains state across pages during the VIN add process
 */
@Injectable({ providedIn: 'root' })
export class ConsumerStateService {
  // Authentication state
  private readonly _contractContextId = signal<string | null>(null);
  private readonly _contractSummary = signal<ContractSummary | null>(null);

  // OTP state
  private readonly _otpRequired = signal<boolean>(false);
  private readonly _otpChallengeId = signal<string | null>(null);
  private readonly _otpMaskedDestination = signal<string | null>(null);
  private readonly _otpChannel = signal<'sms' | 'email' | null>(null);
  private readonly _otpVerified = signal<boolean>(false);

  // VIN state
  private readonly _enteredVin = signal<string | null>(null);
  private readonly _decodedVin = signal<VinDecoded | null>(null);
  private readonly _eligibilityResult = signal<VinEligibilityData | null>(null);

  // Commit state
  private readonly _idempotencyKey = signal<string | null>(null);
  private readonly _commitRequestId = signal<string | null>(null);
  private readonly _commitStatus = signal<VinAddStatus | null>(null);

  // Public readonly signals
  readonly contractContextId = this._contractContextId.asReadonly();
  readonly contractSummary = this._contractSummary.asReadonly();
  readonly otpRequired = this._otpRequired.asReadonly();
  readonly otpChallengeId = this._otpChallengeId.asReadonly();
  readonly otpMaskedDestination = this._otpMaskedDestination.asReadonly();
  readonly otpChannel = this._otpChannel.asReadonly();
  readonly otpVerified = this._otpVerified.asReadonly();
  readonly enteredVin = this._enteredVin.asReadonly();
  readonly decodedVin = this._decodedVin.asReadonly();
  readonly eligibilityResult = this._eligibilityResult.asReadonly();
  readonly idempotencyKey = this._idempotencyKey.asReadonly();
  readonly commitRequestId = this._commitRequestId.asReadonly();
  readonly commitStatus = this._commitStatus.asReadonly();

  // Computed signals
  readonly isEligible = computed(() => this._eligibilityResult()?.eligible ?? false);

  readonly currentStep = computed(() => {
    if (!this._contractContextId()) return 0;
    if (this._otpRequired() && !this._otpVerified()) return 0;
    if (!this._commitRequestId()) return 1;
    return 2;
  });

  readonly canProceedToReview = computed(() => {
    return !!this._contractContextId() && (!this._otpRequired() || this._otpVerified());
  });

  readonly isContractLocked = computed(() => {
    return this._commitStatus() === VinAddStatus.COMMITTED_LOCKED;
  });

  /**
   * Set authentication result
   */
  setAuthResult(
    contractContextId: string,
    contractSummary?: ContractSummary,
    otp?: OtpSummary
  ): void {
    this._contractContextId.set(contractContextId);
    this._contractSummary.set(contractSummary ?? null);

    if (otp && otp.status === 'REQUIRED') {
      this._otpRequired.set(true);
      this._otpChallengeId.set(otp.otpChallengeId);
      this._otpMaskedDestination.set(otp.maskedDestination);
      this._otpChannel.set(otp.channel);
    } else {
      this._otpRequired.set(false);
      this._otpVerified.set(true); // No OTP needed, consider verified
    }
  }

  /**
   * Set OTP as required (when auth returns OTP_REQUIRED error)
   */
  setOtpRequired(details: {
    contractContextId: string;
    otpChallengeId: string;
    maskedDestination: string;
    channel: 'sms' | 'email';
  }): void {
    this._contractContextId.set(details.contractContextId);
    this._otpRequired.set(true);
    this._otpChallengeId.set(details.otpChallengeId);
    this._otpMaskedDestination.set(details.maskedDestination);
    this._otpChannel.set(details.channel);
  }

  /**
   * Mark OTP as verified
   */
  setOtpVerified(): void {
    this._otpVerified.set(true);
  }

  /**
   * Set VIN decode result
   */
  setVinDecode(vin: string, decoded: VinDecoded): void {
    this._enteredVin.set(vin);
    this._decodedVin.set(decoded);
  }

  /**
   * Set the entered VIN (from auth page, before decode)
   */
  setEnteredVin(vin: string): void {
    this._enteredVin.set(vin);
  }

  /**
   * Set eligibility result
   */
  setEligibility(result: VinEligibilityData): void {
    this._eligibilityResult.set(result);
  }

  /**
   * Clear VIN state (to try another VIN)
   */
  clearVinState(): void {
    this._enteredVin.set(null);
    this._decodedVin.set(null);
    this._eligibilityResult.set(null);
  }

  /**
   * Prepare for commit - generate or return existing idempotency key
   */
  prepareCommit(): string {
    let key = this._idempotencyKey();
    if (!key) {
      key = crypto.randomUUID();
      this._idempotencyKey.set(key);
    }
    return key;
  }

  /**
   * Set commit result
   */
  setCommitResult(data: VinCommitData): void {
    this._commitRequestId.set(data.requestId);
    this._commitStatus.set(data.status);

    if (data.decoded) {
      this._decodedVin.set(data.decoded);
    }
  }

  /**
   * Update commit status (from polling)
   */
  updateCommitStatus(status: VinAddStatus): void {
    this._commitStatus.set(status);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._contractContextId.set(null);
    this._contractSummary.set(null);
    this._otpRequired.set(false);
    this._otpChallengeId.set(null);
    this._otpMaskedDestination.set(null);
    this._otpChannel.set(null);
    this._otpVerified.set(false);
    this._enteredVin.set(null);
    this._decodedVin.set(null);
    this._eligibilityResult.set(null);
    this._idempotencyKey.set(null);
    this._commitRequestId.set(null);
    this._commitStatus.set(null);
  }
}

