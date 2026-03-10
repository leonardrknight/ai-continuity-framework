# ADR-002: Provider-Neutral Methodology

**Date:** 2026-02-01 (retroactive — decision predates FORGE adoption)
**Status:** Accepted

---

## Context

The framework documents patterns for AI memory and identity. It could be written for a specific provider (Claude, GPT, Gemini) or kept provider-neutral. Research iteration 1 found 80-90% identity fidelity is achievable across providers with proper architecture.

## Decision

All core documents and templates must be provider-neutral. No vendor-specific instructions, APIs, or assumptions in the numbered methodology documents.

Provider-specific implementation details may appear in proposals and research as illustrative examples, but core patterns must work across Claude, GPT, Gemini, and local LLMs.

## Consequences

**Positive:**
- Framework is useful to the widest possible audience
- Supports the migration use case (moving between providers)
- Prevents framework obsolescence if any single provider changes
- Encourages patterns based on fundamentals, not API quirks

**Negative:**
- Cannot leverage provider-specific features in core docs
- Some recommendations are necessarily more general than optimal for any single provider
- Implementation proposals must specify which providers they target

**Neutral:**
- Templates use Markdown/YAML — universally readable formats

---

*Template source: docs/adr/adr-template.md*
