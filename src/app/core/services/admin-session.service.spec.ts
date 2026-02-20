import { TestBed } from '@angular/core/testing';
import { AdminSessionService } from './admin-session.service';
import { AdminLoginResponseData } from '@core/models';

describe('AdminSessionService', () => {
  let service: AdminSessionService;

  const mockLoginData: AdminLoginResponseData = {
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDA5MDB9.test',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    email: 'admin@example.com',
    role: 'admin',
    displayName: 'Test Admin',
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSessionService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should not be authenticated initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return null for token when no session', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return null for email when no session', () => {
      expect(service.email()).toBeNull();
    });

    it('should return null for role when no session', () => {
      expect(service.role()).toBeNull();
    });

    it('should return null for displayName when no session', () => {
      expect(service.displayName()).toBeNull();
    });

    it('should return null for expiresAt when no session', () => {
      expect(service.expiresAt()).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should store all session data in signals', () => {
      service.setSession(mockLoginData);

      expect(service.token()).toBe(mockLoginData.token);
      expect(service.email()).toBe(mockLoginData.email);
      expect(service.role()).toBe(mockLoginData.role);
      expect(service.displayName()).toBe(mockLoginData.displayName);
      expect(service.expiresAt()).toEqual(new Date(mockLoginData.expiresAt));
    });

    it('should set isAuthenticated to true', () => {
      service.setSession(mockLoginData);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should persist session to sessionStorage', () => {
      service.setSession(mockLoginData);

      const stored = sessionStorage.getItem('admin_portal_session');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.token).toBe(mockLoginData.token);
      expect(parsed.email).toBe(mockLoginData.email);
      expect(parsed.role).toBe(mockLoginData.role);
      expect(parsed.displayName).toBe(mockLoginData.displayName);
      expect(parsed.expiresAt).toBe(mockLoginData.expiresAt);
    });
  });

  describe('clearSession', () => {
    it('should clear all session data', () => {
      service.setSession(mockLoginData);
      service.clearSession();

      expect(service.token()).toBeNull();
      expect(service.email()).toBeNull();
      expect(service.role()).toBeNull();
      expect(service.displayName()).toBeNull();
      expect(service.expiresAt()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should remove session from sessionStorage', () => {
      service.setSession(mockLoginData);
      service.clearSession();

      expect(sessionStorage.getItem('admin_portal_session')).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token when session is valid', () => {
      service.setSession(mockLoginData);

      expect(service.getToken()).toBe(mockLoginData.token);
    });

    it('should return null when no session exists', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return null and clear session when expired', () => {
      const expiredData: AdminLoginResponseData = {
        ...mockLoginData,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      service.setSession(expiredData);

      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should auto-clear signals when expired token is requested', () => {
      const expiredData: AdminLoginResponseData = {
        ...mockLoginData,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      service.setSession(expiredData);
      service.getToken(); // Should trigger clearSession

      expect(service.token()).toBeNull();
      expect(service.email()).toBeNull();
      expect(service.role()).toBeNull();
      expect(service.displayName()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should be false when no session', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should be true when session is valid', () => {
      service.setSession(mockLoginData);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should be false when session is expired', () => {
      const expiredData: AdminLoginResponseData = {
        ...mockLoginData,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      service.setSession(expiredData);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should be false after clearSession', () => {
      service.setSession(mockLoginData);
      expect(service.isAuthenticated()).toBe(true);

      service.clearSession();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should restore session from sessionStorage on init', () => {
      const storedSession = {
        token: mockLoginData.token,
        expiresAt: mockLoginData.expiresAt,
        email: mockLoginData.email,
        role: mockLoginData.role,
        displayName: mockLoginData.displayName,
      };
      sessionStorage.setItem('admin_portal_session', JSON.stringify(storedSession));

      // Create a fresh instance that reads from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = new AdminSessionService();

      expect(freshService.token()).toBe(mockLoginData.token);
      expect(freshService.email()).toBe(mockLoginData.email);
      expect(freshService.role()).toBe(mockLoginData.role);
      expect(freshService.displayName()).toBe(mockLoginData.displayName);
      expect(freshService.isAuthenticated()).toBe(true);
    });

    it('should not restore expired session from sessionStorage', () => {
      const expiredSession = {
        token: mockLoginData.token,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        email: mockLoginData.email,
        role: mockLoginData.role,
        displayName: mockLoginData.displayName,
      };
      sessionStorage.setItem('admin_portal_session', JSON.stringify(expiredSession));

      const freshService = new AdminSessionService();

      expect(freshService.token()).toBeNull();
      expect(freshService.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('admin_portal_session')).toBeNull();
    });

    it('should handle corrupted sessionStorage gracefully', () => {
      sessionStorage.setItem('admin_portal_session', '{invalid-json');

      const freshService = new AdminSessionService();

      expect(freshService.token()).toBeNull();
      expect(freshService.isAuthenticated()).toBe(false);
    });
  });
});
