import { TestBed } from '@angular/core/testing';
import { ConsumerStateService } from './consumer-state.service';
import { VinAddStatus } from '@core/models';

describe('ConsumerStateService', () => {
  let service: ConsumerStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsumerStateService);
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have null contractContextId', () => {
      expect(service.contractContextId()).toBeNull();
    });

    it('should not be eligible', () => {
      expect(service.isEligible()).toBe(false);
    });

    it('should have currentStep 0', () => {
      expect(service.currentStep()).toBe(0);
    });

    it('should not be contract locked', () => {
      expect(service.isContractLocked()).toBe(false);
    });
  });

  describe('setAuthResult', () => {
    it('should set contract context ID', () => {
      service.setAuthResult('ctx-001');
      expect(service.contractContextId()).toBe('ctx-001');
    });

    it('should set contract summary when provided', () => {
      const summary = { primaryVinMasked: '1HG***1234', hasAdditionalVin: false };
      service.setAuthResult('ctx-001', summary);
      expect(service.contractSummary()).toEqual(summary);
    });

    it('should mark OTP as not required when no OTP provided', () => {
      service.setAuthResult('ctx-001');
      expect(service.otpRequired()).toBe(false);
      expect(service.otpVerified()).toBe(true);
    });

    it('should set OTP state when OTP is required', () => {
      service.setAuthResult('ctx-001', undefined, {
        status: 'REQUIRED',
        otpChallengeId: 'otp-123',
        maskedDestination: '***-1234',
        channel: 'sms',
      });
      expect(service.otpRequired()).toBe(true);
      expect(service.otpChallengeId()).toBe('otp-123');
      expect(service.otpMaskedDestination()).toBe('***-1234');
      expect(service.otpChannel()).toBe('sms');
      expect(service.otpVerified()).toBe(false);
    });

  });

  describe('setOtpRequired', () => {
    it('should set OTP details', () => {
      service.setOtpRequired({
        contractContextId: 'ctx-otp',
        otpChallengeId: 'otp-456',
        maskedDestination: '***-5678',
        channel: 'email',
      });
      expect(service.contractContextId()).toBe('ctx-otp');
      expect(service.otpRequired()).toBe(true);
      expect(service.otpChallengeId()).toBe('otp-456');
      expect(service.otpChannel()).toBe('email');
    });
  });

  describe('setOtpVerified', () => {
    it('should mark OTP as verified', () => {
      service.setOtpRequired({
        contractContextId: 'ctx-otp',
        otpChallengeId: 'otp-789',
        maskedDestination: '***-1234',
        channel: 'sms',
      });
      expect(service.otpVerified()).toBe(false);

      service.setOtpVerified();
      expect(service.otpVerified()).toBe(true);
    });

  });

  describe('setEnteredVin', () => {
    it('should set the entered VIN', () => {
      service.setEnteredVin('WVWZZZ3CZW1234567');
      expect(service.enteredVin()).toBe('WVWZZZ3CZW1234567');
    });
  });

  describe('VIN state', () => {
    beforeEach(() => {
      service.setAuthResult('ctx-001');
    });

    it('should set VIN decode result', () => {
      const decoded = { year: 2023, make: 'Honda', model: 'Accord' };
      service.setVinDecode('1HGCM82633A123456', decoded);
      expect(service.enteredVin()).toBe('1HGCM82633A123456');
      expect(service.decodedVin()).toEqual(decoded);
    });

    it('should set eligibility result', () => {
      const result = { vin: '1HGCM82633A123456', eligible: true, reasonCode: 'OK' };
      service.setEligibility(result);
      expect(service.eligibilityResult()).toEqual(result);
      expect(service.isEligible()).toBe(true);
    });

    it('should set ineligible result', () => {
      const result = { vin: '1HGCM82633A123456', eligible: false, reasonCode: 'CLASS_TOO_HIGH' };
      service.setEligibility(result);
      expect(service.isEligible()).toBe(false);
    });

    it('should clear VIN state', () => {
      service.setVinDecode('1HGCM82633A123456', { year: 2023, make: 'Honda', model: 'Accord' });
      service.setEligibility({ vin: '1HGCM82633A123456', eligible: true, reasonCode: 'OK' });

      service.clearVinState();
      expect(service.enteredVin()).toBeNull();
      expect(service.decodedVin()).toBeNull();
      expect(service.eligibilityResult()).toBeNull();
    });

    it('should allow proceeding to review when authenticated without OTP', () => {
      expect(service.canProceedToReview()).toBe(true);
    });

    it('should allow proceeding to review when authenticated with OTP verified', () => {
      service.reset();
      service.setOtpRequired({
        contractContextId: 'ctx-001',
        otpChallengeId: 'otp-123',
        maskedDestination: '***-1234',
        channel: 'sms',
      });
      expect(service.canProceedToReview()).toBe(false);

      service.setOtpVerified();
      expect(service.canProceedToReview()).toBe(true);
    });

    it('should not allow proceeding to review when not authenticated', () => {
      service.reset();
      expect(service.canProceedToReview()).toBe(false);
    });
  });

  describe('commit state', () => {
    beforeEach(() => {
      service.setAuthResult('ctx-001');
    });

    it('should generate idempotency key on prepareCommit', () => {
      const key = service.prepareCommit();
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });

    it('should return same idempotency key on repeated calls', () => {
      const key1 = service.prepareCommit();
      const key2 = service.prepareCommit();
      expect(key1).toBe(key2);
    });

    it('should set commit result', () => {
      service.setCommitResult({
        requestId: 'req-001',
        status: VinAddStatus.PENDING,
        vin: '1HGCM82633A123456',
        decoded: { year: 2023, make: 'Honda', model: 'Accord' },
      });
      expect(service.commitRequestId()).toBe('req-001');
      expect(service.commitStatus()).toBe(VinAddStatus.PENDING);
    });

    it('should update commit status', () => {
      service.setCommitResult({
        requestId: 'req-001',
        status: VinAddStatus.PENDING,
        vin: '1HGCM82633A123456',
      });
      service.updateCommitStatus(VinAddStatus.COMMITTED_LOCKED);
      expect(service.commitStatus()).toBe(VinAddStatus.COMMITTED_LOCKED);
      expect(service.isContractLocked()).toBe(true);
    });
  });

  describe('currentStep', () => {
    it('should be 0 when not authenticated', () => {
      expect(service.currentStep()).toBe(0);
    });

    it('should be 0 when OTP required but not verified', () => {
      service.setOtpRequired({
        contractContextId: 'ctx-otp',
        otpChallengeId: 'otp-123',
        maskedDestination: '***-1234',
        channel: 'sms',
      });
      expect(service.currentStep()).toBe(0);
    });

    it('should be 1 when authenticated without OTP, no commit yet', () => {
      service.setAuthResult('ctx-001');
      expect(service.currentStep()).toBe(1);
    });

    it('should be 1 when authenticated with OTP verified, no commit yet', () => {
      service.setOtpRequired({
        contractContextId: 'ctx-otp',
        otpChallengeId: 'otp-123',
        maskedDestination: '***-1234',
        channel: 'sms',
      });
      service.setOtpVerified();
      expect(service.currentStep()).toBe(1);
    });

    it('should be 2 when committed', () => {
      service.setAuthResult('ctx-001');
      service.setCommitResult({ requestId: 'req-001', status: VinAddStatus.COMMITTED_LOCKED, vin: '1HGCM82633A123456' });
      expect(service.currentStep()).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      service.setAuthResult('ctx-001');
      service.setVinDecode('1HGCM82633A123456', { year: 2023, make: 'Honda', model: 'Accord' });
      service.setEligibility({ vin: '1HGCM82633A123456', eligible: true, reasonCode: 'OK' });
      service.prepareCommit();
      service.setCommitResult({ requestId: 'req-001', status: VinAddStatus.COMMITTED_LOCKED, vin: '1HGCM82633A123456' });

      service.reset();

      expect(service.contractContextId()).toBeNull();
      expect(service.contractSummary()).toBeNull();
      expect(service.otpRequired()).toBe(false);
      expect(service.otpChallengeId()).toBeNull();
      expect(service.otpVerified()).toBe(false);
      expect(service.enteredVin()).toBeNull();
      expect(service.decodedVin()).toBeNull();
      expect(service.eligibilityResult()).toBeNull();
      expect(service.idempotencyKey()).toBeNull();
      expect(service.commitRequestId()).toBeNull();
      expect(service.commitStatus()).toBeNull();
      expect(service.currentStep()).toBe(0);
    });
  });
});
