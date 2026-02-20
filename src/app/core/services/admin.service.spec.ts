import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminService } from './admin.service';
import { ApiService } from './api.service';
import {
  ApiEnvelope,
  AdminContractSearchData,
  AdminRequestDetailData,
  AdminNoteResponseData,
} from '@core/models';

describe('AdminService', () => {
  let service: AdminService;
  let apiServiceMock: jest.Mocked<Pick<ApiService, 'get' | 'post'>>;

  const mockSearchResponse: ApiEnvelope<AdminContractSearchData> = {
    correlationId: 'corr-search-1',
    success: true,
    data: {
      results: [
        {
          contractContextId: 'ctx-1',
          externalContractId: 'ext-1',
          status: 'PENDING' as const,
          committedVinMasked: '1HG******5678',
          committedAt: '2025-06-01T12:00:00Z',
        },
      ],
    },
    error: null,
  };

  const mockRequestDetailResponse: ApiEnvelope<AdminRequestDetailData> = {
    correlationId: 'corr-detail-1',
    success: true,
    data: {
      requestId: 'req-123',
      contractContextId: 'ctx-1',
      status: 'COMMITTED_LOCKED' as const,
      vin: '1HGBH41JXMN109186',
      eligibilityAllowed: true,
      audit: [
        {
          eventType: 'AUTH_SUCCESS',
          createdAt: '2025-06-01T12:00:00Z',
          actorType: 'CONSUMER',
        },
        {
          eventType: 'VIN_COMMIT',
          createdAt: '2025-06-01T12:05:00Z',
          actorType: 'SYSTEM',
        },
      ],
    },
    error: null,
  };

  const mockNoteResponse: ApiEnvelope<AdminNoteResponseData> = {
    correlationId: 'corr-note-1',
    success: true,
    data: {
      requestId: 'req-123',
      noteSaved: true,
    },
    error: null,
  };

  beforeEach(() => {
    apiServiceMock = {
      get: jest.fn(),
      post: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiServiceMock }],
    });

    service = TestBed.inject(AdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchContracts', () => {
    it('should call api.get with contractNumber query param', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service.searchContracts({ contractNumber: 'CONTRACT-001' }).subscribe((result) => {
        expect(result).toEqual(mockSearchResponse);
      });

      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/admin/contracts?contractNumber=CONTRACT-001'
      );
    });

    it('should call api.get with externalContractId query param', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service.searchContracts({ externalContractId: 'ext-abc' }).subscribe();

      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/admin/contracts?externalContractId=ext-abc'
      );
    });

    it('should call api.get with requestId query param', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service.searchContracts({ requestId: 'req-xyz' }).subscribe();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/admin/contracts?requestId=req-xyz');
    });

    it('should combine multiple search parameters', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service
        .searchContracts({
          contractNumber: 'CONTRACT-001',
          externalContractId: 'ext-abc',
        })
        .subscribe();

      const calledPath = apiServiceMock.get.mock.calls[0][0];
      expect(calledPath).toContain('contractNumber=CONTRACT-001');
      expect(calledPath).toContain('externalContractId=ext-abc');
      expect(calledPath).toMatch(/^\/admin\/contracts\?/);
    });

    it('should call api.get with no query params when none provided', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service.searchContracts({}).subscribe();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/admin/contracts');
    });

    it('should ignore undefined parameters', () => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service
        .searchContracts({
          contractNumber: 'CONTRACT-001',
          externalContractId: undefined,
          requestId: undefined,
        })
        .subscribe();

      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/admin/contracts?contractNumber=CONTRACT-001'
      );
    });

    it('should return search results from the API', (done) => {
      apiServiceMock.get.mockReturnValue(of(mockSearchResponse));

      service.searchContracts({ contractNumber: 'CONTRACT-001' }).subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.results).toHaveLength(1);
        expect(result.data?.results[0].contractContextId).toBe('ctx-1');
        done();
      });
    });
  });

  describe('getRequestDetail', () => {
    it('should call api.get with the correct path', () => {
      apiServiceMock.get.mockReturnValue(of(mockRequestDetailResponse));

      service.getRequestDetail('req-123').subscribe();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/admin/requests/req-123');
    });

    it('should return request detail data', (done) => {
      apiServiceMock.get.mockReturnValue(of(mockRequestDetailResponse));

      service.getRequestDetail('req-123').subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.requestId).toBe('req-123');
        expect(result.data?.status).toBe('COMMITTED_LOCKED');
        expect(result.data?.audit).toHaveLength(2);
        done();
      });
    });

    it('should include audit trail in the response', (done) => {
      apiServiceMock.get.mockReturnValue(of(mockRequestDetailResponse));

      service.getRequestDetail('req-123').subscribe((result) => {
        const audit = result.data?.audit;
        expect(audit?.[0].eventType).toBe('AUTH_SUCCESS');
        expect(audit?.[1].eventType).toBe('VIN_COMMIT');
        done();
      });
    });
  });

  describe('addNote', () => {
    it('should call api.post with the correct path and body', () => {
      apiServiceMock.post.mockReturnValue(of(mockNoteResponse));

      service.addNote('req-123', 'Customer called about status').subscribe();

      expect(apiServiceMock.post).toHaveBeenCalledWith('/admin/requests/req-123/note', {
        note: 'Customer called about status',
      });
    });

    it('should return note save confirmation', (done) => {
      apiServiceMock.post.mockReturnValue(of(mockNoteResponse));

      service.addNote('req-123', 'A note').subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.requestId).toBe('req-123');
        expect(result.data?.noteSaved).toBe(true);
        done();
      });
    });

    it('should send the note in an AdminNoteRequest format', () => {
      apiServiceMock.post.mockReturnValue(of(mockNoteResponse));

      service.addNote('req-456', 'Escalation note').subscribe();

      const callBody = apiServiceMock.post.mock.calls[0][1];
      expect(callBody).toEqual({ note: 'Escalation note' });
    });
  });
});
