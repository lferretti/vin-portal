import { TestBed } from '@angular/core/testing';
import { ContractService } from './contract.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('ContractService', () => {
  let service: ContractService;
  let apiService: { post: jest.Mock };

  const mockResponse = {
    correlationId: 'test-corr-id',
    success: true,
    data: {
      contractContextId: 'ctx-123',
      sessionToken: 'token-abc',
      sessionExpiresAt: '2025-01-01T00:00:00Z',
      otp: { status: 'NOT_REQUIRED', otpChallengeId: null, maskedDestination: null, channel: null },
    },
    error: null,
  };

  beforeEach(() => {
    apiService = {
      post: jest.fn().mockReturnValue(of(mockResponse)),
    };

    TestBed.configureTestingModule({
      providers: [
        ContractService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(ContractService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call authenticate endpoint', () => {
    service.authenticate({
      vin7: '1234567',
      lastName: 'Smith',
      zip: '30301',
    }).subscribe();

    expect(apiService.post).toHaveBeenCalledWith(
      '/contract/authenticate',
      expect.any(Object)
    );
  });

  it('should trim input values', () => {
    service.authenticate({
      vin7: '  1234567  ',
      lastName: '  Smith  ',
      zip: '  30301  ',
    }).subscribe();

    expect(apiService.post).toHaveBeenCalledWith(
      '/contract/authenticate',
      {
        vin7: '1234567',
        lastName: 'SMITH',
        zip: '30301',
      }
    );
  });

  it('should uppercase the last name', () => {
    service.authenticate({
      vin7: '1234567',
      lastName: 'smith',
      zip: '30301',
    }).subscribe();

    expect(apiService.post).toHaveBeenCalledWith(
      '/contract/authenticate',
      expect.objectContaining({
        lastName: 'SMITH',
      })
    );
  });
});
