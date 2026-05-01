---
name: No auto-branch creation
description: User requires explicit approval before any git branch is created
type: feedback
---

Never create git branches without explicit user permission.

**Why:** User was surprised when the `before_specify` hook in Spec Kit automatically created a `001-base-spec-constitution` branch during `/speckit-specify`. They had not asked for a branch and did not want one created.

**How to apply:** Before running any command (hook or otherwise) that creates a git branch, confirm with the user first. If a mandatory hook is configured to auto-create branches (e.g., `speckit.git.feature`), warn the user and ask for approval rather than executing silently.
