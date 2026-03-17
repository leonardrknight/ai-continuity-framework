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
