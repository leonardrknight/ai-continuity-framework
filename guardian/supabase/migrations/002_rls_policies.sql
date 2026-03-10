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
