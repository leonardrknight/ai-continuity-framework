# @R Coherence Review — v3.0 Constitution Update

**Date:** 2026-03-16
**Reviewer:** @R (Refine)
**Scope:** PRODUCT.md v3.0, TECH.md v3.0, BUILDPLAN v3, ADR-006, all existing ADRs, built code (PRs 1-4)

---

## Summary

The v3.0 reframe is fundamentally sound. The hub-and-spoke architecture is the right model, and the insight that the memory swarm is already source-agnostic is correct — Phase 1 PRs 5-8 truly need no adjustment. However, the review found **2 hard conflicts**, **4 soft conflicts**, and **5 gaps** that should be resolved before approving TECH.md v3.0 and continuing to execute.

---

## HARD CONFLICTS (must fix before execution)

### HC-1: `source_event_id NOT NULL` blocks the Scribe

**Location:** `001_initial_schema.sql` line: `source_event_id UUID NOT NULL REFERENCES raw_events(id)`
**Conflict with:** TECH.md Phase 2 Scribe specification

The `extracted_memories` table has a `NOT NULL` foreign key to `raw_events`. The Scribe processes `messages`, not `raw_events`. It cannot insert into `extracted_memories` without a valid `source_event_id`.

**Options:**
- **(a)** Migration 004 makes `source_event_id` nullable and adds `source_message_id UUID REFERENCES messages(id)`. One of the two must be set (CHECK constraint).
- **(b)** Generalize to `source_id UUID NOT NULL` + `source_table TEXT NOT NULL CHECK (source_table IN ('raw_events', 'messages'))`. Drops referential integrity but simplifies.
- **(c)** Route conversation messages through `raw_events` too (re-use the same table with `github_event_type = 'conversation.message'`). Ugly but zero schema changes.

**Recommendation:** Option (a). Clean, additive, preserves existing FK integrity for GitHub events.

---

### HC-2: ADR-003 ranking weights vs. TECH.md Retriever formula

**Location:** ADR-003 says 85/15 similarity/recency split. TECH.md Retriever Stage 2 uses 50/30/20 (semantic/importance/recency).
**Also:** ADR-003 says minimum similarity floor of 0.35. `match_memories()` uses threshold 0.5.

ADR-003's clarification note says "See Guardian Agent Retriever spec in TECH.md for the concrete formula" — implying TECH.md is authoritative for implementation details. But the weights diverge significantly from ADR-003's recommendation.

**Recommendation:** Update ADR-003 to explicitly state that the 85/15 guideline applies to the *principle* (relevance over recency) and that TECH.md's three-factor formula (semantic + importance + recency) is the concrete implementation. The principle is preserved — recency is 20%, the lowest weight. Add a note that the similarity threshold was raised to 0.5 for precision.

---

## SOFT CONFLICTS (should fix, not blocking)

### SC-1: GOVERNANCE.md still v2.0

GOVERNANCE.md hasn't been updated for PRODUCT.md v3.0. Missing:
- Change control for conversation-related tables (user_profiles, conversations, messages)
- Governance for Chat API endpoints
- Reference to ADR-006
- Scribe agent behavior changes subject to methodology doc authority

**Recommendation:** Update GOVERNANCE.md to v3.0 alongside TECH.md approval.

---

### SC-2: ADR-004 status unclear

ADR-004 status is "Proposed" (never formally accepted). ADR-006 extends it. PRODUCT.md v3.0 says "Dual-plane with unified identity" which is the ADR-006 model, not ADR-004's single-plane.

**Recommendation:** Accept ADR-004 (it correctly describes Phase 1) and mark ADR-006 as extending it for Phase 2.

---

### SC-3: Use case 11 name is misleading

PRODUCT.md use case 11 is called "Anticipatory Context" and placed under Phase 2, but its description ("Before generating a response, Guardian retrieves relevant memories") describes standard reactive retrieval, not the Phase 3 Retrieval Anticipator.

**Recommendation:** Rename use case 11 to "Memory-Augmented Response" or "Contextual Response Generation." Reserve "Anticipatory" language for Phase 3's predictive pre-fetch.

---

### SC-4: Scribe "synchronous lite extraction" is underspecified

TECH.md Phase 2 Scribe spec says "After each assistant response (synchronous lite extraction), plus Inngest batch every 2 minutes." The synchronous part isn't defined — what does it extract? How fast must it be? Does it use an LLM or just keyword heuristics?

**Recommendation:** Either specify the synchronous path (e.g., "inline keyword extraction without LLM call, <50ms, captures entities and topic tags only") or remove it and rely solely on the 2-minute batch. Simpler is better for Phase 2.

---

## GAPS (missing pieces, not conflicts)

### G-1: No `source_type` channel indicator

The inbox packet suggested `source_type: 'conversation'` vs `source_type: 'github_event'` to distinguish memory origin. The actual schema uses `source_type` for 'stated' vs 'inferred' (explicit vs. LLM-inferred). These are different dimensions.

**Recommendation:** Add a `source_channel TEXT DEFAULT 'github' CHECK (source_channel IN ('github', 'conversation'))` column to `extracted_memories` and `consolidated_memories` in Migration 004. This lets queries filter by channel without overloading `source_type`.

---

### G-2: `match_memories()` user scoping

BUILDPLAN PR 9 correctly notes that `match_memories()` needs a `user_id` parameter. But the function also needs to handle cross-channel identity linking (when `user_profiles.github_contributor_id` is set).

**Recommendation:** Add to PR 9 scope: "Update `match_memories()` to accept optional `filter_user_id` parameter. When both `filter_repo_id` and `filter_user_id` are provided, return memories matching either the user's `user_id` OR their linked `contributor_id`."

---

### G-3: No Guardian identity/personality spec

PRODUCT.md says Guardian manages the repo AND holds conversations. TECH.md Phase 2 Chat API says "Guardian's identity/personality (from Soul docs)" feeds the system prompt. But there's no actual Guardian Soul document — no defined personality, voice, or conversational style.

**Recommendation:** Before Phase 2, create `guardian/SOUL.md` (or similar) that defines Guardian's conversational identity: how it speaks, its values, its personality. This is the framework's own dogfooding of the Soul concept from `09-Voice-Capture.md`.

---

### G-4: Test directory structure doesn't include Phase 2

TECH.md repo structure shows `tests/agents/` with Phase 1 test files but no Phase 2 tests (scribe.test.ts, chat tests, auth tests).

**Recommendation:** Update TECH.md repo structure to include Phase 2 test paths. Minor — will be handled naturally in Phase 2 PRs.

---

### G-5: No cost estimate for Phase 2

PRODUCT.md success criteria include performance targets but no cost model. Phase 2 conversation responses use Claude Sonnet (significantly more expensive than Haiku). The Scribe adds additional Haiku calls per conversation turn.

**Recommendation:** Add a cost estimate section to TECH.md Phase 2: estimated cost per conversation turn (Sonnet response + Haiku extraction + embedding), projected monthly cost at N active users.

---

## ALIGNMENT VERIFICATION

### Product ↔ Tech Alignment

| PRODUCT.md Claim | TECH.md Support | Status |
|------------------|-----------------|--------|
| Hub-and-spoke: one brain, multiple interfaces | Architecture diagram shows dual-channel → shared pipeline | ALIGNED |
| Unlimited memory: never forgets | Capture → Extract → Consolidate → Curate → Retrieve pipeline | ALIGNED |
| Per-user memory isolation | RLS policies on conversation tables + user_id scoping | ALIGNED |
| Cross-channel continuity | `user_profiles.github_contributor_id` FK + Retriever OR query | ALIGNED |
| Scribe = conversational Extractor | Scribe agent spec reuses Extractor pattern | ALIGNED |
| Retriever fires on every message | Chat API flow: step 3 = Retriever call | ALIGNED |
| GitHub channel unchanged | Phase 1 code untouched, PRs 5-8 unchanged | ALIGNED |

### Tech ↔ Code Alignment (Phase 1 built code)

| TECH.md Spec | Built Code | Status |
|--------------|------------|--------|
| Hono server with webhook endpoint | `app.ts` — Hono, POST /api/webhooks/github | ALIGNED |
| HMAC SHA-256 timing-safe verification | `webhooks.ts` — createHmac + timingSafeEqual | ALIGNED |
| 5 event types | webhooks.ts — issues, issue_comment, pull_request, pull_request_review, push | ALIGNED |
| Extractor: batch 20, Haiku, tool_use, 3x retry | extractor.ts — BATCH_SIZE=20, claude-haiku-4-5, tool_use, MAX_LLM_RETRIES=3 | ALIGNED |
| Extraction prompt with emotional context | prompts.ts — emotional_valence, emotional_arousal in schema | ALIGNED |
| OpenAI embeddings 1536d | embeddings.ts (verified via schema VECTOR(1536)) | ALIGNED |
| Inngest cron every 5 min | inngest/functions/extractor.ts | ALIGNED |
| Zod config validation | config.ts — z.object with all env vars | ALIGNED |
| Agent state tracking | extractor.ts — upsertAgentState after run | ALIGNED |
| Idempotency via delivery_id | raw_events.github_delivery_id UNIQUE + duplicate check in app.ts | ALIGNED |

### ADR ↔ Implementation Alignment

| ADR | Implementation | Status |
|-----|----------------|--------|
| ADR-001 (Scaffolding/Soul) | Methodology docs at root, implementation in guardian/ | ALIGNED |
| ADR-002 (Provider-neutral) | Methodology docs are provider-neutral; Guardian uses specific providers | ALIGNED |
| ADR-003 (Relevance over recency) | Retriever formula prioritizes semantic (50%) over recency (20%) | PRINCIPLE ALIGNED, WEIGHTS DIVERGE (see HC-2) |
| ADR-004 (Single-plane GitHub auth) | Webhook signature verification, contributor profiles from GitHub identity | ALIGNED |
| ADR-005 (4 agents, separate Consolidator) | 4 agents specified: Extractor, Consolidator, Retriever, Curator | ALIGNED |
| ADR-006 (Dual-plane conversation auth) | Phase 2 schema + Supabase Auth design | ALIGNED (not yet built) |

---

## RISK ASSESSMENT

| Risk | Severity | Likelihood | Notes |
|------|----------|------------|-------|
| HC-1 (source_event_id NOT NULL) blocks Scribe | HIGH | CERTAIN | Must fix in Migration 004 or Phase 2 is blocked |
| Chat response latency (Retriever + LLM) | MEDIUM | MEDIUM | 500ms Retriever + 2-3s Sonnet = 2.5-3.5s. Streaming helps. |
| Scribe extraction quality for conversations | MEDIUM | MEDIUM | Different prompt tuning needed vs GitHub. Iterate. |
| LLM cost at conversation volume | LOW | LOW | Estimate needed but unlikely to be prohibitive for single-instance. |
| Schema migration with existing data | LOW | LOW | All changes are additive (nullable columns). Clean. |

---

## RECOMMENDATIONS

### Before approving TECH.md v3.0:
1. **Fix HC-1:** Add `source_event_id` nullable + `source_message_id` design to TECH.md Phase 2 schema section
2. **Fix HC-2:** Update ADR-003 clarification to explicitly defer to TECH.md Retriever formula
3. **Fix SC-3:** Rename use case 11 from "Anticipatory Context" to "Memory-Augmented Response"
4. **Add G-1:** `source_channel` column to Phase 2 migration spec

### Before starting Phase 2:
5. **Fix SC-1:** Update GOVERNANCE.md to v3.0
6. **Fix SC-2:** Accept ADR-004, mark ADR-006 as extending it
7. **Add G-3:** Create Guardian SOUL.md (conversational identity)
8. **Fix SC-4:** Decide on synchronous lite extraction (specify or remove)

### Non-blocking (address during execution):
9. **G-2:** Specify cross-channel match_memories() query in PR 9
10. **G-4:** Test directory structure (handled naturally in PRs)
11. **G-5:** Cost estimate for Phase 2 (add to TECH.md when convenient)

---

*Reviewed all constitutional documents, 6 ADRs, BUILDPLAN, all source code (PRs 1-4), inbox packet, and discovery materials.*
*Review produced by @R on 2026-03-16.*
