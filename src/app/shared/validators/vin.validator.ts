import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * VIN pattern: 17 characters, excludes I, O, Q
 * These letters are excluded to avoid confusion with numbers
 */
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Validator for Vehicle Identification Numbers (VIN)
 * - Must be exactly 17 characters
 * - Cannot contain I, O, or Q
 * - Case insensitive (normalized to uppercase)
 */
export function vinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const vin = control.value.toUpperCase().replace(/\s/g, '');

    if (vin.length !== 17) {
      return {
        vinLength: {
          required: 17,
          actual: vin.length,
        },
      };
    }

    if (!VIN_PATTERN.test(vin)) {
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

