import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the sidebar', () => {
    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside).toBeTruthy();
  });

  it('should display the VIN Portal branding', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('VIN Portal');
  });

  it('should display Admin Dashboard subtitle', () => {
    const subtitle = fixture.nativeElement.querySelector('aside span');
    expect(subtitle.textContent).toContain('Admin Dashboard');
  });

  it('should have a Dashboard navigation link', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    const dashboardLink = Array.from<HTMLAnchorElement>(navLinks).find((a) =>
      a.textContent?.includes('Dashboard')
    );
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink!.getAttribute('href')).toBe('/admin');
  });

  it('should have a Search Contracts navigation link', () => {
    const navLinks = fixture.nativeElement.querySelectorAll('nav a');
    const searchLink = Array.from<HTMLAnchorElement>(navLinks).find((a) =>
      a.textContent?.includes('Search Contracts')
    );
    expect(searchLink).toBeTruthy();
    expect(searchLink!.getAttribute('href')).toBe('/admin/search');
  });

  it('should have a router-outlet for child routes', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should have a Back to Consumer Portal link', () => {
    const backLink = fixture.nativeElement.querySelector('a[href="/"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back to Consumer Portal');
  });

  it('should display Support Portal text in the header', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.textContent).toContain('Support Portal');
  });

  it('should have a main content area', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main).toBeTruthy();
  });
});
