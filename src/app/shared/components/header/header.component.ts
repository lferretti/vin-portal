import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Application header component with logo and support link
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header
      class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm"
    >
      <a routerLink="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div
          class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg"
        >
          VP
        </div>
        <span class="font-display font-semibold text-slate-900 text-lg hidden sm:inline">
          Vehicle Protection Portal
        </span>
      </a>
      <nav>
        <a
          href="/support"
          class="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium transition-colors"
        >
          Need Help?
        </a>
      </nav>
    </header>
  `,
})
export class HeaderComponent {}

