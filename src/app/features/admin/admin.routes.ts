import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { authGuard } from '@core/guards';

/**
 * Admin portal routes with layout wrapper
 */
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
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
