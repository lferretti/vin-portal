import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import {
  mockInterceptor,
  correlationInterceptor,
  authInterceptor,
  errorInterceptor,
} from '@core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        mockInterceptor, // First - intercepts before real API calls
        correlationInterceptor,
        authInterceptor,
        errorInterceptor,
      ])
    ),
  ],
};
