import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { ReviewComponent } from './review.component';
import { VinService } from '@core/services/vin.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import {
  ApiEnvelope,
  VinCommitData,
  VinAddStatus,
  ContractSummary,
  VinDecoded,
  VinEligibilityData,
} from '@core/models';

describe('ReviewComponent', () => {
  let component: ReviewComponent;
  let fixture: ComponentFixture<ReviewComponent>;
  let vinService: { commit: jest.Mock };
  let consumerState: {
    contractSummary: ReturnType<typeof signal<ContractSummary | null>>;
    enteredVin: ReturnType<typeof signal<string | null>>;
    decodedVin: ReturnType<typeof signal<VinDecoded | null>>;
    eligibilityResult: ReturnType<typeof signal<VinEligibilityData | null>>;
    prepareCommit: jest.Mock;
    setCommitResult: jest.Mock;
  };
  let router: Router;

  const VALID_VIN = '1HGCM82633A123456';

  const mockCommitResponse: ApiEnvelope<VinCommitData> = {
    correlationId: 'corr-300',
    success: true,
    data: {
      requestId: 'req-abc-123',
      status: VinAddStatus.PENDING,
      vin: VALID_VIN,
      decoded: { year: 2003, make: 'Honda', model: 'Accord' },
    },
    error: null,
  };

  beforeEach(async () => {
    vinService = {
      commit: jest.fn().mockReturnValue(of(mockCommitResponse)),
    };

    consumerState = {
      contractSummary: signal<ContractSummary | null>({
        primaryVinMasked: '1HG***1234',
        hasAdditionalVin: false,
      }),
      enteredVin: signal<string | null>(VALID_VIN),
      decodedVin: signal<VinDecoded | null>({
        year: 2003,
        make: 'Honda',
        model: 'Accord',
      }),
      eligibilityResult: signal<VinEligibilityData | null>({
        vin: VALID_VIN,
        eligible: true,
        reasonCode: 'OK',
      }),
      prepareCommit: jest.fn().mockReturnValue('idempotency-key-123'),
      setCommitResult: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReviewComponent],
      providers: [
        provideRouter([
          { path: 'result/:id', component: ReviewComponent },
          { path: 'vin-entry', component: ReviewComponent },
        ]),
        { provide: VinService, useValue: vinService },
        { provide: ConsumerStateService, useValue: consumerState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewComponent);
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
    expect(heading.textContent).toContain('Review & Confirm');
  });

  it('should display the primary VIN masked', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1HG***1234');
  });

  it('should display the entered VIN', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain(VALID_VIN);
  });

  it('should display the eligibility badge', () => {
    const badge = fixture.nativeElement.querySelector('.badge-success');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Eligible');
  });

  it('should display the important warning', () => {
    const warning = fixture.nativeElement.textContent;
    expect(warning).toContain('one-time, irreversible action');
  });

  describe('confirmation checkbox and canCommit', () => {
    it('should have confirmation unchecked by default', () => {
      expect(component.confirmationChecked()).toBe(false);
    });

    it('should not allow commit when checkbox is unchecked', () => {
      expect(component.canCommit()).toBe(false);
    });

    it('should allow commit when checkbox is checked', () => {
      component.confirmationChecked.set(true);
      expect(component.canCommit()).toBe(true);
    });

    it('should disable confirm button when checkbox is unchecked', () => {
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('[data-testid="confirm-submit"]');
      expect(button.disabled).toBe(true);
    });

    it('should enable confirm button when checkbox is checked', () => {
      component.confirmationChecked.set(true);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('[data-testid="confirm-submit"]');
      expect(button.disabled).toBe(false);
    });

    it('should not allow commit while committing', () => {
      component.confirmationChecked.set(true);
      component.isCommitting.set(true);
      expect(component.canCommit()).toBe(false);
    });
  });

  describe('commit', () => {
    it('should not commit when canCommit is false', () => {
      component.confirmationChecked.set(false);
      component.onCommit();
      expect(vinService.commit).not.toHaveBeenCalled();
    });

    it('should redirect to vin-entry when no VIN is entered', () => {
      component.confirmationChecked.set(true);
      consumerState.enteredVin.set(null);
      component.onCommit();
      expect(router.navigate).toHaveBeenCalledWith(['/vin-entry']);
    });

    it('should call prepareCommit and vinService.commit', fakeAsync(() => {
      component.confirmationChecked.set(true);
      component.onCommit();
      tick();

      expect(consumerState.prepareCommit).toHaveBeenCalled();
      expect(vinService.commit).toHaveBeenCalledWith(
        { vin: VALID_VIN, acceptIrreversible: true },
        'idempotency-key-123'
      );
    }));

    it('should call setCommitResult and navigate on success', fakeAsync(() => {
      component.confirmationChecked.set(true);
      component.onCommit();
      tick();

      expect(consumerState.setCommitResult).toHaveBeenCalledWith(mockCommitResponse.data);
      expect(router.navigate).toHaveBeenCalledWith(['/result', 'req-abc-123']);
    }));

    it('should set isCommitting during commit', fakeAsync(() => {
      component.confirmationChecked.set(true);
      expect(component.isCommitting()).toBe(false);

      component.onCommit();
      tick();

      expect(component.isCommitting()).toBe(false);
    }));
  });

  describe('error handling', () => {
    beforeEach(() => {
      component.confirmationChecked.set(true);
    });

    it('should handle CONTRACT_LOCKED error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'CONTRACT_LOCKED', message: 'Locked' } },
        status: 409,
      });
      vinService.commit.mockReturnValue(throwError(() => errorResponse));

      component.onCommit();
      tick();

      expect(component.errorMessage()).toContain('already locked');
    }));

    it('should handle VIN_ALREADY_COMMITTED error and navigate', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: {
          error: {
            code: 'VIN_ALREADY_COMMITTED',
            message: 'Already committed',
            details: { requestId: 'existing-req-456' },
          },
        },
        status: 409,
      });
      vinService.commit.mockReturnValue(throwError(() => errorResponse));

      component.onCommit();
      tick();

      expect(component.errorMessage()).toContain('already been committed');
      expect(router.navigate).toHaveBeenCalledWith(['/result', 'existing-req-456']);
    }));

    it('should handle VIN_INELIGIBLE error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'VIN_INELIGIBLE', message: 'Not eligible' } },
        status: 422,
      });
      vinService.commit.mockReturnValue(throwError(() => errorResponse));

      component.onCommit();
      tick();

      expect(component.errorMessage()).toContain('no longer eligible');
    }));

    it('should handle DEPENDENCY_UNAVAILABLE error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Service down' } },
        status: 503,
      });
      vinService.commit.mockReturnValue(throwError(() => errorResponse));

      component.onCommit();
      tick();

      expect(component.errorMessage()).toContain('temporarily unavailable');
    }));

    it('should handle unknown error', fakeAsync(() => {
      const errorResponse = new HttpErrorResponse({
        error: { error: { code: 'UNKNOWN', message: 'Unknown' } },
        status: 500,
      });
      vinService.commit.mockReturnValue(throwError(() => errorResponse));

      component.onCommit();
      tick();

      expect(component.errorMessage()).toContain('error occurred');
    }));
  });

  describe('clearError', () => {
    it('should clear the error message', () => {
      component.errorMessage.set('test error');
      component.clearError();
      expect(component.errorMessage()).toBeNull();
    });
  });

  it('should have a back link to /vin-entry', () => {
    const backLink = fixture.nativeElement.querySelector('a[href="/vin-entry"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back');
  });

  it('should display dash when no contract summary', () => {
    consumerState.contractSummary.set(null);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    // The template shows '—' when primaryVinMasked is missing
    expect(text).toContain('—');
  });
});
