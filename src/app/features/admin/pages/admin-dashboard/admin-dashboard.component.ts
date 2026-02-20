import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Admin dashboard - landing page for support portal
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div>
      <h1 class="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <!-- Quick Actions -->
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div class="space-y-2">
            <a
              routerLink="/admin/search"
              class="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50"
            >
              <div
                class="bg-primary-100 flex h-10 w-10 items-center justify-center rounded-lg"
              >
                <svg
                  class="text-primary-600 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <div>
                <span class="font-medium text-slate-900">Search Contracts</span>
                <p class="text-sm text-slate-500">Find contracts by number, ID, or request</p>
              </div>
            </a>
          </div>
        </div>

        <!-- Information Card -->
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">Support Portal</h2>
          <p class="mb-4 text-sm text-slate-600">
            Use this portal to look up contract information, view VIN add request details, and add
            internal notes for support cases.
          </p>
          <ul class="space-y-2 text-sm text-slate-600">
            <li class="flex items-center gap-2">
              <svg
                class="h-4 w-4 text-green-600"
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
              View contract and request details
            </li>
            <li class="flex items-center gap-2">
              <svg
                class="h-4 w-4 text-green-600"
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
              Review audit event timeline
            </li>
            <li class="flex items-center gap-2">
              <svg
                class="h-4 w-4 text-green-600"
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
              Add internal support notes
            </li>
          </ul>
        </div>

        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">Status Reference</h2>
          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">NOT_USED</span>
              <span class="text-sm text-slate-600">Contract authenticated, no VIN commit started.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">PENDING</span>
              <span class="text-sm text-slate-600">VIN commit accepted, awaiting dependency confirmation.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">COMMITTED_LOCKED</span>
              <span class="text-sm text-slate-600">VIN committed successfully. Contract permanently locked.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">FAILED_INELIGIBLE</span>
              <span class="text-sm text-slate-600">Eligibility rules denied the VIN (e.g., vehicle class too high).</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">FAILED_DEPENDENCY</span>
              <span class="text-sm text-slate-600">External dependency unreachable after all retries.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">FAILED_VALIDATION</span>
              <span class="text-sm text-slate-600">VIN failed format or decode validation.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">CANCELLED</span>
              <span class="text-sm text-slate-600">Manually cancelled (not used in standard consumer flow).</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {}
