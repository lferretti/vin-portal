import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VinDisplayComponent } from './vin-display.component';
import { VinDecoded } from '@core/models';

describe('VinDisplayComponent', () => {
  let component: VinDisplayComponent;
  let fixture: ComponentFixture<VinDisplayComponent>;

  const mockDecoded: VinDecoded = {
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VinDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VinDisplayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('decoded', mockDecoded);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the year', () => {
    const ddElements = fixture.nativeElement.querySelectorAll('dd');
    expect(ddElements[0].textContent.trim()).toBe('2024');
  });

  it('should display the make', () => {
    const ddElements = fixture.nativeElement.querySelectorAll('dd');
    expect(ddElements[1].textContent.trim()).toBe('Toyota');
  });

  it('should display the model', () => {
    const ddElements = fixture.nativeElement.querySelectorAll('dd');
    expect(ddElements[2].textContent.trim()).toBe('Camry');
  });

  it('should render Year, Make, and Model labels', () => {
    const dtElements = fixture.nativeElement.querySelectorAll('dt');
    expect(dtElements.length).toBe(3);
    expect(dtElements[0].textContent.trim()).toBe('Year');
    expect(dtElements[1].textContent.trim()).toBe('Make');
    expect(dtElements[2].textContent.trim()).toBe('Model');
  });

  it('should render a definition list (dl)', () => {
    const dl = fixture.nativeElement.querySelector('dl');
    expect(dl).toBeTruthy();
  });

  it('should use a 3-column grid layout', () => {
    const dl = fixture.nativeElement.querySelector('dl');
    expect(dl.classList).toContain('grid');
    expect(dl.classList).toContain('grid-cols-3');
  });

  describe('with different decoded data', () => {
    it('should update when decoded input changes', () => {
      const newDecoded: VinDecoded = {
        year: 2023,
        make: 'Honda',
        model: 'Civic',
      };

      fixture.componentRef.setInput('decoded', newDecoded);
      fixture.detectChanges();

      const ddElements = fixture.nativeElement.querySelectorAll('dd');
      expect(ddElements[0].textContent.trim()).toBe('2023');
      expect(ddElements[1].textContent.trim()).toBe('Honda');
      expect(ddElements[2].textContent.trim()).toBe('Civic');
    });

    it('should handle older model years correctly', () => {
      const newDecoded: VinDecoded = {
        year: 1999,
        make: 'Ford',
        model: 'Mustang',
      };

      fixture.componentRef.setInput('decoded', newDecoded);
      fixture.detectChanges();

      const ddElements = fixture.nativeElement.querySelectorAll('dd');
      expect(ddElements[0].textContent.trim()).toBe('1999');
      expect(ddElements[1].textContent.trim()).toBe('Ford');
      expect(ddElements[2].textContent.trim()).toBe('Mustang');
    });
  });

  it('should apply styling classes to the container', () => {
    const container = fixture.nativeElement.querySelector('div.bg-slate-50');
    expect(container).toBeTruthy();
    expect(container.classList).toContain('rounded-lg');
    expect(container.classList).toContain('p-4');
    expect(container.classList).toContain('border');
    expect(container.classList).toContain('border-slate-200');
  });
});
