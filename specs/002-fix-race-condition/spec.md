# Feature Specification: Fix Race Condition in Number Range DB Queries

**Feature Branch**: `fix/race-condition-db-queries`  
**Created**: 2026-05-01  
**Status**: Draft  
**Input**: User description: "Plugin looks good but going through lib code, noticed it relies on select followed by update which may lead to race conditions. Native sequences could be a better alternative unless there's some locking mechanism or safeguard in place that I missed. SELECT ... .forUpdate() can also be used to prevent race conditions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Concurrent Range Access Yields Unique Numbers (Priority: P1)

When multiple application workers or processes simultaneously request the next value from the same number range, each caller must receive a unique, non-duplicate number. Currently, two concurrent reads can both observe the same `CurrentValue` before either has committed its update, causing both callers to receive the same number.

**Why this priority**: Duplicate number range values corrupt business identifiers (e.g., invoice numbers, order IDs) and are the core defect being fixed. This is the critical path.

**Independent Test**: Can be fully tested by launching two concurrent requests for the same range and verifying that each receives a different, sequential number — this delivers the entire value of the fix.

**Acceptance Scenarios**:

1. **Given** two simultaneous callers request the next value from the same range, **When** both requests complete, **Then** each caller receives a different number and the range counter reflects both increments.
2. **Given** ten simultaneous callers request the next value from the same range, **When** all requests complete, **Then** exactly ten unique sequential numbers are returned with no duplicates.
3. **Given** a range is being updated concurrently, **When** one caller has acquired the row lock, **Then** other callers wait and are served only after the lock is released, not skipped or errored.

---

### User Story 2 - Single-Process Access Remains Unchanged (Priority: P2)

A single caller requesting number range values one at a time experiences no change in behavior, return values, or performance compared to the current implementation.

**Why this priority**: Regression protection — the fix must not break existing single-tenant or sequential usage patterns that currently work correctly.

**Independent Test**: Can be fully tested by running the existing sequential number range retrieval test suite and confirming all results match previous behavior.

**Acceptance Scenarios**:

1. **Given** a range named "INVOICE" with `StartValue=1` and `IncrementBy=1`, **When** a single caller requests the next value five times sequentially, **Then** the values 1, 2, 3, 4, 5 are returned in order.
2. **Given** a range with a custom increment (e.g., `IncrementBy=10`), **When** a single caller requests the next value, **Then** the returned value and the stored counter are both correct.

---

### User Story 3 - Graceful Handling of Lock Conflicts (Priority: P3)

When the database cannot grant a row lock within an acceptable time (e.g., due to a long-running transaction), the system surfaces a clear, actionable error rather than silently returning stale or duplicate data.

**Why this priority**: Operational resilience — callers need to know when a number range request failed so they can retry or surface the error to the user rather than proceeding with a potentially duplicate value.

**Independent Test**: Can be fully tested by simulating a held lock and verifying that the plugin returns a well-described error instead of a duplicate or stale value.

**Acceptance Scenarios**:

1. **Given** a row lock on a range is held by another transaction indefinitely, **When** a second caller attempts to retrieve the next value and the lock wait times out, **Then** an error is thrown with a message identifying the range name and indicating a lock conflict.
2. **Given** a lock conflict error is thrown, **When** the caller retries after the lock is released, **Then** the retry succeeds and returns the correct next value.

---

### Edge Cases

- What happens when two requests arrive within microseconds of each other for the same range?
- How does the system behave if the database does not support row-level locking?
- What occurs if the range record is deleted between the lock acquisition and the update?
- How is a range update handled if the database transaction is rolled back after the lock is acquired?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST guarantee that concurrent calls to retrieve the next value for the same range never return duplicate values.
- **FR-002**: System MUST acquire a database-level exclusive row lock on the number range record before reading `CurrentValue` and before writing the updated value.
- **FR-003**: The lock MUST be held for the minimum duration necessary — from the read of `CurrentValue` through the commit of the updated value — and released immediately after.
- **FR-004**: System MUST throw a descriptive error if a row lock cannot be acquired (e.g., lock wait timeout), identifying the affected range name.
- **FR-005**: All existing public behaviors — range creation (`createRange`), range existence check (`checkRange`), and next-value retrieval (`getNextValue`) — MUST remain backward compatible with no change to their signatures or return types.
- **FR-006**: The fix MUST be limited to the number range retrieval path; no other database operations in the plugin are in scope.

### Key Entities

- **Number Range**: A named counter record with a starting value, an increment amount, and a current value. Represents the mutable state that is vulnerable to concurrent modification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent number range requests return unique values — zero duplicate numbers issued across any number of simultaneous callers.
- **SC-002**: All existing sequential single-process number range tests pass without modification after the fix is applied.
- **SC-003**: Under a concurrent load of at least 10 simultaneous callers for the same range, the resulting sequence of returned numbers is contiguous, unique, and correctly incremented.
- **SC-004**: When a lock conflict occurs, callers receive an error within a time bounded by the database's configured lock wait timeout rather than hanging indefinitely.

## Assumptions

- The underlying database engine supports row-level exclusive locking (SAP HANA, PostgreSQL, and SQLite in WAL mode all qualify).
- The CDS framework's `SELECT.forUpdate()` capability is available in the target CDS version used by the plugin.
- Native database sequences are considered out of scope for this fix; the `forUpdate()` locking approach is the chosen solution, as it requires no schema migration.
- The fix does not require changes to the data model, entity definitions, or the public API surface of the plugin.
- Lock wait timeout behavior is governed by the database configuration and is not configurable within the plugin itself.
- No changes to the `checkRange` or `createRange` functions are required since they do not read-then-write a mutable counter.
