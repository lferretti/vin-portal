import { Component, inject, signal, computed, OnInit, OnDestroy, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { interval, Subscription, switchMap, takeWhile, tap } from 'rxjs';

import { VinService } from '@core/services/vin.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { VinAddStatus, VinRequestStatusData, isTerminalStatus } from '@core/models';
import {
  HeaderComponent,
  ProgressStepperComponent,
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
  imports: [
    RouterLink,
    DatePipe,
    HeaderComponent,
    ProgressStepperComponent,
    VinDisplayComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="3" />

        <div class="page-card mt-8 text-center">
          @switch (status()) {
            @case ('COMMITTED_LOCKED') {
              <div class="animate-fade-in">
                <div
                  class="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
                >
                  <svg
                    class="w-10 h-10 text-green-600"
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
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Vehicle Added Successfully!</h1>
                <p class="text-slate-600 mb-8">
                  Your additional vehicle has been added to your warranty contract.
                </p>

                @if (statusData()?.decoded) {
                  <div class="mb-6">
                    <app-vin-display [decoded]="statusData()!.decoded!" />
                  </div>
                }

                <div class="bg-slate-50 rounded-lg p-4 text-left mb-6">
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

                <a
                  routerLink="/"
                  class="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
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
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Processing Your Request</h1>
                <p class="text-slate-600 mb-6">
                  Your request is being processed. This may take a few moments.
                </p>

                <div class="bg-blue-50 rounded-lg p-4 mb-6">
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
                    class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6"
                >
                  <svg
                    class="w-10 h-10 text-red-600"
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
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Vehicle Not Eligible</h1>
                <p class="text-slate-600 mb-6">
                  {{ statusData()?.eligibilityReasonCode || 'This vehicle could not be added to your contract.' }}
                </p>

                <a
                  routerLink="/vin-entry"
                  class="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Another Vehicle
                </a>
              </div>
            }

            @case ('FAILED_DEPENDENCY') {
              <div class="animate-fade-in">
                <div
                  class="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6"
                >
                  <svg
                    class="w-10 h-10 text-amber-600"
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
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Unable to Complete Request</h1>
                <p class="text-slate-600 mb-6">
                  We encountered an issue processing your request. Please contact support with your reference number.
                </p>

                <div class="bg-slate-50 rounded-lg p-4 mb-6">
                  <p class="text-sm text-slate-600">
                    Reference: <span class="mono font-medium">{{ requestId() }}</span>
                  </p>
                </div>

                <a
                  href="/support"
                  class="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
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
export class ResultComponent implements OnInit, OnDestroy {
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);

  private pollingSubscription: Subscription | null = null;

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

  ngOnDestroy(): void {
    this.stopPolling();
  }

  refreshStatus(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    const reqId = this.requestId();
    if (!reqId) return;

    this.vinService.getStatus(reqId).subscribe({
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
    if (this.pollingSubscription) return;

    this.isPolling.set(true);
    this.pollCount.set(0);

    // Poll every 10 seconds, max 18 times (~3 minutes)
    this.pollingSubscription = interval(10000)
      .pipe(
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
              this.stopPolling();
            }
          }
        },
        complete: () => {
          this.stopPolling();
        },
      });
  }

  private stopPolling(): void {
    this.isPolling.set(false);
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
}

