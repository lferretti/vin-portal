import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ContractService } from '@core/services/contract.service';
import { SessionService } from '@core/services/session.service';
import { RumService } from '@core/services';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { vinValidator, normalizeVin, zipValidator } from '@shared/validators';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
} from '@shared/components';
import type { StepConfig } from '@shared/components';
import { AuthenticateContractRequest } from '@core/models';

/**
 * Vehicle Lookup page - First step in the wizard
 * Collects VIN and personal details, authenticates the user
 */
@Component({
  selector: 'app-authenticate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
          <h1 class="mb-2 text-2xl font-bold text-slate-900">Vehicle Lookup</h1>
          <p class="mb-6 text-slate-600">
            Enter your vehicle and personal details to find your warranty contract.
          </p>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" data-testid="auth-error" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" data-testid="auth-form" class="space-y-5">
            <app-form-field
              label="VIN (last 7 characters or full VIN)"
              hint="Found on your dashboard or driver's door frame"
              [control]="form.controls.vin"
              [required]="true"
            >
              <input
                type="text"
                formControlName="vin"
                class="form-input uppercase placeholder:normal-case"
                [class.form-input-error]="form.controls.vin.invalid && form.controls.vin.touched"
                (input)="onVinInput($event)"
                autocomplete="off"
                maxlength="17"
                placeholder="Enter at least the last 7 characters"
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
                class="bg-primary-600 hover:bg-primary-700 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="form.invalid || isLoading() || rateLimitCooldown() > 0"
              >
                @if (isLoading()) {
                  <div class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Verifying...
                } @else if (rateLimitCooldown() > 0) {
                  Wait {{ rateLimitCooldown() }}s
                } @else {
                  Continue
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              </button>
            </div>
          </form>

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/" class="text-primary-600 hover:underline">&larr; Back to home</a>
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly rumService = inject(RumService);

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Verify Contract Details' },
    { id: 'vin', label: 'Second VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Summary' },
  ];

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly rateLimitCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly form = new FormGroup({
    vin: new FormControl('', [Validators.required, vinValidator()]),
    lastName: new FormControl('', [Validators.required]),
    zip: new FormControl('', [Validators.required, zipValidator()]),
  });

  onVinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    this.form.controls.vin.setValue(input.value, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.rumService.addAction('auth_form_submit');

    const fullVin = normalizeVin(this.form.value.vin!);
    const vin7 = fullVin.slice(-7);

    const request: AuthenticateContractRequest = {
      vin7,
      lastName: this.form.value.lastName!.trim().toUpperCase(),
      zip: this.form.value.zip!.trim(),
    };

    this.contractService.authenticate(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.success && response.data) {
          this.rumService.addAction('auth_success', { otpRequired: response.data.otp.status === 'REQUIRED' });

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
    this.rumService.addAction('auth_error', { code: apiError?.code });

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
      case 'RATE_LIMITED': {
        const retryAfter = (err as HttpErrorResponse & { retryAfterSeconds?: number }).retryAfterSeconds;
        const seconds = retryAfter ?? (apiError.details?.retryAfterSeconds as number) ?? 60;
        this.startCooldown(seconds);
        this.errorMessage.set(`Too many attempts. Please wait ${seconds} seconds and try again.`);
        break;
      }
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

  private startCooldown(seconds: number): void {
    this.rateLimitCooldown.set(seconds);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.rateLimitCooldown.update(c => c - 1);
      if (this.rateLimitCooldown() <= 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }
}
