# TECH.md — AI Continuity Framework

**Version:** 3.0
**Date:** 2026-03-16
**Status:** APPROVED
**Approved by:** Leo Knight, 2026-03-16
**Supersedes:** Version 2.0 (GitHub-only Guardian)

---

## Project Type

Dual-nature repository:

1. **Methodology** — Markdown documents, YAML templates, research papers. No build step.
2. **Guardian Agent** — TypeScript cloud service with GitHub integration AND conversation interface. Builds, tests, deploys.

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
│   │   │   ├── extractor.ts       # Extractor Agent (GitHub events)
│   │   │   ├── scribe.ts          # Scribe Agent (conversations) [Phase 2]
│   │   │   ├── consolidator.ts    # Consolidator Agent
│   │   │   ├── retriever.ts       # Retriever Agent
│   │   │   └── curator.ts         # Curator Agent
│   │   ├── chat/                   # [Phase 2]
│   │   │   ├── router.ts          # Chat API routes
│   │   │   ├── response.ts        # Memory-augmented response generation
│   │   │   └── session.ts         # Conversation session management
│   │   ├── auth/                   # [Phase 2]
│   │   │   ├── supabase-auth.ts   # Supabase Auth integration
│   │   │   └── identity.ts        # Cross-channel identity linking
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

### Phase 2 Additions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Auth (conversation)** | Supabase Auth | Built-in email/OAuth, pairs with existing Supabase, JWT sessions |
| **Chat frontend** | Next.js 15 + React 19 | SSR, streaming, existing team expertise |
| **LLM (conversation)** | Claude Sonnet 4.6 via Anthropic SDK | Conversation quality requires stronger model than Haiku |
| **Streaming** | Anthropic SDK streaming + SSE | Real-time response delivery to chat UI |

### Why Not CrewAI / LangGraph?

The research (Iteration 7) specified CrewAI Flows + LangGraph for a full 6-agent swarm. Phase 1 builds 5 agents (4 core + Scribe in Phase 2) with straightforward pipelines. The Anthropic SDK with structured outputs provides everything we need without the framework overhead. This decision can be revisited if Phase 3 (Active Memory Management) adds sufficient complexity to justify a framework.

---

## System Architecture

### Hub-and-Spoke Overview

Guardian is one brain with multiple interfaces. All channels feed the same memory pipeline.

```
┌──────────────┐                              ┌──────────────────┐
│   GITHUB     │                              │   WEB CHAT       │
│              │                              │   [Phase 2]      │
│  PR/Issue/   │                              │  User message    │
│  Comment/    │                              │  via API or UI   │
│  Push        │                              │                  │
└──────┬───────┘                              └────────┬─────────┘
       │                                               │
       ▼                                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    GUARDIAN AGENT SERVICE                          │
│                                                                   │
│  ┌─────────────────┐                    ┌──────────────────────┐ │
│  │ WEBHOOK RECEIVER │                    │    CHAT API          │ │
│  │ Verify signature │                    │ Auth user → Route    │ │
│  │ ID contributor   │                    │ [Phase 2]            │ │
│  └────────┬────────┘                    └──────────┬───────────┘ │
│           │                                        │              │
│           ▼                                        ▼              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   RAW CAPTURE (Immediate)                    │ │
│  │  GitHub events → raw_events    Conversations → messages     │ │
│  └────────────────────────┬────────────────────────────────────┘ │
│                           │                                       │
│      ┌────────────────────┼────────────────────┐                 │
│      ▼                    ▼                    ▼                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────┐             │
│  │EXTRACTOR │     │ CONSOLIDATOR │     │  SCRIBE  │             │
│  │(GitHub)  │     │              │     │ (Chat)   │             │
│  │Every 5min│     │ Hourly       │     │ Per-turn │             │
│  │          │     │ Dedup/merge  │     │ [Phase 2]│             │
│  └────┬─────┘     └──────┬───────┘     └────┬─────┘             │
│       │                  │                   │                    │
│       └──────────┬───────┘───────────────────┘                   │
│                  ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │          extracted_memories (shared, source-agnostic)      │    │
│  └───────────────────────────┬──────────────────────────────┘    │
│                              ▼                                    │
│  ┌────────────┐  ┌──────────────────────────────────────────┐   │
│  │  RETRIEVER │  │         consolidated_memories             │   │
│  │  On-demand │◄─│   (deduplicated, scored, tiered)          │   │
│  │  <500ms    │  └──────────────────────────────────────────┘   │
│  └────────────┘                    ▲                              │
│       │                            │                              │
│       │                    ┌───────┴──────┐                      │
│       │                    │   CURATOR    │                      │
│       │                    │  Daily 3 AM  │                      │
│       │                    │ Score/tier/  │                      │
│       │                    │ profiles     │                      │
│       ▼                    └──────────────┘                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  SUPABASE (Postgres + pgvector)              │ │
│  │                                                              │ │
│  │  raw_events │ messages │ extracted_memories │ consolidated   │ │
│  │  user_profiles │ conversations │ agent_state                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Insight

The memory swarm (Consolidator, Retriever, Curator) is **source-agnostic**. It operates on `extracted_memories` and `consolidated_memories` regardless of origin. Phase 1 feeds it from GitHub events via the Extractor. Phase 2 adds a second input via the Scribe. Both channels share the same downstream pipeline — no duplication.

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

### Phase 1: GitHub Channel

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

### Phase 2: Conversation Channel (additive)

```
User message (via Chat API)
  │
  ├──▶ messages table (immediate capture)
  │
  ├──▶ [Retriever, synchronous] → retrieve relevant memories for this user
  │         │
  │         ▼
  │    Synthesized context + user message → Claude Sonnet → response
  │         │
  │         ▼
  │    Response streamed to user + stored in messages
  │
  └──▶ [Scribe, per-turn or batched]
           │
           ▼
      extracted_memories ──▶ same pipeline as Phase 1
```

Both channels feed the same `extracted_memories → consolidated_memories` pipeline. The Consolidator, Curator, and Retriever are source-agnostic.

---

## Phase 2: Conversation Architecture

### Schema Additions (Migration 004+)

#### Table: `user_profiles`

Per-user identity and memory context for conversation users.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE,               -- links to Supabase Auth user
  email TEXT,
  display_name TEXT,

  -- Cross-channel linking
  github_contributor_id UUID REFERENCES contributor_profiles(id),  -- NULL until linked

  -- Profile (updated by Curator)
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  summary TEXT,
  interests TEXT[],
  communication_style TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_auth ON user_profiles (supabase_auth_id);
```

#### Table: `conversations`

Conversation sessions per user.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT,                                   -- auto-generated from first message
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  message_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations (user_id, updated_at DESC);
```

#### Table: `messages`

Individual conversation turns — the raw capture for the Scribe.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),

  -- Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Processing (Scribe)
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scribe's work queue
CREATE INDEX idx_messages_unprocessed
  ON messages (created_at)
  WHERE processed = FALSE;

-- Conversation history (ordered)
CREATE INDEX idx_messages_conversation
  ON messages (conversation_id, created_at);
```

#### Migration 004: Schema extensions for conversation support

The following additive changes are applied to existing Phase 1 tables:

```sql
-- 1. Make source_event_id nullable (was NOT NULL) so Scribe can insert without a raw_event
ALTER TABLE extracted_memories ALTER COLUMN source_event_id DROP NOT NULL;

-- 2. Add source_message_id for conversation-sourced memories
ALTER TABLE extracted_memories ADD COLUMN source_message_id UUID REFERENCES messages(id);

-- 3. Exactly one source must be set
ALTER TABLE extracted_memories ADD CONSTRAINT chk_source_xor
  CHECK (source_event_id IS NOT NULL OR source_message_id IS NOT NULL);

-- 4. Add user_id for per-user memory scoping
ALTER TABLE extracted_memories ADD COLUMN user_id UUID REFERENCES user_profiles(id);
ALTER TABLE consolidated_memories ADD COLUMN user_id UUID REFERENCES user_profiles(id);

-- 5. Add source_channel to distinguish memory origin
ALTER TABLE extracted_memories
  ADD COLUMN source_channel TEXT DEFAULT 'github'
  CHECK (source_channel IN ('github', 'conversation'));

ALTER TABLE consolidated_memories
  ADD COLUMN source_channel TEXT DEFAULT 'github'
  CHECK (source_channel IN ('github', 'conversation'));

-- 6. Index for user-scoped queries
CREATE INDEX idx_extracted_user ON extracted_memories (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_consolidated_user ON consolidated_memories (user_id, importance_score DESC) WHERE user_id IS NOT NULL;
```

These changes are additive and non-breaking. Existing Phase 1 data is unaffected (source_event_id stays populated, user_id is NULL for GitHub-sourced memories, source_channel defaults to 'github').

#### RLS for Conversation Tables

```sql
-- User can only see their own conversations and messages
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"
  ON user_profiles FOR ALL
  USING (supabase_auth_id = auth.uid());

CREATE POLICY "users_own_conversations"
  ON conversations FOR ALL
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE supabase_auth_id = auth.uid()
  ));

CREATE POLICY "users_own_messages"
  ON messages FOR ALL
  USING (user_id IN (
    SELECT id FROM user_profiles WHERE supabase_auth_id = auth.uid()
  ));
```

### Scribe Agent

**Purpose:** Extract structured memories from conversation turns in real time.

**Trigger:** Inngest cron every 2 minutes. Processes unprocessed messages in batches.

**Pipeline:**
```
messages (unprocessed)
  → Batch up to 30 messages (grouped by conversation)
  → For each conversation batch:
      1. Build context: conversation thread + user profile summary
      2. Call Claude Haiku with conversation extraction prompt
      3. Parse structured output: memories[] with type/importance/topics
      4. Generate embedding for each memory (OpenAI)
      5. Insert into extracted_memories with user_id
      6. Mark messages as processed
  → Update agent_state
```

**Key differences from Extractor:**

| Dimension | Extractor (GitHub) | Scribe (Conversation) |
|-----------|-------------------|----------------------|
| Input | Webhook payloads | Conversation turns |
| Cadence | Every 5 min | Every 2 min (higher velocity) |
| Context | Single event | Thread context (prior turns) |
| Signals | Facts, decisions, patterns | + Thread state, tone, direction, preferences |
| User scoping | contributor_id | user_id |

**Shared with Extractor:** Embedding generation, memory insertion, `extracted_memories` table, agent_state tracking, error handling patterns.

### Chat API

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/chat` | Send message, receive memory-augmented response |
| `GET` | `/api/conversations` | List user's conversations |
| `GET` | `/api/conversations/:id` | Get conversation history |
| `POST` | `/api/conversations` | Start new conversation |

**Chat request flow:**
```
POST /api/chat { conversation_id, message }
  │
  ├── 1. Auth: validate JWT (Supabase Auth)
  ├── 2. Store user message in messages table
  ├── 3. [Retriever] fetch relevant memories for this user
  ├── 4. Build LLM prompt: system + memories + conversation history + user message
  ├── 5. Call Claude Sonnet (streaming)
  ├── 6. Stream response to client via SSE
  ├── 7. Store assistant response in messages table
  └── 8. [Scribe] queue messages for extraction (async)
```

**Response generation prompt includes:**
- Guardian's identity/personality (from Soul docs)
- Retrieved memories relevant to this user and topic
- User profile summary (interests, communication style)
- Recent conversation history (last N turns)

### Cross-Channel Identity Linking

When a GitHub contributor also uses the chat interface:

```
User signs up with email → user_profiles created
User links GitHub account → github_contributor_id set on user_profiles
  → Retriever now pulls memories from BOTH channels for this person
  → Curator merges profile data from both sources
```

This is optional and user-initiated. Unlinked identities remain separate.

---

## Phase 3: Active Memory Management (Architecture Preview)

Phase 3 adds three components that make Guardian's memory truly unlimited by managing what's in the context window at any given time.

### Context Window Monitor

Tracks token usage and proactively pages low-value context to warm storage.

```
Context Window Budget:
├── Identity Zone (10-15%) — Soul docs, system prompt [pinned]
├── Active Thread Zone (50-60%) — current conversation [managed]
├── Retrieved Memory Zone (15-20%) — from long-term storage [rotated]
└── Buffer Zone (10-15%) — headroom for new messages
```

When buffer fills, lowest-relevance blocks are paged out, leaving one-line stubs that the Retriever can re-hydrate if the conversation circles back.

### Retrieval Anticipator

Wraps the Retriever with a prediction layer. Monitors conversation stream for signals (entity mentions, topic shifts, temporal references) and pre-fetches relevant memories before they're explicitly needed.

### Thread-Aware Memory

The Scribe tracks conversational threads (topic, step-by-step progress, cross-references) so Guardian can resume interrupted threads without the user having to re-explain where they left off.

**Detailed specifications for Phase 3 will be added when Phase 2 is stable.**

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

### Phase 2 Deployment

Phase 2 adds a Next.js frontend for the chat interface. Two deployment options:

**Option A: Monorepo on Vercel** (recommended)
- Chat UI (Next.js) deploys to Vercel with `guardian/` as root directory
- Guardian backend stays on Fly.io (webhooks + agents)
- Chat API proxied through Next.js API routes → Fly.io backend

**Option B: All on Fly.io**
- Guardian serves both webhook API and chat UI
- Single container, simpler ops
- Trade-off: no Vercel edge optimization for chat UI

Recommendation: Start with Option B for simplicity, evaluate Option A if chat latency matters.

---

## Test Architecture

### Framework

**Vitest** — TypeScript-native, fast, ESM support, built-in mocking.

### Test Strategy

| Layer | Type | Coverage Target |
|-------|------|-----------------|
| Agents (Extractor, Scribe, Consolidator, Retriever, Curator) | Unit | 80%+ |
| GitHub webhook handling | Integration | 90%+ |
| Chat API (auth, message flow, response generation) | Integration | 90%+ |
| Supabase queries | Integration | 80%+ |
| End-to-end (webhook → memory → response) | E2E | Key paths |
| End-to-end (chat → scribe → memory → retrieval → response) | E2E | Key paths |

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
- **ADR-004:** Guardian Agent auth architecture (Phase 1 — GitHub single-plane)
- **ADR-005:** Phase 1 agent architecture — 4 agents with separate Consolidator
- **ADR-006:** Dual-plane auth for conversation channel (Phase 2) *(new, required)*

---

*This document defines HOW the project is structured and built. See PRODUCT.md for WHAT and WHY. See GOVERNANCE.md for WHO decides.*
