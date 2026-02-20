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

        <!-- Status Legend -->
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-slate-900">Status Reference</h2>
          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between">
              <dt class="text-slate-600">Not Used</dt>
              <dd>
                <span class="badge-neutral">NOT_USED</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-slate-600">Pending</dt>
              <dd>
                <span class="badge-warning">PENDING</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-slate-600">Committed</dt>
              <dd>
                <span class="badge-success">COMMITTED</span>
              </dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-slate-600">Failed</dt>
              <dd>
                <span class="badge-error">FAILED</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {}
