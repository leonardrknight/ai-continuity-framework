# ADR-001: Scaffolding vs Soul Memory Model

**Date:** 2026-02-01 (retroactive — decision predates FORGE adoption)
**Status:** Accepted

---

## Context

AI assistants need persistent memory to maintain continuity across sessions and migrations. The question is how to organize that memory. Options considered:

1. **Flat file dump** — One big memory file with everything
2. **Database-only** — Structured storage with no file layer
3. **Two-layer model** — Separate technical backup from identity documentation

The framework needed a mental model that practitioners could immediately understand and apply, regardless of their technical sophistication.

## Decision

Adopt a two-layer memory model:

- **Scaffolding** — Technical backup (files, configs, credentials). Gets the AI operational on new hardware.
- **Soul** — Identity documentation (values, voice, relationships, lessons). Makes the AI "itself."

Both layers are required. Scaffolding without soul produces a functioning stranger. Soul without scaffolding produces identity with no way to run.

Within the Soul layer, a further tiered structure: Soul (stable) → Memory (operational) → Daily (short-term).

## Consequences

**Positive:**
- Intuitive metaphor that non-technical users grasp immediately
- Clean separation of concerns — different update frequencies, different owners
- Migration becomes copying two distinct categories of files
- Soul layer is inherently provider-neutral (just Markdown)

**Negative:**
- Requires discipline to keep layers separated
- Some memories don't cleanly fit one layer (e.g., project context has both operational and identity aspects)
- More files to maintain than a single-file approach

**Neutral:**
- Established the vocabulary used throughout all subsequent framework documents

---

*Template source: docs/adr/adr-template.md*
