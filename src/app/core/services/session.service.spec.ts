import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { AuthenticateSuccessData } from '@core/models';

describe('SessionService', () => {
  let service: SessionService;

  const mockSessionData: AuthenticateSuccessData = {
    contractContextId: 'test-context-id',
    sessionToken: 'eyJhbGciOiJIUzI1NiJ9.eyJjb250cmFjdENvbnRleHRJZCI6InRlc3QiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDkwMH0.test',
    sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    otp: {
      status: 'NOT_REQUIRED',
      otpChallengeId: null,
      maskedDestination: null,
      channel: null,
    },
    contractSummary: {
      primaryVinMasked: '1HG******1234',
      hasAdditionalVin: false,
    },
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should return false for isAuthenticated when no session', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return null for token when no session', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return null for contractContextId when no session', () => {
      expect(service.contractContextId()).toBeNull();
    });
  });

  describe('setSession', () => {
    it('should store session data', () => {
      service.setSession(mockSessionData);

      expect(service.token()).toBe(mockSessionData.sessionToken);
      expect(service.contractContextId()).toBe(mockSessionData.contractContextId);
      expect(service.contractSummary()).toEqual(mockSessionData.contractSummary);
    });

    it('should set isAuthenticated to true', () => {
      service.setSession(mockSessionData);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should persist session to sessionStorage', () => {
      service.setSession(mockSessionData);

      const stored = sessionStorage.getItem('vin_portal_session');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.token).toBe(mockSessionData.sessionToken);
    });
  });

  describe('getToken', () => {
    it('should return token when session is valid', () => {
      service.setSession(mockSessionData);

      expect(service.getToken()).toBe(mockSessionData.sessionToken);
    });

    it('should return null and clear session when expired', () => {
      const expiredData: AuthenticateSuccessData = {
        ...mockSessionData,
        sessionExpiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      service.setSession(expiredData);

      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('should clear all session data', () => {
      service.setSession(mockSessionData);
      service.clearSession();

      expect(service.token()).toBeNull();
      expect(service.contractContextId()).toBeNull();
      expect(service.contractSummary()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should remove session from sessionStorage', () => {
      service.setSession(mockSessionData);
      service.clearSession();

      expect(sessionStorage.getItem('vin_portal_session')).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('should return true when no session', () => {
      expect(service.isExpired()).toBe(true);
    });

    it('should return false when session is valid', () => {
      service.setSession(mockSessionData);

      expect(service.isExpired()).toBe(false);
    });

    it('should return true when session is expired', () => {
      const expiredData: AuthenticateSuccessData = {
        ...mockSessionData,
        sessionExpiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      service.setSession(expiredData);

      expect(service.isExpired()).toBe(true);
    });
  });

  describe('redirect URL', () => {
    it('should store and consume redirect URL', () => {
      service.setRedirectUrl('/vin-entry');

      expect(service.consumeRedirectUrl()).toBe('/vin-entry');
      expect(service.consumeRedirectUrl()).toBeNull(); // Should be cleared
    });
  });

  describe('updateContractSummary', () => {
    it('should update contract summary', () => {
      service.setSession(mockSessionData);

      const updatedSummary = {
        primaryVinMasked: '1HG******1234',
        hasAdditionalVin: true,
      };

      service.updateContractSummary(updatedSummary);

      expect(service.contractSummary()).toEqual(updatedSummary);
    });
  });

  describe('persistence', () => {
    it('should restore session from sessionStorage on init', () => {
      // Manually set sessionStorage
      const storedSession = {
        token: mockSessionData.sessionToken,
        expiresAt: mockSessionData.sessionExpiresAt,
        contractContextId: mockSessionData.contractContextId,
        contractSummary: mockSessionData.contractSummary,
      };
      sessionStorage.setItem('vin_portal_session', JSON.stringify(storedSession));

      // Create new service instance
      const newService = TestBed.inject(SessionService);

      // Force reload by creating through TestBed reset
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = new SessionService();

      expect(freshService.token()).toBe(mockSessionData.sessionToken);
      expect(freshService.isAuthenticated()).toBe(true);
    });
  });
});

