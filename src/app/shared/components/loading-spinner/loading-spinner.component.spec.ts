import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render with role="status"', () => {
    const statusDiv = fixture.nativeElement.querySelector('[role="status"]');
    expect(statusDiv).toBeTruthy();
  });

  it('should set aria-live to polite', () => {
    const statusDiv = fixture.nativeElement.querySelector('[role="status"]');
    expect(statusDiv.getAttribute('aria-live')).toBe('polite');
  });

  it('should render the spinner animation element', () => {
    const spinner = fixture.nativeElement.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('should render screen-reader-only "Loading..." text', () => {
    const srOnly = fixture.nativeElement.querySelector('.sr-only');
    expect(srOnly).toBeTruthy();
    expect(srOnly.textContent.trim()).toBe('Loading...');
  });

  describe('message input', () => {
    it('should not render message paragraph when message is empty', () => {
      const messageParagraph = fixture.nativeElement.querySelector('p');
      expect(messageParagraph).toBeNull();
    });

    it('should render message text when message is provided', () => {
      fixture.componentRef.setInput('message', 'Loading your data...');
      fixture.detectChanges();

      const messageParagraph = fixture.nativeElement.querySelector('p');
      expect(messageParagraph).toBeTruthy();
      expect(messageParagraph.textContent.trim()).toBe('Loading your data...');
    });

    it('should apply text styling classes to message', () => {
      fixture.componentRef.setInput('message', 'Please wait');
      fixture.detectChanges();

      const messageParagraph = fixture.nativeElement.querySelector('p');
      expect(messageParagraph.classList).toContain('text-sm');
      expect(messageParagraph.classList).toContain('text-slate-600');
    });

    it('should update message when input changes', () => {
      fixture.componentRef.setInput('message', 'First message');
      fixture.detectChanges();

      let messageParagraph = fixture.nativeElement.querySelector('p');
      expect(messageParagraph.textContent.trim()).toBe('First message');

      fixture.componentRef.setInput('message', 'Updated message');
      fixture.detectChanges();

      messageParagraph = fixture.nativeElement.querySelector('p');
      expect(messageParagraph.textContent.trim()).toBe('Updated message');
    });

    it('should remove message when input is set back to empty string', () => {
      fixture.componentRef.setInput('message', 'Temporary message');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('p')).toBeTruthy();

      fixture.componentRef.setInput('message', '');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('p')).toBeNull();
    });
  });

  it('should default message to empty string', () => {
    expect(component.message()).toBe('');
  });
});
