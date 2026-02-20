import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler';
import { RumService } from './rum.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let mockRumService: { addError: jest.Mock };

  beforeEach(() => {
    mockRumService = { addError: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: RumService, useValue: mockRumService },
      ],
    });

    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('should be created', () => {
    expect(handler).toBeTruthy();
  });

  it('should report Error to RUM service', () => {
    const error = new Error('Test error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    handler.handleError(error);

    expect(mockRumService.addError).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });

  it('should report non-Error to RUM service', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    handler.handleError('string error');

    expect(mockRumService.addError).toHaveBeenCalledWith('string error');
    consoleSpy.mockRestore();
  });

  it('should log errors to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test');

    handler.handleError(error);

    expect(consoleSpy).toHaveBeenCalledWith('Unhandled error:', error);
    consoleSpy.mockRestore();
  });

  it('should handle null errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => handler.handleError(null)).not.toThrow();

    consoleSpy.mockRestore();
  });
});
