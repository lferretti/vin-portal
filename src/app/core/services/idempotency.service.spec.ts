import { TestBed } from '@angular/core/testing';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdempotencyService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateKey', () => {
    it('should generate a UUID-like string', () => {
      const key = service.generateKey();

      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate unique keys', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('getOrCreateKey', () => {
    it('should create a new key for new operation', () => {
      const key = service.getOrCreateKey('test-operation');

      expect(key).toBeTruthy();
    });

    it('should return same key for same operation', () => {
      const key1 = service.getOrCreateKey('test-operation');
      const key2 = service.getOrCreateKey('test-operation');

      expect(key1).toBe(key2);
    });

    it('should return different keys for different operations', () => {
      const key1 = service.getOrCreateKey('operation-1');
      const key2 = service.getOrCreateKey('operation-2');

      expect(key1).not.toBe(key2);
    });

    it('should persist keys across service instances', () => {
      const key1 = service.getOrCreateKey('test-operation');

      // Create new service instance
      const newService = new IdempotencyService();
      const key2 = newService.getOrCreateKey('test-operation');

      expect(key1).toBe(key2);
    });
  });

  describe('clearKey', () => {
    it('should clear a specific key', () => {
      const key1 = service.getOrCreateKey('test-operation');
      service.clearKey('test-operation');
      const key2 = service.getOrCreateKey('test-operation');

      expect(key1).not.toBe(key2);
    });

    it('should not affect other keys', () => {
      service.getOrCreateKey('operation-1');
      const key2 = service.getOrCreateKey('operation-2');

      service.clearKey('operation-1');

      const key2After = service.getOrCreateKey('operation-2');
      expect(key2).toBe(key2After);
    });
  });

  describe('clearAllKeys', () => {
    it('should clear all stored keys', () => {
      const key1 = service.getOrCreateKey('operation-1');
      const key2 = service.getOrCreateKey('operation-2');

      service.clearAllKeys();

      const key1After = service.getOrCreateKey('operation-1');
      const key2After = service.getOrCreateKey('operation-2');

      expect(key1).not.toBe(key1After);
      expect(key2).not.toBe(key2After);
    });
  });
});

