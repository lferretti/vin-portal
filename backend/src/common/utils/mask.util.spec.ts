import { maskVin, maskPhone } from './mask.util';

describe('mask.util', () => {
  describe('maskVin', () => {
    it('should mask a standard 17-character VIN', () => {
      const result = maskVin('1HGBH41JXMN109186');
      expect(result).toBe('1HG******9186');
    });

    it('should keep first 3 and last 4 characters visible', () => {
      const result = maskVin('WVWZZZ3CZWE123456');
      expect(result).toBe('WVW******3456');
    });

    it('should return *** for VINs shorter than 7 characters', () => {
      expect(maskVin('ABC')).toBe('***');
      expect(maskVin('ABCDEF')).toBe('***');
    });

    it('should handle exactly 7-character strings', () => {
      const result = maskVin('ABCDEFG');
      expect(result).toBe('ABC******DEFG');
    });

    it('should handle empty string', () => {
      expect(maskVin('')).toBe('***');
    });
  });

  describe('maskPhone', () => {
    it('should mask a 10-digit phone number', () => {
      const result = maskPhone('5551234567');
      expect(result).toBe('***-***-4567');
    });

    it('should keep last 4 digits visible', () => {
      const result = maskPhone('1234567890');
      expect(result).toBe('***-***-7890');
    });

    it('should return *** for phone numbers shorter than 4 characters', () => {
      expect(maskPhone('12')).toBe('***');
      expect(maskPhone('123')).toBe('***');
    });

    it('should handle phone with dashes', () => {
      const result = maskPhone('555-123-4567');
      expect(result).toBe('***-***-4567');
    });

    it('should handle exactly 4-character strings', () => {
      const result = maskPhone('1234');
      expect(result).toBe('***-***-1234');
    });
  });
});
