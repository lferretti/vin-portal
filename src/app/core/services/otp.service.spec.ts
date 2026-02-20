import { TestBed } from '@angular/core/testing';
import { OtpService } from './otp.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('OtpService', () => {
  let service: OtpService;
  let apiService: { post: jest.Mock };

  const mockSendResponse = {
    correlationId: 'corr-1',
    success: true,
    data: { sent: true },
    error: null,
  };

  const mockVerifyResponse = {
    correlationId: 'corr-2',
    success: true,
    data: {
      contractContextId: 'ctx-123',
      sessionToken: 'new-token',
      sessionExpiresAt: '2025-01-01T00:00:00Z',
    },
    error: null,
  };

  beforeEach(() => {
    apiService = {
      post: jest.fn().mockReturnValue(of(mockSendResponse)),
    };

    TestBed.configureTestingModule({
      providers: [
        OtpService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(OtpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('send', () => {
    it('should call send endpoint with challenge ID', () => {
      service.send({ otpChallengeId: 'challenge-123' }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/otp/send',
        { otpChallengeId: 'challenge-123' }
      );
    });
  });

  describe('verify', () => {
    it('should call verify endpoint with challenge ID and code', () => {
      apiService.post.mockReturnValue(of(mockVerifyResponse));

      service.verify({
        otpChallengeId: 'challenge-123',
        code: '123456',
      }).subscribe();

      expect(apiService.post).toHaveBeenCalledWith(
        '/otp/verify',
        { otpChallengeId: 'challenge-123', code: '123456' }
      );
    });
  });
});
