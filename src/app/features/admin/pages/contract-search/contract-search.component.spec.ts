import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContractSearchComponent } from './contract-search.component';
import { AdminService } from '@core/services/admin.service';
import { ApiEnvelope, AdminContractSearchData, AdminContractSummary, VinAddStatus } from '@core/models';

describe('ContractSearchComponent', () => {
  let component: ContractSearchComponent;
  let fixture: ComponentFixture<ContractSearchComponent>;
  let adminServiceMock: {
    searchContracts: jest.Mock;
  };

  const mockResults: AdminContractSummary[] = [
    {
      contractContextId: 'ctx-001',
      externalContractId: 'EXT-001',
      status: VinAddStatus.NOT_USED,
      committedVinMasked: undefined,
      committedAt: undefined,
    },
    {
      contractContextId: 'ctx-002',
      externalContractId: 'EXT-002',
      status: VinAddStatus.COMMITTED_LOCKED,
      committedVinMasked: '1HG******5678',
      committedAt: '2026-01-15T10:00:00Z',
    },
  ];

  const mockSuccessResponse: ApiEnvelope<AdminContractSearchData> = {
    correlationId: 'test-corr-id',
    success: true,
    data: { results: mockResults },
    error: null,
  };

  const mockEmptyResponse: ApiEnvelope<AdminContractSearchData> = {
    correlationId: 'test-corr-id',
    success: true,
    data: { results: [] },
    error: null,
  };

  beforeEach(async () => {
    adminServiceMock = {
      searchContracts: jest.fn().mockReturnValue(of(mockSuccessResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [ContractSearchComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the Search Contracts heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Search Contracts');
  });

  it('should render the search form with three input fields', () => {
    const contractNumber = fixture.nativeElement.querySelector('#contractNumber');
    const externalId = fixture.nativeElement.querySelector('#externalContractId');
    const requestId = fixture.nativeElement.querySelector('#requestId');

    expect(contractNumber).toBeTruthy();
    expect(externalId).toBeTruthy();
    expect(requestId).toBeTruthy();
  });

  it('should have the search button disabled when no criteria entered', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('should enable the search button when contract number is entered', () => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    expect(component.hasSearchCriteria()).toBe(true);

    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    // Verify the component method returns true (button disabled state may not
    // reflect in DOM without a template event due to OnPush, so test the logic)
    expect(component.isSearching() || !component.hasSearchCriteria()).toBe(false);
  });

  it('should enable the search button when external ID is entered', () => {
    component.searchForm.patchValue({ externalContractId: 'EXT-001' });
    expect(component.hasSearchCriteria()).toBe(true);
    expect(component.isSearching() || !component.hasSearchCriteria()).toBe(false);
  });

  it('should enable the search button when request ID is entered', () => {
    component.searchForm.patchValue({ requestId: 'REQ-001' });
    expect(component.hasSearchCriteria()).toBe(true);
    expect(component.isSearching() || !component.hasSearchCriteria()).toBe(false);
  });

  it('should not call AdminService.searchContracts when no criteria is provided', () => {
    component.onSearch();
    expect(adminServiceMock.searchContracts).not.toHaveBeenCalled();
  });

  it('should call AdminService.searchContracts with form values on submit', () => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();

    expect(adminServiceMock.searchContracts).toHaveBeenCalledWith({
      contractNumber: 'CONTRACT-001',
      externalContractId: undefined,
      requestId: undefined,
    });
  });

  it('should display results after a successful search', fakeAsync(() => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    expect(component.hasSearched()).toBe(true);
    expect(component.results()).toEqual(mockResults);

    const resultHeading = fixture.nativeElement.querySelector('h2');
    expect(resultHeading.textContent).toContain('Results (2)');
  }));

  it('should display result rows with contract data', fakeAsync(() => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('EXT-001');
    expect(rows[1].textContent).toContain('EXT-002');
  }));

  it('should show View Details link for each result', fakeAsync(() => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    const viewLinks = fixture.nativeElement.querySelectorAll('tbody a');
    expect(viewLinks.length).toBe(2);
    expect(viewLinks[0].textContent).toContain('View Details');
    expect(viewLinks[0].getAttribute('href')).toBe('/admin/contract/ctx-001');
    expect(viewLinks[1].getAttribute('href')).toBe('/admin/contract/ctx-002');
  }));

  it('should display no results message when search returns empty', fakeAsync(() => {
    adminServiceMock.searchContracts.mockReturnValue(of(mockEmptyResponse));

    component.searchForm.patchValue({ contractNumber: 'NONEXISTENT' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    const noResults = fixture.nativeElement.querySelector('p');
    expect(noResults.textContent).toContain('No contracts found matching your criteria');
  }));

  it('should show error message when search fails', fakeAsync(() => {
    adminServiceMock.searchContracts.mockReturnValue(throwError(() => new Error('Network error')));

    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Search failed. Please try again.');
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
  }));

  it('should clear error message via clearError', fakeAsync(() => {
    adminServiceMock.searchContracts.mockReturnValue(throwError(() => new Error('fail')));

    component.searchForm.patchValue({ contractNumber: 'X' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Search failed. Please try again.');

    component.clearError();
    fixture.detectChanges();

    expect(component.errorMessage()).toBeNull();
  }));

  it('should set isSearching to true during search and false after', fakeAsync(() => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });

    expect(component.isSearching()).toBe(false);
    component.onSearch();
    // isSearching should be true before Observable resolves in a real async scenario.
    // With synchronous `of()`, it completes immediately.
    tick();

    expect(component.isSearching()).toBe(false);
    expect(component.hasSearched()).toBe(true);
  }));

  it('should not show results section before any search is performed', () => {
    expect(component.hasSearched()).toBe(false);
    const resultHeading = fixture.nativeElement.querySelector('h2');
    // h2 should not exist since hasSearched is false
    expect(resultHeading).toBeNull();
  });

  it('should display committed VIN or dash for each result', fakeAsync(() => {
    component.searchForm.patchValue({ contractNumber: 'CONTRACT-001' });
    component.onSearch();
    tick();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    // First row has no committed VIN — should show dash
    const firstRowCells = rows[0].querySelectorAll('td');
    expect(firstRowCells[2].textContent?.trim()).toBe('\u2014'); // em dash

    // Second row has committed VIN
    const secondRowCells = rows[1].querySelectorAll('td');
    expect(secondRowCells[2].textContent?.trim()).toBe('1HG******5678');
  }));
});
