# ADR-003: Relevance Over Recency in Memory Reranking

**Date:** 2026-02-22 (retroactive — from production insight)
**Status:** Accepted

---

## Context

Auto-recall in vector memory systems was surfacing irrelevant recent memories over highly relevant older ones. A 14-day recency decay half-life and 70/30 similarity/recency blend caused curated institutional knowledge to be buried by recent noise. Observed in production at Mi Amigos AI.

See: `insights/2026-02-22-memory-reranking.md`

## Decision

Adopt similarity-dominant reranking as the recommended default for AI memory systems:

- **Recency decay half-life:** 60+ days (up from 14)
- **Similarity/recency weight:** 85/15 (up from 70/30)
- **Minimum similarity floor:** 0.35 (new — prevents vector noise)
- **Auto-capture noise filtering:** Skip system timestamps, metadata, session lifecycle prompts

The guiding principle: **Memory systems should emulate expertise, not news feeds.**

> **Clarification:** "Relevance over recency" means relevance is *prioritized above* recency in ranking weight, not that recency is eliminated. Recency remains a scoring factor (15-20% weight) — it simply no longer dominates. The Guardian Retriever's concrete formula (`0.50 * semantic + 0.30 * importance + 0.20 * recency`) in TECH.md implements this principle: recency is the lowest-weighted factor at 20%. The original 85/15 guideline was for a two-factor model (similarity + recency); the three-factor formula distributes the "relevance" portion across semantic similarity and importance score. The minimum similarity threshold was raised from 0.35 to 0.5 for precision in the Guardian implementation.

## Consequences

**Positive:**
- Institutional knowledge surfaces reliably regardless of age
- Reduces "artificial amnesia" for curated facts
- Noise filtering improves overall search quality

**Negative:**
- Rapidly-changing domains may need different parameters (14-30 day decay)
- Requires parameter tuning per deployment context

**Neutral:**
- Documented as recommended defaults, not mandated values

---

*Template source: docs/adr/adr-template.md*
