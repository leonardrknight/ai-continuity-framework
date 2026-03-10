# Handoff: PR 4 — Extractor Agent

**From:** @G (Govern)
**To:** @E (Execute)
**Date:** 2026-03-10
**Branch:** `feature/guardian-extractor`
**Depends on:** PR 3 (merged as #15)

---

## Objective

Build the Extractor Agent — a scheduled worker that processes unprocessed `raw_events` into structured `extracted_memories` using Claude Haiku for extraction and OpenAI for embeddings.

---

## Deliverables

### 1. LLM Client (`guardian/src/llm/client.ts`)
- Anthropic SDK client initialization (Claude Haiku for extraction)
- OpenAI client for embeddings (text-embedding-3-small, 1536d)
- Both clients use environment variables from `config.ts` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)

### 2. Extraction Prompt (`guardian/src/llm/prompts.ts`)
- System prompt: repo context (name, description, key topics)
- User message: event content_text
- Response format: structured JSON via tool_use schema
- Output schema per memory:
  ```typescript
  {
    content: string;        // The extracted memory
    memory_type: MemoryType; // fact | decision | preference | pattern | question | action_item | relationship
    topics: string[];
    entities: string[];
    importance_score: number; // 0-1
    confidence_score: number; // 0-1
    source_type: 'stated' | 'inferred';
    emotional_valence: number | null; // -1 to 1
    emotional_arousal: number | null; // 0 to 1
  }
  ```

### 3. Embedding Generation (`guardian/src/llm/embeddings.ts`)
- `generateEmbedding(text: string): Promise<number[]>` — calls OpenAI text-embedding-3-small
- Returns 1536-dimensional vector
- Error handling: return null on failure (memory stored without embedding, flagged for backfill)

### 4. Extractor Agent (`guardian/src/agents/extractor.ts`)
- Core `extractMemories(client, events)` function
- Pipeline per TECH.md:
  1. Batch up to 20 unprocessed raw_events (`getUnprocessedEvents()`)
  2. For each event with content_text:
     - Call Claude Haiku with extraction prompt
     - Parse structured output into memories[]
     - Generate embedding for each memory
     - Insert into `extracted_memories` (`insertExtractedMemory()`)
     - Mark raw_event as processed (`markEventProcessed()`)
  3. Update `agent_state` for 'extractor' (`upsertAgentState()`)
- Error handling:
  - LLM failures: retry 3x with exponential backoff
  - Embedding failures: store memory without embedding (content_embedding = null)
  - DB failures: retry up to 5x
  - Dead events: log to agent_state.metadata.dead_letter after max retries

### 5. Inngest Function (`guardian/src/inngest/extractor.ts` or similar)
- Cron trigger: every 5 minutes
- Calls the extractor agent
- Note: For testing, the core extraction logic should be testable independently of Inngest

---

## Existing Code to Use

All DB helpers are already built in PR 2:

| Function | File | Purpose |
|----------|------|---------|
| `getUnprocessedEvents(client, limit)` | `db/queries.ts:27` | Fetch raw_events where processed=false |
| `markEventProcessed(client, eventId)` | `db/queries.ts:41` | Set processed=true + timestamp |
| `insertExtractedMemory(client, memory)` | `db/queries.ts:51` | Write to extracted_memories |
| `upsertAgentState(client, state)` | `db/queries.ts:168` | Track agent run state |
| `getSupabaseClient()` | `db/client.ts` | Supabase singleton |

Types are in `db/schema.ts`:
- `ExtractedMemoryInsert` — insert type with required fields (source_event_id, repo_id, content, memory_type) + optional fields (embedding, topics, entities, importance, confidence, emotional_valence, emotional_arousal)
- `AgentStateUpsert` — agent tracking type
- `MemoryType` — enum of valid memory types

Config already validates `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `config.ts`.

---

## Key Requirements

1. **Tests first** — Write tests before implementation
2. **Mock LLM calls** — Tests must not hit real APIs. Mock Anthropic and OpenAI responses.
3. **Mock DB calls** — Use the same `vi.hoisted()` + `vi.mock()` pattern from PR 3 webhook tests
4. **Sacred Four must pass** — typecheck, lint, test, build
5. **No Inngest dependency in tests** — Test the core extraction function, not the scheduling wrapper

---

## Test Plan

| Test | Description |
|------|-------------|
| Extracts memories from issue event | Given a fixture raw_event with issue content, produces expected ExtractedMemory with correct type/topics |
| Extracts memories from PR event | Given a PR raw_event, extracts decision/action_item memories |
| Handles multiple memories per event | A single rich event can produce 2+ memories |
| Generates embeddings | Each extracted memory gets a 1536d embedding vector |
| Stores without embedding on failure | If OpenAI fails, memory is stored with content_embedding=null |
| Marks events as processed | After successful extraction, raw_event.processed=true |
| Skips events without content_text | Raw events with null content_text are marked processed but produce no memories |
| Updates agent_state | After a run, agent_state reflects items_processed count and timestamps |
| Handles LLM extraction failure | If Haiku fails after retries, event is not marked processed (retried next run) |
| Extracts emotional context | Events with strong sentiment produce emotional_valence and emotional_arousal values |

---

## Performance Targets (from TECH.md)

| Metric | Target |
|--------|--------|
| Processing latency | <5 min from event |
| Throughput | 50 events/run |
| Extraction accuracy | >90% |
| Error rate | <2% |

---

## Dependencies to Add

- `@anthropic-ai/sdk` — Anthropic API client
- `openai` — OpenAI API client (embeddings)
- `inngest` — Scheduled function framework

---

## Branch Setup

Create branch `feature/guardian-extractor` from `main` (which now includes PRs 1-3).

---

*Handoff produced by @G on 2026-03-10*
