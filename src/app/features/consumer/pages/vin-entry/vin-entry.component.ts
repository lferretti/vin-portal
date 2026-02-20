import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { filter, switchMap, tap } from 'rxjs';

import { VinService } from '@core/services/vin.service';
import { RumService } from '@core/services';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { vinValidator, normalizeVin } from '@shared/validators';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
  LoadingSpinnerComponent,
  VinDisplayComponent,
  StepConfig,
} from '@shared/components';

/**
 * VIN Entry page - Enter and validate the VIN to add
 */
@Component({
  selector: 'app-vin-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent,
    ProgressStepperComponent,
    AlertBannerComponent,
    FormFieldComponent,
    LoadingSpinnerComponent,
    VinDisplayComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="1" />

        <div class="page-card mt-8">
          <h1 class="mb-2 text-2xl font-bold text-slate-900">Enter Vehicle VIN</h1>
          <p class="mb-6 text-slate-600">
            Enter the 17-character Vehicle Identification Number of the vehicle you want to add.
          </p>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearMessages()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          <div class="space-y-5">
            <app-form-field
              label="Vehicle Identification Number (VIN)"
              hint="17 characters, found on your dashboard or driver's door frame"
              [control]="vinControl"
              [required]="true"
            >
              <input
                type="text"
                [formControl]="vinControl"
                data-testid="vin-input"
                class="form-input uppercase placeholder:normal-case"
                [class.form-input-error]="vinControl.invalid && vinControl.touched"
                (blur)="onVinBlur()"
                (input)="onVinInput($event)"
                autocomplete="off"
                maxlength="17"
                placeholder="1HGCM82633A123456"
              />
            </app-form-field>

            @if (isDecoding() || isCheckingEligibility()) {
              <div class="py-4">
                <app-loading-spinner 
                  [message]="isDecoding() ? 'Decoding VIN...' : 'Checking eligibility...'" 
                />
              </div>
            }

            @if (decodedVin() && !isDecoding()) {
              <div class="animate-fade-in" data-testid="vehicle-info">
                <h3 class="mb-2 text-sm font-medium text-slate-700">Vehicle Information</h3>
                <app-vin-display [decoded]="decodedVin()!" />
              </div>
            }

            @if (eligibilityResult() && !isCheckingEligibility()) {
              @if (eligibilityResult()!.eligible) {
                <app-alert-banner type="success">
                  <strong>Eligible!</strong> This vehicle can be added to your contract.
                </app-alert-banner>
              } @else {
                <app-alert-banner type="error">
                  <strong>Not Eligible:</strong> {{ eligibilityMessage() }}
                </app-alert-banner>
              }
            }
          </div>

          <div class="mt-8 flex gap-3">
            <a
              routerLink="/authenticate"
              class="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              ← Back
            </a>
            <button
              type="button"
              (click)="onContinue()"
              class="bg-primary-600 hover:bg-primary-700 inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="!canContinue()"
            >
              Continue
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class VinEntryComponent {
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rumService = inject(RumService);

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Verify Contract Details' },
    { id: 'vin', label: 'Second VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Summary' },
  ];

  readonly isDecoding = signal(false);
  readonly isCheckingEligibility = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly decodedVin = this.consumerState.decodedVin;
  readonly eligibilityResult = this.consumerState.eligibilityResult;

  readonly canContinue = computed(() => {
    return this.eligibilityResult()?.eligible === true && !this.isDecoding() && !this.isCheckingEligibility();
  });

  readonly eligibilityMessage = computed(() => {
    const result = this.eligibilityResult();
    if (!result || result.eligible) return '';

    const messages: Record<string, string> = {
      CLASS_TOO_HIGH: 'This vehicle class exceeds your contract coverage.',
      VIN_ALREADY_USED: 'This VIN is already associated with another contract.',
      CONTRACT_LOCKED: 'Your contract already has an additional vehicle.',
      INVALID_VIN: 'This VIN could not be validated.',
    };

    return messages[result.reasonCode] || 'This vehicle is not eligible for your contract.';
  });

  readonly vinControl = new FormControl('', [Validators.required, vinValidator()]);

  private lastDecodedVin = '';

  onVinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Normalize to uppercase as user types
    input.value = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    this.vinControl.setValue(input.value, { emitEvent: false });

    // Clear previous results when user modifies VIN
    if (this.decodedVin() || this.eligibilityResult()) {
      this.consumerState.clearVinState();
      this.lastDecodedVin = '';
    }
  }

  onVinBlur(): void {
    const vin = normalizeVin(this.vinControl.value || '');
    if (vin.length === 17 && this.vinControl.valid && vin !== this.lastDecodedVin) {
      this.decodeAndCheckEligibility(vin);
    }
  }

  clearMessages(): void {
    this.errorMessage.set(null);
  }

  onContinue(): void {
    if (this.canContinue()) {
      this.router.navigate(['/review']);
    }
  }

  private decodeAndCheckEligibility(vin: string): void {
    this.lastDecodedVin = vin;
    this.isDecoding.set(true);
    this.errorMessage.set(null);
    this.consumerState.clearVinState();
    this.rumService.addAction('vin_decode_submit');

    this.vinService
      .decode({ vin })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((decodeResponse) => {
          this.isDecoding.set(false);
          if (decodeResponse.success && decodeResponse.data) {
            this.consumerState.setVinDecode(vin, decodeResponse.data.decoded);
          } else {
            this.errorMessage.set('Unable to decode VIN. Please check and try again.');
          }
        }),
        filter((res) => res.success && !!res.data),
        tap(() => this.isCheckingEligibility.set(true)),
        switchMap(() => this.vinService.checkEligibility({ vin }))
      )
      .subscribe({
        next: (eligResponse) => {
          this.isCheckingEligibility.set(false);
          if (eligResponse.success && eligResponse.data) {
            this.rumService.addAction('eligibility_check', { result: eligResponse.data.eligible ? 'eligible' : 'ineligible', reasonCode: eligResponse.data.eligible ? undefined : eligResponse.data.reasonCode });
            this.consumerState.setEligibility(eligResponse.data);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isDecoding.set(false);
          this.isCheckingEligibility.set(false);
          this.handleError(err);
        },
      });
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    switch (apiError?.code) {
      case 'VIN_INVALID_FORMAT':
        this.errorMessage.set('Invalid VIN format. Please check and try again.');
        break;
      case 'VIN_DECODE_FAILED':
        this.errorMessage.set('Unable to decode this VIN. Please verify it is correct.');
        break;
      case 'VIN_INELIGIBLE':
        // Eligibility error - show in the UI
        if (apiError.details) {
          this.consumerState.setEligibility({
            vin: this.vinControl.value || '',
            eligible: false,
            reasonCode: apiError.details.reasonCode as string || 'UNKNOWN',
          });
        }
        break;
      case 'DEPENDENCY_UNAVAILABLE':
        this.errorMessage.set(
          'Service temporarily unavailable. Please try again in a moment.'
        );
        break;
      default:
        this.errorMessage.set('An error occurred. Please try again.');
    }
  }
}

