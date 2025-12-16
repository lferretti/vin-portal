import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '@shared/components';

/**
 * Landing page - Entry point for the VIN add flow
 * Displays key information and CTA to start the process
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, HeaderComponent],
  template: `
    <div class="page-container bg-gradient-to-br from-slate-50 to-primary-50">
      <app-header />

      <main class="page-main flex items-center justify-center">
        <div class="max-w-2xl mx-auto px-4 py-8 text-center">
          <!-- Hero Section -->
          <div class="mb-12 animate-fade-in">
            <div
              class="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-2xl mb-6"
            >
              <svg
                class="w-10 h-10 text-primary-600"
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
            <h1 class="text-4xl font-bold text-slate-900 mb-4">
              Add an Additional Vehicle to Your Contract
            </h1>
            <p class="text-lg text-slate-600 max-w-xl mx-auto">
              Extend your warranty protection to a second vehicle with just a few simple steps.
            </p>
          </div>

          <!-- Info Cards -->
          <div class="grid md:grid-cols-3 gap-6 mb-12">
            <div class="card text-left animate-slide-up" style="animation-delay: 0.1s">
              <div
                class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4"
              >
                <svg
                  class="w-6 h-6 text-primary-600"
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
              <h3 class="text-lg font-semibold text-slate-900 mb-2">One Additional Vehicle</h3>
              <p class="text-slate-600 text-sm">
                You may add one additional VIN to your existing warranty contract.
              </p>
            </div>

            <div class="card text-left animate-slide-up" style="animation-delay: 0.2s">
              <div
                class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4"
              >
                <svg
                  class="w-6 h-6 text-amber-600"
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
              <h3 class="text-lg font-semibold text-slate-900 mb-2">One-Time Change</h3>
              <p class="text-slate-600 text-sm">
                Once validated and committed, this change cannot be reversed.
              </p>
            </div>

            <div class="card text-left animate-slide-up" style="animation-delay: 0.3s">
              <div
                class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4"
              >
                <svg
                  class="w-6 h-6 text-green-600"
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
              <h3 class="text-lg font-semibold text-slate-900 mb-2">Same Class or Less</h3>
              <p class="text-slate-600 text-sm">
                The additional vehicle must be the same class or lower than your primary vehicle.
              </p>
            </div>
          </div>

          <!-- CTA Section -->
          <div class="animate-slide-up" style="animation-delay: 0.4s">
            <a
              routerLink="/authenticate"
              class="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
            >
              Get Started
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <footer class="py-6 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
        <p>&copy; {{ currentYear }} Vehicle Protection Portal. All rights reserved.</p>
      </footer>
    </div>
  `,
})
export class LandingComponent {
  currentYear = new Date().getFullYear();
}

