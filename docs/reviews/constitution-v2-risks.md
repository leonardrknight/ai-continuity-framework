# Risk Assessment — Constitution v2.0

**Date:** 2026-03-10
**Source:** @R coherence review

---

## Risk Inventory

### R-1: GOVERNANCE.md Stale for Guardian Scope

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Certain |
| Impact | @E could implement Guardian without clear change control for code changes |
| Mitigation | Update GOVERNANCE.md to v2.0 before implementation begins |

---

### R-2: Duplicate Memories Between Curator Runs

| Field | Value |
|-------|-------|
| Severity | Low |
| Likelihood | High |
| Impact | Retriever may surface near-duplicate memories within a 24hr window |
| Mitigation | Accept for Phase 1, or add lightweight dedup check in Retriever at query time |

---

### R-3: Embedding Provider Lock-in

| Field | Value |
|-------|-------|
| Severity | Low |
| Likelihood | Low (Phase 1 is single-provider) |
| Impact | Switching embedding providers requires re-embedding all memories |
| Mitigation | Document in TECH.md that embeddings abstraction layer is a Phase 2 concern |

---

### R-4: Retriever Ranking Ambiguity

| Field | Value |
|-------|-------|
| Severity | Medium |
| Likelihood | Certain |
| Impact | Developer implementing Retriever won't know if ranking is DB-side or app-side |
| Mitigation | Resolve G-2 in review report before implementation |
