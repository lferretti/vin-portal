import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertBannerComponent, AlertType } from './alert-banner.component';

describe('AlertBannerComponent', () => {
  let component: AlertBannerComponent;
  let fixture: ComponentFixture<AlertBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('type variants', () => {
    const testCases: { type: AlertType; expectedClass: string; icon: string }[] = [
      { type: 'success', expectedClass: 'bg-green-50', icon: '✓' },
      { type: 'warning', expectedClass: 'bg-yellow-50', icon: '⚠' },
      { type: 'error', expectedClass: 'bg-red-50', icon: '✕' },
      { type: 'info', expectedClass: 'bg-blue-50', icon: 'ℹ' },
    ];

    testCases.forEach(({ type, expectedClass, icon }) => {
      it(`should display ${type} alert with correct styling`, () => {
        fixture.componentRef.setInput('type', type);
        fixture.detectChanges();

        const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alertEl.className).toContain(expectedClass);
        expect(component.icon()).toBe(icon);
      });
    });
  });

  describe('aria-live', () => {
    it('should use assertive for error alerts', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl.getAttribute('aria-live')).toBe('assertive');
    });

    it('should use polite for non-error alerts', () => {
      fixture.componentRef.setInput('type', 'info');
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('dismissible', () => {
    it('should not show dismiss button by default', () => {
      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      expect(dismissBtn).toBeNull();
    });

    it('should show dismiss button when dismissible', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      expect(dismissBtn).toBeTruthy();
    });

    it('should emit dismiss event when button clicked', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const dismissSpy = jest.fn();
      component.dismiss.subscribe(dismissSpy);

      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      dismissBtn.click();

      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('icon computed signal', () => {
    it('should return correct icon for each type', () => {
      const icons: Record<AlertType, string> = {
        success: '✓',
        warning: '⚠',
        error: '✕',
        info: 'ℹ',
      };

      (Object.keys(icons) as AlertType[]).forEach((type) => {
        fixture.componentRef.setInput('type', type);
        fixture.detectChanges();
        expect(component.icon()).toBe(icons[type]);
      });
    });
  });

  describe('alertClasses computed signal', () => {
    it('should include base classes', () => {
      const classes = component.alertClasses();
      expect(classes).toContain('flex');
      expect(classes).toContain('items-start');
      expect(classes).toContain('rounded-lg');
    });

    it('should include type-specific classes', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const classes = component.alertClasses();
      expect(classes).toContain('bg-red-50');
      expect(classes).toContain('text-red-800');
    });
  });
});
