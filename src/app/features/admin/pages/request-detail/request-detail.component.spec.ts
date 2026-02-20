import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RequestDetailComponent } from './request-detail.component';
import { AdminService } from '@core/services/admin.service';
import { AdminSessionService } from '@core/services';
import {
  ApiEnvelope,
  AdminRequestDetailData,
  AdminNoteResponseData,
  VinAddStatus,
} from '@core/models';

describe('RequestDetailComponent', () => {
  let component: RequestDetailComponent;
  let fixture: ComponentFixture<RequestDetailComponent>;
  let adminServiceMock: {
    getRequestDetail: jest.Mock;
    addNote: jest.Mock;
    searchContracts: jest.Mock;
  };
  let adminSessionMock: {
    role: ReturnType<typeof signal>;
  };

  const mockRequestDetail: AdminRequestDetailData = {
    requestId: 'req-001',
    contractContextId: 'ctx-001',
    status: VinAddStatus.PENDING,
    vin: '1HGCM82633A123456',
    decoded: {
      year: 2026,
      make: 'Honda',
      model: 'Accord',
    },
    eligibilityAllowed: true,
    eligibilityReasonCode: undefined,
    lastDependencyError: undefined,
    audit: [
      {
        eventType: 'AUTH_SUCCESS',
        createdAt: '2026-01-15T09:00:00Z',
        actorType: 'CONSUMER',
        sourceIp: '192.168.1.42',
        userAgent: 'Mozilla/5.0 TestBrowser',
      },
      {
        eventType: 'VIN_DECODE',
        createdAt: '2026-01-15T09:05:00Z',
        actorType: 'SYSTEM',
        eventData: { vin: '1HGCM82633A123456' },
      },
      {
        eventType: 'ELIGIBILITY_CHECK',
        createdAt: '2026-01-15T09:06:00Z',
        actorType: 'SYSTEM',
      },
    ],
  };

  const mockDetailResponse: ApiEnvelope<AdminRequestDetailData> = {
    correlationId: 'test-corr-id',
    success: true,
    data: mockRequestDetail,
    error: null,
  };

  const mockNoteResponse: ApiEnvelope<AdminNoteResponseData> = {
    correlationId: 'test-corr-id',
    success: true,
    data: { requestId: 'req-001', noteSaved: true },
    error: null,
  };

  beforeEach(async () => {
    adminServiceMock = {
      getRequestDetail: jest.fn().mockReturnValue(of(mockDetailResponse)),
      addNote: jest.fn().mockReturnValue(of(mockNoteResponse)),
      searchContracts: jest.fn(),
    };

    adminSessionMock = {
      role: signal<string | null>('admin'),
    };

    await TestBed.configureTestingModule({
      imports: [RequestDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminServiceMock },
        { provide: AdminSessionService, useValue: adminSessionMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('requestId', 'req-001');
    fixture.detectChanges(); // triggers ngOnInit -> loadData
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should receive requestId input', () => {
    expect(component.requestId()).toBe('req-001');
  });

  it('should display the Request Detail heading', () => {
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Request Detail');
  });

  it('should have a Back to Search link', () => {
    const backLink = fixture.nativeElement.querySelector('a[href="/admin/search"]');
    expect(backLink).toBeTruthy();
    expect(backLink.textContent).toContain('Back to Search');
  });

  it('should call AdminService.getRequestDetail on init', () => {
    expect(adminServiceMock.getRequestDetail).toHaveBeenCalledWith('req-001');
  });

  it('should load and display request data', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    expect(component.data()).toEqual(mockRequestDetail);
    expect(component.isLoading()).toBe(false);

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('req-001');
    expect(content).toContain('ctx-001');
  }));

  it('should display the VIN value', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('1HGCM82633A123456');
  }));

  it('should display the Request Information card', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h2');
    const requestInfo = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Request Information')
    );
    expect(requestInfo).toBeTruthy();
  }));

  it('should display the Eligibility card', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h2');
    const eligibilityCard = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Eligibility')
    );
    expect(eligibilityCard).toBeTruthy();
  }));

  it('should show Allowed badge when eligibilityAllowed is true', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('.badge-success');
    const allowedBadge = Array.from<HTMLElement>(badges).find((s) =>
      s.textContent?.includes('Allowed')
    );
    expect(allowedBadge).toBeTruthy();
  }));

  it('should display decoded vehicle information', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const vehicleSection = fixture.nativeElement.querySelector('app-vin-display');
    expect(vehicleSection).toBeTruthy();
  }));

  it('should display the Audit Timeline card', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h2');
    const auditCard = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Audit Timeline')
    );
    expect(auditCard).toBeTruthy();
  }));

  it('should render audit events', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('AUTH_SUCCESS');
    expect(content).toContain('VIN_DECODE');
    expect(content).toContain('ELIGIBILITY_CHECK');
  }));

  it('should show actor type for audit events', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('CONSUMER');
    expect(content).toContain('SYSTEM');
  }));

  it('should display the Add Internal Note form', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const headings = fixture.nativeElement.querySelectorAll('h2');
    const noteCard = Array.from<HTMLElement>(headings).find((h) =>
      h.textContent?.includes('Add Internal Note')
    );
    expect(noteCard).toBeTruthy();

    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
  }));

  it('should have Add Note button disabled when note is empty', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button[type="submit"]');
    const addNoteButton = Array.from<HTMLButtonElement>(buttons).find((b) =>
      b.textContent?.includes('Add Note')
    );
    expect(addNoteButton).toBeTruthy();
    expect(addNoteButton!.disabled).toBe(true);
  }));

  it('should enable Add Note button when note text is entered', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    component.noteControl.setValue('This is a test note');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button[type="submit"]');
    const addNoteButton = Array.from<HTMLButtonElement>(buttons).find((b) =>
      b.textContent?.includes('Add Note')
    );
    expect(addNoteButton!.disabled).toBe(false);
  }));

  it('should call AdminService.addNote when note is submitted', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    component.noteControl.setValue('Customer called about status');
    component.onAddNote();
    tick();

    expect(adminServiceMock.addNote).toHaveBeenCalledWith('req-001', 'Customer called about status');
  }));

  it('should show success message after note is added', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    component.noteControl.setValue('Test note');
    component.onAddNote();
    tick();
    fixture.detectChanges();

    expect(component.successMessage()).toBe('Note added successfully.');
  }));

  it('should reset note control after successful note submission', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    component.noteControl.setValue('Test note');
    component.onAddNote();
    tick();
    fixture.detectChanges();

    expect(component.noteControl.value).toBeNull();
  }));

  it('should refresh data after successful note submission', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    adminServiceMock.getRequestDetail.mockClear();

    component.noteControl.setValue('Test note');
    component.onAddNote();
    tick();
    fixture.detectChanges();

    // loadData is called again after note submission
    expect(adminServiceMock.getRequestDetail).toHaveBeenCalledWith('req-001');
  }));

  it('should show error message when adding a note fails', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    adminServiceMock.addNote.mockReturnValue(throwError(() => new Error('Server error')));

    component.noteControl.setValue('Test note');
    component.onAddNote();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Failed to add note. Please try again.');
  }));

  it('should not submit note when noteControl is invalid', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    // noteControl is empty, so it should be invalid (Validators.required)
    component.onAddNote();
    tick();

    expect(adminServiceMock.addNote).not.toHaveBeenCalled();
  }));

  it('should show error message when loading request detail fails', fakeAsync(() => {
    adminServiceMock.getRequestDetail.mockReturnValue(throwError(() => new Error('Network error')));

    // Re-create component to test load failure
    fixture = TestBed.createComponent(RequestDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('requestId', 'req-fail');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Failed to load request details.');
    expect(component.isLoading()).toBe(false);
  }));

  it('should clear error message via clearError', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    component.errorMessage.set('Some error');
    component.clearError();
    expect(component.errorMessage()).toBeNull();
  }));

  it('should call loadData when refresh is invoked', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    adminServiceMock.getRequestDetail.mockClear();
    component.refresh();
    tick();

    expect(adminServiceMock.getRequestDetail).toHaveBeenCalledWith('req-001');
  }));

  it('should display Refresh Data button in the sidebar', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button[type="button"]');
    const refreshButton = Array.from<HTMLButtonElement>(buttons).find((b) =>
      b.textContent?.includes('Refresh Data')
    );
    expect(refreshButton).toBeTruthy();
  }));

  it('should show character count for the note textarea', fakeAsync(() => {
    tick();
    fixture.detectChanges();

    const noteForm = fixture.nativeElement.querySelector('form');
    const charCount = noteForm.querySelector('.text-xs.text-slate-500');
    expect(charCount.textContent).toContain('0 / 4000');

    component.noteControl.setValue('Hello');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(charCount.textContent).toContain('5 / 4000');
  }));

  it('should show Not Allowed badge when eligibilityAllowed is false', fakeAsync(() => {
    const ineligibleDetail: AdminRequestDetailData = {
      ...mockRequestDetail,
      eligibilityAllowed: false,
      eligibilityReasonCode: 'CLASS_TOO_HIGH',
    };

    adminServiceMock.getRequestDetail.mockReturnValue(
      of({
        ...mockDetailResponse,
        data: ineligibleDetail,
      })
    );

    fixture = TestBed.createComponent(RequestDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('requestId', 'req-ineligible');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const badges = fixture.nativeElement.querySelectorAll('.badge-error');
    const notAllowedBadge = Array.from<HTMLElement>(badges).find((s) =>
      s.textContent?.includes('Not Allowed')
    );
    expect(notAllowedBadge).toBeTruthy();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('CLASS_TOO_HIGH');
  }));

  describe('role-based audit field visibility', () => {
    it('should show IP and User Agent when role is admin', fakeAsync(() => {
      adminSessionMock.role.set('admin');
      tick();
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('IP: 192.168.1.42');
      expect(content).toContain('UA: Mozilla/5.0 TestBrowser');
    }));

    it('should hide IP and User Agent when role is support', fakeAsync(() => {
      adminSessionMock.role.set('support');
      tick();
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).not.toContain('IP: 192.168.1.42');
      expect(content).not.toContain('UA: Mozilla/5.0 TestBrowser');
    }));

    it('should have isSecurityAdmin true when role is admin', () => {
      adminSessionMock.role.set('admin');
      expect(component.isSecurityAdmin()).toBe(true);
    });

    it('should have isSecurityAdmin false when role is support', () => {
      adminSessionMock.role.set('support');
      expect(component.isSecurityAdmin()).toBe(false);
    });
  });
});
