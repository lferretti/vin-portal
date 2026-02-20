import { Routes } from '@angular/router';
import { authGuard, eligibleGuard, otpRequiredGuard } from '@core/guards';

export const consumerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
    title: 'VIN Portal - Add Vehicle',
  },
  {
    path: 'authenticate',
    loadComponent: () =>
      import('./pages/authenticate/authenticate.component').then(
        (m) => m.AuthenticateComponent
      ),
    title: 'Vehicle Lookup - VIN Portal',
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./pages/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
    canActivate: [otpRequiredGuard],
    title: 'Verify Identity - VIN Portal',
  },
  {
    path: 'vin-entry',
    loadComponent: () =>
      import('./pages/vin-entry/vin-entry.component').then((m) => m.VinEntryComponent),
    canActivate: [authGuard],
    title: 'Enter Vehicle VIN - VIN Portal',
  },
  {
    path: 'review',
    loadComponent: () =>
      import('./pages/review/review.component').then((m) => m.ReviewComponent),
    canActivate: [authGuard, eligibleGuard],
    title: 'Review & Confirm - VIN Portal',
  },
  {
    path: 'result/:requestId',
    loadComponent: () =>
      import('./pages/result/result.component').then((m) => m.ResultComponent),
    canActivate: [authGuard],
    title: 'Summary - VIN Portal',
  },
];
