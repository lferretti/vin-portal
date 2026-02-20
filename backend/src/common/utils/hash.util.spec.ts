import { hashContractNumber, hashOtpCode } from './hash.util';
import { createHash } from 'crypto';

describe('hash.util', () => {
  describe('hashContractNumber', () => {
    it('should produce a consistent SHA-256 hex digest', () => {
      const result = hashContractNumber('CONTRACT-001', 'salt123');
      const expected = createHash('sha256')
        .update('salt123:CONTRACT-001')
        .digest('hex');
      expect(result).toBe(expected);
    });

    it('should return a 64-character hex string', () => {
      const result = hashContractNumber('ABC', 'xyz');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different contract numbers', () => {
      const hash1 = hashContractNumber('CONTRACT-001', 'salt');
      const hash2 = hashContractNumber('CONTRACT-002', 'salt');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different salts', () => {
      const hash1 = hashContractNumber('CONTRACT-001', 'salt1');
      const hash2 = hashContractNumber('CONTRACT-001', 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic (same inputs always produce same output)', () => {
      const hash1 = hashContractNumber('CONTRACT-001', 'salt');
      const hash2 = hashContractNumber('CONTRACT-001', 'salt');
      expect(hash1).toBe(hash2);
    });
  });

  describe('hashOtpCode', () => {
    it('should produce a consistent SHA-256 hex digest', () => {
      const result = hashOtpCode('123456', 'otp-salt');
      const expected = createHash('sha256')
        .update('otp-salt:123456')
        .digest('hex');
      expect(result).toBe(expected);
    });

    it('should return a 64-character hex string', () => {
      const result = hashOtpCode('123456', 'salt');
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different codes', () => {
      const hash1 = hashOtpCode('123456', 'salt');
      const hash2 = hashOtpCode('654321', 'salt');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different salts', () => {
      const hash1 = hashOtpCode('123456', 'salt1');
      const hash2 = hashOtpCode('123456', 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    it('should be deterministic', () => {
      const hash1 = hashOtpCode('999999', 'mysalt');
      const hash2 = hashOtpCode('999999', 'mysalt');
      expect(hash1).toBe(hash2);
    });
  });
});
