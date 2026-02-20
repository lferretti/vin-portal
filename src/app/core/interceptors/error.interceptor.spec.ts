import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { SessionService } from '../services/session.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let sessionService: { clearSession: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    sessionService = {
      clearSession: jest.fn(),
    };

    router = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: sessionService },
        { provide: Router, useValue: router },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should clear session and redirect on 401 AUTH_EXPIRED', () => {
    httpClient.get('/api/v1/test').subscribe({
      error: () => {},
    });

    const req = httpTesting.expectOne('/api/v1/test');
    req.flush(
      { error: { code: 'AUTH_EXPIRED', message: 'Session expired' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(sessionService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/authenticate']);
  });

  it('should clear session and redirect on 401 AUTH_INVALID', () => {
    httpClient.get('/api/v1/test').subscribe({
      error: () => {},
    });

    const req = httpTesting.expectOne('/api/v1/test');
    req.flush(
      { error: { code: 'AUTH_INVALID', message: 'Invalid token' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(sessionService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/authenticate']);
  });

  it('should not clear session on 401 without matching error code', () => {
    httpClient.get('/api/v1/test').subscribe({
      error: () => {},
    });

    const req = httpTesting.expectOne('/api/v1/test');
    req.flush(
      { error: { code: 'OTHER_ERROR', message: 'Something else' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(sessionService.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should re-throw the error', (done) => {
    httpClient.get('/api/v1/test').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    const req = httpTesting.expectOne('/api/v1/test');
    req.flush(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500, statusText: 'Internal Server Error' }
    );
  });

  it('should pass through successful responses', () => {
    const testData = { success: true, data: { test: true } };

    httpClient.get('/api/v1/test').subscribe((response) => {
      expect(response).toEqual(testData);
    });

    const req = httpTesting.expectOne('/api/v1/test');
    req.flush(testData);
  });
});
