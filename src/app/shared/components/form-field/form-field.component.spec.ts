import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('label rendering', () => {
    it('should render the label when provided', () => {
      fixture.componentRef.setInput('label', 'Email Address');
      fixture.componentRef.setInput('fieldId', 'email-field');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Email Address');
      expect(label.getAttribute('for')).toBe('email-field');
    });

    it('should not render label when label is empty', () => {
      fixture.componentRef.setInput('label', '');
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label).toBeNull();
    });

    it('should show required asterisk when required is true', () => {
      fixture.componentRef.setInput('label', 'Name');
      fixture.componentRef.setInput('required', true);
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('span.text-red-500');
      expect(asterisk).toBeTruthy();
      expect(asterisk.textContent.trim()).toBe('*');
    });

    it('should not show required asterisk when required is false', () => {
      fixture.componentRef.setInput('label', 'Name');
      fixture.componentRef.setInput('required', false);
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('span.text-red-500');
      expect(asterisk).toBeNull();
    });
  });

  describe('hint rendering', () => {
    it('should render hint text when provided and no error', () => {
      fixture.componentRef.setInput('hint', 'Enter your full name');
      fixture.componentRef.setInput('fieldId', 'name-field');
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.form-hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent.trim()).toBe('Enter your full name');
      expect(hint.id).toBe('name-field-hint');
    });

    it('should not render hint when hint is empty', () => {
      fixture.componentRef.setInput('hint', '');
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.form-hint');
      expect(hint).toBeNull();
    });

    it('should hide hint when there is an error to show', () => {
      const control = new FormControl('', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('hint', 'Some hint');
      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      const hint = fixture.nativeElement.querySelector('.form-hint');
      expect(hint).toBeNull();
    });
  });

  describe('error rendering', () => {
    it('should show error message when control is invalid and touched', () => {
      const control = new FormControl('', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.componentRef.setInput('fieldId', 'test-field');
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.form-error');
      expect(error).toBeTruthy();
      expect(error.textContent.trim()).toBe('This field is required.');
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.id).toBe('test-field-error');
    });

    it('should not show error when control is invalid but untouched', () => {
      const control = new FormControl('', Validators.required);

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.form-error');
      expect(error).toBeNull();
    });

    it('should not show error when control is valid', () => {
      const control = new FormControl('valid value', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.form-error');
      expect(error).toBeNull();
    });

    it('should not show error when no control is provided', () => {
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.form-error');
      expect(error).toBeNull();
    });
  });

  describe('error messages', () => {
    it('should show required error message', () => {
      const control = new FormControl('', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('This field is required.');
    });

    it('should show minlength error message', () => {
      const control = new FormControl('ab', Validators.minLength(5));
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Minimum length is 5 characters.');
    });

    it('should show maxlength error message', () => {
      const control = new FormControl('abcdefghijk', Validators.maxLength(5));
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Maximum length is 5 characters.');
    });

    it('should show pattern error message', () => {
      const control = new FormControl('abc', Validators.pattern(/^\d+$/));
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Invalid format.');
    });

    it('should show custom error message when provided via errorMessages input', () => {
      const control = new FormControl('', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.componentRef.setInput('errorMessages', { required: 'Please fill this in.' });
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Please fill this in.');
    });

    it('should show vinLength error message', () => {
      const control = new FormControl('');
      control.setErrors({ vinLength: { actual: 10 } });
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('VIN must be between 7 and 17 characters (currently 10).');
    });

    it('should show vinFormat error message', () => {
      const control = new FormControl('');
      control.setErrors({ vinFormat: true });
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe(
        'VIN contains invalid characters. Letters I, O, and Q are not allowed.'
      );
    });

    it('should show zipFormat error message', () => {
      const control = new FormControl('');
      control.setErrors({ zipFormat: true });
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe(
        'Enter a valid US ZIP code (e.g., 30301 or 30301-1234).'
      );
    });

    it('should fall back to generic error message for unknown errors', () => {
      const control = new FormControl('');
      control.setErrors({ unknownError: true });
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Invalid value.');
    });

    it('should return empty string when control has no errors', () => {
      const control = new FormControl('valid');
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('');
    });
  });

  describe('computed IDs', () => {
    it('should compute hintId from fieldId', () => {
      fixture.componentRef.setInput('fieldId', 'my-field');
      fixture.detectChanges();

      expect(component.hintId()).toBe('my-field-hint');
    });

    it('should compute errorId from fieldId', () => {
      fixture.componentRef.setInput('fieldId', 'my-field');
      fixture.detectChanges();

      expect(component.errorId()).toBe('my-field-error');
    });
  });

  describe('showError computed signal', () => {
    it('should return false when control is null', () => {
      expect(component.showError()).toBeFalsy();
    });

    it('should return false when control is valid and touched', () => {
      const control = new FormControl('hello', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.showError()).toBeFalsy();
    });

    it('should return true when control is invalid and touched', () => {
      const control = new FormControl('', Validators.required);
      control.markAsTouched();

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.showError()).toBeTruthy();
    });

    it('should return false when control is invalid but not touched', () => {
      const control = new FormControl('', Validators.required);

      fixture.componentRef.setInput('control', control);
      fixture.detectChanges();

      expect(component.showError()).toBeFalsy();
    });
  });
});
