# Data Model: Fix Race Condition in Number Range DB Queries

**Phase**: 1 — Design  
**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Schema Changes

**None.** The fix is a pure application-logic change. No new tables, columns, indexes, or sequences are added or modified.

---

## Existing Entity: `Ranges`

Defined in [index.cds](../../index.cds) and served by `NumberRangePluginService`.

| Field | Type | Role |
|-------|------|------|
| `RangeName` | String (key) | Unique identifier for the number range |
| `StartValue` | Integer | The value the range was initialized with |
| `IncrementBy` | Integer | The step size added on each `getNextValue()` call |
| `CurrentValue` | Integer | **The mutable counter** — this is the field subject to the race condition |

### Race Condition Anatomy

```
Time →
T0: Request A reads CurrentValue = 5
T1: Request B reads CurrentValue = 5    ← both see same value before either updates
T2: Request A updates CurrentValue to 6
T3: Request B updates CurrentValue to 6 ← duplicate! both return 5
```

### Fixed Behavior (with `forUpdate()`)

```
Time →
T0: Request A acquires row lock, reads CurrentValue = 5
T1: Request B attempts to acquire row lock → WAITS
T2: Request A updates CurrentValue to 6, commits → lock released
T3: Request B acquires row lock, reads CurrentValue = 6
T4: Request B updates CurrentValue to 7, commits
Result: A returns 5, B returns 6 — unique and sequential ✓
```

---

## State Transitions

The `CurrentValue` field follows a strictly linear progression:

```
StartValue → StartValue + IncrementBy → StartValue + 2×IncrementBy → …
```

The fix ensures this progression is monotonic and collision-free under concurrent access. No new states are introduced.

---

## Invariants (post-fix)

- `CurrentValue` is always incremented by exactly `IncrementBy` per successful `getNextValue()` call.
- No two concurrent `getNextValue()` calls for the same `RangeName` can read the same `CurrentValue`.
- A failed `getNextValue()` call (lock timeout or update error) leaves `CurrentValue` unchanged.
