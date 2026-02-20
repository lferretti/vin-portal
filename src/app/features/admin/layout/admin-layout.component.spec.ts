import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminSessionService } from '@core/services';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let adminSessionMock: {
    displayName: ReturnType<typeof signal>;
    role: ReturnType<typeof signal>;
    email: ReturnType<typeof signal>;
    clearSession: jest.Mock;
  };
  let router: Router;

  beforeEach(async () => {
    adminSessionMock = {
      displayName: signal<string | null>('Jane Admin'),
      role: signal<string | null>('admin'),
      email: signal<string | null>('jane@example.com'),
      clearSession: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AdminSessionService, useValue: adminSessionMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

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
    const links = fixture.nativeElement.querySelectorAll('a');
    const backLink = Array.from<HTMLAnchorElement>(links).find((a) =>
      a.textContent?.includes('Back to Consumer Portal')
    );
    expect(backLink).toBeTruthy();
  });

  it('should display Support Portal text in the header', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.textContent).toContain('Support Portal');
  });

  it('should have a main content area', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main).toBeTruthy();
  });

  it('should display the user display name', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Jane Admin');
  });

  it('should display the user email', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('jane@example.com');
  });

  it('should display Security / Admin role badge for admin role', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Security / Admin');
  });

  it('should display Support role badge for support role', () => {
    adminSessionMock.role.set('support');
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Support');
    expect(content).not.toContain('Security / Admin');
  });

  it('should apply purple badge class for admin role', () => {
    const badge = fixture.nativeElement.querySelector('.bg-purple-900');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Security / Admin');
  });

  it('should apply blue badge class for support role', () => {
    adminSessionMock.role.set('support');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.bg-blue-900');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('Support');
  });

  it('should have a Sign Out button', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const signOutButton = Array.from<HTMLButtonElement>(buttons).find((b) =>
      b.textContent?.includes('Sign Out')
    );
    expect(signOutButton).toBeTruthy();
  });

  it('should call clearSession and navigate to /admin/login on logout', () => {
    component.logout();

    expect(adminSessionMock.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login']);
  });

  it('should not display user identity when displayName is null', () => {
    adminSessionMock.displayName.set(null);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain('Jane Admin');
    expect(content).not.toContain('jane@example.com');
  });
});
