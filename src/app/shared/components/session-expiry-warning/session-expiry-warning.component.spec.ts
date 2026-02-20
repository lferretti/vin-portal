import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { SessionExpiryWarningComponent } from './session-expiry-warning.component';
import { SessionService } from '@core/services';

describe('SessionExpiryWarningComponent', () => {
  let component: SessionExpiryWarningComponent;
  let fixture: ComponentFixture<SessionExpiryWarningComponent>;
  let mockSessionService: { timeUntilExpiry: jest.Mock; clearSession: jest.Mock };

  beforeEach(async () => {
    mockSessionService = {
      timeUntilExpiry: jest.fn().mockReturnValue(300000), // 5 minutes
      clearSession: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SessionExpiryWarningComponent],
      providers: [
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SessionExpiryWarningComponent);
    component = fixture.componentInstance;
  }

  it('should create', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
    discardPeriodicTasks();
  }));

  it('should not show warning when session has plenty of time', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    expect(component.showWarning()).toBe(false);
    discardPeriodicTasks();
  }));

  it('should show warning when session is about to expire', fakeAsync(() => {
    mockSessionService.timeUntilExpiry.mockReturnValue(90000); // 90 seconds left
    createComponent();
    fixture.detectChanges();

    // Trigger the interval check
    tick(5000);
    fixture.detectChanges();

    expect(component.showWarning()).toBe(true);
    expect(component.remainingSeconds()).toBe(90);
    component.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('should dismiss warning when dismiss button clicked', fakeAsync(() => {
    mockSessionService.timeUntilExpiry.mockReturnValue(60000);
    createComponent();
    fixture.detectChanges();
    tick(5000);
    fixture.detectChanges();

    component.dismiss();
    fixture.detectChanges();

    expect(component.showWarning()).toBe(false);
    component.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('should clear session and redirect on start over', fakeAsync(() => {
    mockSessionService.timeUntilExpiry.mockReturnValue(60000);
    createComponent();
    fixture.detectChanges();
    tick(5000);

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });

    component.startOver();

    expect(mockSessionService.clearSession).toHaveBeenCalled();
    expect(window.location.href).toBe('/');

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    component.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('should show remaining seconds in the warning', fakeAsync(() => {
    mockSessionService.timeUntilExpiry.mockReturnValue(45000); // 45 seconds
    createComponent();
    fixture.detectChanges();
    tick(5000);
    fixture.detectChanges();

    expect(component.remainingSeconds()).toBe(45);
    component.ngOnDestroy();
    discardPeriodicTasks();
  }));
});
