import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AuthenticateComponent } from './authenticate.component';
import { ContractService } from '@core/services/contract.service';
import { SessionService } from '@core/services/session.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { ApiEnvelope, AuthenticateSuccessData } from '@core/models';

describe('AuthenticateComponent', () => {
  let component: AuthenticateComponent;
  let fixture: ComponentFixture<AuthenticateComponent>;
  let contractService: { authenticate: jest.Mock };
  let sessionService: { setSession: jest.Mock; consumeRedirectUrl: jest.Mock };
  let consumerState: { setAuthResult: jest.Mock; setOtpRequired: jest.Mock };
  let router: Router;

  const mockSuccessResponse: ApiEnvelope<AuthenticateSuccessData> = {
    correlationId: 'corr-123',
    success: true,
    data: {
      contractContextId: 'ctx-123',
      sessionToken: 'token-abc',
      sessionExpiresAt: '2026-12-31T00:00:00Z',
      otp: { status: 'NOT_REQUIRED', otpChallengeId: null, maskedDestination: null, channel: null },
      contractSummary: { primaryVinMasked: '1HG***1234', hasAdditionalVin: false },
    },
    error: null,
  };

  const mockOtpRequiredResponse: ApiEnvelope<AuthenticateSuccessData> = {
    correlationId: 'corr-456',
    success: true,
    data: {
      contractContextId: 'ctx-456',
      sessionToken: 'token-def',
      sessionExpiresAt: '2026-12-31T00:00:00Z',
      otp: { status: 'REQUIRED', otpChallengeId: 'otp-789', maskedDestination: '***-***-1234', channel: 'sms' },
    },
    error: null,
  };

  beforeEach(async () => {
    contractService = { authenticate: jest.fn() };
    sessionService = { setSession: jest.fn(), consumeRedirectUrl: jest.fn().mockReturnValue(null) };
    consumerState = { setAuthResult: jest.fn(), setOtpRequired: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AuthenticateComponent],
      providers: [
        provideRouter([
          { path: 'vin-entry', component: AuthenticateComponent },
          { path: 'verify-otp', component: AuthenticateComponent },
        ]),
        { provide: ContractService, useValue: contractService },
        { provide: SessionService, useValue: sessionService },
        { provide: ConsumerStateService, useValue: consumerState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthenticateComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Vehicle Lookup');
  });

  it('should render the authentication form with three fields', () => {
    const form = fixture.nativeElement.querySelector('[data-testid="auth-form"]');
    expect(form).toBeTruthy();

    const inputs = form.querySelectorAll('input');
    expect(inputs.length).toBe(3);
  });

  it('should have submit button disabled when form is empty', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('should enable submit button when form is valid', () => {
    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(false);
  });

  it('should mark VIN as invalid when fewer than 7 characters', () => {
    component.form.controls.vin.setValue('ABC12');
    component.form.controls.vin.markAsTouched();
    expect(component.form.controls.vin.invalid).toBe(true);
  });

  it('should accept a 7-character VIN', () => {
    component.form.controls.vin.setValue('1234567');
    component.form.controls.vin.markAsTouched();
    expect(component.form.controls.vin.valid).toBe(true);
  });

  it('should mark zip as invalid for incorrect format', () => {
    component.form.controls.zip.setValue('abc');
    component.form.controls.zip.markAsTouched();
    expect(component.form.controls.zip.invalid).toBe(true);
  });

  it('should not submit if the form is invalid', () => {
    component.onSubmit();
    expect(contractService.authenticate).not.toHaveBeenCalled();
  });

  it('should call contractService.authenticate on valid form submit', fakeAsync(() => {
    contractService.authenticate.mockReturnValue(of(mockSuccessResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('Smith');
    component.form.controls.zip.setValue('30301');

    component.onSubmit();
    tick();

    expect(contractService.authenticate).toHaveBeenCalledWith({
      vin7: '1234567',
      lastName: 'SMITH',
      zip: '30301',
    });
  }));

  it('should set loading state during submission', fakeAsync(() => {
    contractService.authenticate.mockReturnValue(of(mockSuccessResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');

    expect(component.isLoading()).toBe(false);
    component.onSubmit();

    // After the synchronous observable completes, loading is back to false
    tick();
    expect(component.isLoading()).toBe(false);
  }));

  it('should navigate to /vin-entry on successful auth without OTP', fakeAsync(() => {
    contractService.authenticate.mockReturnValue(of(mockSuccessResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    component.onSubmit();
    tick();

    expect(sessionService.setSession).toHaveBeenCalledWith(mockSuccessResponse.data);
    expect(consumerState.setAuthResult).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/vin-entry']);
  }));

  it('should navigate to /verify-otp when OTP is required', fakeAsync(() => {
    contractService.authenticate.mockReturnValue(of(mockOtpRequiredResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW7654321');
    component.form.controls.lastName.setValue('JONES');
    component.form.controls.zip.setValue('10001');
    component.onSubmit();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/verify-otp']);
  }));

  it('should use redirect URL from session service when available', fakeAsync(() => {
    sessionService.consumeRedirectUrl.mockReturnValue('/vin-entry');
    contractService.authenticate.mockReturnValue(of(mockSuccessResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    component.onSubmit();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/vin-entry']);
  }));

  it('should display AUTH_NO_MATCH error message', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { error: { code: 'AUTH_NO_MATCH', message: 'No match' } },
      status: 404,
    });
    contractService.authenticate.mockReturnValue(throwError(() => errorResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW9999999');
    component.form.controls.lastName.setValue('DOE');
    component.form.controls.zip.setValue('00000');
    component.onSubmit();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain("couldn't find an exact match");
    const errorBanner = fixture.nativeElement.querySelector('[data-testid="auth-error"]');
    expect(errorBanner).toBeTruthy();
  }));

  it('should handle RATE_LIMITED error with retry seconds', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { error: { code: 'RATE_LIMITED', message: 'Rate limited', details: { retryAfterSeconds: 30 } } },
      status: 429,
    });
    contractService.authenticate.mockReturnValue(throwError(() => errorResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    component.onSubmit();
    tick();

    expect(component.errorMessage()).toContain('30 seconds');
  }));

  it('should handle CONTRACT_LOCKED error', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { error: { code: 'CONTRACT_LOCKED', message: 'Locked' } },
      status: 409,
    });
    contractService.authenticate.mockReturnValue(throwError(() => errorResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    component.onSubmit();
    tick();

    expect(component.errorMessage()).toContain('already has an additional vehicle');
  }));

  it('should handle AUTH_OTP_REQUIRED error and navigate to verify-otp', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: {
        error: {
          code: 'AUTH_OTP_REQUIRED',
          message: 'OTP required',
          details: {
            contractContextId: 'ctx-789',
            otpChallengeId: 'otp-abc',
            maskedDestination: '***-***-5678',
            channel: 'sms',
          },
        },
      },
      status: 403,
    });
    contractService.authenticate.mockReturnValue(throwError(() => errorResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW7654321');
    component.form.controls.lastName.setValue('JONES');
    component.form.controls.zip.setValue('10001');
    component.onSubmit();
    tick();

    expect(consumerState.setOtpRequired).toHaveBeenCalledWith({
      contractContextId: 'ctx-789',
      otpChallengeId: 'otp-abc',
      maskedDestination: '***-***-5678',
      channel: 'sms',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/verify-otp']);
  }));

  it('should handle unknown error with generic message', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { error: { code: 'UNKNOWN', message: 'Something failed' } },
      status: 500,
    });
    contractService.authenticate.mockReturnValue(throwError(() => errorResponse));

    component.form.controls.vin.setValue('WVWZZZ3CZW1234567');
    component.form.controls.lastName.setValue('SMITH');
    component.form.controls.zip.setValue('30301');
    component.onSubmit();
    tick();

    expect(component.errorMessage()).toContain('unexpected error');
  }));

  it('should clear the error message', () => {
    component.errorMessage.set('test error');
    component.clearError();
    expect(component.errorMessage()).toBeNull();
  });
});
