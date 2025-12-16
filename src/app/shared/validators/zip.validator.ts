import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * US ZIP code pattern: 5 digits or 5+4 format
 */
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

/**
 * Validator for US ZIP codes
 * Accepts 5-digit or 5+4 format (e.g., "30301" or "30301-1234")
 */
export function zipValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const zip = control.value.trim();

    if (!ZIP_PATTERN.test(zip)) {
      return { zipFormat: true };
    }

    return null;
  };
}

/**
 * Format a ZIP code for display
 * Ensures proper formatting of 5+4 codes
 */
export function formatZip(zip: string): string {
  const cleaned = zip.replace(/[^\d]/g, '');

  if (cleaned.length === 9) {
    return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
  }

  return cleaned.substring(0, 5);
}

