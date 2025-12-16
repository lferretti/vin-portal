import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Admin portal layout with sidebar navigation
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-100 flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-800 text-white flex-shrink-0">
        <div class="p-6">
          <a routerLink="/admin" class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold"
            >
              VP
            </div>
            <div>
              <h1 class="font-display font-semibold">VIN Portal</h1>
              <span class="text-xs text-slate-400">Admin Dashboard</span>
            </div>
          </a>
        </div>

        <nav class="px-4 py-2">
          <ul class="space-y-1">
            <li>
              <a
                routerLink="/admin"
                routerLinkActive="bg-slate-700 text-white"
                [routerLinkActiveOptions]="{ exact: true }"
                class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <a
                routerLink="/admin/search"
                routerLinkActive="bg-slate-700 text-white"
                class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search Contracts
              </a>
            </li>
          </ul>
        </nav>

        <div class="absolute bottom-0 left-0 w-64 p-4 border-t border-slate-700">
          <a
            href="/"
            class="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 17l-5-5m0 0l5-5m-5 5h12"
              />
            </svg>
            Back to Consumer Portal
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col">
        <header class="bg-white border-b border-slate-200 px-8 py-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-semibold text-slate-900">
              <ng-content select="[slot=header-title]"></ng-content>
            </h2>
            <div class="text-sm text-slate-500">
              Support Portal
            </div>
          </div>
        </header>

        <main class="flex-1 p-8 overflow-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      aside {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
      }
      .flex-1 {
        margin-left: 16rem;
      }
    `,
  ],
})
export class AdminLayoutComponent {}

