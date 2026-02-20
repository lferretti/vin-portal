import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineBannerComponent } from './offline-banner.component';

describe('OfflineBannerComponent', () => {
  let component: OfflineBannerComponent;
  let fixture: ComponentFixture<OfflineBannerComponent>;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let originalOnLine: boolean;

  beforeEach(async () => {
    // Save original navigator.onLine value
    originalOnLine = navigator.onLine;

    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    await TestBed.configureTestingModule({
      imports: [OfflineBannerComponent],
    }).compileComponents();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(OfflineBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('when online', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      createComponent();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should set isOffline to false', () => {
      expect(component.isOffline()).toBe(false);
    });

    it('should not render the offline banner', () => {
      const banner = fixture.nativeElement.querySelector('[role="alert"]');
      expect(banner).toBeNull();
    });
  });

  describe('when offline', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      createComponent();
    });

    it('should set isOffline to true', () => {
      expect(component.isOffline()).toBe(true);
    });

    it('should render the offline banner', () => {
      const banner = fixture.nativeElement.querySelector('[role="alert"]');
      expect(banner).toBeTruthy();
    });

    it('should display the offline message', () => {
      const banner = fixture.nativeElement.querySelector('[role="alert"]');
      expect(banner.textContent).toContain(
        'You are currently offline. Some features may be unavailable.'
      );
    });

    it('should have proper styling classes', () => {
      const banner = fixture.nativeElement.querySelector('[role="alert"]');
      expect(banner.className).toContain('bg-amber-500');
      expect(banner.className).toContain('text-amber-950');
      expect(banner.className).toContain('text-center');
    });
  });

  describe('event listeners', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      createComponent();
    });

    it('should register online event listener on init', () => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should register offline event listener on init', () => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove online event listener on destroy', () => {
      fixture.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should remove offline event listener on destroy', () => {
      fixture.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('online/offline transitions', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      createComponent();
    });

    it('should show banner when going offline', () => {
      expect(component.isOffline()).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();

      // Simulate going offline
      window.dispatchEvent(new Event('offline'));
      fixture.detectChanges();

      expect(component.isOffline()).toBe(true);
      const banner = fixture.nativeElement.querySelector('[role="alert"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('You are currently offline');
    });

    it('should hide banner when coming back online', () => {
      // Start offline
      window.dispatchEvent(new Event('offline'));
      fixture.detectChanges();
      expect(component.isOffline()).toBe(true);

      // Come back online
      window.dispatchEvent(new Event('online'));
      fixture.detectChanges();

      expect(component.isOffline()).toBe(false);
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('should handle multiple offline/online transitions', () => {
      // Go offline
      window.dispatchEvent(new Event('offline'));
      fixture.detectChanges();
      expect(component.isOffline()).toBe(true);

      // Come back online
      window.dispatchEvent(new Event('online'));
      fixture.detectChanges();
      expect(component.isOffline()).toBe(false);

      // Go offline again
      window.dispatchEvent(new Event('offline'));
      fixture.detectChanges();
      expect(component.isOffline()).toBe(true);

      // Come back online again
      window.dispatchEvent(new Event('online'));
      fixture.detectChanges();
      expect(component.isOffline()).toBe(false);
    });
  });
});
