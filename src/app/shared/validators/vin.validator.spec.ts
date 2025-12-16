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

  describe('invalid length', () => {
    it('should return error for VIN shorter than 17 characters', () => {
      const control = new FormControl('1HGCM8263');
      const result = validator(control);

      expect(result).toEqual({
        vinLength: { required: 17, actual: 9 },
      });
    });

    it('should return error for VIN longer than 17 characters', () => {
      const control = new FormControl('1HGCM82633A12345678');
      const result = validator(control);

      expect(result).toEqual({
        vinLength: { required: 17, actual: 19 },
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

