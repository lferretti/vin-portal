import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed, OnInit, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { AdminService } from '@core/services/admin.service';
import { AdminSessionService } from '@core/services';
import { AdminRequestDetailData } from '@core/models';
import {
  AlertBannerComponent,
  LoadingSpinnerComponent,
  VinDisplayComponent,
} from '@shared/components';
import { formatStatus, getStatusBadgeClass } from '@shared/utils/status-badge.util';

/**
 * Admin request detail page with audit timeline and notes
 */
@Component({
  selector: 'app-request-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

      <h1 class="mb-6 text-2xl font-bold text-slate-900">Request Detail</h1>

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
        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Main Content -->
          <div class="space-y-6 lg:col-span-2">
            <!-- Request Info -->
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-900">Request Information</h2>
              <dl class="grid gap-4 md:grid-cols-2">
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
                <div class="mt-4 border-t border-slate-200 pt-4">
                  <h3 class="mb-2 text-sm font-medium text-slate-700">Vehicle Information</h3>
                  <app-vin-display [decoded]="data()!.decoded!" />
                </div>
              }
            </div>

            <!-- Eligibility -->
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-900">Eligibility</h2>
              <dl class="grid gap-4 md:grid-cols-2">
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
                    <dd class="text-sm text-red-700">{{ data()!.lastDependencyError }}</dd>
                  </div>
                }
              </dl>
            </div>

            <!-- Audit Timeline -->
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-900">Audit Timeline</h2>
              @if (data()!.audit.length === 0) {
                <p class="text-sm text-slate-500">No audit events recorded.</p>
              } @else {
                <div class="space-y-4">
                  @for (event of data()!.audit; track event.createdAt) {
                    <div
                      class="relative border-l-2 border-slate-200 pb-4 pl-6 last:border-l-0 last:pb-0"
                    >
                      <div
                        class="absolute top-0 left-0 h-3 w-3 -translate-x-[7px] rounded-full bg-slate-300"
                      ></div>
                      <div class="flex items-start justify-between">
                        <div>
                          <span class="font-medium text-slate-900">{{ event.eventType }}</span>
                          @if (event.actorType) {
                            <span class="ml-2 text-xs text-slate-500">({{ event.actorType }})</span>
                          }
                        </div>
                        <time class="text-xs text-slate-500">
                          {{ event.createdAt | date:'short' }}
                        </time>
                      </div>
                      @if (event.eventData) {
                        <pre
                          class="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600"
                        >{{ event.eventData | json }}</pre>
                      }
                      @if (isSecurityAdmin()) {
                        @if (event.sourceIp) {
                          <span class="text-xs text-slate-500">IP: {{ event.sourceIp }}</span>
                        }
                        @if (event.userAgent) {
                          <span class="text-xs text-slate-500">UA: {{ event.userAgent }}</span>
                        }
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
              <h2 class="mb-4 text-lg font-semibold text-slate-900">Add Internal Note</h2>
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
                    class="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
                    [disabled]="noteControl.invalid || isAddingNote()"
                  >
                    @if (isAddingNote()) {
                      <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    }
                    Add Note
                  </button>
                </div>
              </form>
            </div>

            <!-- Quick Actions -->
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-900">Actions</h2>
              <div class="space-y-2">
                <button
                  type="button"
                  (click)="refresh()"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  private readonly adminSession = inject(AdminSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSecurityAdmin = computed(() => this.adminSession.role() === 'admin');

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

    this.adminService.addNote(this.requestId(), this.noteControl.value!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isAddingNote.set(false);
        if (response.success) {
          this.successMessage.set('Note added successfully.');
          this.noteControl.reset();
          this.loadData(); // Refresh to show new note in audit
        }
      },
      error: () => {
        this.isAddingNote.set(false);
        this.errorMessage.set('Failed to add note. Please try again.');
      },
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getRequestDetail(this.requestId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.data.set(response.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load request details.');
      },
    });
  }

  readonly formatStatus = formatStatus;
  readonly getStatusBadgeClass = getStatusBadgeClass;
}

