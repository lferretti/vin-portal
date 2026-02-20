import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the Dashboard heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toContain('Dashboard');
  });

  it('should display the Quick Actions card', () => {
    const cardHeadings = fixture.nativeElement.querySelectorAll('h2');
    const quickActions = Array.from<HTMLElement>(cardHeadings).find((h) =>
      h.textContent?.includes('Quick Actions')
    );
    expect(quickActions).toBeTruthy();
  });

  it('should have a Search Contracts quick action link', () => {
    const links = fixture.nativeElement.querySelectorAll('a');
    const searchLink = Array.from<HTMLAnchorElement>(links).find((a) =>
      a.textContent?.includes('Search Contracts')
    );
    expect(searchLink).toBeTruthy();
    expect(searchLink!.getAttribute('href')).toBe('/admin/search');
  });

  it('should show description for Search Contracts action', () => {
    const description = fixture.nativeElement.querySelector('p');
    expect(description.textContent).toContain('Find contracts by number, ID, or request');
  });

  it('should display the Support Portal information card', () => {
    const cardHeadings = fixture.nativeElement.querySelectorAll('h2');
    const supportCard = Array.from<HTMLElement>(cardHeadings).find((h) =>
      h.textContent?.includes('Support Portal')
    );
    expect(supportCard).toBeTruthy();
  });

  it('should list support portal capabilities', () => {
    const listItems = fixture.nativeElement.querySelectorAll('li');
    const texts = Array.from<HTMLElement>(listItems).map((li) => li.textContent?.trim());
    expect(texts).toContain('View contract and request details');
    expect(texts).toContain('Review audit event timeline');
    expect(texts).toContain('Add internal support notes');
  });

  it('should display the Status Reference card', () => {
    const cardHeadings = fixture.nativeElement.querySelectorAll('h2');
    const statusCard = Array.from<HTMLElement>(cardHeadings).find((h) =>
      h.textContent?.includes('Status Reference')
    );
    expect(statusCard).toBeTruthy();
  });

  it('should show all status values in the reference table', () => {
    const statusLabels = fixture.nativeElement.querySelectorAll('dt');
    const labels = Array.from<HTMLElement>(statusLabels).map((dt) => dt.textContent?.trim());
    expect(labels).toContain('Not Used');
    expect(labels).toContain('Pending');
    expect(labels).toContain('Committed');
    expect(labels).toContain('Failed');
  });

  it('should show status badge values', () => {
    const badges = fixture.nativeElement.querySelectorAll('dd span');
    const badgeTexts = Array.from<HTMLElement>(badges).map((span) => span.textContent?.trim());
    expect(badgeTexts).toContain('NOT_USED');
    expect(badgeTexts).toContain('PENDING');
    expect(badgeTexts).toContain('COMMITTED');
    expect(badgeTexts).toContain('FAILED');
  });
});
