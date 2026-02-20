import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpTesting: HttpTestingController;

  const mockResponse = {
    correlationId: 'test-corr-id',
    success: true,
    data: { test: true },
    error: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should make GET request to correct URL', () => {
      service.get('/test/path').subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('/api/v1/test/path');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass custom headers', () => {
      const headers = new HttpHeaders().set('X-Custom', 'value');

      service.get('/test', { headers }).subscribe();

      const req = httpTesting.expectOne('/api/v1/test');
      expect(req.request.headers.get('X-Custom')).toBe('value');
      req.flush(mockResponse);
    });
  });

  describe('post', () => {
    it('should make POST request with body', () => {
      const body = { key: 'value' };

      service.post('/test', body).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('/api/v1/test');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });

    it('should pass custom headers on POST', () => {
      const headers = new HttpHeaders().set('X-Idempotency-Key', 'abc-123');

      service.post('/test', {}, { headers }).subscribe();

      const req = httpTesting.expectOne('/api/v1/test');
      expect(req.request.headers.get('X-Idempotency-Key')).toBe('abc-123');
      req.flush(mockResponse);
    });
  });

  describe('put', () => {
    it('should make PUT request with body', () => {
      const body = { updated: true };

      service.put('/test/1', body).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('/api/v1/test/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('delete', () => {
    it('should make DELETE request', () => {
      service.delete('/test/1').subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTesting.expectOne('/api/v1/test/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });
});
