import { Injectable } from '@angular/core';

const IDEMPOTENCY_STORAGE_KEY = 'vin_portal_idempotency';

/**
 * Service for generating and managing idempotency keys
 * Used to ensure VIN commits are not duplicated
 */
@Injectable({ providedIn: 'root' })
export class IdempotencyService {
  /**
   * Generate a new idempotency key
   */
  generateKey(): string {
    return crypto.randomUUID();
  }

  /**
   * Get or create an idempotency key for a specific operation
   * The key is persisted to handle page refreshes during commit
   */
  getOrCreateKey(operationId: string): string {
    const stored = this.getStoredKeys();
    
    if (stored[operationId]) {
      return stored[operationId];
    }

    const newKey = this.generateKey();
    stored[operationId] = newKey;
    this.saveStoredKeys(stored);

    return newKey;
  }

  /**
   * Clear the idempotency key for an operation (after success or final failure)
   */
  clearKey(operationId: string): void {
    const stored = this.getStoredKeys();
    delete stored[operationId];
    this.saveStoredKeys(stored);
  }

  /**
   * Clear all stored idempotency keys
   */
  clearAllKeys(): void {
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
  }

  private getStoredKeys(): Record<string, string> {
    try {
      const data = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveStoredKeys(keys: Record<string, string>): void {
    sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(keys));
  }
}

