import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ContractService } from '@core/services/contract.service';
import { SessionService } from '@core/services/session.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { zipValidator } from '@shared/validators';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
} from '@shared/components';
import type { StepConfig } from '@shared/components';
import { AuthenticateContractRequest } from '@core/models';

/**
 * Authenticate page - First step in the wizard
 * Collects contract credentials and authenticates the user
 */
@Component({
  selector: 'app-authenticate',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent,
    ProgressStepperComponent,
    AlertBannerComponent,
    FormFieldComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="0" />

        <div class="page-card mt-8">
          <h1 class="text-2xl font-bold text-slate-900 mb-2">Verify Your Contract</h1>
          <p class="text-slate-600 mb-6">
            Enter your contract details exactly as they appear on your warranty documents.
          </p>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            <app-form-field
              label="Contract Number"
              hint="Found on your warranty certificate"
              [control]="form.controls.contractNumber"
              [required]="true"
            >
              <input
                type="text"
                formControlName="contractNumber"
                class="form-input"
                [class.form-input-error]="form.controls.contractNumber.invalid && form.controls.contractNumber.touched"
                autocomplete="off"
                placeholder="Enter your contract number"
              />
            </app-form-field>

            <app-form-field
              label="Last Name"
              [control]="form.controls.lastName"
              [required]="true"
            >
              <input
                type="text"
                formControlName="lastName"
                class="form-input"
                [class.form-input-error]="form.controls.lastName.invalid && form.controls.lastName.touched"
                autocomplete="family-name"
                placeholder="Enter your last name"
              />
            </app-form-field>

            <app-form-field
              label="ZIP Code"
              hint="5-digit or 5+4 format"
              [control]="form.controls.zip"
              [required]="true"
            >
              <input
                type="text"
                formControlName="zip"
                class="form-input"
                [class.form-input-error]="form.controls.zip.invalid && form.controls.zip.touched"
                autocomplete="postal-code"
                inputmode="numeric"
                maxlength="10"
                placeholder="30301"
              />
            </app-form-field>

            <div class="pt-4">
              <button
                type="submit"
                class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="form.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                } @else {
                  Continue
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              </button>
            </div>
          </form>

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/" class="text-primary-600 hover:underline">← Back to home</a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class AuthenticateComponent {
  private readonly contractService = inject(ContractService);
  private readonly sessionService = inject(SessionService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Authenticate' },
    { id: 'vin', label: 'VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    contractNumber: new FormControl('', [Validators.required, Validators.minLength(6)]),
    lastName: new FormControl('', [Validators.required]),
    zip: new FormControl('', [Validators.required, zipValidator()]),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request: AuthenticateContractRequest = {
      contractNumber: this.form.value.contractNumber!.trim(),
      lastName: this.form.value.lastName!.trim().toUpperCase(),
      zip: this.form.value.zip!.trim(),
    };

    this.contractService.authenticate(request).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.success && response.data) {
          // Store session
          this.sessionService.setSession(response.data);

          // Update consumer state
          this.consumerState.setAuthResult(
            response.data.contractContextId,
            response.data.contractSummary,
            response.data.otp
          );

          // Navigate based on OTP status
          if (response.data.otp.status === 'REQUIRED') {
            this.router.navigate(['/verify-otp']);
          } else {
            // Check for redirect URL
            const redirectUrl = this.sessionService.consumeRedirectUrl();
            this.router.navigate([redirectUrl || '/vin-entry']);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.handleError(err);
      },
    });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    switch (apiError?.code) {
      case 'AUTH_NO_MATCH':
        this.errorMessage.set(
          "We couldn't find an exact match. Please verify your details and try again."
        );
        break;
      case 'AUTH_OTP_REQUIRED':
        // OTP required - set up state and navigate
        if (apiError.details) {
          this.consumerState.setOtpRequired({
            contractContextId: apiError.details.contractContextId as string,
            otpChallengeId: apiError.details.otpChallengeId as string,
            maskedDestination: apiError.details.maskedDestination as string,
            channel: apiError.details.channel as 'sms' | 'email',
          });
          this.router.navigate(['/verify-otp']);
        }
        break;
      case 'RATE_LIMITED':
        const seconds = (apiError.details?.retryAfterSeconds as number) || 60;
        this.errorMessage.set(`Too many attempts. Please wait ${seconds} seconds and try again.`);
        break;
      case 'CONTRACT_LOCKED':
        this.errorMessage.set(
          'This contract already has an additional vehicle registered. Contact support for assistance.'
        );
        break;
      default:
        this.errorMessage.set(
          'An unexpected error occurred. Please try again or contact support.'
        );
    }
  }
}

