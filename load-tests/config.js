export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<2000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>10'],
};

// SLA-aligned thresholds from docs/operations-sla.md
export const SLA_THRESHOLDS = {
  authenticate: { http_req_duration: ['p(95)<1500'] },
  vin_decode: { http_req_duration: ['p(95)<1000'] },
  eligibility: { http_req_duration: ['p(95)<1500'] },
  commit: { http_req_duration: ['p(95)<2000'] },
};

// Test contract data (matches backend stub adapter defaults)
export const TEST_CONTRACT = {
  contractNumber: 'CONTRACT-001',
  lastName: 'SMITH',
  zip: '30301',
};

// Test VIN (valid 17-character VIN, no I/O/Q)
export const TEST_VIN = '1HGCM82633A004352';

// Default load profile
export const LOAD_PROFILE = {
  stages: [
    { duration: '30s', target: 5 },   // ramp up
    { duration: '1m', target: 10 },    // steady state
    { duration: '30s', target: 20 },   // peak
    { duration: '30s', target: 0 },    // ramp down
  ],
};

// Smoke test profile (quick validation)
export const SMOKE_PROFILE = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '20s', target: 1 },
    { duration: '10s', target: 0 },
  ],
};
