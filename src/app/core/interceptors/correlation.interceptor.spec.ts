import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { correlationInterceptor } from './correlation.interceptor';

describe('correlationInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should add X-Correlation-ID header to all requests', () => {
    httpClient.get('/api/v1/test').subscribe();

    const req = httpTesting.expectOne('/api/v1/test');
    expect(req.request.headers.has('X-Correlation-ID')).toBe(true);
    req.flush({});
  });

  it('should add a non-empty correlation ID', () => {
    httpClient.get('/api/v1/test').subscribe();

    const req = httpTesting.expectOne('/api/v1/test');
    const correlationId = req.request.headers.get('X-Correlation-ID');
    expect(correlationId).toBeTruthy();
    expect(typeof correlationId).toBe('string');
    req.flush({});
  });

  it('should generate unique IDs for different requests', () => {
    httpClient.get('/api/v1/test1').subscribe();
    httpClient.get('/api/v1/test2').subscribe();

    const req1 = httpTesting.expectOne('/api/v1/test1');
    const req2 = httpTesting.expectOne('/api/v1/test2');

    const id1 = req1.request.headers.get('X-Correlation-ID');
    const id2 = req2.request.headers.get('X-Correlation-ID');

    expect(id1).not.toBe(id2);

    req1.flush({});
    req2.flush({});
  });
});
