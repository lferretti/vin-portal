import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOffline()) {
      <div
        role="alert"
        class="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
      >
        You are currently offline. Some features may be unavailable.
      </div>
    }
  `,
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  readonly isOffline = signal(!navigator.onLine);

  private readonly onOnline = () => this.isOffline.set(false);
  private readonly onOffline = () => this.isOffline.set(true);

  ngOnInit(): void {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
