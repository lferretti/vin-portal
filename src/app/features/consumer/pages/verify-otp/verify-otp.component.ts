import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { OtpService } from '@core/services/otp.service';
import { SessionService } from '@core/services/session.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
} from '@shared/components';
import type { StepConfig } from '@shared/components';

/**
 * OTP Verification page - Conditional step for high-risk authentication
 */
@Component({
  selector: 'app-verify-otp',
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
          <div class="text-center mb-6">
            <div
              class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
            >
              <svg
                class="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 mb-2">Verify Your Identity</h1>
            <p class="text-slate-600">
              We've sent a verification code to
              <span class="font-medium">{{ maskedDestination() }}</span>
            </p>
          </div>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          @if (successMessage()) {
            <app-alert-banner type="success" class="mb-6">
              {{ successMessage() }}
            </app-alert-banner>
          }

          <form (ngSubmit)="onVerify()" class="space-y-5">
            <app-form-field
              label="Verification Code"
              hint="Enter the 6-digit code"
              [control]="codeControl"
              [required]="true"
            >
              <input
                type="text"
                [formControl]="codeControl"
                class="form-input text-center text-2xl tracking-widest font-mono"
                [class.form-input-error]="codeControl.invalid && codeControl.touched"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
              />
            </app-form-field>

            <div class="pt-2">
              <button
                type="submit"
                class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="codeControl.invalid || isVerifying()"
              >
                @if (isVerifying()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                } @else {
                  Verify Code
                }
              </button>
            </div>
          </form>

          <div class="mt-6 text-center">
            <p class="text-sm text-slate-600 mb-2">Didn't receive a code?</p>
            <button
              type="button"
              (click)="onResend()"
              class="text-primary-600 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="resendCooldown() > 0 || isSending()"
            >
              @if (isSending()) {
                Sending...
              } @else if (resendCooldown() > 0) {
                Resend in {{ resendCooldown() }}s
              } @else {
                Resend Code
              }
            </button>
          </div>

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/authenticate" class="text-primary-600 hover:underline">
              ← Use different credentials
            </a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private readonly otpService = inject(OtpService);
  private readonly sessionService = inject(SessionService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);

  private resendInterval: ReturnType<typeof setInterval> | null = null;

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Authenticate' },
    { id: 'vin', label: 'VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  readonly isVerifying = signal(false);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly resendCooldown = signal(0);

  readonly maskedDestination = this.consumerState.otpMaskedDestination;

  readonly codeControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  ngOnInit(): void {
    // Auto-send OTP on page load
    this.sendOtp();
  }

  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  onResend(): void {
    this.sendOtp();
  }

  onVerify(): void {
    if (this.codeControl.invalid) {
      this.codeControl.markAsTouched();
      return;
    }

    const challengeId = this.consumerState.otpChallengeId();
    if (!challengeId) {
      this.router.navigate(['/authenticate']);
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    this.otpService
      .verify({
        otpChallengeId: challengeId,
        code: this.codeControl.value!,
      })
      .subscribe({
        next: (response) => {
          this.isVerifying.set(false);

          if (response.success && response.data) {
            // Update session with new token
            this.sessionService.setSession({
              ...response.data,
              contractSummary: undefined,
            });

            // Mark OTP as verified
            this.consumerState.setOtpVerified();

            // Navigate to VIN entry
            const redirectUrl = this.sessionService.consumeRedirectUrl();
            this.router.navigate([redirectUrl || '/vin-entry']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isVerifying.set(false);
          this.handleError(err);
        },
      });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  private sendOtp(): void {
    const challengeId = this.consumerState.otpChallengeId();
    if (!challengeId) return;

    this.isSending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.startResendCooldown();

    this.otpService.send({ otpChallengeId: challengeId }).subscribe({
      next: (response) => {
        this.isSending.set(false);
        if (response.success) {
          this.successMessage.set('A new code has been sent.');
          // Clear success message after a few seconds
          setTimeout(() => this.successMessage.set(null), 5000);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSending.set(false);
        this.handleError(err);
      },
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(60);

    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }

    this.resendInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        if (this.resendInterval) {
          clearInterval(this.resendInterval);
          this.resendInterval = null;
        }
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    switch (apiError?.code) {
      case 'OTP_INVALID':
        this.errorMessage.set('Invalid code. Please check and try again.');
        break;
      case 'OTP_EXPIRED':
        this.errorMessage.set('Code has expired. Please request a new one.');
        break;
      case 'OTP_LOCKED_OUT':
        this.errorMessage.set(
          'Too many failed attempts. Please wait before trying again or contact support.'
        );
        break;
      case 'RATE_LIMITED':
        this.errorMessage.set('Please wait before requesting another code.');
        break;
      default:
        this.errorMessage.set('An error occurred. Please try again.');
    }
  }
}

