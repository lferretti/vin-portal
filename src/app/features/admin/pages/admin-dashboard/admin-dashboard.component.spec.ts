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

  it('should show all 7 status badges in the reference section', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('NOT_USED');
    expect(content).toContain('PENDING');
    expect(content).toContain('COMMITTED_LOCKED');
    expect(content).toContain('FAILED_INELIGIBLE');
    expect(content).toContain('FAILED_DEPENDENCY');
    expect(content).toContain('FAILED_VALIDATION');
    expect(content).toContain('CANCELLED');
  });

  it('should show descriptions for all 7 statuses', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Contract authenticated, no VIN commit started.');
    expect(content).toContain('VIN commit accepted, awaiting dependency confirmation.');
    expect(content).toContain('VIN committed successfully. Contract permanently locked.');
    expect(content).toContain('Eligibility rules denied the VIN');
    expect(content).toContain('External dependency unreachable after all retries.');
    expect(content).toContain('VIN failed format or decode validation.');
    expect(content).toContain('Manually cancelled');
  });
});
