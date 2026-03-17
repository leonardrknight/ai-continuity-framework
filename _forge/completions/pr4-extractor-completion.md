# Completion Packet — PR 4: Extractor Agent

**Handoff:** `_forge/handoffs/pr4-extractor-handoff.md`
**Branch:** `feature/guardian-extractor`
**PR:** #16
**Status:** Ready for review

---

## What Was Built

### LLM Client: `guardian/src/llm/client.ts`
- `getAnthropicClient()` — Singleton, Claude Haiku for extraction
- `getOpenAIClient()` — Singleton, text-embedding-3-small for embeddings
- `resetLLMClients()` — Testing helper

### Extraction Prompt: `guardian/src/llm/prompts.ts`
- `EXTRACTION_SYSTEM_PROMPT` — Repo-aware system prompt with guidelines for importance/confidence scoring
- `EXTRACTION_TOOL_SCHEMA` — Anthropic tool_use schema: memories[] with content, memory_type, topics, entities, importance_score, confidence_score, source_type, emotional_valence, emotional_arousal
- `buildExtractionUserMessage()` — Formats event type + author + content for LLM
- `ExtractedMemoryLLM` — TypeScript interface for parsed LLM output

### Embedding Generation: `guardian/src/llm/embeddings.ts`
- `generateEmbedding(text)` — Returns 1536d vector or null on failure

### Extractor Agent: `guardian/src/agents/extractor.ts`
- `runExtractor(client, repoId)` — Core pipeline:
  1. Batch up to 20 unprocessed events
  2. Skip null content_text (mark processed, no LLM)
  3. Call Claude Haiku with tool_use (3x retry, exponential backoff)
  4. Generate embedding per memory (null on failure)
  5. Insert each ExtractedMemory
  6. Mark raw_event processed
  7. Update agent_state
- `ExtractionRunResult` — { eventsProcessed, memoriesCreated, errors }

### Inngest Integration
- `guardian/src/inngest/client.ts` — Inngest client (id: 'guardian-agent')
- `guardian/src/inngest/functions/extractor.ts` — Cron every 5 min
- `guardian/src/app.ts` — `/api/inngest` endpoint added

---

## Test Results

**53 tests, 0 failures**

| Suite | Tests | Status |
|-------|-------|--------|
| Extractor Agent | 10 | ✅ |
| POST /api/webhooks/github | 8 | ✅ |
| verifySignature | 4 | ✅ |
| extractContentText | 7 | ✅ |
| extractUsername | 2 | ✅ |
| extractRepoId | 2 | ✅ |
| compositeEventType | 2 | ✅ |
| DB schema | 17 | ✅ |
| Health check | 1 | ✅ |

### Sacred Four
- [x] Typecheck — clean
- [x] Lint + Prettier — clean
- [x] Tests — 53/53 passed
- [x] Build — clean

---

## Dependencies Added

- `@anthropic-ai/sdk` — Anthropic API client (Claude Haiku extraction)
- `openai` — OpenAI API client (embeddings)
- `inngest` — Scheduled function framework

---

## Next Steps

- **PR 5: Consolidator Agent** — Hourly dedup/merge of extracted_memories into consolidated_memories
- **PR 6: Retriever Agent** — Two-stage ranking for on-demand context retrieval
- Supabase migrations should be applied before testing against live data

---

*Produced by @E on 2026-03-10*
