import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 404 heading', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('404');
  });

  it('should display "Page Not Found" message', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Page Not Found');
  });

  it('should have a "Return to Home" link', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Return to Home');
  });

  it('should show explanatory text', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("doesn't exist");
  });
});
