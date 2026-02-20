import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { BASE_URL, THRESHOLDS, LOAD_PROFILE } from '../config.js';

/**
 * Admin JWT token. Provide via environment variable:
 *   k6 run -e ADMIN_TOKEN=<jwt> load-tests/scenarios/admin-search.js
 *
 * Alternatively, if the backend supports admin credential auth,
 * set ADMIN_USER and ADMIN_PASS env vars.
 */
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';
const ADMIN_USER = __ENV.ADMIN_USER || '';
const ADMIN_PASS = __ENV.ADMIN_PASS || '';

export const options = {
  stages: LOAD_PROFILE.stages,
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:admin_search}': ['p(95)<1500'],
    'http_req_duration{name:admin_request_detail}': ['p(95)<1000'],
  },
};

/**
 * Obtain an admin bearer token, either from the env var
 * or by authenticating against the admin auth endpoint.
 */
function getAdminToken() {
  if (ADMIN_TOKEN) {
    return ADMIN_TOKEN;
  }

  if (ADMIN_USER && ADMIN_PASS) {
    const res = http.post(
      `${BASE_URL}/api/v1/admin/auth`,
      JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
      {
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': `k6-admin-auth-${Date.now()}`,
        },
        tags: { name: 'admin_auth' },
      },
    );

    const ok = check(res, {
      'admin auth returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    if (ok) {
      try {
        const body = JSON.parse(res.body);
        return body.data ? body.data.token : body.token;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function adminHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-correlation-id': `k6-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

/**
 * Admin search flow load test.
 *
 * Simulates an admin user:
 *   1. Authenticate (or use pre-supplied JWT)
 *   2. Search contracts by contract number
 *   3. Retrieve a specific request detail
 */
export default function () {
  const token = getAdminToken();
  if (!token) {
    fail('Admin authentication failed — set ADMIN_TOKEN or ADMIN_USER/ADMIN_PASS env vars');
    return;
  }

  // Step 1: Search contracts by contract number
  const searchRes = http.get(
    `${BASE_URL}/api/v1/admin/contracts?contractNumber=CONTRACT-001`,
    {
      headers: adminHeaders(token),
      tags: { name: 'admin_search' },
    },
  );

  check(searchRes, {
    'admin search returns 200': (r) => r.status === 200,
    'admin search returns array or results': (r) => {
      try {
        const body = JSON.parse(r.body);
        const data = body.data || body;
        return Array.isArray(data) || (data.items && Array.isArray(data.items));
      } catch {
        return false;
      }
    },
    'admin search response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  sleep(Math.random() * 2 + 1); // Think time: admin reviews search results

  // Step 2: Get request detail (if search returned results with a requestId)
  let requestId = null;
  try {
    const body = JSON.parse(searchRes.body);
    const data = body.data || body;
    const items = Array.isArray(data) ? data : data.items || [];
    if (items.length > 0) {
      requestId = items[0].requestId || items[0].id;
    }
  } catch {
    // Could not extract requestId from search results
  }

  if (requestId) {
    const detailRes = http.get(
      `${BASE_URL}/api/v1/admin/requests/${requestId}`,
      {
        headers: adminHeaders(token),
        tags: { name: 'admin_request_detail' },
      },
    );

    check(detailRes, {
      'admin detail returns 200': (r) => r.status === 200,
      'admin detail has request data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const data = body.data || body;
          return !!data.requestId || !!data.id || !!data.status;
        } catch {
          return false;
        }
      },
      'admin detail response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  } else {
    // Fallback: search by a different parameter to exercise the endpoint
    const fallbackRes = http.get(
      `${BASE_URL}/api/v1/admin/contracts?externalContractId=EXT-001`,
      {
        headers: adminHeaders(token),
        tags: { name: 'admin_search' },
      },
    );

    check(fallbackRes, {
      'admin fallback search returns 200': (r) => r.status === 200,
    });
  }

  // End-of-iteration think time
  sleep(Math.random() * 2 + 1);
}
