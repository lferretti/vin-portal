import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import {
  BASE_URL,
  THRESHOLDS,
  SLA_THRESHOLDS,
  TEST_VIN,
  LOAD_PROFILE,
} from '../config.js';
import { authenticateConsumer, authHeaders, randomUUID } from '../helpers.js';

export const options = {
  stages: LOAD_PROFILE.stages,
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:authenticate}': SLA_THRESHOLDS.authenticate.http_req_duration,
    'http_req_duration{name:vin_decode}': SLA_THRESHOLDS.vin_decode.http_req_duration,
    'http_req_duration{name:eligibility}': SLA_THRESHOLDS.eligibility.http_req_duration,
    'http_req_duration{name:commit}': SLA_THRESHOLDS.commit.http_req_duration,
  },
};

/**
 * Full VIN add flow load test.
 *
 * Simulates the complete consumer journey:
 *   1. Authenticate with contract credentials
 *   2. Decode a VIN
 *   3. Check VIN eligibility
 *   4. Commit the VIN addition
 *   5. Poll request status
 *
 * Each step is tagged for per-endpoint threshold enforcement
 * aligned with SLA targets from docs/operations-sla.md.
 */
export default function () {
  // Step 1: Authenticate
  const token = authenticateConsumer();
  if (!token) {
    fail('Authentication failed — cannot proceed with VIN flow');
    return;
  }

  sleep(Math.random() * 2 + 1); // Think time: user navigates to VIN entry

  // Step 2: Decode VIN
  const decodeRes = http.post(
    `${BASE_URL}/api/v1/vin/decode`,
    JSON.stringify({ vin: TEST_VIN }),
    {
      headers: authHeaders(token),
      tags: { name: 'vin_decode' },
    },
  );

  check(decodeRes, {
    'decode returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'decode response has vehicle data': (r) => {
      try {
        const body = JSON.parse(r.body);
        const data = body.data || body;
        return !!data.make || !!data.year || !!data.vin;
      } catch {
        return false;
      }
    },
    'decode response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(Math.random() * 2 + 1); // Think time: user reviews vehicle info

  // Step 3: Check eligibility
  const eligRes = http.post(
    `${BASE_URL}/api/v1/vin/eligibility`,
    JSON.stringify({ vin: TEST_VIN }),
    {
      headers: authHeaders(token),
      tags: { name: 'eligibility' },
    },
  );

  check(eligRes, {
    'eligibility returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'eligibility response has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        const data = body.data || body;
        return data.eligible !== undefined || data.status !== undefined;
      } catch {
        return false;
      }
    },
    'eligibility response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  sleep(Math.random() * 3 + 2); // Think time: user reviews eligibility and confirms

  // Step 4: Commit VIN addition
  const idempotencyKey = randomUUID();

  const commitRes = http.post(
    `${BASE_URL}/api/v1/vin/commit`,
    JSON.stringify({ vin: TEST_VIN, acceptIrreversible: true }),
    {
      headers: {
        ...authHeaders(token),
        'x-idempotency-key': idempotencyKey,
      },
      tags: { name: 'commit' },
    },
  );

  check(commitRes, {
    'commit returns 200 or 201 or 202': (r) =>
      r.status === 200 || r.status === 201 || r.status === 202,
    'commit response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  // Extract requestId from commit response for status polling
  let requestId = null;
  try {
    const body = JSON.parse(commitRes.body);
    const data = body.data || body;
    requestId = data.requestId || data.id;
  } catch {
    // requestId extraction failed — skip polling
  }

  sleep(Math.random() + 1); // Think time: brief pause before polling

  // Step 5: Poll request status (if we have a requestId)
  if (requestId) {
    const statusRes = http.get(
      `${BASE_URL}/api/v1/vin/request/${requestId}`,
      {
        headers: authHeaders(token),
        tags: { name: 'request_status' },
      },
    );

    check(statusRes, {
      'status poll returns 200': (r) => r.status === 200,
      'status poll has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          const data = body.data || body;
          return !!data.status;
        } catch {
          return false;
        }
      },
    });
  }

  // End-of-iteration think time
  sleep(Math.random() * 2 + 1);
}
