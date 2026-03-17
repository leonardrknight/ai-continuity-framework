# PR 4: Extractor Agent — Code Complete

**Date:** 2026-03-10
**Branch:** feature/guardian-extractor
**Status:** CODE COMPLETE — Ready for review

## Deliverables

| File | Purpose |
|------|---------|
| `guardian/src/llm/client.ts` | Anthropic + OpenAI client singletons |
| `guardian/src/llm/prompts.ts` | Extraction system prompt + tool schema |
| `guardian/src/llm/embeddings.ts` | OpenAI text-embedding-3-small (1536d) |
| `guardian/src/agents/extractor.ts` | Core extraction pipeline |
| `guardian/src/inngest/client.ts` | Inngest client init |
| `guardian/src/inngest/functions/extractor.ts` | Cron function (every 5 min) |
| `guardian/src/__tests__/extractor.test.ts` | 10 tests with mocked LLM/DB |

## Sacred Four

```
typecheck  ✅
lint       ✅
test       ✅  53 passed (10 new)
build      ✅
```

## Dependencies Added

- `@anthropic-ai/sdk` ^0.78.0
- `openai` ^6.27.0
- `inngest` ^3.52.6

## Test Coverage

- Extracts memories from issue event
- Handles multiple memories per event
- Generates 1536d embeddings for each memory
- Stores without embedding on embedding failure
- Marks events as processed after success
- Skips events without content_text
- Updates agent_state after a run
- Handles LLM extraction failure gracefully (event stays unprocessed for retry)
- Extracts emotional context (valence + arousal)
- Returns early when no unprocessed events
