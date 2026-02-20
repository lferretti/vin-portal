import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { SessionService } from '@core/services';

const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes before expiry

@Component({
  selector: 'app-session-expiry-warning',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showWarning()) {
      <div role="alertdialog"
           aria-labelledby="session-expiry-title"
           aria-describedby="session-expiry-desc"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-xl">
          <h2 id="session-expiry-title" class="mb-2 text-lg font-semibold text-gray-900">Session Expiring Soon</h2>
          <p id="session-expiry-desc" class="mb-4 text-gray-600">
            Your session will expire in {{ remainingSeconds() }} seconds. You will lose any unsaved progress.
          </p>
          <div class="flex justify-end gap-3">
            <button
              (click)="dismiss()"
              class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:outline-none">
              Dismiss
            </button>
            <button
              (click)="startOver()"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none">
              Start Over
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SessionExpiryWarningComponent implements OnInit, OnDestroy {
  private readonly sessionService = inject(SessionService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly showWarning = signal(false);
  readonly remainingSeconds = signal(0);
  private dismissed = false;

  ngOnInit(): void {
    this.intervalId = setInterval(() => this.checkExpiry(), 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  dismiss(): void {
    this.showWarning.set(false);
    this.dismissed = true;
  }

  startOver(): void {
    this.sessionService.clearSession();
    window.location.href = '/';
  }

  private checkExpiry(): void {
    if (this.dismissed) return;

    const remaining = this.sessionService.timeUntilExpiry();

    if (remaining > 0 && remaining <= WARNING_THRESHOLD_MS) {
      this.remainingSeconds.set(Math.ceil(remaining / 1000));
      this.showWarning.set(true);
    } else if (remaining <= 0 && this.showWarning()) {
      this.showWarning.set(false);
    }
  }
}
