import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService, Notification } from '@core/services/notification.service';

@Component({
  selector: 'app-error-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <div
      class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
      aria-live="assertive"
      role="alert"
    >
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          [ngClass]="toastClasses(notification)"
          class="animate-fade-in flex items-start gap-3 rounded-lg p-4 shadow-lg"
        >
          <span class="flex-shrink-0 text-lg">{{ icon(notification) }}</span>
          <p class="flex-1 text-sm">{{ notification.message }}</p>
          <button
            type="button"
            (click)="notificationService.dismiss(notification.id)"
            aria-label="Dismiss notification"
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
        </div>
      }
    </div>
  `,
})
export class ErrorToastComponent {
  protected readonly notificationService = inject(NotificationService);

  protected toastClasses(notification: Notification): string {
    const variants: Record<Notification['type'], string> = {
      error: 'bg-red-50 text-red-800 border border-red-200',
      warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      info: 'bg-blue-50 text-blue-800 border border-blue-200',
    };
    return variants[notification.type];
  }

  protected icon(notification: Notification): string {
    const icons: Record<Notification['type'], string> = {
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[notification.type];
  }
}
