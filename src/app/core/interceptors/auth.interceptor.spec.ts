import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from '../services/session.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let sessionService: { getToken: jest.Mock };

  beforeEach(() => {
    sessionService = {
      getToken: jest.fn().mockReturnValue(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: sessionService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should add Bearer header when token exists', () => {
    sessionService.getToken.mockReturnValue('test-token');

    httpClient.get('/api/v1/vin/decode').subscribe();

    const req = httpTesting.expectOne('/api/v1/vin/decode');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should not add header when no token', () => {
    sessionService.getToken.mockReturnValue(null);

    httpClient.get('/api/v1/vin/decode').subscribe();

    const req = httpTesting.expectOne('/api/v1/vin/decode');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip auth header for authenticate endpoint', () => {
    sessionService.getToken.mockReturnValue('test-token');

    httpClient.post('/api/v1/contract/authenticate', {}).subscribe();

    const req = httpTesting.expectOne('/api/v1/contract/authenticate');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip auth header for OTP endpoints', () => {
    sessionService.getToken.mockReturnValue('test-token');

    httpClient.post('/api/v1/otp/send', {}).subscribe();

    const req = httpTesting.expectOne('/api/v1/otp/send');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should skip auth header for OTP verify endpoint', () => {
    sessionService.getToken.mockReturnValue('test-token');

    httpClient.post('/api/v1/otp/verify', {}).subscribe();

    const req = httpTesting.expectOne('/api/v1/otp/verify');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
