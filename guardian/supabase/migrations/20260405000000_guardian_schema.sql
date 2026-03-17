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
-- 002_rls_policies.sql
-- Row Level Security: repo-scoped isolation
-- Guardian Agent authenticates via service role key (bypasses RLS)
-- These policies protect against future multi-tenant scenarios

-- Enable RLS on all tables
ALTER TABLE raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidated_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;

-- Repo-scoped access policies
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
-- 003_functions.sql
-- Postgres functions for memory retrieval and access tracking

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
-- 004_conversation_tables.sql
-- Phase 2: Tables for user profiles, conversations, and messages

-- ============================================================
-- Table: user_profiles
-- Per-user identity for conversation participants
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id UUID UNIQUE,
  email TEXT,
  display_name TEXT,
  github_contributor_id UUID REFERENCES contributor_profiles(id),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  summary TEXT,
  interests TEXT[],
  communication_style TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_auth ON user_profiles (supabase_auth_id);

-- ============================================================
-- Table: conversations
-- Tracks individual conversation sessions per user
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations (user_id, updated_at DESC);

-- ============================================================
-- Table: messages
-- Individual messages within conversations
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_unprocessed ON messages (created_at) WHERE processed = FALSE;
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
-- 005_conversation_extensions.sql
-- Extend existing tables for conversation-sourced memories

-- Make source_event_id nullable so Scribe can insert without a raw_event
ALTER TABLE extracted_memories ALTER COLUMN source_event_id DROP NOT NULL;

-- Add source_message_id for conversation-sourced memories
ALTER TABLE extracted_memories ADD COLUMN source_message_id UUID REFERENCES messages(id);

-- Exactly one source must be set
ALTER TABLE extracted_memories ADD CONSTRAINT chk_source_xor
  CHECK (source_event_id IS NOT NULL OR source_message_id IS NOT NULL);

-- Add user_id for per-user memory scoping
ALTER TABLE extracted_memories ADD COLUMN user_id UUID REFERENCES user_profiles(id);
ALTER TABLE consolidated_memories ADD COLUMN user_id UUID REFERENCES user_profiles(id);

-- Add source_channel to distinguish memory origin
ALTER TABLE extracted_memories ADD COLUMN source_channel TEXT DEFAULT 'github'
  CHECK (source_channel IN ('github', 'conversation'));
ALTER TABLE consolidated_memories ADD COLUMN source_channel TEXT DEFAULT 'github'
  CHECK (source_channel IN ('github', 'conversation'));

-- Indexes for user-scoped queries
CREATE INDEX idx_extracted_user
  ON extracted_memories (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_consolidated_user
  ON consolidated_memories (user_id, importance_score DESC)
  WHERE user_id IS NOT NULL;
-- 006_conversation_rls.sql
-- Row Level Security for conversation tables

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "users_own_profile" ON user_profiles FOR ALL
  USING (supabase_auth_id = auth.uid());

-- Users can only see their own conversations
CREATE POLICY "users_own_conversations" ON conversations FOR ALL
  USING (user_id IN (SELECT id FROM user_profiles WHERE supabase_auth_id = auth.uid()));

-- Users can only see their own messages
CREATE POLICY "users_own_messages" ON messages FOR ALL
  USING (user_id IN (SELECT id FROM user_profiles WHERE supabase_auth_id = auth.uid()));
-- 007_match_memories_v2.sql
-- Update match_memories to support optional user_id filtering

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  query_text TEXT,
  filter_repo_id TEXT,
  filter_user_id UUID DEFAULT NULL,
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
      AND (filter_user_id IS NULL OR cm.user_id = filter_user_id OR cm.user_id IS NULL)
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
      AND (filter_user_id IS NULL OR cm.user_id = filter_user_id OR cm.user_id IS NULL)
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
