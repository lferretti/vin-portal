# ADR-0005: Hybrid Synchronous/Asynchronous Commit Pattern for VIN Addition

## Context

The core operation of the VIN Portal is "committing" a new vehicle (VIN) to an existing warranty contract. This commit operation involves the backend calling several external dependencies: the contract management system to validate and update the contract, a VIN decoder service to verify the vehicle, and potentially a notification service to confirm the addition to the consumer.

These external dependencies have varying reliability and response times. The contract management system, in particular, can experience intermittent slowness or downtime during peak periods. The team needed to design a commit flow that provides a good user experience (fast feedback) while being resilient to dependency failures.

A fully synchronous approach would block the user until all downstream calls complete, risking timeouts and a poor experience. A fully asynchronous approach would always queue the request, meaning the user never gets immediate confirmation even when everything is healthy.

## Decision

Implement a hybrid commit pattern:

1. **Synchronous attempt first:** When the consumer submits the VIN addition, the backend attempts to complete the full commit synchronously within a configured timeout window (e.g., 10 seconds).
2. **Immediate success:** If all downstream calls complete within the timeout, the API returns a `COMMITTED` status and the consumer sees an immediate success result.
3. **Fallback to async:** If any downstream dependency is slow or unavailable, the backend immediately returns a `PENDING` status to the consumer. The request is persisted to a durable queue, and a background worker picks it up for retry processing.
4. **Retry with exponential backoff:** The worker retries the commit with exponential backoff (initial delay of 30 seconds, doubling each attempt) up to a maximum of 5 retries. If all retries fail, the request is marked as `FAILED` and flagged for manual review in the admin dashboard.

The consumer-facing result page displays the appropriate status (`COMMITTED` or `PENDING`) and explains next steps for pending requests (e.g., "You will receive a confirmation email once processing is complete").

## Alternatives Considered

- **Fully synchronous (blocking):** The simplest approach: the API call blocks until all downstream operations complete or time out. This provides immediate feedback when everything works but results in long wait times or HTTP timeouts when dependencies are slow. Consumers may retry (causing duplicate submissions) or abandon the flow. This approach is not resilient to partial failures.

- **Fully asynchronous (always queue):** Every commit request is immediately queued, and the consumer always receives a `PENDING` response. A worker processes the queue. This is the most resilient approach but provides the worst user experience: even when all systems are healthy and could respond in under a second, the consumer never gets immediate confirmation. It also requires additional infrastructure (polling or WebSocket for status updates) if the consumer wants to wait for the result.

- **Saga pattern (distributed transactions):** Implement a formal saga with compensating transactions for each step. This provides the strongest consistency guarantees but is significantly more complex to implement, test, and debug. The VIN addition is essentially a single logical operation (not a chain of independent business transactions), so the saga pattern's complexity is not justified. Compensating actions (e.g., "un-add" a VIN) are not meaningful in this domain.

## Consequences

**Positive:**
- Consumers get immediate confirmation in the common case (healthy dependencies), which is the best user experience.
- The system degrades gracefully: when dependencies are slow or down, the user is not blocked and receives a clear `PENDING` status instead of an error or timeout.
- The retry mechanism with exponential backoff handles transient failures automatically without manual intervention.
- The admin dashboard provides visibility into `PENDING` and `FAILED` requests, enabling manual resolution when automated retries are exhausted.
- No duplicate commits: the backend uses idempotency keys to ensure that retries do not create duplicate VIN additions.

**Negative:**
- Increased backend complexity: the system must support both synchronous and asynchronous code paths, including queue management, worker processes, and idempotency enforcement.
- The consumer may leave the portal before a `PENDING` request resolves. The system relies on email notifications to inform the consumer of the final outcome, which adds a dependency on the notification service.
- Testing the hybrid flow requires simulating both fast and slow dependency responses, increasing the test matrix.
- The maximum retry count (5) and backoff schedule must be tuned based on observed dependency behavior. If retries are exhausted, manual intervention is required.
- Status tracking across the synchronous/asynchronous boundary requires careful state management in the backend to avoid race conditions.

## Links

- [Microsoft Cloud Design Patterns: Retry Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry)
- [Microsoft Cloud Design Patterns: Queue-Based Load Leveling](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling)
- `src/app/features/consumer/pages/result/result.component.ts` — Displays COMMITTED or PENDING status
- `backend/` — Backend implementation of the hybrid commit flow
