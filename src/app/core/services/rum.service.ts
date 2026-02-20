import { Injectable } from '@angular/core';
import { datadogRum } from '@datadog/browser-rum';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RumService {
  private initialized = false;

  init(): void {
    if (this.initialized || !environment.datadog.enabled) {
      return;
    }

    datadogRum.init({
      clientToken: environment.datadog.clientToken,
      applicationId: environment.datadog.applicationId,
      site: environment.datadog.site,
      service: environment.datadog.service,
      env: environment.datadog.env,
      sessionSampleRate: environment.datadog.sampleRate,
      trackUserInteractions: environment.datadog.trackInteractions,
      trackResources: environment.datadog.trackResources,
      defaultPrivacyLevel: 'mask-user-input',
    });

    this.initialized = true;
  }

  addError(error: unknown): void {
    if (!this.initialized || !environment.datadog.enabled) {
      return;
    }

    if (error instanceof Error) {
      datadogRum.addError(error);
    } else {
      datadogRum.addError(new Error(String(error)));
    }
  }
}
