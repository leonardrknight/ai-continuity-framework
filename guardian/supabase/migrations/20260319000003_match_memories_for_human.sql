-- Three-Plane Knowledge: Plane-aware retrieval function
-- Applied live via `supabase db push` on 2026-03-19

CREATE OR REPLACE FUNCTION match_memories_for_human(
  query_embedding vector(1536),
  query_text text,
  requesting_human_id uuid,
  filter_org_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  semantic_weight float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  content text,
  memory_type text,
  knowledge_plane text,
  topics text[],
  entities text[],
  importance_score float,
  similarity float,
  created_at timestamptz,
  source_human_name text
) AS $$
DECLARE
  human_role_id uuid;
  human_authority text;
  role_filters text[];
BEGIN
  -- Resolve requesting human's role and authority
  SELECT h.role_id, r.authority_level, r.company_plane_filters
  INTO human_role_id, human_authority, role_filters
  FROM humans h
  LEFT JOIN roles r ON h.role_id = r.id
  WHERE h.id = requesting_human_id;

  RETURN QUERY
  SELECT
    cm.id, cm.content, cm.memory_type, cm.knowledge_plane,
    cm.topics, cm.entities, cm.importance_score,
    (1 - (cm.content_embedding <=> query_embedding)) AS similarity,
    cm.created_at,
    h.display_name AS source_human_name
  FROM consolidated_memories cm
  LEFT JOIN humans h ON cm.human_id = h.id
  WHERE
    -- Always include company plane (filtered by role access)
    (cm.knowledge_plane = 'company'
      AND (human_authority IN ('founder', 'executive')
           OR NOT cm.topics && role_filters))
    -- Include own private memories
    OR (cm.knowledge_plane = 'private' AND cm.human_id = requesting_human_id)
    -- Include own role memories
    OR (cm.knowledge_plane = 'role' AND cm.human_id = requesting_human_id)
    -- Include role memories for same role (succession)
    OR (cm.knowledge_plane = 'role' AND cm.role_id = human_role_id
        AND cm.human_id != requesting_human_id)
  ORDER BY
    (semantic_weight * (1 - (cm.content_embedding <=> query_embedding))
     + (1 - semantic_weight) * ts_rank_cd(
       to_tsvector('english', cm.content),
       plainto_tsquery('english', query_text)
     )) DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
