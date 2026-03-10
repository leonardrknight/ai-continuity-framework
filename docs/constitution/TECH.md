# TECH.md — AI Continuity Framework

**Version:** 2.0
**Date:** 2026-03-10
**Status:** DRAFT — Awaiting Leo's approval
**Supersedes:** Version 1.0 (documentation-only)

---

## Project Type

Dual-nature repository:

1. **Methodology** — Markdown documents, YAML templates, research papers. No build step.
2. **Guardian Agent** — TypeScript cloud service. Builds, tests, deploys.

The methodology lives at the repo root. The Guardian Agent lives in `guardian/`.

---

## Repository Structure

```
ai-continuity-framework/
│
│ ── METHODOLOGY (unchanged) ──────────────────────────────────────
│
├── 01-The-Problem.md              # Core methodology (numbered)
├── 02-Memory-Architecture.md
├── 03-Journal-Guide.md
├── 04-Migration-Playbook.md
├── 05-Session-Management.md
├── 06-Weekly-Reflection.md
├── 07-Hub-and-Spoke.md
├── 08-Multi-Agent-Memory.md
├── 09-Voice-Capture.md
├── templates/                     # Identity/memory templates
├── research/                      # Deep research iterations (1-7)
├── proposals/                     # Implementation proposals
├── insights/                      # Production observations
│
│ ── GUARDIAN AGENT (new) ──────────────────────────────────────────
│
├── guardian/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── src/
│   │   ├── index.ts               # Entry point (webhook server)
│   │   ├── config.ts              # Environment + configuration
│   │   ├── github/
│   │   │   ├── app.ts             # GitHub App setup (Octokit)
│   │   │   ├── webhooks.ts        # Webhook event handlers
│   │   │   └── actions.ts         # GitHub API actions (comment, label, etc.)
│   │   ├── agents/
│   │   │   ├── extractor.ts       # Extractor Agent
│   │   │   ├── consolidator.ts    # Consolidator Agent
│   │   │   ├── retriever.ts       # Retriever Agent
│   │   │   └── curator.ts         # Curator Agent
│   │   ├── db/
│   │   │   ├── client.ts          # Supabase client
│   │   │   ├── schema.ts          # TypeScript types matching DB schema
│   │   │   └── queries.ts         # Typed query helpers
│   │   ├── llm/
│   │   │   ├── client.ts          # Anthropic SDK client
│   │   │   ├── prompts.ts         # System prompts for each agent
│   │   │   └── embeddings.ts      # Embedding generation (OpenAI)
│   │   └── util/
│   │       ├── logger.ts          # Structured logging
│   │       └── errors.ts          # Error types
│   ├── supabase/
│   │   └── migrations/            # SQL migrations (numbered)
│   │       ├── 001_initial_schema.sql
│   │       ├── 002_rls_policies.sql
│   │       └── 003_functions.sql
│   └── tests/
│       ├── agents/
│       │   ├── extractor.test.ts
│       │   ├── consolidator.test.ts
│       │   ├── retriever.test.ts
│       │   └── curator.test.ts
│       ├── github/
│       │   └── webhooks.test.ts
│       └── fixtures/              # Sample GitHub events, memories
│
│ ── GOVERNANCE (unchanged) ────────────────────────────────────────
│
├── docs/
│   ├── constitution/              # PRODUCT.md, TECH.md, GOVERNANCE.md
│   ├── adr/                       # Architecture Decision Records
│   └── parking-lot/
├── abc/                           # FORGE entry artifacts
├── _forge/                        # FORGE inbox/ledger
└── .claude/                       # FORGE agents and skills
```

---

## Technology Stack

### Methodology (unchanged)

| Layer | Technology |
|-------|------------|
| Content format | Markdown (.md) |
| Data format | YAML |
| Version control | Git / GitHub |
| Research tooling | Perplexity AI (MCP) |

### Guardian Agent

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Runtime** | Node.js 22+ / TypeScript 5.5+ | GitHub ecosystem, Supabase SDK, async-native |
| **GitHub integration** | Octokit + @octokit/webhooks | Official GitHub App SDK |
| **Database** | Supabase (Postgres 16 + pgvector) | RLS, vector search, realtime, managed |
| **LLM (extraction)** | Claude Haiku 4.5 via Anthropic SDK | Fast, cost-effective for structured extraction |
| **LLM (reasoning)** | Claude Sonnet 4.6 via Anthropic SDK | Complex consolidation, synthesis |
| **Embeddings** | OpenAI text-embedding-3-small (1536d) | Best price/quality ratio, pgvector compatible |
| **Scheduling** | Inngest | Durable execution, retries, observability |
| **Testing** | Vitest | Fast, TypeScript-native, ESM support |
| **Linting** | ESLint + Prettier | Standard TypeScript tooling |
| **Container** | Docker | Self-hostable deployment |

### Why Not CrewAI / LangGraph?

The research (Iteration 7) specified CrewAI Flows + LangGraph for a full 6-agent swarm. Phase 1 builds 4 agents with straightforward pipelines. The Anthropic SDK with structured outputs provides everything we need without the framework overhead. This decision can be revisited in Phase 2 when Voice Keeper and Archivist add complexity.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GITHUB                                       │
│                                                                       │
│   PR opened ──┐  Issue created ──┐  Comment posted ──┐  Push ──┐    │
│               │                  │                    │         │    │
└───────────────┼──────────────────┼────────────────────┼─────────┼────┘
                │                  │                    │         │
                ▼                  ▼                    ▼         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     GUARDIAN AGENT SERVICE                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                  WEBHOOK RECEIVER (Express/Hono)                 │ │
│  │                                                                  │ │
│  │  Validates signature → Identifies contributor → Routes event    │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │                                     │
│                                 ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      RAW CAPTURE (Immediate)                     │ │
│  │                                                                  │ │
│  │  Every GitHub event → raw_events table                          │ │
│  │  NO PROCESSING. NO FILTERING. JUST CAPTURE.                     │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │                                     │
│         ┌──────────────┼──────────────┬──────────────┐              │
│         ▼              ▼              ▼              ▼              │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ EXTRACTOR  │ │ CONSOLIDATOR │ │  RETRIEVER │ │   CURATOR  │   │
│  │            │ │              │ │            │ │            │   │
│  │ Scheduled: │ │ Scheduled:   │ │ On-demand: │ │ Scheduled: │   │
│  │ Every 5min │ │ Hourly       │ │ <500ms     │ │ Daily 3 AM │   │
│  │            │ │              │ │            │ │            │   │
│  │ Extracts:  │ │ Dedup:       │ │ Searches:  │ │ Manages:   │   │
│  │ • Facts    │ │ • Merge      │ │ • Semantic │ │ • Import.  │   │
│  │ • Decisions│ │ • Link       │ │ • Keyword  │ │ • Tier     │   │
│  │ • Prefs    │ │ • Promote    │ │ • Temporal │ │ • Profiles │   │
│  │ • Patterns │ │              │ │ • Contrib. │ │ • Archival │   │
│  └─────┬──────┘ └──────┬───────┘ └─────┬──────┘ └─────┬──────┘   │
│        │               │               │              │            │
│        └───────────────┼───────────────┼──────────────┘            │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     SUPABASE (Postgres + pgvector)               │ │
│  │                                                                  │ │
│  │  raw_events → extracted_memories → consolidated_memories        │ │
│  │  contributor_profiles │ agent_state │ retrieval_stats            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## GitHub App Integration

### Webhook Events (Subscribed)

| Event | Trigger | Guardian Action |
|-------|---------|----------------|
| `issues.opened` | New issue created | Capture → Extract → Optionally respond with related context |
| `issues.comment` | Comment on issue | Capture → Extract → Surface related memories if helpful |
| `pull_request.opened` | New PR | Capture → Extract → Comment with relevant architectural context |
| `pull_request.review` | PR review submitted | Capture → Extract contributor feedback patterns |
| `pull_request.closed` | PR merged or closed | Capture → Extract decisions made |
| `push` | Commits pushed | Capture commit messages → Extract changes |
| `discussion.created` | New discussion | Capture → Extract (if Discussions enabled) |

### GitHub App Permissions

| Permission | Scope | Reason |
|------------|-------|--------|
| Issues | Read & Write | Read events, post contextual comments |
| Pull Requests | Read & Write | Read events, post review context |
| Contents | Read | Read file contents for context |
| Metadata | Read | Repository info |
| Discussions | Read & Write | Read events, respond (if enabled) |

### Webhook Security

- Verify `X-Hub-Signature-256` on every request using app secret
- Reject events older than 5 minutes (replay protection)
- Rate limit: max 100 events/minute per repo (queue excess)

### Contributor Identification

```
GitHub event arrives
  → Extract github_username from event payload
  → Lookup in contributor_profiles table
    → Found: Load profile, attach to event context
    → Not found: Create stub profile, mark as "new contributor"
  → Contributor ID flows through entire pipeline
```

---

## Supabase Schema Design

### Table: `raw_events`

The firehose. Every GitHub event goes here first, unprocessed.

```sql
CREATE TABLE raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_event_type TEXT NOT NULL,        -- 'issues.opened', 'pull_request.review', etc.
  github_delivery_id TEXT UNIQUE NOT NULL, -- X-GitHub-Delivery header (idempotency)
  repo_id TEXT NOT NULL,                   -- 'owner/repo'
  contributor_id UUID REFERENCES contributor_profiles(id),
  github_username TEXT NOT NULL,

  -- Content
  payload JSONB NOT NULL,                  -- Full GitHub webhook payload
  content_text TEXT,                       -- Extracted human-readable text (body, comment, commit msg)

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  github_created_at TIMESTAMPTZ           -- Timestamp from the GitHub event itself
);

-- Extractor's work queue
CREATE INDEX idx_raw_events_unprocessed
  ON raw_events (created_at)
  WHERE processed = FALSE;

-- Lookup by contributor
CREATE INDEX idx_raw_events_contributor
  ON raw_events (contributor_id, created_at DESC);

-- Idempotency guard
CREATE UNIQUE INDEX idx_raw_events_delivery
  ON raw_events (github_delivery_id);
```

### Table: `contributor_profiles`

Per-contributor memory context — what Guardian knows about each person.

```sql
CREATE TABLE contributor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT UNIQUE NOT NULL,
  github_id BIGINT UNIQUE,

  -- Profile
  display_name TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,

  -- Computed context (updated by Curator)
  summary TEXT,                            -- "Regular contributor focused on research docs"
  interests TEXT[],                        -- Topics they engage with
  expertise TEXT[],                        -- Areas of demonstrated knowledge
  communication_style TEXT,                -- "concise", "detailed", "asks lots of questions"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `extracted_memories`

Structured memories extracted from raw events by the Extractor Agent.

```sql
CREATE TABLE extracted_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id UUID NOT NULL REFERENCES raw_events(id),
  contributor_id UUID REFERENCES contributor_profiles(id),
  repo_id TEXT NOT NULL,

  -- Content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),

  -- Classification
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'fact', 'decision', 'preference', 'pattern', 'question', 'action_item', 'relationship'
  )),
  topics TEXT[],
  entities TEXT[],                          -- Named entities (people, files, features)

  -- Scoring
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  source_type TEXT DEFAULT 'stated' CHECK (source_type IN ('stated', 'inferred')),

  -- Emotional context (extracted by Extractor, used by Curator importance formula)
  emotional_valence FLOAT CHECK (emotional_valence BETWEEN -1 AND 1),   -- negative to positive sentiment
  emotional_arousal FLOAT CHECK (emotional_arousal BETWEEN 0 AND 1),    -- calm to intense

  -- Lifecycle
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  consolidated BOOLEAN DEFAULT FALSE,
  consolidated_into UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector search index
CREATE INDEX idx_extracted_embedding
  ON extracted_memories
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index
ALTER TABLE extracted_memories
  ADD COLUMN content_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_extracted_tsv
  ON extracted_memories USING gin(content_tsv);

-- Curator's work queue
CREATE INDEX idx_extracted_unconsolidated
  ON extracted_memories (created_at)
  WHERE consolidated = FALSE;
```

### Table: `consolidated_memories`

Deduplicated, linked, long-term storage managed by the Curator.

```sql
CREATE TABLE consolidated_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id TEXT NOT NULL,
  contributor_id UUID REFERENCES contributor_profiles(id), -- NULL = repo-level memory

  -- Content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),

  -- Classification
  memory_type TEXT NOT NULL,
  topics TEXT[],

  -- Importance (boosted by consolidation)
  importance_score FLOAT NOT NULL CHECK (importance_score BETWEEN 0 AND 1),
  stability FLOAT DEFAULT 0.5,             -- Forgetting curve stability (SM-2)

  -- Relationships
  related_memories UUID[],
  source_memories UUID[],                  -- extracted_memory IDs this was built from

  -- Lifecycle
  tier TEXT DEFAULT 'medium' CHECK (tier IN ('short', 'medium', 'long')),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,               -- Optimistic locking

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector search
CREATE INDEX idx_consolidated_embedding
  ON consolidated_memories
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search
ALTER TABLE consolidated_memories
  ADD COLUMN content_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_consolidated_tsv
  ON consolidated_memories USING gin(content_tsv);

-- Tier-based queries
CREATE INDEX idx_consolidated_tier
  ON consolidated_memories (repo_id, tier, importance_score DESC);
```

### Table: `agent_state`

Persistent state for each agent — cursors, statistics, health.

```sql
CREATE TABLE agent_state (
  agent_name TEXT NOT NULL,                -- 'extractor', 'consolidator', 'retriever', 'curator'
  repo_id TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_successful_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  error_count_24h INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (agent_name, repo_id)
);
```

### Postgres Functions

```sql
-- Hybrid search: semantic + keyword
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  query_text TEXT,
  filter_repo_id TEXT,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.6
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  topics TEXT[],
  importance_score FLOAT,
  semantic_score FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      cm.id,
      cm.content,
      cm.memory_type,
      cm.topics,
      cm.importance_score,
      1 - (cm.content_embedding <=> query_embedding) AS sem_score
    FROM consolidated_memories cm
    WHERE cm.repo_id = filter_repo_id
      AND 1 - (cm.content_embedding <=> query_embedding) > match_threshold
    ORDER BY cm.content_embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword AS (
    SELECT
      cm.id,
      ts_rank(cm.content_tsv, plainto_tsquery('english', query_text)) AS kw_score
    FROM consolidated_memories cm
    WHERE cm.repo_id = filter_repo_id
      AND cm.content_tsv @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT
    s.id,
    s.content,
    s.memory_type,
    s.topics,
    s.importance_score,
    s.sem_score AS semantic_score,
    COALESCE(k.kw_score, 0) AS keyword_score,
    (semantic_weight * s.sem_score + (1 - semantic_weight) * COALESCE(k.kw_score, 0))
      AS combined_score
  FROM semantic s
  LEFT JOIN keyword k ON s.id = k.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Bump access count when memories are retrieved
CREATE OR REPLACE FUNCTION record_memory_access(memory_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consolidated_memories
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = ANY(memory_ids);
END;
$$;
```

---

## RLS Policies

Row Level Security isolates data by repository. The Guardian Agent authenticates via Supabase service role key for its own operations, but RLS ensures multi-repo isolation if the same Supabase instance serves multiple Guardian deployments.

```sql
-- Enable RLS on all tables
ALTER TABLE raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidated_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (Guardian Agent uses this)
-- These policies protect against future multi-tenant scenarios

-- Repo-scoped read access
CREATE POLICY "repo_isolation_raw_events"
  ON raw_events FOR ALL
  USING (repo_id = current_setting('app.current_repo_id', TRUE));

CREATE POLICY "repo_isolation_extracted"
  ON extracted_memories FOR ALL
  USING (repo_id = current_setting('app.current_repo_id', TRUE));

CREATE POLICY "repo_isolation_consolidated"
  ON consolidated_memories FOR ALL
  USING (repo_id = current_setting('app.current_repo_id', TRUE));

CREATE POLICY "repo_isolation_agent_state"
  ON agent_state FOR ALL
  USING (repo_id = current_setting('app.current_repo_id', TRUE));

-- Contributor profiles are shared (username is global)
CREATE POLICY "contributor_profiles_read"
  ON contributor_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "contributor_profiles_write"
  ON contributor_profiles FOR ALL
  USING (TRUE);
```

---

## Agent Specifications

### Extractor Agent

**Purpose:** Process raw GitHub events into structured memories.

**Trigger:** Inngest cron, every 5 minutes. Also fires on event-driven threshold (backlog > 50).

**Pipeline:**
```
raw_events (unprocessed)
  → Batch up to 20 events
  → For each event:
      1. Extract content_text from payload (PR body, comment, commit msg)
      2. Call Claude Haiku with extraction prompt
      3. Parse structured output: memories[], each with type/importance/topics/emotional_valence/emotional_arousal
      4. Generate embedding for each memory (OpenAI)
      5. Insert into extracted_memories
      6. Mark raw_event as processed
  → Update agent_state
```

**LLM prompt strategy:** System prompt includes repo context (name, description, key topics). User message contains the event content. Response is structured JSON (tool_use with defined schema).

**Performance targets:**

| Metric | Target | Critical |
|--------|--------|----------|
| Processing latency | <5 min from event | >30 min |
| Throughput | 50 events/run | <10 events/run |
| Extraction accuracy | >90% | <80% |
| Error rate | <2% | >10% |

**Error handling:** LLM failures retry 3x with backoff. Embedding failures store memory without embedding (Curator backfills). DB failures retry 5x. Dead events go to `agent_state.metadata.dead_letter`.

### Consolidator Agent

**Purpose:** Deduplicate and merge extracted memories into consolidated long-term storage.

**Trigger:** Inngest cron, every hour (`0 * * * *`).

**Pipeline:**
```
extracted_memories (unconsolidated)
  → Fetch batch of unconsolidated extracted_memories
  → For each memory:
      1. Compute embedding similarity against existing consolidated_memories
      2. If similarity > 0.92: merge (LLM combines content, boost importance)
      3. If similarity 0.75-0.92: link as related_memories
      4. If < 0.75: create new consolidated_memory
      5. Mark extracted_memory as consolidated
  → Update agent_state
```

**LLM prompt strategy:** When merging (similarity > 0.92), Claude Sonnet synthesizes the combined content, preserving detail from both sources. The merged memory inherits the higher importance score, boosted by 10%.

**Performance targets:**

| Metric | Target | Critical |
|--------|--------|----------|
| Consolidation latency | <10 min/run | >30 min |
| Dedup accuracy | >95% | <85% |
| False merge rate | <1% | >3% |
| Throughput | 200 memories/run | <50/run |

**Error handling:** LLM merge failures leave both memories unconsolidated (retried next run). DB failures retry 3x with backoff. Embedding comparison failures fall back to keyword overlap heuristic.

---

### Retriever Agent

**Purpose:** Find relevant context for the current conversation. Synchronous, must be fast.

**Trigger:** On-demand HTTP call from webhook handler when Guardian needs to respond.

**Pipeline (two-stage ranking):**
```
Query (contributor context + current event)
  → Generate query embedding
  →
  → STAGE 1: SQL function (match_memories)
  │   Returns candidate set scored by:
  │   • Semantic similarity (pgvector cosine distance)
  │   • Keyword relevance (Postgres full-text ts_rank)
  │   • Combined via semantic_weight parameter (default 0.6)
  │   • Limited to match_count * 2 candidates (over-fetch for re-ranking)
  │
  → STAGE 2: Application layer re-ranking
  │   For each candidate from Stage 1:
  │   final_score = 0.50 * semantic_similarity
  │               + 0.30 * importance_score
  │               + 0.20 * recency_decay(age_days)
  │   Sort by final_score, take top match_count
  │
  → Load contributor profile (parallel with Stage 1)
  → Synthesize context block for LLM prompt
  → Record access (bump counts for retrieved memories)
  → Return synthesized context
```

**Why two stages:** The SQL function efficiently narrows millions of memories to a candidate set using indexes (IVFFlat for vectors, GIN for full-text). The application layer applies importance and recency weights that would be expensive to compute in SQL for the full table but are trivial for ~20 candidates.

**Ranking formula (Stage 2, from research, adapted):**
```
score = 0.50 * semantic_similarity
      + 0.30 * importance_score
      + 0.20 * recency_decay(age_days)
```

Where `recency_decay(d) = e^(-d / 30)` (Ebbinghaus-inspired, from Iteration 1).

**Graceful degradation** (from Iteration 7 research):

| Level | Condition | Response |
|-------|-----------|----------|
| Full | All systems healthy | Semantic + keyword + contributor context |
| Reduced | Embedding timeout | Keyword search only |
| Minimal | Database slow | Contributor profile only |
| Empty | All systems down | Respond without memory context |

**Performance targets:**

| Metric | Target | Critical |
|--------|--------|----------|
| P50 latency | <100ms | >300ms |
| P95 latency | <300ms | >500ms |
| Relevance (MRR@10) | >0.7 | <0.4 |

### Curator Agent

**Purpose:** Manage memory importance, lifecycle tiers, and contributor profiles. Operates on consolidated memories produced by the Consolidator.

**Trigger:** Inngest cron, daily at 3 AM UTC (`0 3 * * *`).

**Pipeline:**
```
Phase 1: Lifecycle Management
  → For each consolidated_memory not curated in 7+ days:
      1. Recalculate importance (base × access_freq × recency × type_weight)
      2. Update tier (long ≥ 0.8, medium ≥ 0.4, short < 0.4)
      3. Flag for archival if: importance < 0.2 AND age > 90d AND access < 3

Phase 2: Contributor Profile Refresh
  → For each active contributor:
      1. Aggregate their memories by topic
      2. Update interests, expertise, communication_style
      3. Update summary
```

**Importance algorithm (from Iteration 7, Curator spec):**
```
importance = 0.30 * base_importance
           + 0.20 * min(1.0, access_count / 10)
           + 0.15 * recency_decay(age_days)
           + 0.15 * type_weight(memory_type)
           + 0.10 * |emotional_valence|
           + 0.10 * min(1.0, source_count / 5)
```

Type weights: `decision: 0.9, relationship: 0.85, preference: 0.7, action_item: 0.6, fact: 0.5, pattern: 0.5, question: 0.3`

**Performance targets:**

| Metric | Target | Critical |
|--------|--------|----------|
| Consolidation time | <15 min/repo | >1 hour |
| Dedup accuracy | >95% | <85% |
| False merge rate | <1% | >3% |

---

## Data Flow Summary

```
GitHub Event
  │
  ▼
raw_events (immediate, no processing)
  │
  ▼ [Extractor, every 5 min]
extracted_memories (structured, tagged, embedded)
  │
  ▼ [Consolidator, hourly]
consolidated_memories (deduplicated, linked)
  │
  ▼ [Curator, daily 3 AM]
consolidated_memories (importance scored, tiered, archived)
  │
  ▼ [Retriever, on-demand]
Synthesized context → Guardian's LLM prompt → GitHub comment/response
```

This directly implements the framework's capture → extract → consolidate → curate → retrieve pipeline documented in `02-Memory-Architecture.md` and the Memory Agent Swarm proposal.

---

## Deployment Architecture

### Phase 1: Single-Instance (this repo only)

```
┌─────────────────────────────────────────────┐
│              Docker Compose                   │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  guardian-service (Node.js)              │ │
│  │  • Webhook server (port 3000)           │ │
│  │  • Inngest worker (agents run here)     │ │
│  └─────────────────────┬───────────────────┘ │
│                        │                      │
│  ┌─────────────────────┴───────────────────┐ │
│  │  Inngest Dev Server (port 8288)         │ │
│  │  • Cron scheduling                       │ │
│  │  • Event routing                         │ │
│  │  • Observability dashboard               │ │
│  └─────────────────────────────────────────┘ │
│                                               │
└─────────────────────────────────────────────┘
          │                        │
          ▼                        ▼
  Supabase (hosted)        GitHub (webhooks)
```

**Environment variables** (`.env`):

```
# GitHub App
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# OpenAI (embeddings only)
OPENAI_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Config
GUARDIAN_REPO=leonardrknight/ai-continuity-framework
LOG_LEVEL=info
```

### Production Deployment Options

| Option | Pros | Cons |
|--------|------|------|
| **Fly.io** (recommended Phase 1) | Simple deploy, always-on, cheap ($5-10/mo) | Single region |
| **Railway** | Git-push deploy, managed | Less control |
| **VPS + Docker** | Full control, self-hosted | More ops work |
| **AWS ECS / Cloud Run** | Scalable | Overkill for Phase 1 |

Fly.io is recommended for Phase 1: single container, always-on (webhooks need instant response), low cost, easy Docker deployment.

---

## Test Architecture

### Framework

**Vitest** — TypeScript-native, fast, ESM support, built-in mocking.

### Test Strategy

| Layer | Type | Coverage Target |
|-------|------|-----------------|
| Agents (Extractor, Consolidator, Retriever, Curator) | Unit | 80%+ |
| GitHub webhook handling | Integration | 90%+ |
| Supabase queries | Integration | 80%+ |
| End-to-end (webhook → memory → response) | E2E | Key paths |

### Mocking Strategy

- **LLM calls:** Mocked in unit tests (deterministic fixtures). Integration tests use real API with recorded responses.
- **Supabase:** Test against a dedicated Supabase project with test data. Reset between test suites.
- **GitHub webhooks:** Fixture payloads from GitHub's webhook documentation.

### Sacred Four Commands

```bash
cd guardian

# Build
pnpm build                   # TypeScript compilation

# Lint
pnpm lint                    # ESLint + Prettier check

# Test
pnpm test                    # Vitest (unit + integration)

# Typecheck
pnpm typecheck               # tsc --noEmit
```

All four must pass before any PR is merged for Guardian code.

---

## Document Numbering Convention (Methodology)

Unchanged. Core methodology documents use sequential numbering: `NN-Title.md`. Research iterations use: `research/iteration-N/NN-topic.md`.

---

## Quality Standards

### Methodology (unchanged)

| Check | Method |
|-------|--------|
| Markdown validity | Manual review |
| Internal link integrity | PR review |
| Consistent terminology | PRODUCT.md Key Concepts |
| Research citation | Trace to source document |

### Guardian Agent

| Check | Method |
|-------|--------|
| Type safety | `pnpm typecheck` (strict mode) |
| Code style | `pnpm lint` (ESLint + Prettier) |
| Test coverage | Vitest coverage report, 80%+ target |
| Schema migrations | Reviewed in PR, tested against staging |
| Secrets | Never committed. `.env.example` documents required vars |
| Dependencies | `pnpm audit` for known vulnerabilities |

---

## Boundaries

### Methodology (unchanged)
- Provider-neutral. All patterns work across Claude, GPT, Gemini, local LLMs.
- Templates are starting points, not prescriptive schemas.
- Research is exploratory. Findings are recommendations, not mandates.

### Guardian Agent
- The Guardian Agent implementation uses specific providers (Anthropic, OpenAI, Supabase) but the **patterns** it demonstrates are documented provider-neutrally in the methodology.
- The docs are **authoritative**. If Guardian's behavior diverges from the methodology docs, the software gets fixed.
- Guardian code lives exclusively in `guardian/`. It does not modify methodology files at the repo root.
- No sensitive data in code. All secrets via environment variables.

---

## ADR References

- **ADR-001:** Scaffolding vs Soul memory model
- **ADR-002:** Provider-neutral methodology
- **ADR-003:** Relevance over recency reranking
- **ADR-004:** Guardian Agent auth architecture *(new, required)*
- **ADR-005:** Phase 1 agent architecture — 4 agents with separate Consolidator

---

*This document defines HOW the project is structured and built. See PRODUCT.md for WHAT and WHY. See GOVERNANCE.md for WHO decides.*
