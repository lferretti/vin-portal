import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { interval, takeWhile } from 'rxjs';

import { OtpService } from '@core/services/otp.service';
import { SessionService } from '@core/services/session.service';
import { RumService } from '@core/services';
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
          <div class="mb-6 text-center">
            <div
              class="bg-primary-100 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
            >
              <svg
                class="text-primary-600 h-8 w-8"
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
            <h1 class="mb-2 text-2xl font-bold text-slate-900">Verify Your Identity</h1>
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
                class="otp-input"
                [class.otp-input-error]="codeControl.invalid && codeControl.touched"
                autocomplete="one-time-code"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
              />
            </app-form-field>

            <div class="pt-2">
              <button
                type="submit"
                class="bg-primary-600 hover:bg-primary-700 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="codeControl.invalid || isVerifying() || rateLimitCooldown() > 0"
              >
                @if (isVerifying()) {
                  <div class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Verifying...
                } @else if (rateLimitCooldown() > 0) {
                  Wait {{ rateLimitCooldown() }}s
                } @else {
                  Verify Code
                }
              </button>
            </div>
          </form>

          <div class="mt-6 text-center">
            <p class="mb-2 text-sm text-slate-600">Didn't receive a code?</p>
            <button
              type="button"
              (click)="onResend()"
              class="text-primary-600 font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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
export class VerifyOtpComponent implements OnInit {
  private readonly otpService = inject(OtpService);
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

  readonly isVerifying = signal(false);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly resendCooldown = signal(0);
  readonly rateLimitCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  readonly maskedDestination = this.consumerState.otpMaskedDestination;

  readonly codeControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  ngOnInit(): void {
    // Auto-send OTP on page load
    this.sendOtp();
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
    this.rumService.addAction('otp_verify_submit');

    this.otpService
      .verify({
        otpChallengeId: challengeId,
        code: this.codeControl.value!,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isVerifying.set(false);

          if (response.success && response.data) {
            this.rumService.addAction('otp_verify_success');

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

    this.otpService.send({ otpChallengeId: challengeId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

    interval(1000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeWhile(() => this.resendCooldown() > 0)
      )
      .subscribe(() => {
        this.resendCooldown.update((c) => c - 1);
      });
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;
    this.rumService.addAction('otp_verify_error', { code: apiError?.code });

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
      case 'RATE_LIMITED': {
        const retryAfter = (err as HttpErrorResponse & { retryAfterSeconds?: number }).retryAfterSeconds;
        const seconds = retryAfter ?? 60;
        this.startCooldown(seconds);
        this.errorMessage.set(`Too many attempts. Please wait ${seconds} seconds.`);
        break;
      }
      default:
        this.errorMessage.set('An error occurred. Please try again.');
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

