import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '@shared/components';

/**
 * Landing page - Entry point for the VIN add flow
 * Displays key information and CTA to start the process
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HeaderComponent],
  template: `
    <div class="page-container to-primary-50 bg-gradient-to-br from-slate-50">
      <app-header />

      <main class="page-main flex items-center justify-center">
        <div class="mx-auto max-w-2xl px-4 py-8 text-center">
          <!-- Hero Section -->
          <div class="animate-fade-in mb-12">
            <div
              class="bg-primary-100 mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl"
            >
              <svg
                class="text-primary-600 h-10 w-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 class="mb-4 text-4xl font-bold text-slate-900">
              Add an Additional Vehicle to Your Contract
            </h1>
            <p class="mx-auto max-w-xl text-lg text-slate-600">
              Extend your warranty protection to a second vehicle with just a few simple steps.
            </p>
          </div>

          <!-- Info Cards -->
          <div class="mb-12 grid gap-6 md:grid-cols-3">
            <div class="card animate-slide-up text-left" style="animation-delay: 0.1s">
              <div
                class="bg-primary-100 mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              >
                <svg
                  class="text-primary-600 h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 class="mb-2 text-lg font-semibold text-slate-900">One Additional Vehicle</h3>
              <p class="text-sm text-slate-600">
                You may add one additional VIN to your existing warranty contract.
              </p>
            </div>

            <div class="card animate-slide-up text-left" style="animation-delay: 0.2s">
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100"
              >
                <svg
                  class="h-6 w-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 class="mb-2 text-lg font-semibold text-slate-900">One-Time Change</h3>
              <p class="text-sm text-slate-600">
                Once validated and committed, this change cannot be reversed.
              </p>
            </div>

            <div class="card animate-slide-up text-left" style="animation-delay: 0.3s">
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100"
              >
                <svg
                  class="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 class="mb-2 text-lg font-semibold text-slate-900">Same Class or Less</h3>
              <p class="text-sm text-slate-600">
                The additional vehicle must be the same class or lower than your primary vehicle.
              </p>
            </div>
          </div>

          <!-- CTA Section -->
          <div class="animate-slide-up" style="animation-delay: 0.4s">
            <a
              routerLink="/authenticate"
              data-testid="get-started"
              class="bg-primary-600 hover:bg-primary-700 shadow-primary-500/25 hover:shadow-primary-500/30 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Get Started
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </a>
            <p class="mt-4 text-sm text-slate-500">
              Need help?
              <a href="/support" class="text-primary-600 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <p>&copy; {{ currentYear }} Vehicle Protection Portal. All rights reserved.</p>
      </footer>
    </div>
  `,
})
export class LandingComponent {
  currentYear = new Date().getFullYear();
}

