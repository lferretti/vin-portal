import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Application header component with logo and support link
 */
@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header
      class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm"
    >
      <a routerLink="/" class="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div
          class="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
        >
          VP
        </div>
        <span class="font-display hidden text-lg font-semibold text-slate-900 sm:inline">
          Vehicle Protection Portal
        </span>
      </a>
      <nav>
        <a
          href="/support"
          class="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors hover:underline"
        >
          Need Help?
        </a>
      </nav>
    </header>
  `,
})
export class HeaderComponent {}

