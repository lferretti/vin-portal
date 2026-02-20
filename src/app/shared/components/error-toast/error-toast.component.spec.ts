import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorToastComponent } from './error-toast.component';
import { NotificationService } from '@core/services/notification.service';

describe('ErrorToastComponent', () => {
  let component: ErrorToastComponent;
  let fixture: ComponentFixture<ErrorToastComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    jest.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [ErrorToastComponent],
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(ErrorToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have an aria-live="assertive" container with role="alert"', () => {
    const container = fixture.nativeElement.querySelector('[role="alert"]');
    expect(container).toBeTruthy();
    expect(container.getAttribute('aria-live')).toBe('assertive');
  });

  describe('rendering notifications', () => {
    it('should render nothing when there are no notifications', () => {
      const toasts = fixture.nativeElement.querySelectorAll('.rounded-lg');
      expect(toasts).toHaveLength(0);
    });

    it('should render a single error notification', () => {
      notificationService.showError('Something failed');
      fixture.detectChanges();

      const toasts = fixture.nativeElement.querySelectorAll('.rounded-lg');
      expect(toasts).toHaveLength(1);

      const message = toasts[0].querySelector('p');
      expect(message.textContent).toContain('Something failed');
    });

    it('should render multiple notifications', () => {
      notificationService.showError('Error occurred');
      notificationService.showWarning('Warning issued');
      notificationService.showInfo('Info message');
      fixture.detectChanges();

      const toasts = fixture.nativeElement.querySelectorAll('.rounded-lg');
      expect(toasts).toHaveLength(3);
    });

    it('should display notification messages in order', () => {
      notificationService.showError('First');
      notificationService.showWarning('Second');
      notificationService.showInfo('Third');
      fixture.detectChanges();

      const messages = fixture.nativeElement.querySelectorAll('.rounded-lg p');
      expect(messages[0].textContent).toContain('First');
      expect(messages[1].textContent).toContain('Second');
      expect(messages[2].textContent).toContain('Third');
    });
  });

  describe('CSS classes per notification type', () => {
    it('should apply error classes for error notifications', () => {
      notificationService.showError('Error');
      fixture.detectChanges();

      const toast = fixture.nativeElement.querySelector('.rounded-lg');
      expect(toast.className).toContain('bg-red-50');
      expect(toast.className).toContain('text-red-800');
      expect(toast.className).toContain('border-red-200');
    });

    it('should apply warning classes for warning notifications', () => {
      notificationService.showWarning('Warning');
      fixture.detectChanges();

      const toast = fixture.nativeElement.querySelector('.rounded-lg');
      expect(toast.className).toContain('bg-yellow-50');
      expect(toast.className).toContain('text-yellow-800');
      expect(toast.className).toContain('border-yellow-200');
    });

    it('should apply info classes for info notifications', () => {
      notificationService.showInfo('Info');
      fixture.detectChanges();

      const toast = fixture.nativeElement.querySelector('.rounded-lg');
      expect(toast.className).toContain('bg-blue-50');
      expect(toast.className).toContain('text-blue-800');
      expect(toast.className).toContain('border-blue-200');
    });
  });

  describe('icons', () => {
    it('should display error icon for error notifications', () => {
      notificationService.showError('Error');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.rounded-lg span');
      expect(icon.textContent.trim()).toBe('\u2715');
    });

    it('should display warning icon for warning notifications', () => {
      notificationService.showWarning('Warning');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.rounded-lg span');
      expect(icon.textContent.trim()).toBe('\u26A0');
    });

    it('should display info icon for info notifications', () => {
      notificationService.showInfo('Info');
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.rounded-lg span');
      expect(icon.textContent.trim()).toBe('\u2139');
    });
  });

  describe('dismiss button', () => {
    it('should render a dismiss button for each notification', () => {
      notificationService.showError('Error 1');
      notificationService.showWarning('Error 2');
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll(
        'button[aria-label="Dismiss notification"]'
      );
      expect(buttons).toHaveLength(2);
    });

    it('should call service.dismiss() when dismiss button is clicked', () => {
      notificationService.showError('Dismiss me');
      fixture.detectChanges();

      const dismissSpy = jest.spyOn(notificationService, 'dismiss');
      const notificationId = notificationService.notifications()[0].id;

      const button = fixture.nativeElement.querySelector(
        'button[aria-label="Dismiss notification"]'
      );
      button.click();

      expect(dismissSpy).toHaveBeenCalledWith(notificationId);
    });

    it('should remove the notification from the DOM after dismiss', () => {
      notificationService.showError('Will be dismissed');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.rounded-lg')).toHaveLength(1);

      const button = fixture.nativeElement.querySelector(
        'button[aria-label="Dismiss notification"]'
      );
      button.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.rounded-lg')).toHaveLength(0);
    });

    it('should contain an SVG icon inside the dismiss button', () => {
      notificationService.showInfo('Has close icon');
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector(
        'button[aria-label="Dismiss notification"] svg'
      );
      expect(svg).toBeTruthy();
    });
  });

  describe('toastClasses method', () => {
    it('should return correct class string for each type', () => {
      const testCases: { type: 'error' | 'warning' | 'info'; expected: string }[] = [
        { type: 'error', expected: 'bg-red-50 text-red-800 border border-red-200' },
        { type: 'warning', expected: 'bg-yellow-50 text-yellow-800 border border-yellow-200' },
        { type: 'info', expected: 'bg-blue-50 text-blue-800 border border-blue-200' },
      ];

      testCases.forEach(({ type, expected }) => {
        const notification = { id: 1, message: 'test', type, timestamp: Date.now() };
        // Access the protected method via bracket notation for testing
        const classes = (component as unknown as Record<string, Function>)['toastClasses'](
          notification
        );
        expect(classes).toBe(expected);
      });
    });
  });

  describe('icon method', () => {
    it('should return correct icon for each type', () => {
      const testCases: { type: 'error' | 'warning' | 'info'; expected: string }[] = [
        { type: 'error', expected: '\u2715' },
        { type: 'warning', expected: '\u26A0' },
        { type: 'info', expected: '\u2139' },
      ];

      testCases.forEach(({ type, expected }) => {
        const notification = { id: 1, message: 'test', type, timestamp: Date.now() };
        const icon = (component as unknown as Record<string, Function>)['icon'](notification);
        expect(icon).toBe(expected);
      });
    });
  });
});
