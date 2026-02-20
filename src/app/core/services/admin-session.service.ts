import { Injectable, signal, computed } from '@angular/core';
import { AdminLoginResponseData } from '@core/models';

const ADMIN_SESSION_STORAGE_KEY = 'admin_portal_session';

interface StoredAdminSession {
  token: string;
  expiresAt: string;
  email: string;
  role: string;
  displayName: string;
}

/**
 * Service for managing admin session state.
 * Stores JWT tokens in sessionStorage for security.
 * Manages admin authentication separately from consumer sessions.
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  // Private writable signals
  private readonly _token = signal<string | null>(null);
  private readonly _expiresAt = signal<Date | null>(null);
  private readonly _email = signal<string | null>(null);
  private readonly _role = signal<string | null>(null);
  private readonly _displayName = signal<string | null>(null);

  // Public readonly signals
  readonly token = this._token.asReadonly();
  readonly expiresAt = this._expiresAt.asReadonly();
  readonly email = this._email.asReadonly();
  readonly role = this._role.asReadonly();
  readonly displayName = this._displayName.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => {
    const token = this._token();
    return !!token && !this.isExpired();
  });

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Set session data after successful admin login
   */
  setSession(data: AdminLoginResponseData): void {
    this._token.set(data.token);
    this._expiresAt.set(new Date(data.expiresAt));
    this._email.set(data.email);
    this._role.set(data.role);
    this._displayName.set(data.displayName);

    this.saveToStorage({
      token: data.token,
      expiresAt: data.expiresAt,
      email: data.email,
      role: data.role,
      displayName: data.displayName,
    });
  }

  /**
   * Clear session data (logout)
   */
  clearSession(): void {
    this._token.set(null);
    this._expiresAt.set(null);
    this._email.set(null);
    this._role.set(null);
    this._displayName.set(null);

    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  }

  /**
   * Get the current token (for HTTP interceptor).
   * Returns null and auto-clears session if expired.
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
  private isExpired(): boolean {
    const expiresAt = this._expiresAt();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt.getTime();
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
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      return;
    }

    this._token.set(stored.token);
    this._expiresAt.set(expiresAt);
    this._email.set(stored.email);
    this._role.set(stored.role);
    this._displayName.set(stored.displayName);
  }

  /**
   * Save session to sessionStorage
   */
  private saveToStorage(session: StoredAdminSession): void {
    sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  /**
   * Get stored session from sessionStorage
   */
  private getStoredSession(): StoredAdminSession | null {
    try {
      const data = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}
