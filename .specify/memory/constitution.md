# CDS Number Range Plugin Constitution

## Core Principles

### I. Configuration-First
All plugin behavior MUST be expressible through declarative configuration (`package.json`) and CDS field annotations. No custom handler code should be required for standard use cases. Every new capability must be configurable without code changes.

### II. Non-Destructive Integration
The plugin MUST integrate into any SAP CAP project without modifying existing entity definitions beyond adding field annotations. Existing behavior of the host application must not be affected by the plugin's presence.

### III. Fail-Fast Validation
Configuration errors MUST be detected and reported at plugin startup — before any entity is created and before any data could be corrupted. Silent failures at runtime are unacceptable.

### IV. Atomicity and Uniqueness
Number generation MUST be atomic. Under any level of concurrent load, no two entity creations may receive the same value from the same range. This guarantee is non-negotiable.

### V. Explicit Developer Control Over Git Workflow
Git branches are NEVER created automatically without explicit developer approval. Tooling hooks that would create branches must prompt the developer and wait for confirmation before executing. This applies to all automation, including Spec Kit hooks.

## Quality Standards

- Every functional requirement must be testable with a concrete acceptance scenario
- All validation logic must be covered by automated tests
- New database backend support requires parity with existing backend test coverage
- Public API changes (annotations, configuration keys) require a CHANGELOG entry and semantic version bump

## Development Workflow

- Specifications are written before implementation (spec-first)
- Pull requests must reference a spec or issue
- Samples in `samples/` must remain runnable and demonstrate all supported configurations
- No feature is shipped without at least one corresponding sample

## Governance

This constitution supersedes all other project conventions. Amendments require documentation in the CHANGELOG and a new version tag. All pull requests must be reviewed for compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-05-01 | **Last Amended**: 2026-05-01
