import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  signal,
  effect,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { SessionService, RumService } from '@core/services';

const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes before expiry

@Component({
  selector: 'app-session-expiry-warning',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showWarning()) {
      <div role="dialog"
           aria-modal="true"
           aria-labelledby="session-expiry-title"
           aria-describedby="session-expiry-desc"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
           (keydown)="onKeydown($event)">
        <div class="mx-4 max-w-sm rounded-lg bg-white p-6 shadow-xl">
          <h2 id="session-expiry-title" class="mb-2 text-lg font-semibold text-gray-900">Session Expiring Soon</h2>
          <p id="session-expiry-desc" class="mb-4 text-gray-600">
            Your session will expire in {{ remainingSeconds() }} seconds. You will lose any unsaved progress.
          </p>
          <div class="flex justify-end gap-3">
            <button
              #dismissBtn
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
  private readonly rumService = inject(RumService);
  private readonly el = inject(ElementRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  readonly showWarning = signal(false);
  readonly remainingSeconds = signal(0);
  private dismissed = false;

  constructor() {
    // Focus the first interactive element when the dialog becomes visible
    effect(() => {
      if (this.showWarning()) {
        this.previouslyFocusedElement = document.activeElement as HTMLElement | null;
        // Defer focus to next microtask so the DOM has rendered
        queueMicrotask(() => this.focusFirstInteractive());
      } else if (this.previouslyFocusedElement) {
        // Restore focus when dialog closes
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }
    });
  }

  ngOnInit(): void {
    this.intervalId = setInterval(() => this.checkExpiry(), 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /** Handle keydown events for focus trap and Escape dismissal */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  dismiss(): void {
    this.rumService.addAction('session_expiry_warning_dismissed');
    this.showWarning.set(false);
    this.dismissed = true;
  }

  startOver(): void {
    this.rumService.addAction('session_expiry_start_over');
    this.sessionService.clearSession();
    window.location.href = '/';
  }

  private checkExpiry(): void {
    if (this.dismissed) return;

    const remaining = this.sessionService.timeUntilExpiry();

    if (remaining > 0 && remaining <= WARNING_THRESHOLD_MS) {
      this.remainingSeconds.set(Math.ceil(remaining / 1000));
      if (!this.showWarning()) {
        this.rumService.addAction('session_expiry_warning_shown');
      }
      this.showWarning.set(true);
    } else if (remaining <= 0 && this.showWarning()) {
      this.showWarning.set(false);
    }
  }

  /** Focus the first focusable element inside the dialog */
  private focusFirstInteractive(): void {
    const host: HTMLElement = this.el.nativeElement;
    const focusable = host.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }

  /** Trap Tab/Shift+Tab within the dialog's focusable elements */
  private trapFocus(event: KeyboardEvent): void {
    const host: HTMLElement = this.el.nativeElement;
    const focusableElements = host.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
