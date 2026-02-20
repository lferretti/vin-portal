import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize, shareReplay } from 'rxjs';

/**
 * In-flight request cache keyed by "METHOD:URL".
 * GET requests share a replayed observable so concurrent identical GETs
 * resolve from a single network call. Mutating requests (POST/PUT/DELETE)
 * are blocked entirely while a duplicate is already in-flight.
 */
const inFlightRequests = new Map<string, Observable<HttpEvent<unknown>>>();

/**
 * Builds a deduplication cache key from the HTTP method and full URL
 * (including query params, which are part of `req.urlWithParams`).
 */
function buildCacheKey(method: string, url: string): string {
  return `${method}:${url}`;
}

/**
 * HTTP interceptor that deduplicates concurrent identical requests.
 *
 * - **GET:** Uses `shareReplay(1)` so all subscribers receive the same
 *   response from a single network round-trip. The cache entry is removed
 *   on completion so subsequent GETs are not stale.
 * - **POST / PUT / DELETE:** Blocks (returns the existing observable) while
 *   an identical mutating request is already in-flight, preventing
 *   double-submits.
 */
export const deduplicationInterceptor: HttpInterceptorFn = (req, next) => {
  const key = buildCacheKey(req.method, req.urlWithParams);

  // If an identical request is already in-flight, return the existing observable
  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) {
    return existingRequest;
  }

  const shared$ = next(req).pipe(
    // For GETs, shareReplay lets late subscribers receive the cached emission.
    // For mutating requests it still works correctly (single subscriber),
    // but the key benefit is the finalize cleanup.
    shareReplay({ bufferSize: 1, refCount: true }),
    finalize(() => {
      inFlightRequests.delete(key);
    }),
  );

  inFlightRequests.set(key, shared$);

  return shared$;
};
