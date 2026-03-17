/**
 * TypeScript types mirroring the Supabase schema defined in
 * guardian/supabase/migrations/001_initial_schema.sql
 * and guardian/supabase/migrations/004_conversation_tables.sql
 */

// -- Memory type enum --
export type MemoryType =
  | 'fact'
  | 'decision'
  | 'preference'
  | 'pattern'
  | 'question'
  | 'action_item'
  | 'relationship';

export type SourceType = 'stated' | 'inferred';

export type MemoryTier = 'short' | 'medium' | 'long';

export type AgentName = 'extractor' | 'consolidator' | 'retriever' | 'curator' | 'scribe';

export type SourceChannel = 'github' | 'conversation';

export type MessageRole = 'user' | 'assistant' | 'system';

export type ConversationStatus = 'active' | 'archived';

// -- Table row types --

export interface ContributorProfile {
  id: string;
  github_username: string;
  github_id: number | null;
  display_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  interaction_count: number;
  summary: string | null;
  interests: string[] | null;
  expertise: string[] | null;
  communication_style: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawEvent {
  id: string;
  github_event_type: string;
  github_delivery_id: string;
  repo_id: string;
  contributor_id: string | null;
  github_username: string;
  payload: Record<string, unknown>;
  content_text: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  github_created_at: string | null;
}

export interface ExtractedMemory {
  id: string;
  source_event_id: string | null;
  source_message_id: string | null;
  contributor_id: string | null;
  user_id: string | null;
  repo_id: string;
  content: string;
  content_embedding: number[] | null;
  memory_type: MemoryType;
  topics: string[] | null;
  entities: string[] | null;
  importance_score: number;
  confidence_score: number;
  source_type: SourceType;
  source_channel: SourceChannel;
  emotional_valence: number | null;
  emotional_arousal: number | null;
  access_count: number;
  last_accessed_at: string | null;
  consolidated: boolean;
  consolidated_into: string | null;
  created_at: string;
}

export interface ConsolidatedMemory {
  id: string;
  repo_id: string;
  contributor_id: string | null;
  user_id: string | null;
  content: string;
  content_embedding: number[] | null;
  memory_type: string;
  topics: string[] | null;
  importance_score: number;
  stability: number;
  related_memories: string[] | null;
  source_memories: string[] | null;
  source_channel: SourceChannel;
  tier: MemoryTier;
  access_count: number;
  last_accessed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AgentState {
  agent_name: AgentName;
  repo_id: string;
  last_run_at: string | null;
  last_successful_at: string | null;
  items_processed: number;
  error_count_24h: number;
  last_error: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  supabase_auth_id: string | null;
  email: string | null;
  display_name: string | null;
  github_contributor_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  interaction_count: number;
  summary: string | null;
  interests: string[] | null;
  communication_style: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  status: ConversationStatus;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

// -- Insert types (omit server-generated fields) --

export type ContributorProfileInsert = Pick<ContributorProfile, 'github_username'> &
  Partial<
    Pick<
      ContributorProfile,
      'github_id' | 'display_name' | 'summary' | 'interests' | 'expertise' | 'communication_style'
    >
  >;

export type RawEventInsert = Pick<
  RawEvent,
  'github_event_type' | 'github_delivery_id' | 'repo_id' | 'github_username' | 'payload'
> &
  Partial<Pick<RawEvent, 'contributor_id' | 'content_text' | 'github_created_at'>>;

export type ExtractedMemoryInsert = Pick<ExtractedMemory, 'repo_id' | 'content' | 'memory_type'> &
  Partial<
    Pick<
      ExtractedMemory,
      | 'source_event_id'
      | 'source_message_id'
      | 'contributor_id'
      | 'user_id'
      | 'content_embedding'
      | 'topics'
      | 'entities'
      | 'importance_score'
      | 'confidence_score'
      | 'source_type'
      | 'source_channel'
      | 'emotional_valence'
      | 'emotional_arousal'
    >
  >;

export type ConsolidatedMemoryInsert = Pick<
  ConsolidatedMemory,
  'repo_id' | 'content' | 'memory_type' | 'importance_score'
> &
  Partial<
    Pick<
      ConsolidatedMemory,
      | 'contributor_id'
      | 'user_id'
      | 'content_embedding'
      | 'topics'
      | 'stability'
      | 'related_memories'
      | 'source_memories'
      | 'source_channel'
      | 'tier'
    >
  >;

export type AgentStateUpsert = Pick<AgentState, 'agent_name' | 'repo_id'> &
  Partial<
    Pick<
      AgentState,
      | 'last_run_at'
      | 'last_successful_at'
      | 'items_processed'
      | 'error_count_24h'
      | 'last_error'
      | 'metadata'
    >
  >;

export type UserProfileInsert = Partial<
  Pick<
    UserProfile,
    | 'supabase_auth_id'
    | 'email'
    | 'display_name'
    | 'github_contributor_id'
    | 'summary'
    | 'interests'
    | 'communication_style'
  >
>;

export type ConversationInsert = Pick<Conversation, 'user_id'> &
  Partial<Pick<Conversation, 'title' | 'status'>>;

export type MessageInsert = Pick<Message, 'conversation_id' | 'user_id' | 'role' | 'content'>;

// -- Function return types --

export interface MatchMemoryResult {
  id: string;
  content: string;
  memory_type: string;
  topics: string[] | null;
  importance_score: number;
  semantic_score: number;
  keyword_score: number;
  combined_score: number;
}
