import { Component, ChangeDetectionStrategy, inject, signal, OnInit, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminService } from '@core/services/admin.service';
import { VinService } from '@core/services/vin.service';
import { VinRequestStatusData } from '@core/models';
import { AlertBannerComponent, LoadingSpinnerComponent } from '@shared/components';
import { formatStatus, getStatusBadgeClass } from '@shared/utils/status-badge.util';

/**
 * Admin contract detail page
 * Shows contract information and list of VIN add requests
 */
@Component({
  selector: 'app-contract-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, AlertBannerComponent, LoadingSpinnerComponent],
  template: `
    <div>
      <div class="mb-6 flex items-center gap-4">
        <a
          routerLink="/admin/search"
          class="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </a>
      </div>

      <h1 class="mb-6 text-2xl font-bold text-slate-900">Contract Detail</h1>

      @if (errorMessage()) {
        <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
          {{ errorMessage() }}
        </app-alert-banner>
      }

      @if (isLoading()) {
        <div class="py-12">
          <app-loading-spinner message="Loading contract details..." />
        </div>
      } @else {
        <div class="grid gap-6">
          <!-- Contract Info Card -->
          <div class="card">
            <h2 class="mb-4 text-lg font-semibold text-slate-900">Contract Information</h2>
            <dl class="grid gap-4 md:grid-cols-2">
              <div>
                <dt class="text-sm text-slate-500">Contract Context ID</dt>
                <dd class="font-mono text-slate-900">{{ contractContextId() }}</dd>
              </div>
              <div>
                <dt class="text-sm text-slate-500">Status</dt>
                <dd>
                  @if (requestData()) {
                    <span [class]="getStatusBadgeClass(requestData()!.status)">
                      {{ formatStatus(requestData()!.status) }}
                    </span>
                  } @else {
                    <span class="badge-neutral">Unknown</span>
                  }
                </dd>
              </div>
            </dl>
          </div>

          <!-- Request Details Card -->
          @if (requestData()) {
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-900">VIN Add Request</h2>
              <dl class="grid gap-4 md:grid-cols-2">
                <div>
                  <dt class="text-sm text-slate-500">Request ID</dt>
                  <dd class="font-mono text-slate-900">{{ requestData()!.requestId }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">VIN</dt>
                  <dd class="font-mono text-slate-900">{{ requestData()!.vin || '—' }}</dd>
                </div>
                @if (requestData()!.decoded) {
                  <div>
                    <dt class="text-sm text-slate-500">Year / Make / Model</dt>
                    <dd class="text-slate-900">
                      {{ requestData()!.decoded!.year }} {{ requestData()!.decoded!.make }}
                      {{ requestData()!.decoded!.model }}
                    </dd>
                  </div>
                }
                <div>
                  <dt class="text-sm text-slate-500">Eligibility</dt>
                  <dd>
                    @if (requestData()!.eligibilityAllowed) {
                      <span class="badge-success">Eligible</span>
                    } @else if (requestData()!.eligibilityReasonCode) {
                      <span class="badge-error">{{ requestData()!.eligibilityReasonCode }}</span>
                    } @else {
                      <span class="badge-neutral">Unknown</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">Last Updated</dt>
                  <dd class="text-slate-900">{{ requestData()!.lastUpdatedAt | date:'medium' }}</dd>
                </div>
              </dl>
            </div>
          }

          <!-- Actions Card -->
          <div class="card">
            <h2 class="mb-4 text-lg font-semibold text-slate-900">Actions</h2>
            <div class="flex gap-3">
              @if (requestData()) {
                <a
                  [routerLink]="['/admin/request', requestData()!.requestId]"
                  class="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
                >
                  View Full Request Details
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              }
              <button
                type="button"
                (click)="refresh()"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ContractDetailComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly vinService = inject(VinService);

  contractContextId = input.required<string>();

  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly requestData = signal<VinRequestStatusData | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // For demo, we'll try to get request data
    // In a real app, this would fetch by contract context ID
    // Here we simulate by trying to get status if we have a request ID
    // This is a placeholder - the admin API should support contract lookup
    this.isLoading.set(false);
  }

  readonly formatStatus = formatStatus;
  readonly getStatusBadgeClass = getStatusBadgeClass;
}

