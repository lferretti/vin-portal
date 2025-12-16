import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { AdminService } from '@core/services/admin.service';
import { AdminContractSummary, VinAddStatus } from '@core/models';
import { AlertBannerComponent } from '@shared/components';

/**
 * Admin contract search page
 */
@Component({
  selector: 'app-contract-search',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, AlertBannerComponent],
  template: `
    <div>
      <h1 class="text-2xl font-bold text-slate-900 mb-6">Search Contracts</h1>

      @if (errorMessage()) {
        <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
          {{ errorMessage() }}
        </app-alert-banner>
      }

      <!-- Search Form -->
      <div class="card mb-6">
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="space-y-4">
          <div class="grid md:grid-cols-3 gap-4">
            <div>
              <label for="contractNumber" class="form-label">Contract Number</label>
              <input
                type="text"
                id="contractNumber"
                formControlName="contractNumber"
                class="form-input"
                placeholder="Enter contract number"
              />
            </div>
            <div>
              <label for="externalContractId" class="form-label">External Contract ID</label>
              <input
                type="text"
                id="externalContractId"
                formControlName="externalContractId"
                class="form-input"
                placeholder="Enter external ID"
              />
            </div>
            <div>
              <label for="requestId" class="form-label">Request ID</label>
              <input
                type="text"
                id="requestId"
                formControlName="requestId"
                class="form-input"
                placeholder="Enter request ID"
              />
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="submit"
              class="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              [disabled]="isSearching() || !hasSearchCriteria()"
            >
              @if (isSearching()) {
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              Search
            </button>
          </div>
        </form>
      </div>

      <!-- Results -->
      @if (hasSearched()) {
        <div class="card">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">
            Results ({{ results().length }})
          </h2>

          @if (results().length === 0) {
            <p class="text-slate-500 text-center py-8">No contracts found matching your criteria.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="text-left py-3 px-4 font-medium text-slate-500">External ID</th>
                    <th class="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                    <th class="text-left py-3 px-4 font-medium text-slate-500">Committed VIN</th>
                    <th class="text-left py-3 px-4 font-medium text-slate-500">Committed At</th>
                    <th class="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (contract of results(); track contract.contractContextId) {
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                      <td class="py-3 px-4 font-mono text-slate-900">
                        {{ contract.externalContractId }}
                      </td>
                      <td class="py-3 px-4">
                        <span [class]="getStatusBadgeClass(contract.status)">
                          {{ formatStatus(contract.status) }}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-600">
                        {{ contract.committedVinMasked || '—' }}
                      </td>
                      <td class="py-3 px-4 text-slate-600">
                        {{ contract.committedAt || '—' }}
                      </td>
                      <td class="py-3 px-4 text-right">
                        <a
                          [routerLink]="['/admin/contract', contract.contractContextId]"
                          class="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          View Details
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ContractSearchComponent {
  private readonly adminService = inject(AdminService);

  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly results = signal<AdminContractSummary[]>([]);

  readonly searchForm = new FormGroup({
    contractNumber: new FormControl(''),
    externalContractId: new FormControl(''),
    requestId: new FormControl(''),
  });

  hasSearchCriteria(): boolean {
    const v = this.searchForm.value;
    return !!(v.contractNumber || v.externalContractId || v.requestId);
  }

  onSearch(): void {
    if (!this.hasSearchCriteria()) return;

    this.isSearching.set(true);
    this.errorMessage.set(null);

    const params = {
      contractNumber: this.searchForm.value.contractNumber || undefined,
      externalContractId: this.searchForm.value.externalContractId || undefined,
      requestId: this.searchForm.value.requestId || undefined,
    };

    this.adminService.searchContracts(params).subscribe({
      next: (response) => {
        this.isSearching.set(false);
        this.hasSearched.set(true);
        if (response.success && response.data) {
          this.results.set(response.data.results);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSearching.set(false);
        this.hasSearched.set(true);
        this.results.set([]);
        this.errorMessage.set('Search failed. Please try again.');
      },
    });
  }

  clearError(): void {
    this.errorMessage.set(null);
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

