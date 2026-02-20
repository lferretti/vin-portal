import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/**
 * Loading spinner component with optional message
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        class="border-primary-200 border-t-primary-600 h-8 w-8 animate-spin rounded-full border-4"
      ></div>
      @if (message()) {
        <p class="text-sm text-slate-600">{{ message() }}</p>
      }
      <span class="sr-only">Loading...</span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  message = input<string>('');
}

