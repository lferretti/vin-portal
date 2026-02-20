import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { VinEntryComponent } from './vin-entry.component';
import { VinService } from '@core/services/vin.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { ApiEnvelope, VinDecodeData, VinEligibilityData, VinDecoded } from '@core/models';

describe('VinEntryComponent', () => {
  let component: VinEntryComponent;
  let fixture: ComponentFixture<VinEntryComponent>;
  let vinService: { decode: jest.Mock; checkEligibility: jest.Mock };
  let consumerState: {
    decodedVin: ReturnType<typeof signal<VinDecoded | null>>;
    eligibilityResult: ReturnType<typeof signal<VinEligibilityData | null>>;
    enteredVin: ReturnType<typeof signal<string | null>>;
    clearVinState: jest.Mock;
    setVinDecode: jest.Mock;
    setEligibility: jest.Mock;
  };
  let router: Router;

  const VALID_VIN = '1HGCM82633A123456';

  const mockDecodeResponse: ApiEnvelope<VinDecodeData> = {
    correlationId: 'corr-100',
    success: true,
    data: {
      vin: VALID_VIN,
      decoded: { year: 2003, make: 'Honda', model: 'Accord' },
    },
    error: null,
  };

  const mockEligibilityResponse: ApiEnvelope<VinEligibilityData> = {
    correlationId: 'corr-101',
    success: true,
    data: {
      vin: VALID_VIN,
      eligible: true,
      reasonCode: 'OK',
    },
    error: null,
  };

  beforeEach(async () => {
    vinService = {
      decode: jest.fn().mockReturnValue(of(mockDecodeResponse)),
      checkEligibility: jest.fn().mockReturnValue(of(mockEligibilityResponse)),
    };

    consumerState = {
      decodedVin: signal<VinDecoded | null>(null),
      eligibilityResult: signal<VinEligibilityData | null>(null),
      enteredVin: signal<string | null>(null),
      clearVinState: jest.fn(),
      setVinDecode: jest.fn(),
      setEligibility: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VinEntryComponent],
      providers: [
        provideRouter([
          { path: 'review', component: VinEntryComponent },
          { path: 'authenticate', component: VinEntryComponent },
        ]),
        { provide: VinService, useValue: vinService },
        { provide: ConsumerStateService, useValue: consumerState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VinEntryComponent);
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
    expect(heading.textContent).toContain('Enter Vehicle VIN');
  });

  it('should render the VIN input field', () => {
    const input = fixture.nativeElement.querySelector('[data-testid="vin-input"]');
    expect(input).toBeTruthy();
    expect(input.getAttribute('maxlength')).toBe('17');
  });

  it('should have the Continue button disabled initially', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  describe('VIN validation', () => {
    it('should mark VIN as invalid when empty', () => {
      component.vinControl.setValue('');
      component.vinControl.markAsTouched();
      expect(component.vinControl.invalid).toBe(true);
    });

    it('should mark VIN as invalid when fewer than 7 characters', () => {
      component.vinControl.setValue('1HGCM');
      component.vinControl.markAsTouched();
      expect(component.vinControl.invalid).toBe(true);
    });

    it('should mark VIN as invalid when it contains I, O, or Q', () => {
      component.vinControl.setValue('1HGCM82633I12345');
      component.vinControl.markAsTouched();
      expect(component.vinControl.invalid).toBe(true);
    });

    it('should mark VIN as valid for a proper 17-character VIN', () => {
      component.vinControl.setValue(VALID_VIN);
      expect(component.vinControl.valid).toBe(true);
    });
  });

  describe('VIN decode and eligibility', () => {
    it('should call decode on blur with valid 17-char VIN', fakeAsync(() => {
      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(vinService.decode).toHaveBeenCalledWith({ vin: VALID_VIN });
    }));

    it('should not call decode on blur when VIN is incomplete', () => {
      component.vinControl.setValue('1HGCM826');
      component.onVinBlur();

      expect(vinService.decode).not.toHaveBeenCalled();
    });

    it('should call checkEligibility after successful decode', fakeAsync(() => {
      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(vinService.checkEligibility).toHaveBeenCalledWith({ vin: VALID_VIN });
    }));

    it('should set decoding state during decode', fakeAsync(() => {
      component.vinControl.setValue(VALID_VIN);
      expect(component.isDecoding()).toBe(false);

      component.onVinBlur();
      // After synchronous observable completes
      tick();

      expect(component.isDecoding()).toBe(false);
      expect(consumerState.setVinDecode).toHaveBeenCalledWith(VALID_VIN, {
        year: 2003,
        make: 'Honda',
        model: 'Accord',
      });
    }));

    it('should call setEligibility on successful eligibility check', fakeAsync(() => {
      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(consumerState.setEligibility).toHaveBeenCalledWith(mockEligibilityResponse.data);
    }));
  });

  describe('onContinue', () => {
    it('should navigate to /review when eligible', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: true,
        reasonCode: 'OK',
      });
      fixture.detectChanges();

      component.onContinue();

      expect(router.navigate).toHaveBeenCalledWith(['/review']);
    });

    it('should not navigate when not eligible', () => {
      consumerState.eligibilityResult.set(null);
      fixture.detectChanges();

      component.onContinue();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('canContinue computed signal', () => {
    it('should be false when eligibility result is null', () => {
      consumerState.eligibilityResult.set(null);
      expect(component.canContinue()).toBe(false);
    });

    it('should be false when not eligible', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: false,
        reasonCode: 'CLASS_TOO_HIGH',
      });
      expect(component.canContinue()).toBe(false);
    });

    it('should be true when eligible and not loading', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: true,
        reasonCode: 'OK',
      });
      expect(component.canContinue()).toBe(true);
    });
  });

  describe('eligibilityMessage computed signal', () => {
    it('should return empty string when no eligibility result', () => {
      consumerState.eligibilityResult.set(null);
      expect(component.eligibilityMessage()).toBe('');
    });

    it('should return empty string when eligible', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: true,
        reasonCode: 'OK',
      });
      expect(component.eligibilityMessage()).toBe('');
    });

    it('should return correct message for CLASS_TOO_HIGH', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: false,
        reasonCode: 'CLASS_TOO_HIGH',
      });
      expect(component.eligibilityMessage()).toContain('vehicle class exceeds');
    });

    it('should return correct message for VIN_ALREADY_USED', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: false,
        reasonCode: 'VIN_ALREADY_USED',
      });
      expect(component.eligibilityMessage()).toContain('already associated');
    });

    it('should return fallback message for unknown reason code', () => {
      consumerState.eligibilityResult.set({
        vin: VALID_VIN,
        eligible: false,
        reasonCode: 'SOME_UNKNOWN_CODE',
      });
      expect(component.eligibilityMessage()).toContain('not eligible');
    });
  });

  describe('error handling', () => {
    it('should display error on VIN_INVALID_FORMAT', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'VIN_INVALID_FORMAT', message: 'Invalid' } },
        status: 400,
      });
      vinService.decode.mockReturnValue(throwError(() => errorResponse));

      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(component.errorMessage()).toContain('Invalid VIN format');
    }));

    it('should display error on VIN_DECODE_FAILED', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'VIN_DECODE_FAILED', message: 'Decode failed' } },
        status: 422,
      });
      vinService.decode.mockReturnValue(throwError(() => errorResponse));

      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(component.errorMessage()).toContain('Unable to decode');
    }));

    it('should display error on DEPENDENCY_UNAVAILABLE', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Service down' } },
        status: 503,
      });
      vinService.decode.mockReturnValue(throwError(() => errorResponse));

      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(component.errorMessage()).toContain('temporarily unavailable');
    }));

    it('should handle generic error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'UNKNOWN', message: 'Something' } },
        status: 500,
      });
      vinService.decode.mockReturnValue(throwError(() => errorResponse));

      component.vinControl.setValue(VALID_VIN);
      component.onVinBlur();
      tick();

      expect(component.errorMessage()).toContain('An error occurred');
    }));
  });

  describe('clearMessages', () => {
    it('should clear the error message', () => {
      component.errorMessage.set('some error');
      component.clearMessages();
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('onVinInput', () => {
    it('should clear previous VIN state when user modifies input', () => {
      consumerState.decodedVin.set({ year: 2003, make: 'Honda', model: 'Accord' });
      const event = {
        target: { value: '1HGCM82633A12345' },
      } as unknown as Event;

      component.onVinInput(event);

      expect(consumerState.clearVinState).toHaveBeenCalled();
    });
  });
});
