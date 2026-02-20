import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the main heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Add an Additional Vehicle to Your Contract');
  });

  it('should display a description paragraph', () => {
    const desc = fixture.nativeElement.querySelector('h1 + p');
    expect(desc.textContent).toContain('Extend your warranty protection');
  });

  it('should render three info cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(3);
  });

  it('should display the correct info card titles', () => {
    const cardTitles = fixture.nativeElement.querySelectorAll('.card h3');
    const titles = Array.from(cardTitles).map((el: unknown) => (el as HTMLElement).textContent?.trim());
    expect(titles).toEqual([
      'One Additional Vehicle',
      'One-Time Change',
      'Same Class or Less',
    ]);
  });

  it('should have a Get Started link pointing to /authenticate', () => {
    const link = fixture.nativeElement.querySelector('[data-testid="get-started"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Get Started');
    expect(link.getAttribute('href')).toBe('/authenticate');
  });

  it('should display the current year in the footer', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    const currentYear = new Date().getFullYear().toString();
    expect(footer.textContent).toContain(currentYear);
  });

  it('should set currentYear to the current year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should have a Contact Support link', () => {
    const supportLinks = fixture.nativeElement.querySelectorAll('a[href="/support"]');
    const contactLink = Array.from<HTMLAnchorElement>(supportLinks).find((a) =>
      a.textContent?.includes('Contact Support')
    );
    expect(contactLink).toBeTruthy();
  });

  it('should render the header component', () => {
    const header = fixture.nativeElement.querySelector('app-header');
    expect(header).toBeTruthy();
  });
});
