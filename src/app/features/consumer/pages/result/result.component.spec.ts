import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { ResultComponent } from './result.component';
import { VinService } from '@core/services/vin.service';
import { DocumentService } from '@core/services/document.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import {
  ApiEnvelope,
  VinRequestStatusData,
  VinAddStatus,
} from '@core/models';

describe('ResultComponent', () => {
  let component: ResultComponent;
  let fixture: ComponentFixture<ResultComponent>;
  let vinService: { getStatus: jest.Mock };
  let documentService: { downloadPdf: jest.Mock; emailDocument: jest.Mock };
  let consumerState: {
    commitStatus: ReturnType<typeof signal<VinAddStatus | null>>;
    updateCommitStatus: jest.Mock;
  };
  let router: Router;

  const REQUEST_ID = 'req-abc-123';

  function buildStatusResponse(
    status: VinAddStatus,
    overrides: Partial<VinRequestStatusData> = {}
  ): ApiEnvelope<VinRequestStatusData> {
    return {
      correlationId: 'corr-400',
      success: true,
      data: {
        requestId: REQUEST_ID,
        status,
        vin: '1HGCM82633A123456',
        decoded: { year: 2003, make: 'Honda', model: 'Accord' },
        lastUpdatedAt: '2026-02-18T12:00:00Z',
        ...overrides,
      },
      error: null,
    };
  }

  function setupComponent(): void {
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
    // Set the required input
    fixture.componentRef.setInput('requestId', REQUEST_ID);
  }

  beforeEach(async () => {
    vinService = {
      getStatus: jest.fn().mockReturnValue(
        of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED))
      ),
    };

    documentService = {
      downloadPdf: jest.fn().mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' }))),
      emailDocument: jest.fn().mockReturnValue(of({
        correlationId: 'corr-doc',
        success: true,
        data: { requestId: REQUEST_ID, sent: true },
        error: null,
      })),
    };

    consumerState = {
      commitStatus: signal<VinAddStatus | null>(null),
      updateCommitStatus: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ResultComponent],
      providers: [
        provideRouter([
          { path: 'vin-entry', component: ResultComponent },
        ]),
        { provide: VinService, useValue: vinService },
        { provide: DocumentService, useValue: documentService },
        { provide: ConsumerStateService, useValue: consumerState },
      ],
    }).compileComponents();
  });

  describe('creation and initial load', () => {
    it('should create', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      expect(component).toBeTruthy();
    }));

    it('should call getStatus on init with the request ID', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      expect(vinService.getStatus).toHaveBeenCalledWith(REQUEST_ID);
    }));

    it('should update consumerState.updateCommitStatus on load', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      tick();

      expect(consumerState.updateCommitStatus).toHaveBeenCalledWith(VinAddStatus.COMMITTED_LOCKED);
    }));
  });

  describe('success state (COMMITTED_LOCKED)', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should set status to COMMITTED_LOCKED', () => {
      expect(component.status()).toBe(VinAddStatus.COMMITTED_LOCKED);
    });

    it('should display the success heading', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toContain('Vehicle Added Successfully');
    });

    it('should display VIN information', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('1HGCM82633A123456');
    });

    it('should display the reference ID', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain(REQUEST_ID);
    });

    it('should display a Done link to home', () => {
      const links = fixture.nativeElement.querySelectorAll('a[href="/"]');
      const doneLink = Array.from<HTMLAnchorElement>(links).find((a) =>
        a.textContent?.includes('Done')
      );
      expect(doneLink).toBeTruthy();
    });

    it('should compute isSuccess as true', () => {
      expect(component.isSuccess()).toBe(true);
    });

    it('should compute isPending as false', () => {
      expect(component.isPending()).toBe(false);
    });

    it('should compute isFailed as false', () => {
      expect(component.isFailed()).toBe(false);
    });
  });

  describe('pending state', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.PENDING))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      discardPeriodicTasks();
    }));

    it('should set status to PENDING', () => {
      expect(component.status()).toBe(VinAddStatus.PENDING);
    });

    it('should display the pending heading', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toContain('Processing Your Request');
    });

    it('should display the reference number', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain(REQUEST_ID);
    });

    it('should compute isPending as true', () => {
      expect(component.isPending()).toBe(true);
    });
  });

  describe('failed ineligible state', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.FAILED_INELIGIBLE, {
          eligibilityReasonCode: 'CLASS_TOO_HIGH',
        }))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should set status to FAILED_INELIGIBLE', () => {
      expect(component.status()).toBe(VinAddStatus.FAILED_INELIGIBLE);
    });

    it('should display the failure heading', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toContain('Vehicle Not Eligible');
    });

    it('should display the reason code', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('CLASS_TOO_HIGH');
    });

    it('should display a Try Another Vehicle link', () => {
      const link = fixture.nativeElement.querySelector('a[href="/vin-entry"]');
      expect(link).toBeTruthy();
      expect(link.textContent).toContain('Try Another Vehicle');
    });

    it('should compute isFailed as true', () => {
      expect(component.isFailed()).toBe(true);
    });
  });

  describe('failed dependency state', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.FAILED_DEPENDENCY))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should set status to FAILED_DEPENDENCY', () => {
      expect(component.status()).toBe(VinAddStatus.FAILED_DEPENDENCY);
    });

    it('should display the unable to complete heading', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading.textContent).toContain('Unable to Complete Request');
    });

    it('should display the reference number', () => {
      const text = fixture.nativeElement.textContent;
      expect(text).toContain(REQUEST_ID);
    });

    it('should display a Contact Support link', () => {
      const links = fixture.nativeElement.querySelectorAll('a[href="/support"]');
      const supportLink = Array.from<HTMLAnchorElement>(links).find((a) =>
        a.textContent?.includes('Contact Support')
      );
      expect(supportLink).toBeTruthy();
    });
  });

  describe('error on getStatus', () => {
    it('should fall back to consumer state commit status on API error', fakeAsync(() => {
      consumerState.commitStatus.set(VinAddStatus.PENDING);
      vinService.getStatus.mockReturnValue(throwError(() => new Error('Network error')));

      setupComponent();
      fixture.detectChanges();
      tick();

      expect(component.status()).toBe(VinAddStatus.PENDING);
    }));
  });

  describe('refreshStatus', () => {
    it('should re-call getStatus when refreshStatus is invoked', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      tick();

      vinService.getStatus.mockClear();
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED))
      );
      component.refreshStatus();
      tick();

      expect(vinService.getStatus).toHaveBeenCalledWith(REQUEST_ID);
    }));
  });

  describe('polling behavior', () => {
    it('should stop polling when a terminal status is reached', fakeAsync(() => {
      // First call returns PENDING, subsequent calls return COMMITTED_LOCKED
      let callCount = 0;
      vinService.getStatus.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return of(buildStatusResponse(VinAddStatus.PENDING));
        }
        return of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED));
      });

      setupComponent();
      fixture.detectChanges();
      tick();

      // Advance past one poll interval (10 seconds)
      tick(10000);
      fixture.detectChanges();

      // The second call should return COMMITTED_LOCKED, stopping polling
      expect(component.status()).toBe(VinAddStatus.COMMITTED_LOCKED);
      expect(component.isPolling()).toBe(false);
    }));

    it('should increment poll count during polling', fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.PENDING))
      );
      setupComponent();
      fixture.detectChanges();
      tick();

      expect(component.pollCount()).toBe(0);

      // First poll
      tick(10000);
      expect(component.pollCount()).toBe(1);

      // Second poll
      tick(10000);
      expect(component.pollCount()).toBe(2);

      // Clean up remaining intervals
      discardPeriodicTasks();
    }));

    it('should not start polling twice', fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.PENDING))
      );
      setupComponent();
      fixture.detectChanges();
      tick();

      // Polling is already started from loadStatus
      const initialCallCount = vinService.getStatus.mock.calls.length;

      // Refresh should re-call getStatus but not double-start polling
      component.refreshStatus();
      tick();

      // Only one additional call from refreshStatus, not from double polling
      expect(vinService.getStatus.mock.calls.length).toBe(initialCallCount + 1);

      discardPeriodicTasks();
    }));
  });

  describe('statusData signal', () => {
    it('should contain the response data after load', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      tick();

      const data = component.statusData();
      expect(data).toBeTruthy();
      expect(data!.requestId).toBe(REQUEST_ID);
      expect(data!.vin).toBe('1HGCM82633A123456');
    }));

    it('should include decoded VIN info', fakeAsync(() => {
      setupComponent();
      fixture.detectChanges();
      tick();

      const data = component.statusData();
      expect(data!.decoded).toEqual({ year: 2003, make: 'Honda', model: 'Accord' });
    }));
  });

  describe('document download', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should render the document section on success', () => {
      const section = fixture.nativeElement.querySelector('[data-testid="document-section"]');
      expect(section).toBeTruthy();
    });

    it('should call documentService.downloadPdf when download button is clicked', fakeAsync(() => {
      // Mock createObjectURL and revokeObjectURL
      const mockUrl = 'blob:http://localhost/mock-pdf';
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      component.onDownloadPdf();
      tick();

      expect(documentService.downloadPdf).toHaveBeenCalledWith(REQUEST_ID);
      expect(component.isDownloading()).toBe(false);
    }));

    it('should set downloadError on failure', fakeAsync(() => {
      documentService.downloadPdf.mockReturnValue(throwError(() => new Error('Network error')));

      component.onDownloadPdf();
      tick();

      expect(component.isDownloading()).toBe(false);
      expect(component.downloadError()).toContain('Unable to download');
    }));
  });

  describe('document email', () => {
    beforeEach(fakeAsync(() => {
      vinService.getStatus.mockReturnValue(
        of(buildStatusResponse(VinAddStatus.COMMITTED_LOCKED))
      );
      setupComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should not send email when email is invalid', () => {
      component.emailControl.setValue('');
      component.onEmailDocument();
      expect(documentService.emailDocument).not.toHaveBeenCalled();
    });

    it('should call documentService.emailDocument with valid email', fakeAsync(() => {
      component.emailControl.setValue('user@example.com');
      component.onEmailDocument();
      tick();

      expect(documentService.emailDocument).toHaveBeenCalledWith(REQUEST_ID, 'user@example.com');
      expect(component.emailSent()).toBe(true);
      expect(component.isSendingEmail()).toBe(false);
    }));

    it('should set emailError on failure', fakeAsync(() => {
      documentService.emailDocument.mockReturnValue(throwError(() => new Error('Send failed')));

      component.emailControl.setValue('user@example.com');
      component.onEmailDocument();
      tick();

      expect(component.isSendingEmail()).toBe(false);
      expect(component.emailError()).toContain('Unable to send');
    }));
  });
});
