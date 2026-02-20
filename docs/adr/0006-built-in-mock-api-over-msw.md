# ADR-0006: Built-in Mock API Over MSW for Development and Testing

## Context

The VIN Portal frontend is developed independently from the backend API. Frontend developers need a way to work offline, iterate on UI features without a running backend, and run deterministic tests against predictable API responses. The team needed to select a mocking strategy for the development and test environments.

The application communicates with a NestJS backend at `/api/v1` for authentication, VIN validation, and contract operations. During development, the backend may not be available, may be under active development with unstable endpoints, or may require credentials and network access that are not always convenient for local development.

## Decision

Implement a built-in `MockApiService` and `mockInterceptor` within the Angular application itself. The mock layer is activated via the environment configuration flag `features.mockApi: true`, which is enabled in the development environment (`environment.ts`) and disabled in the production environment (`environment.prod.ts`).

The `mockInterceptor` is the first interceptor in the chain. When `features.mockApi` is `true`, it intercepts outgoing HTTP requests, matches them against predefined routes, and returns mock responses without ever making a network call. When `features.mockApi` is `false`, the interceptor passes requests through to the next interceptor in the chain (correlation, auth, error).

Mock data is defined with deterministic test credentials (see `CLAUDE.md` for the mock credential table), enabling repeatable scenarios for both manual development and automated testing.

## Alternatives Considered

- **MSW (Mock Service Worker):** MSW intercepts requests at the network level using a Service Worker, providing a more realistic simulation of network behavior. It is framework-agnostic and supports both browser and Node.js environments. However, MSW adds an external dependency, requires a Service Worker registration step that complicates the dev setup, and introduces a layer of indirection that makes debugging mock responses harder. MSW's network-level interception is unnecessary when the goal is simply to return deterministic data for known routes.

- **json-server:** A standalone process that serves a REST API from a JSON file. It provides a real HTTP server, which is useful for testing network behavior. However, it requires running a separate process alongside the Angular dev server, complicating the developer workflow. It does not support custom response logic (e.g., conditional OTP flows, error simulation) without middleware plugins, and it adds an external dependency.

- **Mirage.js:** An in-browser mock server that intercepts `fetch` and `XMLHttpRequest` calls. It provides a rich API for defining routes, models, and serializers. However, it is a substantial external dependency (large bundle), is primarily designed for React/Ember ecosystems, and its model layer is unnecessary for the VIN Portal's simple request/response mocking needs.

- **Backend stubs (dedicated mock server):** Deploy a lightweight mock backend (e.g., a stripped-down NestJS instance returning canned responses). This provides the most realistic simulation but requires maintaining a separate codebase, running an additional service, and keeping the stubs in sync with the real API contract. It also prevents true offline development.

## Consequences

**Positive:**
- Zero external dependencies for the mock layer. No additional npm packages, no Service Worker registration, no separate processes to run.
- `npm start` is all a developer needs to begin working with a fully functional mock API. No additional setup steps.
- Mock behavior is co-located with the Angular codebase, making it easy to find, understand, and update mock responses when the API contract changes.
- Deterministic test credentials enable repeatable scenarios: VIN last-7 `1234567/SMITH/30301` always succeeds with direct auth, `0TP7654/TESTUSER/12345` always requires OTP, and other values always return errors.
- The mock interceptor integrates naturally into Angular's `HttpClient` interceptor chain, requiring no special HTTP client configuration or test utilities.
- E2E tests (Playwright) can run against the dev server with mock API enabled, providing fast and deterministic end-to-end coverage without backend dependencies.

**Negative:**
- Mock code is included in the application bundle during development. While it is tree-shaken out of production builds (the `mockInterceptor` short-circuits when `features.mockApi` is `false`, and build optimization removes the dead code paths), developers must be careful not to import mock utilities in production code paths.
- The mock layer does not simulate network latency, timeouts, or partial failures by default. Developers must explicitly add delay or error simulation if they want to test those scenarios.
- The mock responses may drift from the real API if the backend contract changes and the mocks are not updated. There is no automated contract validation between the mock layer and the backend (this could be addressed with API schema validation in CI).
- The mock interceptor intercepts at the Angular `HttpClient` level, not at the network level. This means it does not exercise the browser's fetch/XHR stack, CORS handling, or Service Worker caching behavior. For testing those concerns, a real backend or MSW would be needed.

## Links

- [Angular HttpClient Interceptors](https://angular.dev/guide/http/interceptors)
- `src/environments/environment.ts` — `features.mockApi: true` for development
- `src/environments/environment.prod.ts` — `features.mockApi: false` for production
- `src/app/core/interceptors/` — Interceptor chain (mock is first in the chain)
- `CLAUDE.md` — Mock API test credentials table
