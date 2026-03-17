-- Fix match_memories function: resolve overload conflict and type mismatch
-- 
-- Issues fixed:
-- 1. Two function overloads with similar signatures cause PostgREST PGRST203 error
-- 2. Return type FLOAT doesn't match actual REAL values, causing PGRST 42804 error
--
-- Solution: Single unified function with explicit DOUBLE PRECISION casts

-- Drop any existing overloaded versions
DROP FUNCTION IF EXISTS match_memories(VECTOR(1536), TEXT, TEXT, FLOAT, INT, FLOAT);
DROP FUNCTION IF EXISTS match_memories(VECTOR(1536), TEXT, TEXT, UUID, FLOAT, INT, FLOAT);
DROP FUNCTION IF EXISTS match_memories(VECTOR(1536), TEXT, TEXT, DOUBLE PRECISION, INT, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS match_memories(VECTOR(1536), TEXT, TEXT, UUID, DOUBLE PRECISION, INT, DOUBLE PRECISION);

-- Create single unified version with proper types
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  query_text TEXT,
  filter_repo_id TEXT,
  filter_user_id UUID DEFAULT NULL,
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  match_count INT DEFAULT 10,
  semantic_weight DOUBLE PRECISION DEFAULT 0.6
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  topics TEXT[],
  importance_score DOUBLE PRECISION,
  semantic_score DOUBLE PRECISION,
  keyword_score DOUBLE PRECISION,
  combined_score DOUBLE PRECISION
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      em.id,
      em.content,
      em.memory_type,
      em.topics,
      COALESCE(em.importance_score, 0.5)::DOUBLE PRECISION AS importance_score,
      (1 - (em.content_embedding <=> query_embedding))::DOUBLE PRECISION AS sem_score
    FROM extracted_memories em
    WHERE em.repo_id = filter_repo_id
      AND (filter_user_id IS NULL OR em.user_id = filter_user_id)
      AND em.content_embedding IS NOT NULL
  ),
  keyword AS (
    SELECT
      em.id,
      ts_rank_cd(to_tsvector('english', em.content), plainto_tsquery('english', query_text))::DOUBLE PRECISION AS kw_score
    FROM extracted_memories em
    WHERE em.repo_id = filter_repo_id
      AND (filter_user_id IS NULL OR em.user_id = filter_user_id)
  )
  SELECT
    s.id,
    s.content,
    s.memory_type,
    s.topics,
    s.importance_score,
    s.sem_score AS semantic_score,
    COALESCE(k.kw_score, 0)::DOUBLE PRECISION AS keyword_score,
    (semantic_weight * s.sem_score + (1 - semantic_weight) * COALESCE(k.kw_score, 0))::DOUBLE PRECISION AS combined_score
  FROM semantic s
  LEFT JOIN keyword k ON s.id = k.id
  WHERE (semantic_weight * s.sem_score + (1 - semantic_weight) * COALESCE(k.kw_score, 0)) >= match_threshold
  ORDER BY (semantic_weight * s.sem_score + (1 - semantic_weight) * COALESCE(k.kw_score, 0)) DESC
  LIMIT match_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION match_memories TO authenticated;
GRANT EXECUTE ON FUNCTION match_memories TO service_role;
