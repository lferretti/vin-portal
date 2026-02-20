import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionExpiryWarningComponent } from '@shared/components/session-expiry-warning/session-expiry-warning.component';
import { OfflineBannerComponent } from '@shared/components/offline-banner/offline-banner.component';
import { ErrorToastComponent } from '@shared/components/error-toast/error-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SessionExpiryWarningComponent, OfflineBannerComponent, ErrorToastComponent],
  template: `
    <app-offline-banner />
    <div class="page-container">
      <main id="main-content">
        <router-outlet />
      </main>
      <app-session-expiry-warning />
    </div>
    <app-error-toast />
  `,
})
export class AppComponent {
  title = 'VIN Portal';
}
