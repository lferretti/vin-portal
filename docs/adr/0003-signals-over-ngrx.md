# ADR-0003: Angular Signals Over NgRx for State Management

## Context

The VIN Portal is an Angular 21 single-page application that manages state across several domains: session authentication state, a multi-step consumer wizard flow (landing, authenticate, VIN entry, review, result), and admin views for contract search and request management. The team needed to select a state management approach that balances simplicity, maintainability, and alignment with the Angular framework's direction.

Angular 16+ introduced Signals as a first-class reactive primitive, and Angular 21 has matured the API with `signal()`, `computed()`, and `effect()`. The application's state is moderate in complexity: session tokens, form data flowing through a wizard, and read-heavy admin views. There are no deeply nested state trees or complex inter-feature state dependencies that would demand a formal Redux-style architecture.

## Decision

Use Angular Signals (`signal()`, `computed()`, `effect()`) as the primary state management mechanism throughout the application. State is held in singleton services (e.g., `SessionService`, `ConsumerStateService`) using signals, with computed signals for derived state. Components use `OnPush` change detection and read signals directly in templates.

No external state management library (NgRx, Akita, NGXS) is used. RxJS is still used where streams are genuinely needed (HTTP calls, interceptor chains), but `BehaviorSubject` is not used as a state container.

## Alternatives Considered

- **NgRx (full Redux pattern):** Provides a well-structured, opinionated architecture with actions, reducers, selectors, and effects. However, it introduces significant boilerplate for an application of this size. The VIN Portal has a relatively flat state model (session + wizard steps + admin queries), and NgRx's indirection would add complexity without proportional benefit. NgRx also requires additional dependencies and has a steeper learning curve for new contributors.

- **RxJS BehaviorSubjects:** A common pre-Signals pattern in Angular. BehaviorSubjects work but require manual subscription management, are less ergonomic in templates (requiring the `async` pipe or explicit subscriptions), and do not integrate with Angular's change detection as tightly as signals do. Signals replace BehaviorSubjects for synchronous state with less ceremony.

- **Akita:** A lighter-weight alternative to NgRx that uses an entity-store pattern. While simpler than NgRx, it is still an external dependency, and its development activity has slowed since Angular adopted signals natively. Adopting Akita would mean depending on a third-party library for something the framework now provides out of the box.

## Consequences

**Positive:**
- Zero additional dependencies for state management; signals are built into Angular.
- No boilerplate: no action classes, reducer functions, selector factories, or effect registrations.
- Signals integrate natively with `OnPush` change detection, enabling fine-grained reactivity without manual subscription management.
- `computed()` signals provide derived state that automatically tracks dependencies and updates efficiently.
- Lower barrier to entry for new developers who only need to understand Angular's own API.
- Co-location of state logic within feature services keeps the codebase navigable.

**Negative:**
- Less formal structure compared to NgRx. There is no enforced unidirectional data flow or action log for debugging. Discipline is required to keep state mutations centralized in services rather than scattered across components.
- No built-in DevTools equivalent to the NgRx Store DevTools for inspecting state history and replaying actions.
- If the application grows to require complex cross-feature state coordination (e.g., optimistic updates, undo/redo), signals alone may become insufficient, and a more structured pattern would need to be introduced.
- Team must establish conventions (e.g., state only mutated via service methods, never directly from components) since there is no library enforcing these patterns.

## Links

- [Angular Signals documentation](https://angular.dev/guide/signals)
- [ADR-0004: Session Storage Over Cookies](./0004-session-storage-over-cookies.md) (related: session state held in a signal)
- `src/app/core/services/session.service.ts` — Session state via signals
- `src/app/features/consumer/state/consumer-state.service.ts` — Wizard flow state via signals
