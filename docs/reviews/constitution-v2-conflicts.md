# Conflict Log — Constitution v2.0

**Date:** 2026-03-10
**Source:** @R coherence review

---

## Active Conflicts

### C-1: Consolidator/Curator Agent Merge

| Field | Value |
|-------|-------|
| Severity | Medium |
| Documents | TECH.md v2.0 vs research/iteration-7/01-agent-architecture.md |
| Nature | Architectural simplification without ADR |
| Resolution | Human decision: accept merge + write ADR-005, or restore Consolidator as separate agent |

**Details:** Research specifies 6 agents with Consolidator (hourly) and Curator (daily) as separate roles. TECH.md v2.0 merges them into a single Curator running daily. This changes dedup cadence from hourly to daily. The merge is defensible for Phase 1 but undocumented.

---

### C-2: Emotional Valence Schema Gap

| Field | Value |
|-------|-------|
| Severity | High (blocks implementation) |
| Documents | TECH.md v2.0 (Curator formula vs extracted_memories schema) |
| Nature | Internal inconsistency — formula references nonexistent column |
| Resolution | Human decision: add column, remove from formula, or defer |

**Details:** Curator importance formula includes `0.10 * |emotional_valence|` but `extracted_memories` table has no `emotional_valence` column. The Extractor agent spec also doesn't mention extracting emotional valence.

---

## Resolved Conflicts

(None yet — awaiting human resolution)
