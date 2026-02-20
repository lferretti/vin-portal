import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { deduplicationInterceptor } from './deduplication.interceptor';

describe('deduplicationInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([deduplicationInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should pass a single GET through normally', () => {
    httpClient.get('/api/v1/test').subscribe();

    const req = httpTesting.expectOne('/api/v1/test');
    expect(req.request.method).toBe('GET');
    req.flush({ data: 'ok' });
  });

  it('should share a single network request for concurrent identical GETs', () => {
    const results: unknown[] = [];

    httpClient.get('/api/v1/test').subscribe((r) => results.push(r));
    httpClient.get('/api/v1/test').subscribe((r) => results.push(r));

    // Only one network request should be made
    const req = httpTesting.expectOne('/api/v1/test');
    req.flush({ data: 'shared' });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ data: 'shared' });
    expect(results[1]).toEqual({ data: 'shared' });
  });

  it('should create separate requests for different URLs', () => {
    httpClient.get('/api/v1/test1').subscribe();
    httpClient.get('/api/v1/test2').subscribe();

    const req1 = httpTesting.expectOne('/api/v1/test1');
    const req2 = httpTesting.expectOne('/api/v1/test2');

    req1.flush({ data: '1' });
    req2.flush({ data: '2' });
  });

  it('should remove cache entry after response completes', () => {
    // First request
    httpClient.get('/api/v1/test').subscribe();
    const req1 = httpTesting.expectOne('/api/v1/test');
    req1.flush({ data: 'first' });

    // Second request to same URL — should create a new network request
    httpClient.get('/api/v1/test').subscribe();
    const req2 = httpTesting.expectOne('/api/v1/test');
    req2.flush({ data: 'second' });
  });

  it('should deduplicate concurrent identical POST requests', () => {
    const results: unknown[] = [];

    httpClient.post('/api/v1/submit', { value: 1 }).subscribe((r) => results.push(r));
    httpClient.post('/api/v1/submit', { value: 1 }).subscribe((r) => results.push(r));

    // Only one network request
    const req = httpTesting.expectOne('/api/v1/submit');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });

    expect(results).toHaveLength(2);
  });

  it('should allow a new request after the previous one completes', () => {
    const results: unknown[] = [];

    httpClient.get('/api/v1/test').subscribe((r) => results.push(r));
    const req1 = httpTesting.expectOne('/api/v1/test');
    req1.flush({ data: 'first' });

    httpClient.get('/api/v1/test').subscribe((r) => results.push(r));
    const req2 = httpTesting.expectOne('/api/v1/test');
    req2.flush({ data: 'second' });

    expect(results).toEqual([{ data: 'first' }, { data: 'second' }]);
  });

  it('should use separate cache keys for different HTTP methods on the same URL', () => {
    httpClient.get('/api/v1/resource').subscribe();
    httpClient.post('/api/v1/resource', {}).subscribe();

    const requests = httpTesting.match('/api/v1/resource');
    expect(requests).toHaveLength(2);
    expect(requests[0].request.method).toBe('GET');
    expect(requests[1].request.method).toBe('POST');

    requests[0].flush({ method: 'GET' });
    requests[1].flush({ method: 'POST' });
  });

  it('should create distinct cache keys for URLs with different query params', () => {
    httpClient.get('/api/v1/test?page=1').subscribe();
    httpClient.get('/api/v1/test?page=2').subscribe();

    const req1 = httpTesting.expectOne('/api/v1/test?page=1');
    const req2 = httpTesting.expectOne('/api/v1/test?page=2');

    req1.flush({ page: 1 });
    req2.flush({ page: 2 });
  });
});
