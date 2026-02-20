import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env';
import { AdminService } from '@core/services/admin.service';
import { AdminSessionService } from '@core/services/admin-session.service';
import { AlertBannerComponent } from '@shared/components';

/**
 * Admin login page.
 * In mock mode: shows role-picker buttons for dev login.
 * In production: placeholder for Okta SSO widget.
 */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AlertBannerComponent],
  template: `
    <div class="page-container">
      <main class="page-main items-center justify-center">
        <div class="w-full max-w-md">
          <div class="mb-8 text-center">
            <h1 class="font-display text-3xl font-bold text-slate-900">VIN Portal</h1>
            <p class="mt-2 text-lg text-slate-600">Admin / Support Portal</p>
          </div>

          <!-- Okta SSO widget container (hidden, for future integration) -->
          <div id="okta-signin-widget" class="hidden"></div>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          @if (isMockMode) {
            <div class="card">
              <h2 class="mb-4 text-lg font-semibold text-slate-800">Development Login</h2>
              <p class="mb-6 text-sm text-slate-600">
                Select a role to log in as a development user.
              </p>

              <div class="space-y-3">
                <button
                  type="button"
                  (click)="loginAs('admin')"
                  [disabled]="isLoading()"
                  class="bg-primary-600 hover:bg-primary-700 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isLoading() && loadingRole() === 'admin') {
                    <div class="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    Signing in...
                  } @else {
                    Security / Admin
                  }
                </button>

                <button
                  type="button"
                  (click)="loginAs('support')"
                  [disabled]="isLoading()"
                  class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (isLoading() && loadingRole() === 'support') {
                    <div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                    Signing in...
                  } @else {
                    Support
                  }
                </button>
              </div>
            </div>
          } @else {
            <div class="card text-center">
              <p class="text-slate-600">Redirecting to SSO login...</p>
            </div>
          }

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/" class="text-primary-600 hover:underline">&larr; Back to Consumer Portal</a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class AdminLoginComponent {
  private readonly adminService = inject(AdminService);
  private readonly adminSession = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isMockMode = environment.features.mockApi;
  readonly isLoading = signal(false);
  readonly loadingRole = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  loginAs(role: 'admin' | 'support'): void {
    this.isLoading.set(true);
    this.loadingRole.set(role);
    this.errorMessage.set(null);

    this.adminService
      .devLogin(role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.loadingRole.set(null);

          if (response.success && response.data) {
            this.adminSession.setSession(response.data);
            this.router.navigate(['/admin']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          this.loadingRole.set(null);
          const apiError = err.error?.error;
          this.errorMessage.set(
            apiError?.message || 'Login failed. Please try again.'
          );
        },
      });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }
}
