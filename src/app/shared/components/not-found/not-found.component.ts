import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div class="max-w-md text-center">
        <h1 class="mb-4 text-6xl font-bold text-gray-300">404</h1>
        <h2 class="mb-2 text-2xl font-semibold text-gray-800">Page Not Found</h2>
        <p class="mb-8 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a routerLink="/"
           class="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
          Return to Home
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
