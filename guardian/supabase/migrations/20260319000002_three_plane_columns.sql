-- Three-Plane Knowledge: Add plane columns to memory tables
-- Applied live via `supabase db push` on 2026-03-19

-- Add three-plane columns to extracted_memories
ALTER TABLE extracted_memories
  ADD COLUMN knowledge_plane TEXT NOT NULL DEFAULT 'company',
  ADD COLUMN human_id UUID REFERENCES humans(id),
  ADD COLUMN role_id UUID REFERENCES roles(id),
  ADD COLUMN classification_confidence FLOAT DEFAULT 0.5,
  ADD COLUMN classified_by TEXT DEFAULT 'scribe';

-- Add same to consolidated_memories
ALTER TABLE consolidated_memories
  ADD COLUMN knowledge_plane TEXT NOT NULL DEFAULT 'company',
  ADD COLUMN human_id UUID REFERENCES humans(id),
  ADD COLUMN role_id UUID REFERENCES roles(id),
  ADD COLUMN classification_confidence FLOAT DEFAULT 0.5,
  ADD COLUMN classified_by TEXT DEFAULT 'consolidator';

-- Indexes for plane-filtered queries
CREATE INDEX idx_consolidated_plane ON consolidated_memories(knowledge_plane);
CREATE INDEX idx_consolidated_human ON consolidated_memories(human_id);
CREATE INDEX idx_extracted_plane ON extracted_memories(knowledge_plane);
