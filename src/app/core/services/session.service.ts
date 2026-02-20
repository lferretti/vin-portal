import { Injectable, signal, computed } from '@angular/core';
import { AuthenticateSuccessData, ContractSummary, SessionClaims } from '@core/models';

const SESSION_STORAGE_KEY = 'vin_portal_session';
const REDIRECT_URL_KEY = 'vin_portal_redirect_url';

interface StoredSession {
  token: string;
  expiresAt: string;
  contractContextId: string;
  contractSummary?: ContractSummary;
}

/**
 * Service for managing user session state
 * Stores JWT tokens in sessionStorage for security
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  // Private writable signals
  private readonly _token = signal<string | null>(null);
  private readonly _contractContextId = signal<string | null>(null);
  private readonly _expiresAt = signal<Date | null>(null);
  private readonly _contractSummary = signal<ContractSummary | null>(null);

  // Public readonly signals
  readonly token = this._token.asReadonly();
  readonly contractContextId = this._contractContextId.asReadonly();
  readonly expiresAt = this._expiresAt.asReadonly();
  readonly contractSummary = this._contractSummary.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => {
    const token = this._token();
    return !!token && !this.isExpired();
  });

  readonly timeUntilExpiry = computed(() => {
    const expiresAt = this._expiresAt();
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt.getTime() - Date.now());
  });

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Set session data after successful authentication
   */
  setSession(data: AuthenticateSuccessData): void {
    this._token.set(data.sessionToken);
    this._contractContextId.set(data.contractContextId);
    this._expiresAt.set(new Date(data.sessionExpiresAt));
    this._contractSummary.set(data.contractSummary ?? null);

    this.saveToStorage({
      token: data.sessionToken,
      expiresAt: data.sessionExpiresAt,
      contractContextId: data.contractContextId,
      contractSummary: data.contractSummary,
    });
  }

  /**
   * Clear session data (logout)
   */
  clearSession(): void {
    this._token.set(null);
    this._contractContextId.set(null);
    this._expiresAt.set(null);
    this._contractSummary.set(null);

    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Get the current token (for HTTP interceptor)
   */
  getToken(): string | null {
    if (this.isExpired()) {
      this.clearSession();
      return null;
    }
    return this._token();
  }

  /**
   * Check if the session is expired
   */
  isExpired(): boolean {
    const expiresAt = this._expiresAt();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt.getTime();
  }

  /**
   * Decode JWT claims (without verification)
   */
  getClaims(): SessionClaims | null {
    const token = this._token();
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload as SessionClaims;
    } catch {
      return null;
    }
  }

  /**
   * Set URL to redirect to after authentication
   */
  setRedirectUrl(url: string): void {
    if (this.isRelativePath(url)) {
      sessionStorage.setItem(REDIRECT_URL_KEY, url);
    }
  }

  /**
   * Get and clear the redirect URL
   */
  consumeRedirectUrl(): string | null {
    const url = sessionStorage.getItem(REDIRECT_URL_KEY);
    sessionStorage.removeItem(REDIRECT_URL_KEY);
    if (url && !this.isRelativePath(url)) {
      return null;
    }
    return url;
  }

  private isRelativePath(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
  }

  /**
   * Update the contract summary (e.g., after VIN commit)
   */
  updateContractSummary(summary: ContractSummary): void {
    this._contractSummary.set(summary);

    const stored = this.getStoredSession();
    if (stored) {
      stored.contractSummary = summary;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
    }
  }

  /**
   * Load session from sessionStorage on service init
   */
  private loadFromStorage(): void {
    const stored = this.getStoredSession();
    if (!stored) return;

    const expiresAt = new Date(stored.expiresAt);
    if (Date.now() >= expiresAt.getTime()) {
      // Session expired, clear it
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    this._token.set(stored.token);
    this._contractContextId.set(stored.contractContextId);
    this._expiresAt.set(expiresAt);
    this._contractSummary.set(stored.contractSummary ?? null);
  }

  /**
   * Save session to sessionStorage
   */
  private saveToStorage(session: StoredSession): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  /**
   * Get stored session from sessionStorage
   */
  private getStoredSession(): StoredSession | null {
    try {
      const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

