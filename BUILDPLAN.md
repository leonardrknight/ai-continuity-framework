# BUILDPLAN.md — Guardian Agent

**Date:** 2026-03-16
**Status:** APPROVED
**Approved by:** Leo Knight, 2026-03-16
**Prerequisite:** TECH.md v3.0 approved

---

## PR Sequence

PRs are ordered by dependency. Each PR is independently mergeable and testable.

### PR 1: Scaffold `guardian/` project ✅

**Branch:** `feature/guardian-scaffold`
**PR:** [#13](https://github.com/leonardrknight/ai-continuity-framework/pull/13) — 2026-03-10
**Status:** DELIVERED
**Scope:**
- `guardian/package.json` (TypeScript, Vitest, ESLint, Prettier)
- `guardian/tsconfig.json` (strict mode)
- `guardian/.env.example`
- `guardian/src/index.ts` (minimal Express/Hono server, health check endpoint)
- `guardian/src/config.ts` (env validation with zod)
- `guardian/Dockerfile` + `docker-compose.yml`
- Sacred Four scripts in package.json (`build`, `lint`, `test`, `typecheck`)
- Update root `CLAUDE.md` with Guardian commands

**Tests:** Health check endpoint responds. Build, lint, typecheck pass.
**Validates:** Project structure, tooling, CI readiness.

---

### PR 2: Supabase schema + migrations ✅

**Branch:** `feature/guardian-schema`
**PR:** [#14](https://github.com/leonardrknight/ai-continuity-framework/pull/14) — 2026-03-10
**Status:** DELIVERED
**Depends on:** PR 1
**Scope:**
- `guardian/supabase/migrations/001_initial_schema.sql` — All tables (raw_events, extracted_memories, consolidated_memories, contributor_profiles, agent_state)
- `guardian/supabase/migrations/002_rls_policies.sql` — RLS setup
- `guardian/supabase/migrations/003_functions.sql` — `match_memories()`, `record_memory_access()`
- `guardian/src/db/client.ts` — Supabase client init
- `guardian/src/db/schema.ts` — TypeScript types mirroring DB schema
- `guardian/src/db/queries.ts` — Typed insert/select/update helpers

**Tests:** Schema applies cleanly. TypeScript types match migration DDL. Query helpers pass basic CRUD tests.
**Validates:** Data model is sound, types are correct.

---

### PR 3: GitHub App + webhook receiver ✅

**Branch:** `feature/guardian-github`
**PR:** [#15](https://github.com/leonardrknight/ai-continuity-framework/pull/15) — 2026-03-10
**Status:** DELIVERED
**Depends on:** PR 2
**Scope:**
- `guardian/src/github/webhooks.ts` — Signature verification (HMAC SHA-256, timing-safe), content extraction for 5 event types, processWebhookEvent handler
- `guardian/src/github/actions.ts` — GitHubActionsClient interface + no-op factory
- `guardian/src/app.ts` — `POST /api/webhooks/github` endpoint with full request lifecycle
- Raw event capture: every webhook → `raw_events` table
- Contributor identification: upsert `contributor_profiles`, track interaction count

**Tests:** 25 new tests (4 signature, 7 content extraction, 4 helpers, 10 endpoint integration). 43 total pass.
**Validates:** Event capture pipeline (the "firehose"). Zero data loss.

---

### PR 4: Extractor Agent

**Branch:** `feature/guardian-extractor`
**Depends on:** PR 3
**Scope:**
- `guardian/src/agents/extractor.ts` — Core extraction logic
- `guardian/src/llm/client.ts` — Anthropic SDK client
- `guardian/src/llm/prompts.ts` — Extraction system prompt
- `guardian/src/llm/embeddings.ts` — OpenAI embedding generation
- Inngest function: runs every 5 minutes, processes unprocessed raw_events
- Writes structured memories to `extracted_memories` (including `emotional_valence`, `emotional_arousal`)

**Tests:** Given fixture raw events, produces expected extracted memories. Handles LLM failures gracefully. Embedding failures result in partial storage (no embedding, flagged for backfill). Emotional fields are extracted when present.
**Validates:** The Extractor pipeline works end-to-end. Memories are correctly typed and embedded.

---

### PR 5: Consolidator Agent

**Branch:** `feature/guardian-consolidator`
**Depends on:** PR 4
**Scope:**
- `guardian/src/agents/consolidator.ts` — Deduplication, merge, and linking logic
- Embedding similarity comparison against existing consolidated_memories
- Merge threshold: >0.92 = merge, 0.75-0.92 = link, <0.75 = new entry
- LLM-assisted merge (Claude Sonnet synthesizes combined content)
- Inngest function: runs hourly (`0 * * * *`)

**Tests:** Duplicate memories (>0.92 similarity) are merged correctly. Related memories (0.75-0.92) are linked. New memories create fresh consolidated entries. Merge preserves detail from both sources. Agent handles LLM failures gracefully (leaves unconsolidated for retry).
**Validates:** Extracted memories flow into consolidated storage with dedup. Retriever always searches fresh data.

---

### PR 6: Retriever Agent

**Branch:** `feature/guardian-retriever`
**Depends on:** PR 5
**Scope:**
- `guardian/src/agents/retriever.ts` — Two-stage ranking (SQL candidates → app re-rank)
- Stage 1: `match_memories()` Postgres function (semantic + keyword candidates)
- Stage 2: Application re-rank with `0.50 * semantic + 0.30 * importance + 0.20 * recency`
- Context synthesis: format memories + contributor profile into LLM prompt block
- Graceful degradation (full → reduced → minimal → empty)
- Access count recording

**Tests:** Given seeded memories, retrieves relevant results for test queries. Two-stage ranking order is correct. Latency under 500ms with test data. Degradation levels activate correctly when dependencies fail.
**Validates:** Guardian can recall relevant context when responding to events.

---

### PR 7: Curator Agent

**Branch:** `feature/guardian-curator`
**Depends on:** PR 6
**Scope:**
- `guardian/src/agents/curator.ts` — Lifecycle management + contributor profiles
- Importance recalculation algorithm (including emotional_valence factor)
- Tier management (short/medium/long)
- Archival flagging (low importance + old + low access)
- Contributor profile refresh from aggregated memories
- Inngest function: runs daily at 3 AM UTC (`0 3 * * *`)

**Tests:** Importance scores update as expected. Tier transitions happen at correct thresholds. Archival flags trigger on correct conditions. Contributor profiles reflect accumulated knowledge.
**Validates:** Memory lifecycle works. The system self-maintains.

---

### PR 8: Integration + dogfooding activation

**Branch:** `feature/guardian-activate`
**Depends on:** PR 7
**Scope:**
- Wire Retriever into webhook handler: when Guardian responds to issues/PRs, it includes relevant context
- Response logic: decide when to comment (not every event — only when context adds value)
- Deployment config: Fly.io `fly.toml` or equivalent
- Dogfooding: install GitHub App on `ai-continuity-framework` repo
- Update root README with Guardian Agent section

**Tests:** End-to-end: webhook → capture → extract → retrieve → respond. Response quality spot-check.
**Validates:** The Guardian Agent is alive, managing this repo.

---

## Phase 1 Milestone Summary

| PR | Deliverable | Validates |
|----|-------------|-----------|
| 1 | Project scaffold | Tooling works |
| 2 | Database schema | Data model is sound |
| 3 | GitHub webhook pipeline | Events captured (zero loss) |
| 4 | Extractor Agent | Memories extracted from events |
| 5 | Consolidator Agent | Extracted memories deduplicated into consolidated storage |
| 6 | Retriever Agent | Context recalled on demand (two-stage ranking) |
| 7 | Curator Agent | Memory lifecycle self-maintains |
| 8 | Integration + deploy | Guardian is live, dogfooding on GitHub |

---

## Phase 2: Conversation + Unlimited Memory (PRs 9-13)

**Prerequisite:** Phase 1 stable, GitHub dogfooding validated

### PR 9: Schema migration — users, conversations, messages

**Branch:** `feature/guardian-chat-schema`
**Depends on:** PR 8 (Phase 1 complete)
**Scope:**
- `guardian/supabase/migrations/004_conversation_tables.sql` — `user_profiles`, `conversations`, `messages` tables
- `guardian/supabase/migrations/005_conversation_rls.sql` — RLS policies for per-user isolation
- Add `user_id` column to `extracted_memories` and `consolidated_memories` (nullable, additive)
- Update `guardian/src/db/schema.ts` with new TypeScript types
- Update `guardian/src/db/queries.ts` with conversation query helpers
- Update `match_memories()` function to optionally filter by `user_id`

**Tests:** Schema applies cleanly. RLS verified: user A cannot read user B's data. Existing GitHub pipeline unaffected.
**Validates:** Conversation data model is sound. Per-user isolation works at DB level.

---

### PR 10: Supabase Auth + user management

**Branch:** `feature/guardian-auth`
**Depends on:** PR 9
**Scope:**
- `guardian/src/auth/supabase-auth.ts` — Auth middleware, JWT validation, session management
- `guardian/src/auth/identity.ts` — User profile creation on signup, GitHub identity linking endpoint
- Auth configuration in Supabase dashboard (email/password, optionally GitHub OAuth)
- Protected routes: all `/api/chat` and `/api/conversations` endpoints require auth

**Tests:** Signup/login flow. JWT validation on protected routes. Unauthenticated requests rejected. Profile created on first login.
**Validates:** Conversation users can authenticate. Per-user scoping works end-to-end.

---

### PR 11: Chat API + memory-augmented responses

**Branch:** `feature/guardian-chat-api`
**Depends on:** PR 10
**Scope:**
- `guardian/src/chat/router.ts` — `POST /api/chat`, `GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations`
- `guardian/src/chat/response.ts` — Memory-augmented response generation:
  1. Retriever fetches relevant memories for this user
  2. Build system prompt with Guardian identity + retrieved memories + user profile
  3. Call Claude Sonnet with streaming
  4. Store both user message and assistant response in `messages`
- `guardian/src/chat/session.ts` — Conversation session management (create, list, resume)
- Wire into `guardian/src/app.ts`

**Tests:** Send message → get response with memory context. Conversation history persists. Response quality baseline (memories surface when relevant). Streaming works.
**Validates:** You can talk to Guardian and it responds with memory. The core experience works.

---

### PR 12: Scribe Agent

**Branch:** `feature/guardian-scribe`
**Depends on:** PR 11
**Scope:**
- `guardian/src/agents/scribe.ts` — Conversation extraction pipeline:
  - Batch unprocessed messages (grouped by conversation)
  - Build conversation context (thread + user profile)
  - Call Claude Haiku with conversation extraction prompt
  - Generate embeddings, insert into `extracted_memories` with `user_id`
  - Mark messages as processed
- `guardian/src/llm/prompts.ts` — Add `CONVERSATION_EXTRACTION_PROMPT` (adapted from `EXTRACTION_SYSTEM_PROMPT` for conversational input)
- `guardian/src/inngest/functions/scribe.ts` — Inngest cron every 2 minutes

**Tests:** Given fixture conversation turns, produces expected memories. Thread context improves extraction quality. User preferences and decisions are captured. Emotional valence extracted from conversation tone.
**Validates:** Conversations feed the memory pipeline. The Scribe → Consolidator → Retriever loop works end-to-end.

---

### PR 13: Web chat interface

**Branch:** `feature/guardian-chat-ui`
**Depends on:** PR 12
**Scope:**
- Simple chat UI (Next.js or static HTML + JS — keep it minimal)
- Login/signup screen (Supabase Auth UI)
- Conversation list sidebar
- Chat view with streaming responses
- Mobile-responsive
- Deploy alongside Guardian service

**Tests:** Manual testing: signup, login, send messages, see responses, switch conversations. Verify memory retrieval visible in responses.
**Validates:** People can touch and interact with Guardian. The unlimited memory chatbot is real and tangible.

---

## Phase 2 Milestone Summary

| PR | Deliverable | Validates |
|----|-------------|-----------|
| 9 | Conversation schema + user isolation | Data model supports conversations |
| 10 | Auth + user management | Users can sign up and authenticate |
| 11 | Chat API + memory responses | Guardian responds with memory context |
| 12 | Scribe Agent | Conversations feed the memory pipeline |
| 13 | Web chat UI | People can interact with Guardian |

---

## Phase 3: Active Memory Management (PRs 14-16)

**Prerequisite:** Phase 2 stable, conversations flowing

### PR 14: Context Window Monitor

**Branch:** `feature/guardian-context-monitor`
**Depends on:** PR 13
**Scope:**
- Token budget tracker (monitors context usage per conversation)
- Relevance scoring per message block
- Paging protocol: offload low-relevance blocks to storage, leave one-line stubs
- Re-hydration: Retriever pulls back paged memories when referenced

**Validates:** Long conversations don't degrade. Context is managed, not lost.

---

### PR 15: Retrieval Anticipator

**Branch:** `feature/guardian-anticipator`
**Depends on:** PR 14
**Scope:**
- Conversation stream analyzer (entity mentions, topic shifts, temporal references)
- Prediction confidence scoring
- Pre-fetch queue with tiered injection (inject now / stage / index only)
- Accuracy tracking feedback loop

**Validates:** Guardian pre-loads relevant context before being asked. "It just knows."

---

### PR 16: Thread-aware memory

**Branch:** `feature/guardian-threads`
**Depends on:** PR 15
**Scope:**
- Thread tracking in Scribe (thread_id, step_number, status)
- Thread resumption protocol
- Cross-reference linking between related threads

**Validates:** Guardian can resume interrupted threads without the user re-explaining.

---

## Phase 3 Milestone Summary

| PR | Deliverable | Validates |
|----|-------------|-----------|
| 14 | Context Window Monitor | Long conversations stay coherent |
| 15 | Retrieval Anticipator | Predictive memory pre-fetch works |
| 16 | Thread-aware memory | Interrupted threads resume cleanly |

---

## Risk Registers

| Risk | Mitigation |
|------|------------|
| LLM extraction quality is poor | Start with high-importance events only (PRs, not every commit). Tune prompts iteratively. |
| Retrieval latency > 500ms | Semantic search alone may suffice; skip keyword search as fallback. Pre-compute embeddings. |
| Cost overrun from LLM calls | Haiku for extraction/scribe, Sonnet for conversation responses. Batch processing. Skip low-signal events. |
| Webhook reliability | GitHub retries failed deliveries. Idempotency via `github_delivery_id` UNIQUE constraint. |
| Schema needs changes mid-build | Supabase migrations are additive. Non-breaking column additions are fine. |
| Chat response latency | Retriever must be fast (<500ms). Pre-compute embeddings. Streaming masks LLM latency. |
| Memory isolation breach | RLS at DB level + application-level user scoping. Test with multi-user scenarios. |
| Scribe extraction quality for conversations | Different prompt tuning needed vs GitHub events. Iterate on conversation extraction prompt. |

---

*This plan will be executed by @E per approved handoff. Each PR requires Leo's review and approval (Tier 0 governance).*
