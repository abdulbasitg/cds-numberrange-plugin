# Feature Specification: CDS Number Range Plugin — Baseline

**Created**: 2026-05-01
**Status**: Baseline (as-built specification)
**Version**: 1.0.1

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Increment Field on Entity Creation (Priority: P1)

A SAP CAP developer wants a numeric or string field in a CDS entity to receive a unique, sequential value automatically whenever a new record is created, without writing any custom handler code.

**Why this priority**: This is the core value proposition of the plugin. All other features build on this capability.

**Independent Test**: A developer configures a single range in `package.json`, annotates one entity field, creates a new entity record, and verifies the field receives the next sequential value.

**Acceptance Scenarios**:

1. **Given** a CDS entity with a field annotated `@plugin.numberrange.rangeid: 'MY_RANGE'` and a matching range configured in `package.json`, **When** a new record is created, **Then** the annotated field is automatically populated with the next value in the sequence.
2. **Given** a range configured with `startValue: 100` and `incrementBy: 5`, **When** the first record is created, **Then** the field receives the value `100`; the second record receives `105`.
3. **Given** a range where the backing table entry is missing, **When** the plugin initializes, **Then** it auto-creates the range entry with the configured start value.
4. **Given** two concurrent create requests for the same range, **When** both are processed simultaneously, **Then** each receives a unique, non-duplicate value.

---

### User Story 2 - Formatted String Number (Prefix, Suffix, Padding) (Priority: P2)

A developer needs document identifiers like invoice numbers (`INV-0001-2024`) or order codes (`ORD0000042`) — sequential numbers with custom formatting applied to a string field.

**Why this priority**: Many real-world use cases require human-readable, formatted identifiers. This is a key differentiator over a plain database sequence.

**Independent Test**: A developer configures a range with prefix, suffix, and padding options on a string field, creates records, and verifies the resulting string matches the expected format.

**Acceptance Scenarios**:

1. **Given** a range configured with `prefix: "INV-"`, `suffix: "-2024"`, `paddingChar: "0"`, `paddingCount: 4`, **When** the 5th record is created, **Then** the field value is `INV-0005-2024`.
2. **Given** a string field of length 10 and a range whose maximum formatted output would exceed 10 characters, **When** the plugin initializes, **Then** it reports a configuration error and refuses to start.
3. **Given** a range with no prefix, suffix, or padding configured, **When** the number is assigned, **Then** the raw sequential number is used as-is.

---

### User Story 3 - Draft-Enabled Entity Number Assignment (Priority: P3)

A developer uses SAP CAP draft functionality on an entity that requires a number range field. They need control over whether the number is assigned when a draft is created or only when the draft is activated.

**Why this priority**: Draft support is required for draft-enabled entities where the key field must exist before activation. Without this option, the plugin would be unusable with draft entities.

**Independent Test**: A developer sets `createOnDraft: true` on a range, creates a draft record, and verifies the number is assigned at draft creation time (not at activation).

**Acceptance Scenarios**:

1. **Given** `createOnDraft: true` for a range, **When** a draft record is created, **Then** the number range field is populated immediately.
2. **Given** `createOnDraft: false` (default) for a range, **When** a draft record is created, **Then** the number range field is NOT populated; it is assigned upon draft activation.
3. **Given** an entity with a key field managed by a number range, **When** the entity is draft-enabled and `createOnDraft` is not set, **Then** the plugin applies the default (assign on activation) behavior.

---

### Edge Cases

- What happens when the database is unavailable during number generation?
- How does the plugin handle a range that has reached the maximum value for its field type?
- What happens when a configured range references a field that does not exist in the entity?
- How does the plugin behave when multiple services annotate fields with the same range ID?
- What happens if a developer manually inserts a value into a number-range-managed field?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Plugin MUST automatically assign the next sequential value to any CDS entity field annotated with `@plugin.numberrange.rangeid` upon entity creation.
- **FR-002**: Plugin MUST support per-range configuration of starting value (`startValue`) and increment step (`incrementBy`).
- **FR-003**: Plugin MUST support string field formatting via configurable prefix, suffix, zero-padding character, and padding length.
- **FR-004**: Plugin MUST validate at startup that the maximum formatted output for a string range does not exceed the configured field length; if validation fails, initialization MUST be aborted with a descriptive error.
- **FR-005**: Plugin MUST auto-create the `plugin.numberrange.Ranges` tracking table entry for any configured range that does not already exist in the database.
- **FR-006**: Plugin MUST ensure atomicity of number retrieval and increment, preventing duplicate values under concurrent load.
- **FR-007**: Plugin MUST support a `createOnDraft` option per range, controlling whether numbers are assigned at draft creation or draft activation for draft-enabled entities.
- **FR-008**: Plugin MUST work without modification on SQLite (in-memory) and SQLite (persistent) backends; SAP HANA support is required for production deployments.
- **FR-009**: Plugin MUST be configurable entirely through the `cds.requires` block in `package.json` and CDS field annotations — no custom handler code required for standard usage.
- **FR-010**: Plugin MUST support multiple independent number ranges operating concurrently within the same application.

### Key Entities

- **Number Range Configuration**: Defines a named range — its start value, increment step, formatting options (prefix, suffix, padding), and draft behavior. Lives in `package.json` under `cds.requires.plugin.numberrange.ranges`.
- **Ranges Table Entry** (`plugin.numberrange.Ranges`): Persisted record tracking the current value for each named range. The plugin reads and updates this at runtime for every entity creation.
- **Annotated Entity Field**: A CDS entity field decorated with `@plugin.numberrange.rangeid: '<RANGE_NAME>'` that the plugin manages. Can be of type Integer or String.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can add sequential number generation to an existing entity with zero lines of custom handler code — only `package.json` configuration and a field annotation are required.
- **SC-002**: Number generation produces no duplicate values when tested with concurrent entity creation requests against the same range.
- **SC-003**: A misconfigured range (e.g., formatted number too long for the field) is detected and reported at plugin startup before any records are written.
- **SC-004**: A developer can add a new number range to an existing CAP project and have it operational in under 5 minutes, following only the README.
- **SC-005**: The plugin integrates into a CAP project without any changes to existing entity definitions beyond adding the `@plugin.numberrange.rangeid` annotation.

## Assumptions

- Target users are SAP CAP developers familiar with CDS entity modelling and `package.json`-based configuration.
- The host application uses `@sap/cds >= 8`.
- PostgreSQL support is out of scope for v1.0.x; SQLite and SAP HANA are the supported backends.
- Developers are responsible for not manually editing fields managed by the number range plugin.
- Range configuration is static — loaded from `package.json` at startup; hot-reload of configuration is not supported.
- The `plugin.numberrange.Ranges` table is managed exclusively by the plugin; no external process will modify it concurrently.
