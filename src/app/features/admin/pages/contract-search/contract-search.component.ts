import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';
import { AdminContractSummary } from '@core/models';
import { AlertBannerComponent } from '@shared/components';
import { formatStatus, getStatusBadgeClass } from '@shared/utils/status-badge.util';

/**
 * Admin contract search page
 */
@Component({
  selector: 'app-contract-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, AlertBannerComponent],
  template: `
    <div>
      <h1 class="mb-6 text-2xl font-bold text-slate-900">Search Contracts</h1>

      @if (errorMessage()) {
        <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
          {{ errorMessage() }}
        </app-alert-banner>
      }

      <!-- Search Form -->
      <div class="card mb-6">
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
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
              class="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 font-semibold text-white transition-colors disabled:opacity-50"
              [disabled]="isSearching() || !hasSearchCriteria()"
            >
              @if (isSearching()) {
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              } @else {
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div class="card relative z-10">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">
            Results ({{ results().length }})
          </h2>

          @if (results().length === 0) {
            <p class="py-8 text-center text-slate-500">No contracts found matching your criteria.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">External ID</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Committed VIN</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium text-slate-500">Committed At</th>
                    <th scope="col" class="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (contract of results(); track contract.contractContextId) {
                    <tr class="border-b border-slate-100 hover:bg-slate-50">
                      <td class="px-4 py-3 font-mono text-slate-900">
                        {{ contract.externalContractId }}
                      </td>
                      <td class="px-4 py-3">
                        <span [class]="getStatusBadgeClass(contract.status)">
                          {{ formatStatus(contract.status) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 font-mono text-slate-600">
                        {{ contract.committedVinMasked || '—' }}
                      </td>
                      <td class="px-4 py-3 text-slate-600">
                        {{ contract.committedAt || '—' }}
                      </td>
                      <td class="px-4 py-3 text-right">
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
  private readonly destroyRef = inject(DestroyRef);

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
    if (!this.hasSearchCriteria() || this.isSearching()) return;

    this.isSearching.set(true);
    this.errorMessage.set(null);

    const params = {
      contractNumber: this.searchForm.value.contractNumber || undefined,
      externalContractId: this.searchForm.value.externalContractId || undefined,
      requestId: this.searchForm.value.requestId || undefined,
    };

    this.adminService.searchContracts(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isSearching.set(false);
        this.hasSearched.set(true);
        if (response.success && response.data) {
          this.results.set(response.data.results);
        }
      },
      error: () => {
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

  readonly formatStatus = formatStatus;
  readonly getStatusBadgeClass = getStatusBadgeClass;
}

