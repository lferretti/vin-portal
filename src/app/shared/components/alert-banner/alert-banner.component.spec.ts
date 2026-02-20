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

  it('should default to info type', () => {
    expect(component.type()).toBe('info');
  });

  it('should default dismissible to false', () => {
    expect(component.dismissible()).toBe(false);
  });

  it('should render with role="alert"', () => {
    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
  });

  describe('type variants', () => {
    const testCases: { type: AlertType; expectedBgClass: string; expectedTextClass: string; icon: string }[] = [
      { type: 'success', expectedBgClass: 'bg-green-50', expectedTextClass: 'text-green-800', icon: '\u2713' },
      { type: 'warning', expectedBgClass: 'bg-yellow-50', expectedTextClass: 'text-yellow-800', icon: '\u26A0' },
      { type: 'error', expectedBgClass: 'bg-red-50', expectedTextClass: 'text-red-800', icon: '\u2715' },
      { type: 'info', expectedBgClass: 'bg-blue-50', expectedTextClass: 'text-blue-800', icon: '\u2139' },
    ];

    testCases.forEach(({ type, expectedBgClass, expectedTextClass, icon }) => {
      it(`should display ${type} alert with correct styling and icon`, () => {
        fixture.componentRef.setInput('type', type);
        fixture.detectChanges();

        const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
        expect(alertEl.className).toContain(expectedBgClass);
        expect(alertEl.className).toContain(expectedTextClass);
        expect(component.icon()).toBe(icon);
      });
    });
  });

  describe('icon rendering in DOM', () => {
    it('should render the icon in a span element', () => {
      fixture.componentRef.setInput('type', 'success');
      fixture.detectChanges();

      const iconSpan = fixture.nativeElement.querySelector('span.text-lg');
      expect(iconSpan).toBeTruthy();
      expect(iconSpan.textContent.trim()).toBe('\u2713');
    });
  });

  describe('aria-live', () => {
    it('should use assertive for error alerts', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl.getAttribute('aria-live')).toBe('assertive');
    });

    it('should use polite for info alerts', () => {
      fixture.componentRef.setInput('type', 'info');
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl.getAttribute('aria-live')).toBe('polite');
    });

    it('should use polite for success alerts', () => {
      fixture.componentRef.setInput('type', 'success');
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl.getAttribute('aria-live')).toBe('polite');
    });

    it('should use polite for warning alerts', () => {
      fixture.componentRef.setInput('type', 'warning');
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

    it('should not show dismiss button when dismissible is false', () => {
      fixture.componentRef.setInput('dismissible', false);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      expect(dismissBtn).toBeNull();
    });

    it('should show dismiss button when dismissible is true', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      expect(dismissBtn).toBeTruthy();
    });

    it('should have proper aria-label on dismiss button', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('button');
      expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('should emit dismiss event when button clicked', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const dismissSpy = jest.fn();
      component.dismiss.subscribe(dismissSpy);

      const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
      dismissBtn.click();

      expect(dismissSpy).toHaveBeenCalledTimes(1);
    });

    it('should contain an SVG icon in the dismiss button', () => {
      fixture.componentRef.setInput('dismissible', true);
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('button svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('icon computed signal', () => {
    it('should return correct icon for each type', () => {
      const icons: Record<AlertType, string> = {
        success: '\u2713',
        warning: '\u26A0',
        error: '\u2715',
        info: '\u2139',
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
      expect(classes).toContain('gap-3');
      expect(classes).toContain('p-4');
      expect(classes).toContain('rounded-lg');
      expect(classes).toContain('animate-fade-in');
    });

    it('should include type-specific classes for error', () => {
      fixture.componentRef.setInput('type', 'error');
      fixture.detectChanges();

      const classes = component.alertClasses();
      expect(classes).toContain('bg-red-50');
      expect(classes).toContain('text-red-800');
      expect(classes).toContain('border-red-200');
    });

    it('should include type-specific classes for success', () => {
      fixture.componentRef.setInput('type', 'success');
      fixture.detectChanges();

      const classes = component.alertClasses();
      expect(classes).toContain('bg-green-50');
      expect(classes).toContain('text-green-800');
      expect(classes).toContain('border-green-200');
    });
  });
});
