import { FormControl } from '@angular/forms';
import { vinValidator, normalizeVin, maskVin } from './vin.validator';

describe('vinValidator', () => {
  const validator = vinValidator();

  describe('valid VINs', () => {
    it('should return null for valid 17-character VIN', () => {
      const control = new FormControl('1HGCM82633A123456');
      expect(validator(control)).toBeNull();
    });

    it('should accept lowercase and normalize', () => {
      const control = new FormControl('1hgcm82633a123456');
      expect(validator(control)).toBeNull();
    });

    it('should accept VIN with spaces (normalizes them out)', () => {
      const control = new FormControl('1HGC M826 33A1 2345 6');
      expect(validator(control)).toBeNull();
    });

    it('should return null for empty value (let required handle it)', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });
  });

  describe('valid partial VINs (7-17 characters)', () => {
    it('should accept a 7-character VIN (last-7)', () => {
      const control = new FormControl('1234567');
      expect(validator(control)).toBeNull();
    });

    it('should accept a 10-character partial VIN', () => {
      const control = new FormControl('3CZW123456');
      expect(validator(control)).toBeNull();
    });
  });

  describe('invalid length', () => {
    it('should return error for VIN shorter than 7 characters', () => {
      const control = new FormControl('ABC12');
      const result = validator(control);

      expect(result).toEqual({
        vinLength: { min: 7, max: 17, actual: 5 },
      });
    });

    it('should return error for VIN longer than 17 characters', () => {
      const control = new FormControl('1HGCM82633A12345678');
      const result = validator(control);

      expect(result).toEqual({
        vinLength: { min: 7, max: 17, actual: 19 },
      });
    });
  });

  describe('invalid characters', () => {
    it('should return error for VIN with letter I', () => {
      const control = new FormControl('1HGCM82633I123456');
      expect(validator(control)).toEqual({ vinFormat: true });
    });

    it('should return error for VIN with letter O', () => {
      const control = new FormControl('1HGCM82633O123456');
      expect(validator(control)).toEqual({ vinFormat: true });
    });

    it('should return error for VIN with letter Q', () => {
      const control = new FormControl('1HGCM82633Q123456');
      expect(validator(control)).toEqual({ vinFormat: true });
    });

    it('should return error for VIN with special characters', () => {
      const control = new FormControl('1HGCM82633A12345!');
      expect(validator(control)).toEqual({ vinFormat: true });
    });
  });
});

describe('normalizeVin', () => {
  it('should convert to uppercase', () => {
    expect(normalizeVin('1hgcm82633a123456')).toBe('1HGCM82633A123456');
  });

  it('should remove spaces', () => {
    expect(normalizeVin('1HGC M826 33A1 2345 6')).toBe('1HGCM82633A123456');
  });

  it('should handle empty string', () => {
    expect(normalizeVin('')).toBe('');
  });
});

describe('maskVin', () => {
  it('should mask middle characters', () => {
    expect(maskVin('1HGCM82633A123456')).toBe('1HG******3456');
  });

  it('should handle lowercase input', () => {
    expect(maskVin('1hgcm82633a123456')).toBe('1HG******3456');
  });

  it('should return short VINs unchanged', () => {
    expect(maskVin('1HG')).toBe('1HG');
  });

  it('should handle empty string', () => {
    expect(maskVin('')).toBe('');
  });
});

