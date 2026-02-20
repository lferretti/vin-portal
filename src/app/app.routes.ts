import { Routes } from '@angular/router';

export const routes: Routes = [
  // Consumer portal routes
  {
    path: '',
    loadChildren: () =>
      import('./features/consumer/consumer.routes').then((m) => m.consumerRoutes),
  },
  // Admin portal routes (lazy loaded)
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  // 404 - Not Found
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
