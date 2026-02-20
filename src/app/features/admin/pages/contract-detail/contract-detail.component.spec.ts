import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContractDetailComponent } from './contract-detail.component';
import { AdminService } from '@core/services/admin.service';
import { VinAddStatus } from '@core/models';

describe('ContractDetailComponent', () => {
  let component: ContractDetailComponent;
  let fixture: ComponentFixture<ContractDetailComponent>;
  let adminServiceMock: Record<string, jest.Mock>;

  const mockContractDetailResponse = {
    correlationId: 'corr-1',
    success: true,
    data: {
      contractContextId: 'ctx-test-001',
      externalContractId: 'EXT-001',
      status: VinAddStatus.NOT_USED,
      committedVinMasked: null,
      committedAt: null,
      requests: [],
    },
    error: null,
  };

  const mockContractDetailWithRequests = {
    correlationId: 'corr-2',
    success: true,
    data: {
      contractContextId: 'ctx-test-001',
      externalContractId: 'EXT-001',
      status: VinAddStatus.COMMITTED_LOCKED,
      committedVinMasked: '1HG******1234',
      committedAt: '2026-01-15T10:00:00Z',
      requests: [
        { requestId: 'req-001', status: VinAddStatus.COMMITTED_LOCKED, createdAt: '2026-01-15T10:00:00Z' },
      ],
    },
    error: null,
  };

  const mockRequestDetailResponse = {
    correlationId: 'corr-3',
    success: true as const,
    data: {
      requestId: 'req-001',
      contractContextId: 'ctx-test-001',
      status: VinAddStatus.COMMITTED_LOCKED,
      vin: '1HGCM82633A123456',
      decoded: { year: 2003, make: 'Honda', model: 'Accord' },
      eligibilityAllowed: true,
      eligibilityReasonCode: 'OK',
      audit: [],
    },
    error: null,
  };

  beforeEach(async () => {
    adminServiceMock = {
      searchContracts: jest.fn(),
      getContractDetail: jest.fn().mockReturnValue(of(mockContractDetailResponse)),
      getRequestDetail: jest.fn().mockReturnValue(of(mockRequestDetailResponse)),
      addNote: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ContractDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceMock },
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

  it('should call getContractDetail on init', () => {
    expect(adminServiceMock.getContractDetail).toHaveBeenCalledWith('ctx-test-001');
  });

  it('should set contractData from the API response', () => {
    expect(component.contractData()).toEqual(mockContractDetailResponse.data);
  });

  it('should show status from contractData', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Not Used');
  });

  it('should show external contract ID from contractData', () => {
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('EXT-001');
  });

  it('should not be in loading state after initial load', () => {
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
    adminServiceMock.getContractDetail.mockClear();
    component.refresh();
    expect(adminServiceMock.getContractDetail).toHaveBeenCalledWith('ctx-test-001');
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

  it('should load request detail when contract has requests', () => {
    adminServiceMock.getContractDetail.mockReturnValue(of(mockContractDetailWithRequests));
    component.refresh();
    fixture.detectChanges();

    expect(adminServiceMock.getRequestDetail).toHaveBeenCalledWith('req-001');
  });

  it('should show VIN Add Request card when requestData is set', () => {
    adminServiceMock.getContractDetail.mockReturnValue(of(mockContractDetailWithRequests));
    component.refresh();
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
    adminServiceMock.getContractDetail.mockReturnValue(of(mockContractDetailWithRequests));
    component.refresh();
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('.badge-success');
    const eligibleBadge = Array.from<HTMLElement>(badges).find((s) =>
      s.textContent?.includes('Eligible')
    );
    expect(eligibleBadge).toBeTruthy();
  });

  it('should show View Full Request Details link when requestData is present', () => {
    adminServiceMock.getContractDetail.mockReturnValue(of(mockContractDetailWithRequests));
    component.refresh();
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    const detailLink = Array.from<HTMLAnchorElement>(links).find((a) =>
      a.textContent?.includes('View Full Request Details')
    );
    expect(detailLink).toBeTruthy();
    expect(detailLink!.getAttribute('href')).toBe('/admin/request/req-001');
  });

  it('should set error message when API call fails', () => {
    const errorResponse = {
      error: { error: { message: 'Contract not found.' } },
    };
    adminServiceMock.getContractDetail.mockReturnValue(throwError(() => errorResponse));
    component.refresh();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Contract not found.');
    expect(component.isLoading()).toBe(false);
  });

  it('should show default error message when error has no message', () => {
    adminServiceMock.getContractDetail.mockReturnValue(throwError(() => ({})));
    component.refresh();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Failed to load contract details.');
  });

  it('should show committed VIN when contractData has it', () => {
    adminServiceMock.getContractDetail.mockReturnValue(of(mockContractDetailWithRequests));
    component.refresh();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('1HG******1234');
  });
});
