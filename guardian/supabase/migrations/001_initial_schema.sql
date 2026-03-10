-- 001_initial_schema.sql
-- Guardian Agent: Core tables for memory pipeline
-- Requires: pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table: contributor_profiles
-- Per-contributor memory context
-- ============================================================
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
  summary TEXT,
  interests TEXT[],
  expertise TEXT[],
  communication_style TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: raw_events
-- The firehose. Every GitHub event goes here first, unprocessed.
-- ============================================================
CREATE TABLE raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_event_type TEXT NOT NULL,
  github_delivery_id TEXT UNIQUE NOT NULL,
  repo_id TEXT NOT NULL,
  contributor_id UUID REFERENCES contributor_profiles(id),
  github_username TEXT NOT NULL,

  -- Content
  payload JSONB NOT NULL,
  content_text TEXT,

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  github_created_at TIMESTAMPTZ
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

-- ============================================================
-- Table: extracted_memories
-- Structured memories extracted from raw events by the Extractor
-- ============================================================
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
  entities TEXT[],

  -- Scoring
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
  confidence_score FLOAT DEFAULT 0.8 CHECK (confidence_score BETWEEN 0 AND 1),
  source_type TEXT DEFAULT 'stated' CHECK (source_type IN ('stated', 'inferred')),

  -- Emotional context
  emotional_valence FLOAT CHECK (emotional_valence BETWEEN -1 AND 1),
  emotional_arousal FLOAT CHECK (emotional_arousal BETWEEN 0 AND 1),

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

-- ============================================================
-- Table: consolidated_memories
-- Deduplicated, linked, long-term storage managed by the Curator
-- ============================================================
CREATE TABLE consolidated_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id TEXT NOT NULL,
  contributor_id UUID REFERENCES contributor_profiles(id),

  -- Content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),

  -- Classification
  memory_type TEXT NOT NULL,
  topics TEXT[],

  -- Importance (boosted by consolidation)
  importance_score FLOAT NOT NULL CHECK (importance_score BETWEEN 0 AND 1),
  stability FLOAT DEFAULT 0.5,

  -- Relationships
  related_memories UUID[],
  source_memories UUID[],

  -- Lifecycle
  tier TEXT DEFAULT 'medium' CHECK (tier IN ('short', 'medium', 'long')),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,

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

-- ============================================================
-- Table: agent_state
-- Persistent state for each agent
-- ============================================================
CREATE TABLE agent_state (
  agent_name TEXT NOT NULL,
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
