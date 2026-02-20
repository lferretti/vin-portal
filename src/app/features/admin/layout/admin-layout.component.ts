import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminSessionService } from '@core/services';

/**
 * Admin portal layout with responsive sidebar navigation.
 * On desktop (lg+), sidebar is always visible.
 * On mobile, sidebar is hidden behind a hamburger toggle.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen bg-slate-100">
      <!-- Mobile overlay -->
      @if (sidebarOpen()) {
        <div
          class="fixed inset-0 z-30 bg-black/50 lg:hidden"
          role="button"
          tabindex="0"
          aria-label="Close sidebar"
          (click)="sidebarOpen.set(false)"
          (keydown.enter)="sidebarOpen.set(false)"
          (keydown.escape)="sidebarOpen.set(false)"
        ></div>
      }

      <!-- Sidebar -->
      <aside
        class="sidebar w-64 flex-shrink-0 bg-slate-800 text-white"
        [class.sidebar-open]="sidebarOpen()"
      >
        <div class="p-6">
          <a routerLink="/admin" class="flex items-center gap-3" (click)="closeSidebarOnMobile()">
            <div
              class="bg-primary-600 flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
            >
              VP
            </div>
            <div>
              <h1 class="font-display font-semibold">VIN Portal</h1>
              <span class="text-xs text-slate-400">Admin Dashboard</span>
            </div>
          </a>
        </div>

        <nav aria-label="Admin navigation" class="px-4 py-2">
          <ul class="space-y-1">
            <li>
              <a
                routerLink="/admin"
                routerLinkActive="bg-slate-700 text-white"
                [routerLinkActiveOptions]="{ exact: true }"
                class="flex items-center gap-3 rounded-lg px-4 py-2.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                (click)="closeSidebarOnMobile()"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                class="flex items-center gap-3 rounded-lg px-4 py-2.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                (click)="closeSidebarOnMobile()"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div class="px-4 py-4 border-t border-slate-700">
          @if (displayName()) {
            <div class="mb-3">
              <div class="text-sm font-medium text-slate-200">{{ displayName() }}</div>
              <div class="text-xs text-slate-400">{{ email() }}</div>
              <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                [class]="role() === 'admin' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'">
                {{ role() === 'admin' ? 'Security / Admin' : 'Support' }}
              </span>
            </div>
          }
          <button
            (click)="logout()"
            class="w-full text-left text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
          <a routerLink="/" class="block mt-2 text-sm text-slate-400 hover:text-white transition-colors">
            Back to Consumer Portal
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="main-content flex min-w-0 flex-1 flex-col">
        <header class="border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Mobile hamburger -->
              <button
                type="button"
                class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="Toggle sidebar"
                (click)="sidebarOpen.set(!sidebarOpen())"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 class="font-display font-semibold text-slate-900">
                <ng-content select="[slot=header-title]"></ng-content>
              </h2>
            </div>
            <div class="text-sm text-slate-500">
              Support Portal
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-auto p-4 lg:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      aside.sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 40;
        transform: translateX(-100%);
        transition: transform 0.2s ease-in-out;
      }

      aside.sidebar-open {
        transform: translateX(0);
      }

      .main-content {
        margin-left: 0;
      }

      @media (min-width: 1024px) {
        aside.sidebar {
          transform: translateX(0);
        }

        .main-content {
          margin-left: 16rem;
        }
      }
    `,
  ],
})
export class AdminLayoutComponent {
  private readonly adminSession = inject(AdminSessionService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly displayName = this.adminSession.displayName;
  readonly role = this.adminSession.role;
  readonly email = this.adminSession.email;

  closeSidebarOnMobile(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.adminSession.clearSession();
    this.router.navigate(['/admin/login']);
  }
}

