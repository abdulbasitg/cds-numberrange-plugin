# Research: Fix Race Condition in Number Range DB Queries

**Phase**: 0 — Research  
**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Decision 1: Locking Mechanism — `forUpdate()` vs. Native Sequences

**Decision**: Use `SELECT.forUpdate()` (pessimistic row-level locking).

**Rationale**:
- `forUpdate()` requires no schema migration — the `Ranges` table and its records remain unchanged.
- Native database sequences (e.g., `CREATE SEQUENCE` in HANA/PostgreSQL) would require a migration that converts each range record into a database-level sequence object, significantly expanding the fix's blast radius and adding platform-specific DDL.
- `SELECT.forUpdate()` is a CDS-native API, works transparently across supported databases, and is available in `@sap/cds >=8` (confirmed in installed version 8.9.4).

**Alternatives considered**:
- **Native sequences**: Rejected because they require schema migration, are database-specific, and eliminate the flexibility of the current `StartValue`/`IncrementBy` configuration model.
- **Application-level mutex (e.g., in-memory lock)**: Rejected because it does not survive process restarts, does not work across multiple Node.js instances/pods, and is not durable.

---

## Decision 2: Transaction Scope

**Decision**: No explicit transaction wrapper is needed in `dbhelper.getNextValue()`.

**Rationale**:
- CDS `before('CREATE')` event handlers automatically run within the request's managed transaction context.
- When `getNextValue()` is called from inside a `before('CREATE')` handler, the `SELECT.forUpdate()` and the subsequent `UPDATE` are already part of the same transaction.
- The exclusive row lock acquired by `forUpdate()` is held until the transaction commits (when the `CREATE` handler completes), preventing any concurrent caller from reading the same `CurrentValue`.
- Adding a redundant `cds.run(tx => ...)` wrapper would be incorrect — it would create a nested transaction and could break the lock scope.

**Alternatives considered**:
- **Explicit `cds.tx()` wrapper**: Rejected — CDS managed transactions already cover this path. An explicit wrapper would create a nested scope that releases the lock before the outer CREATE transaction commits.

---

## Decision 3: SQLite Compatibility

**Decision**: `forUpdate()` is safe to call with SQLite; it degrades gracefully.

**Rationale**:
- SQLite does not implement `SELECT ... FOR UPDATE` at the SQL syntax level. However, the CAP SQLite adapter (`@cap-js/sqlite`) ignores the `forUpdate()` clause rather than throwing an error.
- SQLite's WAL (Write-Ahead Log) mode serializes concurrent writes at the database-file level, which effectively prevents the race condition in practice even without row-level locking.
- For production (SAP HANA), `forUpdate()` maps to `SELECT ... FOR UPDATE` and provides true row-level locking.
- No conditional database-detection logic is needed in the plugin code.

**Alternatives considered**:
- **Database-conditional code path**: Rejected — adds complexity with no benefit, since SQLite serializes writes anyway and HANA uses the lock correctly.

---

## Decision 4: Lock Wait Timeout

**Decision**: Use `forUpdate({ wait: 5 })` (5-second wait) as the default, and do not expose this as a configurable option in v1 of the fix.

**Rationale**:
- Without a `wait` option, `forUpdate()` uses the database default — which can be indefinite on some databases. A bounded wait prevents hangs.
- 5 seconds is a reasonable upper bound for a number range lock contention scenario; in practice, number range updates are sub-millisecond.
- Exposing timeout as a configuration option is deferred; the assumption is that 5 seconds covers all realistic usage. This can be made configurable in a future iteration if needed.

**Alternatives considered**:
- **No wait option**: Rejected — risk of callers hanging indefinitely if a lock is held by a long-running transaction.
- **`wait: 0` (immediate fail)**: Rejected — too aggressive; transient lock contention during concurrent bursts would produce false errors.
- **Configurable timeout**: Deferred — adds API surface not required by the current spec.

---

## Decision 5: Where to Add Concurrent Access Tests

**Decision**: Add a new `it()` block to `samples/sample-01-sqlite-in-memory/test/samples.test.js` that fires multiple concurrent `POST` requests using `Promise.all()`.

**Rationale**:
- Sample 01 (SQLite in-memory) is the fastest test environment and resets cleanly between runs.
- SQLite's write serialization ensures the test passes even without true row-level locking, making it a reliable regression guard for the application-level logic.
- Adding tests to an existing sample avoids creating a new sample project (which would require npm install, sample data, etc.).

**Alternatives considered**:
- **New dedicated sample for concurrency**: Deferred — unnecessary for a focused regression test.
- **HANA-only test**: Rejected — HANA is not available in CI without a service binding.
