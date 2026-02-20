import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * VIN character pattern: excludes I, O, Q
 * These letters are excluded to avoid confusion with numbers
 */
const VIN_CHARS_PATTERN = /^[A-HJ-NPR-Z0-9]+$/;

/**
 * Validator for Vehicle Identification Numbers (VIN)
 * - Accepts 7 to 17 characters (minimum last-7 for auth, full VIN optional)
 * - Cannot contain I, O, or Q
 * - Case insensitive (normalized to uppercase)
 */
export function vinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const vin = control.value.toUpperCase().replace(/\s/g, '');

    if (vin.length < 7 || vin.length > 17) {
      return {
        vinLength: {
          min: 7,
          max: 17,
          actual: vin.length,
        },
      };
    }

    if (!VIN_CHARS_PATTERN.test(vin)) {
      return { vinFormat: true };
    }

    return null;
  };
}

/**
 * Normalize a VIN to uppercase without spaces
 */
export function normalizeVin(vin: string): string {
  return vin.toUpperCase().replace(/\s/g, '');
}

/**
 * Mask a VIN for display (show first 3 and last 4 characters)
 */
export function maskVin(vin: string): string {
  if (!vin || vin.length < 7) return vin;
  const normalized = normalizeVin(vin);
  return `${normalized.substring(0, 3)}******${normalized.substring(normalized.length - 4)}`;
}

