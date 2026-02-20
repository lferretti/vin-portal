import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS, SLA_THRESHOLDS, TEST_CONTRACT, LOAD_PROFILE } from '../config.js';

export const options = {
  stages: LOAD_PROFILE.stages,
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:authenticate}': SLA_THRESHOLDS.authenticate.http_req_duration,
  },
};

/**
 * Consumer authentication flow load test.
 *
 * Tests POST /api/v1/contract/authenticate with valid contract data.
 * Verifies the endpoint returns a JWT token within SLA targets
 * (p95 < 1.5s per docs/operations-sla.md).
 */
export default function () {
  // Step 1: Authenticate with contract credentials
  const authPayload = JSON.stringify(TEST_CONTRACT);

  const authRes = http.post(
    `${BASE_URL}/api/v1/contract/authenticate`,
    authPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': `k6-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      tags: { name: 'authenticate' },
    },
  );

  check(authRes, {
    'authenticate returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'authenticate response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!(body.data && body.data.token) || !!body.token;
      } catch {
        return false;
      }
    },
    'authenticate response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  // Think time: simulate user reading the response
  sleep(Math.random() * 2 + 1); // 1-3 seconds

  // Step 2: Attempt authentication with invalid credentials (negative test)
  const badPayload = JSON.stringify({
    contractNumber: 'INVALID-999',
    lastName: 'NOBODY',
    zip: '00000',
  });

  const badRes = http.post(
    `${BASE_URL}/api/v1/contract/authenticate`,
    badPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': `k6-auth-bad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      tags: { name: 'authenticate' },
    },
  );

  check(badRes, {
    'invalid auth returns 401 or 404': (r) => r.status === 401 || r.status === 404,
    'invalid auth response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  // Think time between iterations
  sleep(Math.random() * 2 + 1);
}
