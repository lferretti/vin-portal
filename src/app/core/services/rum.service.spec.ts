import { TestBed } from '@angular/core/testing';
import { RumService } from './rum.service';

jest.mock('@datadog/browser-rum', () => ({
  datadogRum: {
    init: jest.fn(),
  },
}));

import { datadogRum } from '@datadog/browser-rum';

// We need to mock the environment module
jest.mock('../../../environments/environment', () => ({
  environment: {
    datadog: {
      enabled: false,
      clientToken: '',
      applicationId: '',
      site: 'datadoghq.com',
      service: 'vin-portal',
      env: 'test',
      sampleRate: 100,
      trackInteractions: true,
      trackResources: true,
    },
  },
}));

import { environment } from '../../../environments/environment';

describe('RumService', () => {
  let service: RumService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment defaults
    Object.assign(environment.datadog, {
      enabled: false,
      clientToken: '',
      applicationId: '',
      site: 'datadoghq.com',
      service: 'vin-portal',
      env: 'test',
      sampleRate: 100,
      trackInteractions: true,
      trackResources: true,
    });

    TestBed.configureTestingModule({
      providers: [RumService],
    });

    service = TestBed.inject(RumService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not call datadogRum.init when disabled', () => {
    service.init();

    expect(datadogRum.init).not.toHaveBeenCalled();
  });

  it('should call datadogRum.init with correct config when enabled', () => {
    Object.assign(environment.datadog, {
      enabled: true,
      clientToken: 'test-token',
      applicationId: 'test-app-id',
    });

    service.init();

    expect(datadogRum.init).toHaveBeenCalledWith({
      clientToken: 'test-token',
      applicationId: 'test-app-id',
      site: 'datadoghq.com',
      service: 'vin-portal',
      env: 'test',
      sessionSampleRate: 100,
      trackUserInteractions: true,
      trackResources: true,
      defaultPrivacyLevel: 'mask-user-input',
    });
  });

  it('should only initialize once on multiple init() calls', () => {
    Object.assign(environment.datadog, {
      enabled: true,
      clientToken: 'test-token',
      applicationId: 'test-app-id',
    });

    service.init();
    service.init();
    service.init();

    expect(datadogRum.init).toHaveBeenCalledTimes(1);
  });
});
