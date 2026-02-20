import { ErrorHandler, Injectable, inject } from '@angular/core';
import { RumService } from './rum.service';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly rumService = inject(RumService);
  private readonly notificationService = inject(NotificationService);

  handleError(error: unknown): void {
    // Report to Datadog RUM
    this.rumService.addError(error);

    // Log to console in all environments
    console.error('Unhandled error:', error);

    // Notify user
    const message = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    this.notificationService.showError(message);
  }
}
