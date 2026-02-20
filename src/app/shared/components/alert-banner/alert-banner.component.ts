import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

/**
 * Alert banner component for displaying messages
 * Supports success, warning, error, and info variants
 */
@Component({
  selector: 'app-alert-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <div
      [ngClass]="alertClasses()"
      role="alert"
      [attr.aria-live]="type() === 'error' ? 'assertive' : 'polite'"
    >
      <span class="flex-shrink-0 text-lg">{{ icon() }}</span>
      <div class="flex-1 text-sm">
        <ng-content></ng-content>
      </div>
      @if (dismissible()) {
        <button
          type="button"
          (click)="dismiss.emit()"
          aria-label="Dismiss"
          class="-m-1 p-1 text-current opacity-70 transition-opacity hover:opacity-100"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      }
    </div>
  `,
})
export class AlertBannerComponent {
  type = input<AlertType>('info');
  dismissible = input<boolean>(false);
  dismiss = output<void>();

  icon = computed(() => {
    const icons: Record<AlertType, string> = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ',
    };
    return icons[this.type()];
  });

  alertClasses = computed(() => {
    const base = 'flex items-start gap-3 p-4 rounded-lg animate-fade-in';
    const variants: Record<AlertType, string> = {
      success: 'bg-green-50 text-green-800 border border-green-200',
      warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      error: 'bg-red-50 text-red-800 border border-red-200',
      info: 'bg-blue-50 text-blue-800 border border-blue-200',
    };
    return `${base} ${variants[this.type()]}`;
  });
}

