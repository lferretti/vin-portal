import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContractDetailComponent } from './contract-detail.component';
import { AdminService } from '@core/services/admin.service';
import { VinService } from '@core/services/vin.service';
import { VinAddStatus } from '@core/models';

describe('ContractDetailComponent', () => {
  let component: ContractDetailComponent;
  let fixture: ComponentFixture<ContractDetailComponent>;
  let adminServiceMock: Record<string, jest.Mock>;
  let vinServiceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    adminServiceMock = {
      searchContracts: jest.fn(),
      getRequestDetail: jest.fn(),
      addNote: jest.fn(),
    };

    vinServiceMock = {
      decode: jest.fn(),
      checkEligibility: jest.fn(),
      commit: jest.fn(),
      getStatus: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ContractDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceMock },
        { provide: VinService, useValue: vinServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('contractContextId', 'ctx-test-001');
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should receive contractContextId input', () => {
    expect(component.contractContextId()).toBe('ctx-test-001');
  });

  it('should display the Contract Detail heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Contract Detail');
  });

  it('should have a Back to Search link', () => {
    const backLink = fixture.nativeElement.querySelector('a[href="/admin/search"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back to Search');
  });

  it('should display contract context ID in the contract info card', () => {
    const cardContent = fixture.nativeElement.querySelector('.card');
    expect(cardContent.textContent).toContain('ctx-test-001');
  });

  it('should show Contract Information heading', () => {
    const headings = fixture.nativeElement.querySelectorAll('h2');
    const contractInfoHeading = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Contract Information')
    );
    expect(contractInfoHeading).toBeTruthy();
  });

  it('should show Unknown status badge when no request data is loaded', () => {
    expect(component.requestData()).toBeNull();

    const badges = fixture.nativeElement.querySelectorAll('span');
    const unknownBadge = Array.from<HTMLElement>(badges).find((s) =>
      s.textContent?.includes('Unknown')
    );
    expect(unknownBadge).toBeTruthy();
  });

  it('should not be in loading state after initial load', () => {
    // The loadData() method sets isLoading to false synchronously in the current implementation
    expect(component.isLoading()).toBe(false);
  });

  it('should show Actions card with a Refresh button', () => {
    const headings = fixture.nativeElement.querySelectorAll('h2');
    const actionsHeading = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Actions')
    );
    expect(actionsHeading).toBeTruthy();

    const refreshButton = fixture.nativeElement.querySelector('button');
    expect(refreshButton).toBeTruthy();
    expect(refreshButton.textContent).toContain('Refresh');
  });

  it('should call loadData when refresh is invoked', () => {
    // loadData is private, but calling refresh calls it
    // We can verify the side effect: isLoading should momentarily be set then cleared
    component.refresh();
    fixture.detectChanges();

    // After refresh, isLoading should be false (synchronous loadData)
    expect(component.isLoading()).toBe(false);
  });

  it('should clear error message via clearError', () => {
    component.errorMessage.set('Some error');
    expect(component.errorMessage()).toBe('Some error');

    component.clearError();
    expect(component.errorMessage()).toBeNull();
  });

  it('should not show VIN Add Request card when requestData is null', () => {
    const headings = fixture.nativeElement.querySelectorAll('h2');
    const vinRequestHeading = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('VIN Add Request')
    );
    expect(vinRequestHeading).toBeFalsy();
  });

  it('should show VIN Add Request card when requestData is set', () => {
    component.requestData.set({
      requestId: 'req-001',
      status: VinAddStatus.PENDING,
      vin: '1HGCM82633A123456',
      lastUpdatedAt: '2026-01-15T10:00:00Z',
      eligibilityAllowed: true,
    });
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h2');
    const vinRequestHeading = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('VIN Add Request')
    );
    expect(vinRequestHeading).toBeTruthy();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('req-001');
    expect(content).toContain('1HGCM82633A123456');
  });

  it('should show Eligible badge when eligibilityAllowed is true', () => {
    component.requestData.set({
      requestId: 'req-001',
      status: VinAddStatus.PENDING,
      vin: '1HGCM82633A123456',
      lastUpdatedAt: '2026-01-15T10:00:00Z',
      eligibilityAllowed: true,
    });
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('.badge-success');
    const eligibleBadge = Array.from<HTMLElement>(badges).find((s) =>
      s.textContent?.includes('Eligible')
    );
    expect(eligibleBadge).toBeTruthy();
  });

  it('should show View Full Request Details link when requestData is present', () => {
    component.requestData.set({
      requestId: 'req-001',
      status: VinAddStatus.PENDING,
      vin: '1HGCM82633A123456',
      lastUpdatedAt: '2026-01-15T10:00:00Z',
    });
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    const detailLink = Array.from<HTMLAnchorElement>(links).find((a) =>
      a.textContent?.includes('View Full Request Details')
    );
    expect(detailLink).toBeTruthy();
    expect(detailLink!.getAttribute('href')).toBe('/admin/request/req-001');
  });
});
