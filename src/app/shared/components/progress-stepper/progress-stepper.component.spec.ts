import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressStepperComponent, StepConfig } from './progress-stepper.component';

describe('ProgressStepperComponent', () => {
  let component: ProgressStepperComponent;
  let fixture: ComponentFixture<ProgressStepperComponent>;

  const testSteps: StepConfig[] = [
    { id: 'auth', label: 'Authenticate' },
    { id: 'vin', label: 'VIN Entry' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressStepperComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should render all steps', () => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.componentRef.setInput('currentStep', 0);
      fixture.detectChanges();

      const stepElements = fixture.nativeElement.querySelectorAll('li');
      expect(stepElements.length).toBe(4);
    });

    it('should display step numbers for non-completed steps', () => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.componentRef.setInput('currentStep', 1);
      fixture.detectChanges();

      const stepCircles = fixture.nativeElement.querySelectorAll('span.rounded-full');
      // Step 2 (index 1) is current, step 3 and 4 show numbers
      expect(stepCircles[1].textContent.trim()).toContain('2');
    });

    it('should show checkmark for completed steps', () => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.componentRef.setInput('currentStep', 2);
      fixture.detectChanges();

      const svgElements = fixture.nativeElement.querySelectorAll('svg');
      expect(svgElements.length).toBe(2); // Steps 0 and 1 are complete
    });
  });

  describe('step classes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.detectChanges();
    });

    it('should return classes object for completed steps', () => {
      fixture.componentRef.setInput('currentStep', 2);
      fixture.detectChanges();

      const classes = component.getStepClasses(0);
      expect(classes).toEqual({
        'bg-primary-600 text-white': true,
        'bg-primary-100 text-primary-700 ring-2 ring-primary-600': false,
        'bg-slate-100 text-slate-500': false,
      });
    });

    it('should return classes object for current step', () => {
      fixture.componentRef.setInput('currentStep', 1);
      fixture.detectChanges();

      const classes = component.getStepClasses(1);
      expect(classes).toEqual({
        'bg-primary-600 text-white': false,
        'bg-primary-100 text-primary-700 ring-2 ring-primary-600': true,
        'bg-slate-100 text-slate-500': false,
      });
    });

    it('should return classes object for future steps', () => {
      fixture.componentRef.setInput('currentStep', 1);
      fixture.detectChanges();

      const classes = component.getStepClasses(3);
      expect(classes).toEqual({
        'bg-primary-600 text-white': false,
        'bg-primary-100 text-primary-700 ring-2 ring-primary-600': false,
        'bg-slate-100 text-slate-500': true,
      });
    });
  });

  describe('label classes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.detectChanges();
    });

    it('should return active label classes for current and past steps', () => {
      fixture.componentRef.setInput('currentStep', 2);
      fixture.detectChanges();

      const classes = component.getLabelClasses(1);
      expect(classes['text-slate-900']).toBe(true);
    });

    it('should return inactive label classes for future steps', () => {
      fixture.componentRef.setInput('currentStep', 1);
      fixture.detectChanges();

      const classes = component.getLabelClasses(3);
      expect(classes['text-slate-500']).toBe(true);
    });
  });

  describe('connector classes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.detectChanges();
    });

    it('should apply completed connector style for past steps', () => {
      fixture.componentRef.setInput('currentStep', 2);
      fixture.detectChanges();

      const classes = component.getConnectorClasses(0);
      expect(classes['bg-primary-600']).toBe(true);
      expect(classes['bg-slate-200']).toBe(false);
    });

    it('should apply inactive connector style for current and future steps', () => {
      fixture.componentRef.setInput('currentStep', 1);
      fixture.detectChanges();

      const classes = component.getConnectorClasses(1);
      expect(classes['bg-slate-200']).toBe(true);
      expect(classes['bg-primary-600']).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have navigation role', () => {
      fixture.componentRef.setInput('steps', testSteps);
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('aria-label')).toBe('Progress');
    });
  });
});
