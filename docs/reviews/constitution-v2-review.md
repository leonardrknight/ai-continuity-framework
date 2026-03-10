# @R Review Report — Constitution v2.0 Coherence Review

**Reviewer:** @R (Refine)
**Date:** 2026-03-10
**Scope:** PRODUCT.md v2.0, TECH.md v2.0, ADR-004
**Cross-referenced against:** research/iteration-7/ (all 6 papers), GOVERNANCE.md v1.0, ADRs 001-003, proposals/memory-agent-swarm.md

---

## Verdict: 7 findings — 2 conflicts, 3 gaps, 2 observations

The v2.0 constitution docs are well-structured and tell a coherent story. The transition from documentation-only to documentation + Guardian Agent is clearly articulated. However, several items need human resolution before @E proceeds.

---

## CONFLICTS (require resolution)

### C-1: Consolidator/Curator Merge — No ADR, Cadence Change

**Research says:** 6 agents. Consolidator (hourly dedup/merge) and Curator (daily importance/lifecycle) are separate roles with different cadences.
- `research/iteration-7/01-agent-architecture.md` §3.2: Consolidator runs `0 * * * *` (hourly)
- `research/iteration-7/01-agent-architecture.md` §3.5: Curator runs `0 3 * * *` (daily)

**TECH.md v2.0 says:** 3 Phase 1 agents. Curator absorbs consolidation duties and runs daily at 3 AM UTC.

**Impact:** Deduplication cadence drops from hourly to daily. A contributor could interact multiple times in a day and the Retriever would surface duplicate or near-duplicate extracted memories until the next 3 AM Curator run.

**Recommendation:** This is a defensible Phase 1 simplification, but it needs:
1. An ADR (ADR-005) documenting the merge decision and cadence trade-off
2. A note in TECH.md Curator spec acknowledging the gap and the Phase 2 option to split them back out

---

### C-2: Emotional Valence — Referenced in Formula but Missing from Schema

**TECH.md Curator importance formula** (line ~670):
```
importance = ... + 0.10 * |emotional_valence| + ...
```

**TECH.md `extracted_memories` schema** (lines 306-336): No `emotional_valence` column.

**Research Extractor output** includes `emotional_valence: Optional[float]` and `emotional_arousal: Optional[float]`.

**Impact:** The Curator formula cannot compute correctly — it references a field that doesn't exist in the schema.

**Options:**
- A) Add `emotional_valence FLOAT` column to `extracted_memories` and have the Extractor populate it
- B) Remove `emotional_valence` from the Curator formula and redistribute its 10% weight
- C) Defer emotional valence to Phase 2 (remove from formula now, add schema later)

---

## GAPS (should be addressed)

### G-1: GOVERNANCE.md Not Updated for Guardian Agent

GOVERNANCE.md remains v1.0 (documentation-only scope). It does not cover:
- Guardian Agent code changes (who reviews, what process)
- Sacred Four requirements (build/lint/test/typecheck) for `guardian/` directory
- `guardian/` directory change control
- Supabase migration review process
- GitHub App configuration changes

**Recommendation:** GOVERNANCE.md needs a v2.0 update adding a "Guardian Agent" section to Decision Authority, Change Control, and Review Checklist. This should happen before @E begins implementation.

---

### G-2: Retriever Ranking Formula vs. SQL Function Inconsistency (Internal to TECH.md)

**TECH.md Retriever Agent spec** (line ~614):
```
score = 0.50 * semantic_similarity + 0.30 * importance_score + 0.20 * recency_decay
```

**TECH.md `match_memories` SQL function** (lines 438-497):
```
combined_score = semantic_weight * sem_score + (1 - semantic_weight) * kw_score
```

The SQL function uses semantic + keyword scores only. Importance and recency are not factored into the DB query. This means either:
- The application layer must re-rank after the SQL query returns (not documented)
- Or the SQL function needs to incorporate importance and recency

**Recommendation:** Clarify in TECH.md whether ranking is DB-level, application-level, or hybrid. If application-level, document the re-ranking step in the Retriever pipeline.

---

### G-3: Analytics Not Scoped

Research `iteration-7/03-analytics.md` defines a comprehensive analytics framework (system metrics, user insights, privacy tiers). The TECH.md architecture diagram references a `retrieval_stats` table but provides no schema for it. PRODUCT.md doesn't mention analytics in any phase.

**Recommendation:** Either:
- Add "Memory analytics dashboard" to PRODUCT.md Phase 2+ or Phase 3 scope
- Or add a parking-lot item acknowledging the research exists but is deferred

---

## OBSERVATIONS (informational, no action required)

### O-1: Technology Stack Deviation — Properly Documented

Research specifies CrewAI Flows + LangGraph + Redis Streams. TECH.md v2.0 uses plain Anthropic SDK + Inngest (no Redis). The "Why Not CrewAI / LangGraph?" section at TECH.md line 126 explicitly justifies this. The Redis removal is implicit in the switch to Inngest for event routing.

**Status:** Acceptable. The rationale is clear and the door is left open for Phase 2.

---

### O-2: ADR-003 (Relevance Over Recency) vs. Retriever Recency Weight

ADR-003 establishes "relevance over recency" as a principle. The Retriever formula gives recency 20% weight (lowest of the three factors). This is consistent with the spirit of ADR-003 — recency is a signal, not the primary one.

**Status:** No conflict. The naming could cause confusion if someone reads ADR-003 as "zero recency weight." Consider adding a clarifying note to ADR-003 that "over" means "prioritized above," not "instead of."

---

## Additional Notes

| Check | Status |
|-------|--------|
| ADR-004 ↔ PRODUCT.md auth model | Aligned |
| ADR-004 ↔ TECH.md RLS/service role | Aligned |
| Provider neutrality (ADR-002) | Respected — methodology docs untouched, Guardian uses specific providers |
| Phase boundaries (PRODUCT.md ↔ TECH.md) | Consistent |
| Key Concepts (PRODUCT.md) ↔ terminology usage | Consistent |
| Memory types (research vs TECH.md) | Minor evolution: `event` removed, `pattern`/`question` added. Acceptable. |
| Batch sizes (research 50 vs TECH.md 20) | Conservative Phase 1 choice. Acceptable. |
| LLM model names (research vs TECH.md) | Research uses older names. TECH.md has correct current names. |

---

## Recommended Resolution Order

1. **C-2** (schema/formula mismatch) — Quick fix, blocks implementation
2. **G-2** (ranking inconsistency) — Quick fix, blocks Retriever implementation
3. **G-1** (GOVERNANCE.md v2.0) — Required before @E proceeds per FORGE policy
4. **C-1** (Consolidator/Curator ADR) — Important for architectural record
5. **G-3** (Analytics scoping) — Low urgency, parking-lot is fine

---

*Review complete. Human: resolve conflicts, then invoke @G or @E.*
