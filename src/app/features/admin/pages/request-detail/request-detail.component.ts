import { Component, inject, signal, OnInit, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { AdminService } from '@core/services/admin.service';
import { AdminRequestDetailData, AdminAuditEvent, VinAddStatus } from '@core/models';
import {
  AlertBannerComponent,
  LoadingSpinnerComponent,
  VinDisplayComponent,
} from '@shared/components';

/**
 * Admin request detail page with audit timeline and notes
 */
@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    JsonPipe,
    AlertBannerComponent,
    LoadingSpinnerComponent,
    VinDisplayComponent,
  ],
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

      <h1 class="text-2xl font-bold text-slate-900 mb-6">Request Detail</h1>

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

      @if (isLoading()) {
        <div class="py-12">
          <app-loading-spinner message="Loading request details..." />
        </div>
      } @else if (data()) {
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Request Info -->
            <div class="card">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Request Information</h2>
              <dl class="grid md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm text-slate-500">Request ID</dt>
                  <dd class="font-mono text-slate-900">{{ data()!.requestId }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">Status</dt>
                  <dd>
                    <span [class]="getStatusBadgeClass(data()!.status)">
                      {{ formatStatus(data()!.status) }}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">Contract Context ID</dt>
                  <dd class="font-mono text-sm text-slate-700">{{ data()!.contractContextId }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">VIN</dt>
                  <dd class="font-mono text-lg text-slate-900">{{ data()!.vin || '—' }}</dd>
                </div>
              </dl>

              @if (data()!.decoded) {
                <div class="mt-4 pt-4 border-t border-slate-200">
                  <h3 class="text-sm font-medium text-slate-700 mb-2">Vehicle Information</h3>
                  <app-vin-display [decoded]="data()!.decoded!" />
                </div>
              }
            </div>

            <!-- Eligibility -->
            <div class="card">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Eligibility</h2>
              <dl class="grid md:grid-cols-2 gap-4">
                <div>
                  <dt class="text-sm text-slate-500">Result</dt>
                  <dd>
                    @if (data()!.eligibilityAllowed) {
                      <span class="badge-success">Allowed</span>
                    } @else {
                      <span class="badge-error">Not Allowed</span>
                    }
                  </dd>
                </div>
                @if (data()!.eligibilityReasonCode) {
                  <div>
                    <dt class="text-sm text-slate-500">Reason Code</dt>
                    <dd class="font-mono text-slate-900">{{ data()!.eligibilityReasonCode }}</dd>
                  </div>
                }
                @if (data()!.lastDependencyError) {
                  <div class="md:col-span-2">
                    <dt class="text-sm text-slate-500">Last Dependency Error</dt>
                    <dd class="text-red-700 text-sm">{{ data()!.lastDependencyError }}</dd>
                  </div>
                }
              </dl>
            </div>

            <!-- Audit Timeline -->
            <div class="card">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Audit Timeline</h2>
              @if (data()!.audit.length === 0) {
                <p class="text-slate-500 text-sm">No audit events recorded.</p>
              } @else {
                <div class="space-y-4">
                  @for (event of data()!.audit; track event.createdAt) {
                    <div
                      class="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-l-0 last:pb-0"
                    >
                      <div
                        class="absolute left-0 top-0 w-3 h-3 -translate-x-[7px] rounded-full bg-slate-300"
                      ></div>
                      <div class="flex items-start justify-between">
                        <div>
                          <span class="font-medium text-slate-900">{{ event.eventType }}</span>
                          @if (event.actorType) {
                            <span class="text-xs text-slate-500 ml-2">({{ event.actorType }})</span>
                          }
                        </div>
                        <time class="text-xs text-slate-500">
                          {{ event.createdAt | date:'short' }}
                        </time>
                      </div>
                      @if (event.eventData) {
                        <pre
                          class="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-x-auto"
                        >{{ event.eventData | json }}</pre>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Add Note -->
            <div class="card">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Add Internal Note</h2>
              <form (ngSubmit)="onAddNote()" class="space-y-3">
                <textarea
                  [formControl]="noteControl"
                  class="form-input resize-none"
                  rows="4"
                  placeholder="Enter a note for the support team..."
                  maxlength="4000"
                ></textarea>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">
                    {{ noteControl.value?.length || 0 }} / 4000
                  </span>
                  <button
                    type="submit"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    [disabled]="noteControl.invalid || isAddingNote()"
                  >
                    @if (isAddingNote()) {
                      <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    }
                    Add Note
                  </button>
                </div>
              </form>
            </div>

            <!-- Quick Actions -->
            <div class="card">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
              <div class="space-y-2">
                <button
                  type="button"
                  (click)="refresh()"
                  class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RequestDetailComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  requestId = input.required<string>();

  readonly isLoading = signal(true);
  readonly isAddingNote = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly data = signal<AdminRequestDetailData | null>(null);

  readonly noteControl = new FormControl('', [Validators.required, Validators.maxLength(4000)]);

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  onAddNote(): void {
    if (this.noteControl.invalid) return;

    this.isAddingNote.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.adminService.addNote(this.requestId(), this.noteControl.value!).subscribe({
      next: (response) => {
        this.isAddingNote.set(false);
        if (response.success) {
          this.successMessage.set('Note added successfully.');
          this.noteControl.reset();
          this.loadData(); // Refresh to show new note in audit
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isAddingNote.set(false);
        this.errorMessage.set('Failed to add note. Please try again.');
      },
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getRequestDetail(this.requestId()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.data.set(response.data);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load request details.');
      },
    });
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

