import { Component, input } from '@angular/core';

/**
 * Loading spinner component with optional message
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div
      class="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"
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

