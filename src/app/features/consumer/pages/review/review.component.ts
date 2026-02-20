import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { VinService } from '@core/services/vin.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  VinDisplayComponent,
  ConfirmationCheckboxComponent,
  StepConfig,
} from '@shared/components';

/**
 * Review page - Final confirmation before irreversible commit
 */
@Component({
  selector: 'app-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    HeaderComponent,
    ProgressStepperComponent,
    AlertBannerComponent,
    VinDisplayComponent,
    ConfirmationCheckboxComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="2" />

        <div class="page-card mt-8">
          <h1 class="mb-2 text-2xl font-bold text-slate-900">Review & Confirm</h1>
          <p class="mb-6 text-slate-600">
            Please review the details below carefully. This action cannot be undone.
          </p>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          <!-- Summary Card -->
          <div class="mb-6 space-y-6 rounded-xl bg-slate-50 p-6">
            <!-- Contract Summary -->
            <div>
              <h3 class="mb-3 text-sm font-medium tracking-wide text-slate-500 uppercase">
                Your Contract
              </h3>
              <div class="detail-list">
                <div>
                  <dt>Primary Vehicle</dt>
                  <dd class="mono">{{ contractSummary()?.primaryVinMasked || '—' }}</dd>
                </div>
              </div>
            </div>

            <hr class="border-slate-200" />

            <!-- Vehicle to Add -->
            <div>
              <h3 class="mb-3 text-sm font-medium tracking-wide text-slate-500 uppercase">
                Vehicle to Add
              </h3>
              <div class="mb-3">
                <span class="text-xs text-slate-500">VIN</span>
                <p class="mono text-lg font-semibold text-slate-900">{{ enteredVin() }}</p>
              </div>
              @if (decodedVin()) {
                <app-vin-display [decoded]="decodedVin()!" />
              }
            </div>

            <hr class="border-slate-200" />

            <!-- Eligibility Status -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium tracking-wide text-slate-500 uppercase">
                Eligibility
              </span>
              <span class="badge-success">✓ Eligible</span>
            </div>
          </div>

          <!-- Warning Box -->
          <div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div class="flex gap-3">
              <svg
                class="h-6 w-6 flex-shrink-0 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 class="font-semibold text-amber-800">Important</h4>
                <p class="mt-1 text-sm text-amber-700">
                  Adding this vehicle to your contract is a <strong>one-time, irreversible action</strong>.
                  Once confirmed, you will not be able to change or remove this vehicle.
                </p>
              </div>
            </div>
          </div>

          <!-- Confirmation Checkbox -->
          <app-confirmation-checkbox
            label="I understand this change is one-time and cannot be reversed."
            [(checked)]="confirmationChecked"
          />

          <!-- Action Buttons -->
          <div class="mt-8 flex gap-3">
            <a
              routerLink="/vin-entry"
              class="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              [class.pointer-events-none]="isCommitting()"
              [class.opacity-50]="isCommitting()"
            >
              ← Back
            </a>
            <button
              type="button"
              (click)="onCommit()"
              data-testid="confirm-submit"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="!canCommit()"
            >
              @if (isCommitting()) {
                <div class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                Confirming...
              } @else {
                Confirm & Add Vehicle
              }
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class ReviewComponent {
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Authenticate' },
    { id: 'vin', label: 'VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  readonly isCommitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmationChecked = signal(false);

  readonly contractSummary = this.consumerState.contractSummary;
  readonly enteredVin = this.consumerState.enteredVin;
  readonly decodedVin = this.consumerState.decodedVin;

  readonly canCommit = computed(() => {
    return this.confirmationChecked() && !this.isCommitting();
  });

  clearError(): void {
    this.errorMessage.set(null);
  }

  onCommit(): void {
    if (!this.canCommit()) return;

    const vin = this.enteredVin();
    if (!vin) {
      this.router.navigate(['/vin-entry']);
      return;
    }

    // Get or create stable idempotency key
    const idempotencyKey = this.consumerState.prepareCommit();

    this.isCommitting.set(true);
    this.errorMessage.set(null);

    this.vinService
      .commit({ vin, acceptIrreversible: true }, idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isCommitting.set(false);

          if (response.success && response.data) {
            this.consumerState.setCommitResult(response.data);
            this.router.navigate(['/result', response.data.requestId]);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isCommitting.set(false);
          this.handleError(err);
        },
      });
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    switch (apiError?.code) {
      case 'CONTRACT_LOCKED':
        this.errorMessage.set(
          'This contract is already locked. It may have been updated in another session.'
        );
        break;
      case 'VIN_ALREADY_COMMITTED':
        this.errorMessage.set('This vehicle has already been committed to your contract.');
        // Navigate to result if we have a request ID
        if (apiError.details?.requestId) {
          this.router.navigate(['/result', apiError.details.requestId]);
        }
        break;
      case 'VIN_INELIGIBLE':
        this.errorMessage.set(
          'This vehicle is no longer eligible. Please go back and try a different VIN.'
        );
        break;
      case 'DEPENDENCY_UNAVAILABLE':
        this.errorMessage.set(
          'Service temporarily unavailable. Your request may be processed shortly. Please wait or try again.'
        );
        break;
      default:
        this.errorMessage.set('An error occurred. Please try again or contact support.');
    }
  }
}

