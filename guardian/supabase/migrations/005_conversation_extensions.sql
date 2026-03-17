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
