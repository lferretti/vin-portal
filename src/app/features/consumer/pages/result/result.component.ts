import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed, OnInit, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { interval, switchMap, takeWhile, tap } from 'rxjs';

import { VinService } from '@core/services/vin.service';
import { DocumentService } from '@core/services/document.service';
import { RumService } from '@core/services';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { VinAddStatus, VinRequestStatusData, isTerminalStatus } from '@core/models';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
  VinDisplayComponent,
  LoadingSpinnerComponent,
} from '@shared/components';
import type { StepConfig } from '@shared/components';

/**
 * Result page - Shows the outcome of the VIN commit
 * Polls for status updates when PENDING
 */
@Component({
  selector: 'app-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    HeaderComponent,
    ProgressStepperComponent,
    AlertBannerComponent,
    FormFieldComponent,
    VinDisplayComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="3" />

        <div class="page-card mt-8 text-center" data-testid="request-status">
          @switch (status()) {
            @case ('COMMITTED_LOCKED') {
              <div class="animate-fade-in">
                <div
                  class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                >
                  <svg
                    class="h-10 w-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 class="mb-2 text-2xl font-bold text-slate-900">Vehicle Added Successfully!</h1>
                <p class="mb-8 text-slate-600">
                  Your additional vehicle has been added to your warranty contract.
                </p>

                @if (statusData()?.decoded) {
                  <div class="mb-6">
                    <app-vin-display [decoded]="statusData()!.decoded!" />
                  </div>
                }

                <div class="mb-6 rounded-lg bg-slate-50 p-4 text-left">
                  <dl class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <dt class="text-slate-500">VIN</dt>
                      <dd class="mono font-medium">{{ statusData()?.vin }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-slate-500">Confirmed</dt>
                      <dd class="font-medium">{{ statusData()?.lastUpdatedAt | date:'medium' }}</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-slate-500">Reference</dt>
                      <dd class="mono text-xs">{{ requestId() }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- Confirmation Document -->
                <div class="mb-6 rounded-lg border border-slate-200 p-5 text-left" data-testid="document-section">
                  <h3 class="mb-3 text-sm font-semibold text-slate-900">Confirmation Document</h3>

                  @if (downloadError()) {
                    <app-alert-banner type="error" class="mb-3" [dismissible]="true" (dismiss)="downloadError.set(null)">
                      {{ downloadError() }}
                    </app-alert-banner>
                  }

                  <div class="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      (click)="onDownloadPdf()"
                      data-testid="download-pdf-btn"
                      class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      [disabled]="isDownloading()"
                    >
                      @if (isDownloading()) {
                        <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                        Downloading...
                      } @else {
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      }
                    </button>

                    <button
                      type="button"
                      (click)="showEmailSection.set(!showEmailSection())"
                      class="text-primary-600 text-sm font-medium hover:underline"
                    >
                      {{ showEmailSection() ? 'Hide email' : 'Email me a copy' }}
                    </button>
                  </div>

                  @if (showEmailSection()) {
                    <div class="animate-fade-in mt-4">
                      @if (emailSent()) {
                        <app-alert-banner type="success">
                          Confirmation sent to {{ emailControl.value }}.
                        </app-alert-banner>
                      } @else {
                        @if (emailError()) {
                          <app-alert-banner type="error" class="mb-3" [dismissible]="true" (dismiss)="emailError.set(null)">
                            {{ emailError() }}
                          </app-alert-banner>
                        }

                        <div class="flex items-start gap-3">
                          <div class="flex-1">
                            <app-form-field label="" [control]="emailControl">
                              <input
                                type="email"
                                [formControl]="emailControl"
                                class="form-input"
                                [class.form-input-error]="emailControl.invalid && emailControl.touched"
                                placeholder="your@email.com"
                                data-testid="email-input"
                              />
                            </app-form-field>
                          </div>
                          <button
                            type="button"
                            (click)="onEmailDocument()"
                            data-testid="send-email-btn"
                            class="bg-primary-600 hover:bg-primary-700 mt-0.5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            [disabled]="emailControl.invalid || isSendingEmail()"
                          >
                            @if (isSendingEmail()) {
                              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                              Sending...
                            } @else {
                              Send
                            }
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                <a
                  routerLink="/"
                  class="bg-primary-600 hover:bg-primary-700 inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                >
                  Done
                </a>
              </div>
            }

            @case ('PENDING') {
              <div class="animate-fade-in">
                <div class="mb-6">
                  <app-loading-spinner />
                </div>
                <h1 class="mb-2 text-2xl font-bold text-slate-900">Processing Your Request</h1>
                <p class="mb-6 text-slate-600">
                  Your request is being processed. This may take a few moments.
                </p>

                <div class="mb-6 rounded-lg bg-blue-50 p-4">
                  <p class="text-sm text-blue-800">
                    Reference: <span class="mono">{{ requestId() }}</span>
                  </p>
                </div>

                @if (isPolling()) {
                  <p class="text-sm text-slate-500">
                    Checking status automatically...
                    <span class="text-slate-400">({{ pollCount() }} checks)</span>
                  </p>
                } @else {
                  <button
                    type="button"
                    (click)="refreshStatus()"
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Check Status
                  </button>
                }
              </div>
            }

            @case ('FAILED_INELIGIBLE') {
              <div class="animate-fade-in">
                <div
                  class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100"
                >
                  <svg
                    class="h-10 w-10 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h1 class="mb-2 text-2xl font-bold text-slate-900">Vehicle Not Eligible</h1>
                <p class="mb-6 text-slate-600">
                  {{ statusData()?.eligibilityReasonCode || 'This vehicle could not be added to your contract.' }}
                </p>

                <a
                  routerLink="/vin-entry"
                  class="bg-primary-600 hover:bg-primary-700 inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                >
                  Try Another Vehicle
                </a>
              </div>
            }

            @case ('FAILED_DEPENDENCY') {
              <div class="animate-fade-in">
                <div
                  class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-100"
                >
                  <svg
                    class="h-10 w-10 text-amber-600"
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
                </div>
                <h1 class="mb-2 text-2xl font-bold text-slate-900">Unable to Complete Request</h1>
                <p class="mb-6 text-slate-600">
                  We encountered an issue processing your request. Please contact support with your reference number.
                </p>

                <div class="mb-6 rounded-lg bg-slate-50 p-4">
                  <p class="text-sm text-slate-600">
                    Reference: <span class="mono font-medium">{{ requestId() }}</span>
                  </p>
                </div>

                <a
                  href="/support"
                  class="bg-primary-600 hover:bg-primary-700 inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                >
                  Contact Support
                </a>
              </div>
            }

            @default {
              <div class="animate-fade-in">
                <app-loading-spinner message="Loading status..." />
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
})
export class ResultComponent implements OnInit {
  private readonly vinService = inject(VinService);
  private readonly documentService = inject(DocumentService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rumService = inject(RumService);

  // Route parameter
  requestId = input.required<string>();

  readonly steps: StepConfig[] = [
    { id: 'auth', label: 'Authenticate' },
    { id: 'vin', label: 'VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  readonly status = signal<VinAddStatus | null>(null);
  readonly statusData = signal<VinRequestStatusData | null>(null);
  readonly isPolling = signal(false);
  readonly pollCount = signal(0);

  // Document download/email state
  readonly isDownloading = signal(false);
  readonly downloadError = signal<string | null>(null);
  readonly showEmailSection = signal(false);
  readonly emailControl = new FormControl('', [Validators.required, Validators.email]);
  readonly isSendingEmail = signal(false);
  readonly emailSent = signal(false);
  readonly emailError = signal<string | null>(null);

  readonly isSuccess = computed(() => this.status() === VinAddStatus.COMMITTED_LOCKED);
  readonly isPending = computed(() => this.status() === VinAddStatus.PENDING);
  readonly isFailed = computed(() => {
    const s = this.status();
    return s === VinAddStatus.FAILED_INELIGIBLE ||
           s === VinAddStatus.FAILED_DEPENDENCY ||
           s === VinAddStatus.FAILED_VALIDATION;
  });

  ngOnInit(): void {
    this.loadStatus();
  }

  onDownloadPdf(): void {
    this.isDownloading.set(true);
    this.downloadError.set(null);
    this.rumService.addAction('document_download');

    this.documentService
      .downloadPdf(this.requestId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.isDownloading.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `confirmation-${this.requestId()}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.isDownloading.set(false);
          this.downloadError.set('Unable to download document. Please try again.');
        },
      });
  }

  onEmailDocument(): void {
    if (this.emailControl.invalid) {
      this.emailControl.markAsTouched();
      return;
    }

    this.isSendingEmail.set(true);
    this.emailError.set(null);
    this.rumService.addAction('document_email_submit');

    this.documentService
      .emailDocument(this.requestId(), this.emailControl.value!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSendingEmail.set(false);
          if (response.success && response.data?.sent) {
            this.emailSent.set(true);
          } else {
            this.emailError.set('Unable to send email. Please try again.');
          }
        },
        error: () => {
          this.isSendingEmail.set(false);
          this.emailError.set('Unable to send email. Please try again.');
        },
      });
  }

  refreshStatus(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    const reqId = this.requestId();
    if (!reqId) return;

    this.vinService.getStatus(reqId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statusData.set(response.data);
          this.status.set(response.data.status);
          this.consumerState.updateCommitStatus(response.data.status);

          if (response.data.status === VinAddStatus.PENDING) {
            this.startPolling();
          }
        }
      },
      error: () => {
        // On error, try to use state from consumer service
        const stateStatus = this.consumerState.commitStatus();
        if (stateStatus) {
          this.status.set(stateStatus);
        }
      },
    });
  }

  private startPolling(): void {
    if (this.isPolling()) return;

    this.isPolling.set(true);
    this.pollCount.set(0);

    // Poll every 10 seconds, max 18 times (~3 minutes)
    interval(10000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.pollCount.update((c) => c + 1)),
        switchMap(() => this.vinService.getStatus(this.requestId())),
        takeWhile((res) => {
          if (!res.success || !res.data) return false;
          return !isTerminalStatus(res.data.status) && this.pollCount() < 18;
        }, true)
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statusData.set(response.data);
            this.status.set(response.data.status);
            this.consumerState.updateCommitStatus(response.data.status);

            if (isTerminalStatus(response.data.status)) {
              this.isPolling.set(false);
            }
          }
        },
        complete: () => {
          this.isPolling.set(false);
        },
      });
  }
}

