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
  // Fallback
  {
    path: '**',
    redirectTo: '',
  },
];
