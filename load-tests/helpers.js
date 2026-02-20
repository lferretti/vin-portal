import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, TEST_CONTRACT } from './config.js';

/**
 * Authenticate as a consumer and return the JWT token.
 * Fails the k6 check if authentication does not succeed.
 */
export function authenticateConsumer(contract = TEST_CONTRACT) {
  const res = http.post(
    `${BASE_URL}/api/v1/contract/authenticate`,
    JSON.stringify(contract),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': `k6-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      tags: { name: 'authenticate' },
    },
  );

  const ok = check(res, {
    'authenticate status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'authenticate returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        // Envelope interceptor wraps response in { data: ... }
        return !!(body.data && body.data.token) || !!body.token;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    return null;
  }

  try {
    const body = JSON.parse(res.body);
    return body.data ? body.data.token : body.token;
  } catch {
    return null;
  }
}

/**
 * Build standard request headers with authorization.
 */
export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-correlation-id': `k6-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

/**
 * Generate a random UUID v4 for idempotency keys.
 */
export function randomUUID() {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}
