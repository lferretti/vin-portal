import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, ErrorHandler, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import {
  mockInterceptor,
  deduplicationInterceptor,
  correlationInterceptor,
  authInterceptor,
  errorInterceptor,
} from '@core/interceptors';
import { RumService } from '@core/services';
import { GlobalErrorHandler } from '@core/services/global-error-handler';

function initializeRum(): () => void {
  const rumService = inject(RumService);
  return () => rumService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        mockInterceptor, // First - intercepts before real API calls
        deduplicationInterceptor, // Dedup before headers are added
        correlationInterceptor,
        authInterceptor,
        errorInterceptor,
      ])
    ),
    { provide: APP_INITIALIZER, useFactory: initializeRum, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
