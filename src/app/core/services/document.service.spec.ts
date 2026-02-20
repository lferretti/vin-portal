import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DocumentService } from './document.service';
import { ApiService } from './api.service';

describe('DocumentService', () => {
  let service: DocumentService;
  let apiService: { getBlob: jest.Mock; post: jest.Mock };

  beforeEach(() => {
    apiService = {
      getBlob: jest.fn().mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' }))),
      post: jest.fn().mockReturnValue(
        of({
          correlationId: 'corr-1',
          success: true,
          data: { requestId: 'req-123', sent: true },
          error: null,
        })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        DocumentService,
        { provide: ApiService, useValue: apiService },
      ],
    });

    service = TestBed.inject(DocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadPdf', () => {
    it('should call apiService.getBlob with the correct URL', () => {
      service.downloadPdf('req-123').subscribe();
      expect(apiService.getBlob).toHaveBeenCalledWith('/document/request/req-123/pdf');
    });

    it('should return a Blob', (done) => {
      service.downloadPdf('req-123').subscribe((blob) => {
        expect(blob).toBeInstanceOf(Blob);
        done();
      });
    });
  });

  describe('emailDocument', () => {
    it('should call apiService.post with the correct URL and body', () => {
      service.emailDocument('req-123', 'user@example.com').subscribe();
      expect(apiService.post).toHaveBeenCalledWith(
        '/document/request/req-123/email',
        { email: 'user@example.com' }
      );
    });

    it('should return the email response', (done) => {
      service.emailDocument('req-123', 'user@example.com').subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data?.sent).toBe(true);
        done();
      });
    });
  });
});
