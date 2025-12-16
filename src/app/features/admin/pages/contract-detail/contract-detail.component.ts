import { Component, inject, signal, OnInit, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { AdminService } from '@core/services/admin.service';
import { VinService } from '@core/services/vin.service';
import { VinAddStatus, VinRequestStatusData } from '@core/models';
import { AlertBannerComponent, LoadingSpinnerComponent } from '@shared/components';

/**
 * Admin contract detail page
 * Shows contract information and list of VIN add requests
 */
@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, AlertBannerComponent, LoadingSpinnerComponent],
  template: `
    <div>
      <div class="flex items-center gap-4 mb-6">
        <a
          routerLink="/admin/search"
          class="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </a>
      </div>

      <h1 class="text-2xl font-bold text-slate-900 mb-6">Contract Detail</h1>

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
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Contract Information</h2>
            <dl class="grid md:grid-cols-2 gap-4">
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
              <h2 class="text-lg font-semibold text-slate-900 mb-4">VIN Add Request</h2>
              <dl class="grid md:grid-cols-2 gap-4">
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
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
            <div class="flex gap-3">
              @if (requestData()) {
                <a
                  [routerLink]="['/admin/request', requestData()!.requestId]"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  View Full Request Details
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              }
              <button
                type="button"
                (click)="refresh()"
                class="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  formatStatus(status: VinAddStatus): string {
    const labels: Record<VinAddStatus, string> = {
      [VinAddStatus.NOT_USED]: 'Not Used',
      [VinAddStatus.PENDING]: 'Pending',
      [VinAddStatus.COMMITTED_LOCKED]: 'Committed',
      [VinAddStatus.FAILED_INELIGIBLE]: 'Failed - Ineligible',
      [VinAddStatus.FAILED_DEPENDENCY]: 'Failed - Dependency',
      [VinAddStatus.FAILED_VALIDATION]: 'Failed - Validation',
      [VinAddStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status: VinAddStatus): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variants: Record<string, string> = {
      [VinAddStatus.COMMITTED_LOCKED]: `${base} bg-green-100 text-green-800`,
      [VinAddStatus.PENDING]: `${base} bg-yellow-100 text-yellow-800`,
      [VinAddStatus.NOT_USED]: `${base} bg-slate-100 text-slate-800`,
      default: `${base} bg-red-100 text-red-800`,
    };
    return variants[status] || variants['default'];
  }
}

