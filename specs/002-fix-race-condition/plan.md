# Implementation Plan: Fix Race Condition in Number Range DB Queries

**Branch**: `fix/race-condition-db-queries` | **Date**: 2026-05-01 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/002-fix-race-condition/spec.md`

## Summary

The `getNextValue()` function in `dbhelper.js` performs an unguarded `SELECT` followed by a separate `UPDATE`, creating a race condition window where concurrent callers can read the same `CurrentValue` and receive duplicate numbers. The fix adds `forUpdate()` to the SELECT to acquire an exclusive row lock within the CDS-managed transaction, ensuring concurrent callers are serialized at the database level. No schema changes, no API changes, one function modified.

## Technical Context

**Language/Version**: JavaScript (Node.js 18+)  
**Primary Dependencies**: `@sap/cds >=8` (peer dep; 8.9.4 installed in samples); `@cap-js/sqlite` for dev/test  
**Storage**: Database-agnostic via CDS abstraction (SQLite for dev/test, SAP HANA for production)  
**Testing**: `cds test` (CDS built-in runner; Jest + Chai assertions)  
**Target Platform**: Node.js server (library plugin consumed by SAP CAP applications)  
**Project Type**: CDS plugin library  
**Performance Goals**: Number range assignment must not block entity creation perceptibly; lock contention resolved within 5 seconds  
**Constraints**: Must not change public API; must be backward compatible with all CDS-supported databases  
**Scale/Scope**: Library fix; affects one function in one file

## Constitution Check

*Evaluated against `.specify/memory/constitution.md` v1.0.0*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Configuration-First | ✅ Pass | No new configuration options introduced (timeout deferred) |
| II. Non-Destructive Integration | ✅ Pass | No entity or annotation changes; single-process behavior identical |
| III. Fail-Fast Validation | ✅ Pass | Lock timeout errors surface immediately as thrown errors, not silent failures |
| **IV. Atomicity and Uniqueness** | ✅ **Fixes violation** | Current code violates this principle; fix restores it |
| V. Explicit Developer Control Over Git Workflow | ✅ Pass | Branch was created manually; no automated branch creation |

**Quality Standards Gate**:
- Concurrent access test added to `sample-01` (covers FR-001, FR-002, FR-003)
- Existing sequential tests cover regression (FR-004, FR-005)
- No public API changes → version bump and CHANGELOG entry will be handled manually by the developer after all fixes are complete

**Verdict**: All gates pass. Proceed to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-race-condition/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── plugin-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (affected files only)

```text
lib/
└── handler/
    └── dbhelper.js      ← Only file requiring changes (getNextValue function)

samples/
└── sample-01-sqlite-in-memory/
    └── test/
        └── samples.test.js   ← Add concurrent access test case
```

**Structure Decision**: This is a focused bug fix in a library. All changes are confined to `lib/handler/dbhelper.js` and the existing sample test. No new files, directories, or modules are needed.

## Implementation Design

### Change 1: `lib/handler/dbhelper.js` — `getNextValue()`

**Current (broken)**:
```javascript
getNextValue = async (rangeName) => {
    const { NumberRangePluginService } = cds.services;
    const { Ranges } = NumberRangePluginService.entities;
    const nextValueResult = await SELECT.one
        .columns('CurrentValue','IncrementBy')
        .from(Ranges)
        .where({ RangeName: rangeName });       // ← no lock
    const updateResult = await UPDATE(Ranges)
        .where({ RangeName: rangeName })
        .set({ CurrentValue: nextValueResult.CurrentValue + nextValueResult.IncrementBy });
    if (updateResult.changes === 0) {
        throw new Error(`Failed to update range ${rangeName}.`);
    }
    return nextValueResult.CurrentValue;
}
```

**Fixed**:
```javascript
getNextValue = async (rangeName) => {
    const { NumberRangePluginService } = cds.services;
    const { Ranges } = NumberRangePluginService.entities;
    const nextValueResult = await SELECT.one
        .columns('CurrentValue','IncrementBy')
        .from(Ranges)
        .where({ RangeName: rangeName })
        .forUpdate({ wait: 5 });               // ← acquires exclusive row lock
    const updateResult = await UPDATE(Ranges)
        .where({ RangeName: rangeName })
        .set({ CurrentValue: nextValueResult.CurrentValue + nextValueResult.IncrementBy });
    if (updateResult.changes === 0) {
        throw new Error(`Failed to update range ${rangeName}.`);
    }
    return nextValueResult.CurrentValue;
}
```

**Why this works**:
- CDS `before('CREATE')` handlers run within a managed transaction.
- `forUpdate({ wait: 5 })` acquires an exclusive row lock on the matching `Ranges` record for the duration of that transaction.
- Concurrent callers attempting to lock the same row wait until the transaction commits and the lock is released.
- SQLite degrades gracefully — the adapter ignores `FOR UPDATE` and WAL-mode serialization prevents the race condition in practice.
- No additional transaction management code needed.

### Change 2: `samples/sample-01-sqlite-in-memory/test/samples.test.js` — Concurrent Test

Add a new `it()` block that fires `N` concurrent `POST` requests using `Promise.all()` and asserts all returned `bookid` values are unique.

```javascript
it('5 - Concurrent Create: All bookids are unique', async () => {
    const concurrentRequests = 5;
    const results = await Promise.all(
        Array.from({ length: concurrentRequests }, () =>
            test.POST('/odata/v4/catalog/Books', { title: 'Concurrent Book', stock: 1 })
        )
    );
    const ids = results.map(r => r.data.bookid);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).to.equal(concurrentRequests);
});
```

## Key Implementation Rules

1. **Only touch `getNextValue()`** — `checkRange()` and `createRange()` do not have read-then-write patterns and must not be modified.
2. **Do not add a transaction wrapper** — the CDS managed transaction from the `before('CREATE')` handler is sufficient; wrapping would create incorrect nested scope.
3. **Do not make `wait` configurable yet** — 5 seconds is hardcoded per research Decision 4; configurable timeout is deferred.
4. **Do not change function signatures** — `getNextValue(rangeName)` returns the same type (Integer or formatted String via `cdshelper`) as before.
5. **Run all four sample test suites** after the change to confirm no regressions.

## Complexity Tracking

*No constitution violations requiring justification.*
