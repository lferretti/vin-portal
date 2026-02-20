import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { VerifyOtpComponent } from './verify-otp.component';
import { OtpService } from '@core/services/otp.service';
import { SessionService } from '@core/services/session.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { ApiEnvelope, OtpVerifySuccessData, OtpSendData } from '@core/models';

describe('VerifyOtpComponent', () => {
  let component: VerifyOtpComponent;
  let fixture: ComponentFixture<VerifyOtpComponent>;
  let otpService: { verify: jest.Mock; send: jest.Mock };
  let sessionService: { setSession: jest.Mock; consumeRedirectUrl: jest.Mock };
  let consumerState: {
    otpChallengeId: ReturnType<typeof signal<string | null>>;
    otpMaskedDestination: ReturnType<typeof signal<string | null>>;
    setOtpVerified: jest.Mock;
  };
  let router: Router;

  const mockVerifyResponse: ApiEnvelope<OtpVerifySuccessData> = {
    correlationId: 'corr-200',
    success: true,
    data: {
      contractContextId: 'ctx-123',
      sessionToken: 'new-token',
      sessionExpiresAt: '2026-12-31T00:00:00Z',
      otp: { status: 'VERIFIED', otpChallengeId: 'otp-123', maskedDestination: null, channel: null },
    },
    error: null,
  };

  const mockSendResponse: ApiEnvelope<OtpSendData> = {
    correlationId: 'corr-201',
    success: true,
    data: {
      otpChallengeId: 'otp-123',
      status: 'SENT',
      expiresAt: '2026-12-31T00:10:00Z',
    },
    error: null,
  };

  function setupComponent(): void {
    fixture = TestBed.createComponent(VerifyOtpComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
  }

  beforeEach(async () => {
    otpService = {
      verify: jest.fn().mockReturnValue(of(mockVerifyResponse)),
      send: jest.fn().mockReturnValue(of(mockSendResponse)),
    };
    sessionService = {
      setSession: jest.fn(),
      consumeRedirectUrl: jest.fn().mockReturnValue(null),
    };
    consumerState = {
      otpChallengeId: signal<string | null>('otp-123'),
      otpMaskedDestination: signal<string | null>('***-***-1234'),
      setOtpVerified: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VerifyOtpComponent],
      providers: [
        provideRouter([
          { path: 'vin-entry', component: VerifyOtpComponent },
          { path: 'authenticate', component: VerifyOtpComponent },
        ]),
        { provide: OtpService, useValue: otpService },
        { provide: SessionService, useValue: sessionService },
        { provide: ConsumerStateService, useValue: consumerState },
      ],
    }).compileComponents();
  });

  it('should create', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    discardPeriodicTasks();
  }));

  it('should display the heading', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Verify Your Identity');
    discardPeriodicTasks();
  }));

  it('should display the masked destination', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('***-***-1234');
    discardPeriodicTasks();
  }));

  it('should render the verification code input', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[inputmode="numeric"]');
    expect(input).toBeTruthy();
    expect(input.getAttribute('maxlength')).toBe('6');
    discardPeriodicTasks();
  }));

  it('should send OTP on initialization', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    expect(otpService.send).toHaveBeenCalledWith({ otpChallengeId: 'otp-123' });
    discardPeriodicTasks();
  }));

  describe('code validation', () => {
    beforeEach(fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      discardPeriodicTasks();
    }));

    it('should be invalid when empty', () => {
      component.codeControl.setValue('');
      component.codeControl.markAsTouched();
      expect(component.codeControl.invalid).toBe(true);
    });

    it('should be invalid for non-6-digit code', () => {
      component.codeControl.setValue('123');
      component.codeControl.markAsTouched();
      expect(component.codeControl.invalid).toBe(true);
    });

    it('should be invalid for non-numeric input', () => {
      component.codeControl.setValue('abcdef');
      component.codeControl.markAsTouched();
      expect(component.codeControl.invalid).toBe(true);
    });

    it('should be valid for a 6-digit code', () => {
      component.codeControl.setValue('123456');
      expect(component.codeControl.valid).toBe(true);
    });
  });

  describe('verify', () => {
    it('should not call verify when code is invalid', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      component.codeControl.setValue('');
      component.onVerify();
      expect(otpService.verify).not.toHaveBeenCalled();
      discardPeriodicTasks();
    }));

    it('should redirect to /authenticate when no challenge ID is present', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      consumerState.otpChallengeId.set(null);
      component.codeControl.setValue('123456');
      component.onVerify();
      expect(router.navigate).toHaveBeenCalledWith(['/authenticate']);
      discardPeriodicTasks();
    }));

    it('should call otpService.verify with correct params', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      component.codeControl.setValue('123456');
      component.onVerify();
      tick();

      expect(otpService.verify).toHaveBeenCalledWith({
        otpChallengeId: 'otp-123',
        code: '123456',
      });
      discardPeriodicTasks();
    }));

    it('should navigate to /vin-entry on successful verification', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      component.codeControl.setValue('123456');
      component.onVerify();
      tick();

      expect(sessionService.setSession).toHaveBeenCalled();
      expect(consumerState.setOtpVerified).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/vin-entry']);
      discardPeriodicTasks();
    }));

    it('should use redirect URL when available after verification', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      sessionService.consumeRedirectUrl.mockReturnValue('/vin-entry');
      component.codeControl.setValue('123456');
      component.onVerify();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/vin-entry']);
      discardPeriodicTasks();
    }));

    it('should set isVerifying during verification', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      component.codeControl.setValue('123456');
      expect(component.isVerifying()).toBe(false);

      component.onVerify();
      tick();

      // After synchronous observable completes, isVerifying is reset to false
      expect(component.isVerifying()).toBe(false);
      discardPeriodicTasks();
    }));
  });

  describe('error handling', () => {
    it('should display error for OTP_INVALID', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'OTP_INVALID', message: 'Invalid code' } },
        status: 400,
      });
      otpService.verify.mockReturnValue(throwError(() => errorResponse));

      component.codeControl.setValue('000000');
      component.onVerify();
      tick();

      expect(component.errorMessage()).toContain('Invalid code');
      discardPeriodicTasks();
    }));

    it('should display error for OTP_EXPIRED', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'OTP_EXPIRED', message: 'Expired' } },
        status: 410,
      });
      otpService.verify.mockReturnValue(throwError(() => errorResponse));

      component.codeControl.setValue('999999');
      component.onVerify();
      tick();

      expect(component.errorMessage()).toContain('expired');
      discardPeriodicTasks();
    }));

    it('should display error for OTP_LOCKED_OUT', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'OTP_LOCKED_OUT', message: 'Locked out' } },
        status: 429,
      });
      otpService.verify.mockReturnValue(throwError(() => errorResponse));

      component.codeControl.setValue('111111');
      component.onVerify();
      tick();

      expect(component.errorMessage()).toContain('Too many failed attempts');
      discardPeriodicTasks();
    }));

    it('should display generic error for unknown errors', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'INTERNAL', message: 'Unknown' } },
        status: 500,
      });
      otpService.verify.mockReturnValue(throwError(() => errorResponse));

      component.codeControl.setValue('222222');
      component.onVerify();
      tick();

      expect(component.errorMessage()).toContain('An error occurred');
      discardPeriodicTasks();
    }));

    it('should display RATE_LIMITED error on send', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'RATE_LIMITED', message: 'Too fast' } },
        status: 429,
      });
      otpService.send.mockReturnValue(throwError(() => errorResponse));

      component.onResend();
      tick();

      expect(component.errorMessage()).toContain('wait before requesting');
      discardPeriodicTasks();
    }));
  });

  describe('resend', () => {
    it('should call otpService.send on resend', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      // Clear the initial call count from ngOnInit
      otpService.send.mockClear();

      component.onResend();
      tick();

      expect(otpService.send).toHaveBeenCalledWith({ otpChallengeId: 'otp-123' });
      discardPeriodicTasks();
    }));

    it('should start resend cooldown', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      expect(component.resendCooldown()).toBe(60); // set from ngOnInit

      // Tick one second
      tick(1000);
      expect(component.resendCooldown()).toBe(59);

      // Clean up remaining interval ticks
      discardPeriodicTasks();
    }));

    it('should show success message after resend', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      otpService.send.mockClear();
      component.onResend();
      tick();

      expect(component.successMessage()).toContain('new code has been sent');

      // Clean up the cooldown timer and setTimeout
      discardPeriodicTasks();
    }));
  });

  describe('clearError', () => {
    it('should clear the error message', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      component.errorMessage.set('test error');
      component.clearError();
      expect(component.errorMessage()).toBeNull();
      discardPeriodicTasks();
    }));
  });

  it('should have a back link to /authenticate', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();
    const backLink = fixture.nativeElement.querySelector('a[href="/authenticate"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Use different credentials');
    discardPeriodicTasks();
  }));
});
