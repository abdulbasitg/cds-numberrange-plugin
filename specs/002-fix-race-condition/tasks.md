# Tasks: Fix Race Condition in Number Range DB Queries

**Input**: Design documents from `specs/002-fix-race-condition/`  
**Prerequisites**: [plan.md](plan.md) ✅ | [spec.md](spec.md) ✅ | [research.md](research.md) ✅ | [data-model.md](data-model.md) ✅ | [contracts/plugin-api.md](contracts/plugin-api.md) ✅

**Format**: `[ID] [P?] [Story?] Description with file path`  
- **[P]**: Parallelizable (different files, no blocking dependencies)  
- **[Story]**: User story label (US1 / US2 / US3)

---

## Phase 1: Setup (Environment Verification)

**Purpose**: Confirm the environment meets the one prerequisite before touching code.

- [x] T001 Verify `@sap/cds` version in `samples/sample-01-sqlite-in-memory/package.json` is ≥8.0 and `forUpdate()` is available (run `node -e "const cds=require('@sap/cds/lib'); console.log(cds.version)"` from that directory)

**Checkpoint**: CDS version confirmed ≥8. Proceed to Phase 2.

---

## Phase 2: Foundational (No additional foundational work required)

All blocking prerequisites are already in place — the `Ranges` entity, the `NumberRangePluginService`, and the CDS transaction context within `before('CREATE')` handlers are all part of the existing codebase. No schema migrations, no new dependencies, no new files.

**⚠️ NOTE**: The entire fix is confined to `lib/handler/dbhelper.js` and one sample test file. No other source files require modification.

**Checkpoint**: Foundation confirmed. User story implementation can begin.

---

## Phase 3: User Story 1 — Concurrent Range Access Yields Unique Numbers (Priority: P1) 🎯 MVP

**Goal**: Add `forUpdate({ wait: 5 })` to the SELECT in `getNextValue()` so that concurrent callers cannot simultaneously read the same `CurrentValue`.

**Independent Test**: Launch 5 simultaneous `POST /odata/v4/catalog/Books` requests and assert that all 5 returned `bookid` values are distinct integers.

### Implementation for User Story 1

- [x] T002 [US1] In `lib/handler/dbhelper.js`, add `.forUpdate({ wait: 5 })` to the `SELECT.one` call inside `getNextValue()` (line 32) — chain it after `.where({ RangeName: rangeName })` and before the `UPDATE` call
- [x] T003 [US1] In `samples/sample-01-sqlite-in-memory/test/samples.test.js`, add test case `'5 - Concurrent Create: All bookids are unique'` that fires 5 parallel `POST /odata/v4/catalog/Books` requests via `Promise.all()` and asserts `new Set(ids).size === 5`
- [x] T004 [US1] Run `cds test` from `samples/sample-01-sqlite-in-memory/` and confirm all tests pass including the new concurrent test

**Checkpoint**: US1 complete — run the sample independently and confirm unique bookids under concurrent load.

---

## Phase 4: User Story 2 — Single-Process Access Remains Unchanged (Priority: P2)

**Goal**: Confirm that the `forUpdate()` addition does not break any existing sequential test behavior across all sample projects.

**Independent Test**: All existing `it()` blocks in all sample test files pass without modification.

### Implementation for User Story 2

- [x] T005 [P] [US2] Run `cds test` from `samples/sample-01-sqlite-in-memory/` — confirm tests 1–4 (pre-existing) still pass with expected `bookid`, `bookidchar`, and `bookidpad` values
- [x] T006 [P] [US2] Run `cds test` from `samples/sample-02-sqlite-persistent/` — confirm all existing tests pass
- [x] T007 [P] [US2] Run `cds test` from `samples/sample-04-draft/` — confirm all draft lifecycle tests pass (tests 0–6 including draftActivate flows)

**Checkpoint**: US2 complete — all three SQLite sample suites pass. Sequential behavior confirmed unchanged.

---

## Phase 5: User Story 3 — Graceful Handling of Lock Conflicts (Priority: P3)

**Goal**: Confirm that a lock wait timeout from `forUpdate({ wait: 5 })` surfaces as a thrown error rather than a silent failure or duplicate value. No additional code change is required — CDS propagates the lock timeout as an error automatically.

**Independent Test**: Inspect the error thrown when `forUpdate()` cannot acquire a lock within 5 seconds — confirm it includes a descriptive message identifying the range name, not a silent duplicate return.

### Implementation for User Story 3

- [x] T008 [US3] In `lib/handler/dbhelper.js`, review the error propagation path from `getNextValue()`: confirm that a CDS lock-timeout error thrown by `forUpdate()` will propagate up through `cdshelper.getNextValue()` → `addBeforeCreateHandler` → CDS request pipeline (it should, as there is no try/catch wrapping the SELECT call)
- [x] T009 [US3] In `lib/handler/dbhelper.js`, add a descriptive error message for the lock-timeout case by wrapping the `SELECT.forUpdate()` call in a try/catch that rethrows with context: `throw new Error(\`Failed to acquire lock for range ${rangeName}: ${err.message}\`)`
- [x] T010 [US3] In `samples/sample-01-sqlite-in-memory/test/samples.test.js`, document (as a code comment above the concurrent test) how a lock-timeout error would appear to the caller, confirming no silent duplicate is returned

**Checkpoint**: US3 complete — lock conflicts surface as descriptive errors, not silent failures or duplicates.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup. Version bump and CHANGELOG will be handled manually.

- [x] T011 Run the full test suite across all available sample projects one final time (`sample-01`, `sample-02`, `sample-04`) and confirm all tests green
- [x] T012 Review `specs/002-fix-race-condition/checklists/requirements.md` — mark all checklist items as confirmed

**Checkpoint**: All done. Branch ready for PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Phase 3 (US1)**: Depends on Phase 1 completion
- **Phase 4 (US2)**: Depends on Phase 3 completion (must apply the fix before running regression tests)
- **Phase 5 (US3)**: Depends on Phase 3 completion (error behavior is part of the same fix)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5 all complete

### User Story Dependencies

- **US1 (P1)**: Start immediately after Phase 1 — no dependency on US2 or US3
- **US2 (P2)**: Starts after US1 fix is applied (T002 complete) — T005, T006, T007 can run in parallel
- **US3 (P3)**: Starts after US1 fix is applied (T002 complete) — can overlap with US2 regression tests

### Within Each Story

- T002 (code change) → T003 (test) → T004 (run) must be sequential within US1
- T005, T006, T007 are fully parallel within US2
- T008 (review) → T009 (fix) → T010 (comment) must be sequential within US3

---

## Parallel Execution Examples

### User Story 2 (T005, T006, T007 in parallel)

```bash
# All three can run simultaneously in separate terminals
cds test   # from samples/sample-01-sqlite-in-memory/
cds test   # from samples/sample-02-sqlite-persistent/
cds test   # from samples/sample-04-draft/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (verify env)
2. Complete T002 (add `forUpdate`) ← **1-line code change**
3. Complete T003 (add concurrent test)
4. Complete T004 (run tests)
5. **STOP AND VALIDATE**: The race condition is fixed. US1 is the entire core fix.

### Incremental Delivery

1. T001 → T002 → T003 → T004: Core fix + test ← **MVP — ship this**
2. T005–T007: Regression validation across all samples
3. T008–T010: Error surface confirmation
4. T011–T012: Final validation and checklist

### Total Task Count

| Phase | Tasks | Story |
|-------|-------|-------|
| Phase 1 (Setup) | 1 | — |
| Phase 3 (US1 core fix) | 3 | US1 |
| Phase 4 (US2 regression) | 3 | US2 |
| Phase 5 (US3 error handling) | 3 | US3 |
| Phase 6 (Polish) | 2 | — |
| **Total** | **12** | |

**Parallel opportunities**: T005/T006/T007 (US2 regression runs)  
**Suggested MVP scope**: T001 → T002 → T003 → T004 (US1 complete in 4 tasks)
