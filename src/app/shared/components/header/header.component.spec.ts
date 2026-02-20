import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, RouterModule.forRoot([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a header element', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
  });

  it('should display the logo text "VP"', () => {
    const logoDiv = fixture.nativeElement.querySelector('div.bg-primary-600');
    expect(logoDiv).toBeTruthy();
    expect(logoDiv.textContent.trim()).toBe('VP');
  });

  it('should display the application name "Vehicle Protection Portal"', () => {
    const nameSpan = fixture.nativeElement.querySelector('span.font-display');
    expect(nameSpan).toBeTruthy();
    expect(nameSpan.textContent.trim()).toBe('Vehicle Protection Portal');
  });

  it('should have a home link on the logo that uses routerLink', () => {
    const homeLink = fixture.nativeElement.querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
  });

  it('should display the "Need Help?" support link', () => {
    const supportLink = fixture.nativeElement.querySelector('a[href="/support"]');
    expect(supportLink).toBeTruthy();
    expect(supportLink.textContent.trim()).toBe('Need Help?');
  });

  it('should have a nav element wrapping the support link', () => {
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav).toBeTruthy();
    const link = nav.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.textContent.trim()).toBe('Need Help?');
  });

  it('should apply expected header styling classes', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList).toContain('flex');
    expect(header.classList).toContain('items-center');
    expect(header.classList).toContain('justify-between');
    expect(header.classList).toContain('bg-white');
    expect(header.classList).toContain('border-b');
    expect(header.classList).toContain('shadow-sm');
  });

  it('should have logo with rounded-lg styling', () => {
    const logoDiv = fixture.nativeElement.querySelector('div.bg-primary-600');
    expect(logoDiv.classList).toContain('rounded-lg');
    expect(logoDiv.classList).toContain('w-10');
    expect(logoDiv.classList).toContain('h-10');
  });
});
