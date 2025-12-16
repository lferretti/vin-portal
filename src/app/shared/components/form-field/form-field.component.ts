import { Component, input, computed } from '@angular/core';
import { FormControl } from '@angular/forms';

/**
 * Reusable form field component with label, hint, and error handling
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  template: `
    <div class="space-y-1.5">
      @if (label()) {
        <label [for]="fieldId()" class="form-label">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ml-0.5">*</span>
          }
        </label>
      }
      <div class="relative">
        <ng-content></ng-content>
      </div>
      @if (hint() && !showError()) {
        <p class="form-hint" [id]="hintId()">{{ hint() }}</p>
      }
      @if (showError()) {
        <p class="form-error" [id]="errorId()" role="alert">
          {{ errorMessage() }}
        </p>
      }
    </div>
  `,
})
export class FormFieldComponent {
  label = input<string>('');
  hint = input<string>('');
  control = input<FormControl | null>(null);
  required = input<boolean>(false);
  fieldId = input<string>(`field-${Math.random().toString(36).substring(2, 9)}`);

  // Custom error messages
  errorMessages = input<Record<string, string>>({});

  hintId = computed(() => `${this.fieldId()}-hint`);
  errorId = computed(() => `${this.fieldId()}-error`);

  showError = computed(() => {
    const ctrl = this.control();
    return ctrl && ctrl.invalid && ctrl.touched;
  });

  errorMessage = computed(() => {
    const ctrl = this.control();
    if (!ctrl || !ctrl.errors) return '';

    const customMessages = this.errorMessages();
    const errors = ctrl.errors;

    // Check for custom error messages first
    for (const key of Object.keys(errors)) {
      if (customMessages[key]) {
        return customMessages[key];
      }
    }

    // Default error messages
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters.`;
    }
    if (errors['maxlength']) {
      return `Maximum length is ${errors['maxlength'].requiredLength} characters.`;
    }
    if (errors['pattern']) {
      return 'Invalid format.';
    }
    if (errors['vinLength']) {
      return `VIN must be exactly 17 characters (currently ${errors['vinLength'].actual}).`;
    }
    if (errors['vinFormat']) {
      return 'VIN contains invalid characters. Letters I, O, and Q are not allowed.';
    }
    if (errors['zipFormat']) {
      return 'Enter a valid US ZIP code (e.g., 30301 or 30301-1234).';
    }

    return 'Invalid value.';
  });
}

