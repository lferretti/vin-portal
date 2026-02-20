import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationCheckboxComponent } from './confirmation-checkbox.component';

describe('ConfirmationCheckboxComponent', () => {
  let component: ConfirmationCheckboxComponent;
  let fixture: ComponentFixture<ConfirmationCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationCheckboxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationCheckboxComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'I confirm this action');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the label text', () => {
    const labelSpan = fixture.nativeElement.querySelector('span.text-sm');
    expect(labelSpan.textContent.trim()).toBe('I confirm this action');
  });

  it('should render a checkbox input', () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
  });

  it('should default checked to false', () => {
    expect(component.checked()).toBe(false);
  });

  it('should reflect unchecked state in the checkbox input', () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(false);
  });

  describe('checked state', () => {
    it('should update checked model when onCheckedChange is called with true', () => {
      component.onCheckedChange(true);
      expect(component.checked()).toBe(true);
    });

    it('should set checked to false when onCheckedChange is called with false', () => {
      component.onCheckedChange(true);
      component.onCheckedChange(false);
      expect(component.checked()).toBe(false);
    });
  });

  describe('checkedChange output', () => {
    it('should emit checkedChange when onCheckedChange is called with true', () => {
      const emitSpy = jest.fn();
      component.checkedChange.subscribe(emitSpy);

      component.onCheckedChange(true);

      expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('should emit checkedChange when onCheckedChange is called with false', () => {
      const emitSpy = jest.fn();
      component.checkedChange.subscribe(emitSpy);

      component.onCheckedChange(false);

      expect(emitSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('styling classes', () => {
    it('should apply unchecked border class when checked is false', () => {
      const label = fixture.nativeElement.querySelector('label');
      expect(label.classList).toContain('border-slate-300');
    });

    it('should apply checked border and background classes when checked is true', () => {
      component.onCheckedChange(true);
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label.classList).toContain('border-primary-500');
      expect(label.classList).toContain('bg-primary-50');
    });
  });

  describe('label input', () => {
    it('should update label text when input changes', () => {
      fixture.componentRef.setInput('label', 'New label text');
      fixture.detectChanges();

      const labelSpan = fixture.nativeElement.querySelector('span.text-sm');
      expect(labelSpan.textContent.trim()).toBe('New label text');
    });
  });

  describe('describedBy input', () => {
    it('should set aria-describedby attribute when provided', () => {
      fixture.componentRef.setInput('describedBy', 'help-text-id');
      fixture.detectChanges();

      const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
      expect(checkbox.getAttribute('aria-describedby')).toBe('help-text-id');
    });

    it('should default describedBy to empty string', () => {
      expect(component.describedBy()).toBe('');
    });
  });
});
