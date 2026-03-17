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
