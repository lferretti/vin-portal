import { TestBed } from '@angular/core/testing';
import { NotificationService, Notification } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty notifications list', () => {
    expect(service.notifications()).toEqual([]);
  });

  describe('showError', () => {
    it('should add an error notification', () => {
      service.showError('Something went wrong');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Something went wrong');
      expect(notifications[0].type).toBe('error');
    });

    it('should assign a unique id', () => {
      service.showError('Error 1');
      service.showError('Error 2');

      const notifications = service.notifications();
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });

    it('should include a timestamp', () => {
      const now = Date.now();
      jest.setSystemTime(now);

      service.showError('Error with timestamp');

      expect(service.notifications()[0].timestamp).toBe(now);
    });
  });

  describe('showWarning', () => {
    it('should add a warning notification', () => {
      service.showWarning('Be careful');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Be careful');
      expect(notifications[0].type).toBe('warning');
    });
  });

  describe('showInfo', () => {
    it('should add an info notification', () => {
      service.showInfo('FYI this happened');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('FYI this happened');
      expect(notifications[0].type).toBe('info');
    });
  });

  describe('multiple notifications', () => {
    it('should accumulate notifications in order', () => {
      service.showError('Error');
      service.showWarning('Warning');
      service.showInfo('Info');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(3);
      expect(notifications[0].type).toBe('error');
      expect(notifications[1].type).toBe('warning');
      expect(notifications[2].type).toBe('info');
    });
  });

  describe('dismiss', () => {
    it('should remove a notification by id', () => {
      service.showError('Error 1');
      service.showWarning('Warning 1');

      const notifications = service.notifications();
      expect(notifications).toHaveLength(2);

      const idToRemove = notifications[0].id;
      service.dismiss(idToRemove);

      expect(service.notifications()).toHaveLength(1);
      expect(service.notifications()[0].type).toBe('warning');
    });

    it('should be a no-op when dismissing a non-existent id', () => {
      service.showInfo('Stays here');

      service.dismiss(99999);

      expect(service.notifications()).toHaveLength(1);
    });

    it('should remove only the targeted notification', () => {
      service.showError('First');
      service.showWarning('Second');
      service.showInfo('Third');

      const middleId = service.notifications()[1].id;
      service.dismiss(middleId);

      const remaining = service.notifications();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].message).toBe('First');
      expect(remaining[1].message).toBe('Third');
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss after 8000ms', () => {
      service.showError('Will auto-dismiss');

      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(7999);
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(service.notifications()).toHaveLength(0);
    });

    it('should auto-dismiss each notification independently', () => {
      service.showError('First');

      jest.advanceTimersByTime(3000);
      service.showWarning('Second');

      // At 8000ms: first should be dismissed, second still has 3000ms left
      jest.advanceTimersByTime(5000);
      expect(service.notifications()).toHaveLength(1);
      expect(service.notifications()[0].message).toBe('Second');

      // At 11000ms: second should also be dismissed
      jest.advanceTimersByTime(3000);
      expect(service.notifications()).toHaveLength(0);
    });

    it('should not fail if notification is manually dismissed before auto-dismiss', () => {
      service.showError('Manual dismiss first');

      const id = service.notifications()[0].id;
      service.dismiss(id);

      expect(service.notifications()).toHaveLength(0);

      // Auto-dismiss timer fires, but notification is already gone -- should not throw
      expect(() => jest.advanceTimersByTime(8000)).not.toThrow();
      expect(service.notifications()).toHaveLength(0);
    });
  });

  describe('notification shape', () => {
    it('should produce a valid Notification object', () => {
      service.showInfo('Test message');

      const notification: Notification = service.notifications()[0];
      expect(notification).toEqual(
        expect.objectContaining({
          message: 'Test message',
          type: 'info',
        })
      );
      expect(typeof notification.id).toBe('number');
      expect(typeof notification.timestamp).toBe('number');
    });
  });
});
