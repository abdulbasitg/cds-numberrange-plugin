# Plugin API Contract: cds-numberrange-plugin

**Status**: Stable — unchanged by this fix  
**Feature**: [spec.md](../spec.md)

---

## Overview

This document defines the external-facing contract of `cds-numberrange-plugin`. The race condition fix does **not** change any part of this contract — it is documented here to confirm backward compatibility.

---

## 1. CDS Annotation

Plugin consumers annotate entity fields to bind them to a configured range:

```cds
annotate MyEntity with {
    myField @plugin.numberrange.rangeid: 'RANGE_NAME';
}
```

- `RANGE_NAME` must match a range defined in `package.json` (see below).
- Supported field types: `Integer`, `String` (with optional padding/prefix/suffix).
- No change to annotation semantics in this fix.

---

## 2. `package.json` Configuration

```json
{
  "cds": {
    "cds-numberrange-plugin": {
      "ranges": [
        {
          "name": "RANGE_NAME",
          "start": 1,
          "increment": 1,
          "createOnDraft": false,
          "additionalProperties": {
            "padCount": 10,
            "padValue": "0",
            "prefix": "A",
            "suffix": "Z"
          }
        }
      ]
    }
  }
}
```

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `name` | String | Yes | Unique range identifier, matches annotation value |
| `start` | Integer | No (default: 1) | Initial counter value |
| `increment` | Integer | No (default: 1) | Step size per `getNextValue()` call |
| `createOnDraft` | Boolean | No (default: false) | Assign value on draft CREATE instead of active CREATE |
| `additionalProperties.padCount` | Integer | No | Total numeric digits (left-padded) |
| `additionalProperties.padValue` | String (1 char) | No | Padding character |
| `additionalProperties.prefix` | String | No | Prepended to the formatted value |
| `additionalProperties.suffix` | String | No | Appended to the formatted value |

No new configuration keys are introduced by this fix.

---

## 3. Runtime Behavior (Guaranteed Post-Fix)

- On every `CREATE` event for an annotated entity, the plugin assigns the next unique value from the configured range to the annotated field.
- Values are **unique** — no two entity creations receive the same value from the same range.
- Values are **sequential** — values increase by `increment` on each call (order is first-come, first-served under concurrent load).
- The plugin is **idempotent at startup** — if a range already exists in the database, it is not recreated.

---

## 4. Error Surface

- If a range referenced in an annotation is not configured in `package.json`, an error is logged at startup and the field is skipped (existing behavior, unchanged).
- If `getNextValue()` fails due to a lock timeout, an error is thrown and the entity `CREATE` is rejected with an appropriate CDS error (new behavior post-fix).
- If the range record is not found in the database, an existing error is thrown: `Failed to update range {rangeName}.`
