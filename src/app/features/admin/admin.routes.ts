import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { adminAuthGuard } from '@core/guards';

/**
 * Admin portal routes with layout wrapper.
 * /admin/login is unguarded (public login page).
 * All other /admin routes require admin authentication.
 */
export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      ),
    title: 'Admin Login - VIN Portal',
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
        title: 'Admin Dashboard - VIN Portal',
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/contract-search/contract-search.component').then(
            (m) => m.ContractSearchComponent
          ),
        title: 'Search Contracts - VIN Portal Admin',
      },
      {
        path: 'contract/:contractContextId',
        loadComponent: () =>
          import('./pages/contract-detail/contract-detail.component').then(
            (m) => m.ContractDetailComponent
          ),
        title: 'Contract Detail - VIN Portal Admin',
      },
      {
        path: 'request/:requestId',
        loadComponent: () =>
          import('./pages/request-detail/request-detail.component').then(
            (m) => m.RequestDetailComponent
          ),
        title: 'Request Detail - VIN Portal Admin',
      },
    ],
  },
];
