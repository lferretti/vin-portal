import { TestBed } from '@angular/core/testing';
import { HttpHeaders } from '@angular/common/http';
import { VinService } from './vin.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('VinService', () => {
  let service: VinService;
  let apiService: { post: jest.Mock; get: jest.Mock };

  const mockDecodeResponse = {
    correlationId: 'corr-1',
    success: true,
    data: { decoded: { year: 2023, make: 'Honda', model: 'Civic' } },
    error: null,
  };

  const mockEligibilityResponse = {
    correlationId: 'corr-2',
    success: true,
    data: { vin: '1HGCM82633A123456', eligible: true, reasonCode: null },
    error: null,
  };

  const mockCommitResponse = {
    correlationId: 'corr-3',
    success: true,
    data: { requestId: 'req-123', status: 'PENDING' },
    error: null,
  };

  const mockStatusResponse = {
    correlationId: 'corr-4',
    success: true,
    data: { requestId: 'req-123', status: 'COMMITTED_LOCKED' },
    error: null,
  };

  beforeEach(() => {
    apiService = {
      post: jest.fn().mockReturnValue(of(mockDecodeResponse)),
      get: jest.fn().mockReturnValue(of(mockStatusResponse)),
    };

    TestBed.configureTestingModule({
      providers: [
        VinService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(VinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('decode', () => {
    it('should call decode endpoint', () => {
      service.decode({ vin: '1HGCM82633A123456' }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/decode',
        { vin: '1HGCM82633A123456' }
      );
    });

    it('should normalize VIN to uppercase', () => {
      service.decode({ vin: '1hgcm82633a123456' }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/decode',
        { vin: '1HGCM82633A123456' }
      );
    });

    it('should remove spaces from VIN', () => {
      service.decode({ vin: '1HG CM8 2633A123456' }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/decode',
        { vin: '1HGCM82633A123456' }
      );
    });
  });

  describe('checkEligibility', () => {
    it('should call eligibility endpoint', () => {
      apiService.post.mockReturnValue(of(mockEligibilityResponse));

      service.checkEligibility({ vin: '1HGCM82633A123456' }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/eligibility',
        { vin: '1HGCM82633A123456' }
      );
    });
  });

  describe('commit', () => {
    it('should call commit endpoint with idempotency key', () => {
      apiService.post.mockReturnValue(of(mockCommitResponse));

      service.commit(
        { vin: '1HGCM82633A123456', acceptIrreversible: true },
        'idem-key-123'
      ).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/commit',
        { vin: '1HGCM82633A123456', acceptIrreversible: true },
        { headers: expect.any(HttpHeaders) }
      );

      const headers: HttpHeaders = apiService.post.mock.calls[0][2].headers;
      expect(headers.get('X-Idempotency-Key')).toBe('idem-key-123');
    });

    it('should normalize VIN on commit', () => {
      apiService.post.mockReturnValue(of(mockCommitResponse));

      service.commit(
        { vin: '1hgcm82633a123456', acceptIrreversible: true },
        'idem-key'
      ).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/vin/commit',
        { vin: '1HGCM82633A123456', acceptIrreversible: true },
        expect.any(Object)
      );
    });
  });

  describe('getStatus', () => {
    it('should call status endpoint with request ID', () => {
      service.getStatus('req-123').subscribe();

      expect(apiService.get).toHaveBeenCalledWith('/vin/request/req-123');
    });
  });
});
