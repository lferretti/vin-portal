import { FormControl } from '@angular/forms';
import { zipValidator, formatZip } from './zip.validator';

describe('zipValidator', () => {
  const validator = zipValidator();

  describe('valid ZIP codes', () => {
    it('should return null for valid 5-digit ZIP', () => {
      const control = new FormControl('30301');
      expect(validator(control)).toBeNull();
    });

    it('should return null for valid 5+4 ZIP', () => {
      const control = new FormControl('30301-1234');
      expect(validator(control)).toBeNull();
    });

    it('should return null for empty value', () => {
      const control = new FormControl('');
      expect(validator(control)).toBeNull();
    });

    it('should return null for null value', () => {
      const control = new FormControl(null);
      expect(validator(control)).toBeNull();
    });

    it('should handle whitespace', () => {
      const control = new FormControl('  30301  ');
      expect(validator(control)).toBeNull();
    });
  });

  describe('invalid ZIP codes', () => {
    it('should return error for ZIP with less than 5 digits', () => {
      const control = new FormControl('3030');
      expect(validator(control)).toEqual({ zipFormat: true });
    });

    it('should return error for ZIP with more than 5 digits (no dash)', () => {
      const control = new FormControl('303011234');
      expect(validator(control)).toEqual({ zipFormat: true });
    });

    it('should return error for ZIP with letters', () => {
      const control = new FormControl('30A01');
      expect(validator(control)).toEqual({ zipFormat: true });
    });

    it('should return error for 5+4 with wrong format', () => {
      const control = new FormControl('30301-12');
      expect(validator(control)).toEqual({ zipFormat: true });
    });

    it('should return error for ZIP with special characters', () => {
      const control = new FormControl('30301!');
      expect(validator(control)).toEqual({ zipFormat: true });
    });
  });
});

describe('formatZip', () => {
  it('should return 5-digit ZIP unchanged', () => {
    expect(formatZip('30301')).toBe('30301');
  });

  it('should format 9-digit ZIP as 5+4', () => {
    expect(formatZip('303011234')).toBe('30301-1234');
  });

  it('should strip non-numeric characters', () => {
    expect(formatZip('30301-1234')).toBe('30301-1234');
  });

  it('should truncate to 5 digits if less than 9', () => {
    expect(formatZip('3030112')).toBe('30301');
  });

  it('should handle empty string', () => {
    expect(formatZip('')).toBe('');
  });
});

