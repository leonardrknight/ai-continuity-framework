import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RawEvent,
  RawEventInsert,
  ExtractedMemory,
  ExtractedMemoryInsert,
  ConsolidatedMemory,
  ConsolidatedMemoryInsert,
  ContributorProfile,
  ContributorProfileInsert,
  AgentState,
  AgentStateUpsert,
  MatchMemoryResult,
  UserProfile,
  UserProfileInsert,
  Conversation,
  ConversationInsert,
  Message,
  MessageInsert,
} from './schema.js';

// -- Raw Events --

export async function insertRawEvent(
  client: SupabaseClient,
  event: RawEventInsert,
): Promise<RawEvent> {
  const { data, error } = await client.from('raw_events').insert(event).select().single();
  if (error) throw error;
  return data as RawEvent;
}

export async function getUnprocessedEvents(
  client: SupabaseClient,
  limit = 20,
): Promise<RawEvent[]> {
  const { data, error } = await client
    .from('raw_events')
    .select()
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RawEvent[];
}

export async function markEventProcessed(client: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await client
    .from('raw_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) throw error;
}

// -- Extracted Memories --

export async function insertExtractedMemory(
  client: SupabaseClient,
  memory: ExtractedMemoryInsert,
): Promise<ExtractedMemory> {
  const { data, error } = await client.from('extracted_memories').insert(memory).select().single();
  if (error) throw error;
  return data as ExtractedMemory;
}

export async function getUnconsolidatedMemories(
  client: SupabaseClient,
  limit = 50,
): Promise<ExtractedMemory[]> {
  const { data, error } = await client
    .from('extracted_memories')
    .select()
    .eq('consolidated', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExtractedMemory[];
}

export async function markMemoryConsolidated(
  client: SupabaseClient,
  memoryId: string,
  consolidatedInto: string,
): Promise<void> {
  const { error } = await client
    .from('extracted_memories')
    .update({ consolidated: true, consolidated_into: consolidatedInto })
    .eq('id', memoryId);
  if (error) throw error;
}

// -- Consolidated Memories --

export async function insertConsolidatedMemory(
  client: SupabaseClient,
  memory: ConsolidatedMemoryInsert,
): Promise<ConsolidatedMemory> {
  const { data, error } = await client
    .from('consolidated_memories')
    .insert(memory)
    .select()
    .single();
  if (error) throw error;
  return data as ConsolidatedMemory;
}

export async function updateConsolidatedMemory(
  client: SupabaseClient,
  id: string,
  updates: Partial<ConsolidatedMemory>,
): Promise<ConsolidatedMemory> {
  const { data, error } = await client
    .from('consolidated_memories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ConsolidatedMemory;
}

export async function getConsolidatedMemoriesWithEmbeddings(
  client: SupabaseClient,
  repoId: string,
): Promise<ConsolidatedMemory[]> {
  const { data, error } = await client
    .from('consolidated_memories')
    .select()
    .eq('repo_id', repoId)
    .not('content_embedding', 'is', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConsolidatedMemory[];
}

// -- Contributor Profiles --

export async function upsertContributorProfile(
  client: SupabaseClient,
  profile: ContributorProfileInsert,
): Promise<ContributorProfile> {
  const { data, error } = await client
    .from('contributor_profiles')
    .upsert(profile, { onConflict: 'github_username' })
    .select()
    .single();
  if (error) throw error;
  return data as ContributorProfile;
}

export async function getContributorByUsername(
  client: SupabaseClient,
  username: string,
): Promise<ContributorProfile | null> {
  const { data, error } = await client
    .from('contributor_profiles')
    .select()
    .eq('github_username', username)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as ContributorProfile) ?? null;
}

export async function getContributorById(
  client: SupabaseClient,
  contributorId: string,
): Promise<ContributorProfile | null> {
  const { data, error } = await client
    .from('contributor_profiles')
    .select()
    .eq('id', contributorId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as ContributorProfile) ?? null;
}

export async function incrementInteractionCount(
  client: SupabaseClient,
  contributorId: string,
): Promise<void> {
  // Supabase JS doesn't support raw increment, so fetch + update
  const { data: current, error: fetchError } = await client
    .from('contributor_profiles')
    .select('interaction_count')
    .eq('id', contributorId)
    .single();
  if (fetchError) throw fetchError;
  const { error } = await client
    .from('contributor_profiles')
    .update({
      interaction_count: ((current as { interaction_count: number }).interaction_count ?? 0) + 1,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributorId);
  if (error) throw error;
}

// -- Agent State --

export async function upsertAgentState(
  client: SupabaseClient,
  state: AgentStateUpsert,
): Promise<AgentState> {
  const { data, error } = await client
    .from('agent_state')
    .upsert(
      { ...state, updated_at: new Date().toISOString() },
      { onConflict: 'agent_name,repo_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as AgentState;
}

export async function getAgentState(
  client: SupabaseClient,
  agentName: string,
  repoId: string,
): Promise<AgentState | null> {
  const { data, error } = await client
    .from('agent_state')
    .select()
    .eq('agent_name', agentName)
    .eq('repo_id', repoId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as AgentState) ?? null;
}

// -- Curator Queries --

export async function getConsolidatedMemoriesForCuration(
  client: SupabaseClient,
  repoId: string,
  limit = 100,
): Promise<ConsolidatedMemory[]> {
  // Fetch consolidated memories not curated in 7+ days.
  // Uses updated_at as a proxy for last curated — memories curated recently
  // will have a fresh updated_at timestamp.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('consolidated_memories')
    .select()
    .eq('repo_id', repoId)
    .lt('updated_at', sevenDaysAgo)
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ConsolidatedMemory[];
}

export async function getContributorsWithRecentActivity(
  client: SupabaseClient,
  days = 30,
): Promise<ContributorProfile[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('contributor_profiles')
    .select()
    .gte('last_seen_at', cutoff)
    .order('last_seen_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContributorProfile[];
}

export async function getMemoriesForContributor(
  client: SupabaseClient,
  contributorId: string,
  limit = 50,
): Promise<ConsolidatedMemory[]> {
  const { data, error } = await client
    .from('consolidated_memories')
    .select()
    .eq('contributor_id', contributorId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ConsolidatedMemory[];
}

export async function updateContributorProfile(
  client: SupabaseClient,
  id: string,
  updates: Partial<ContributorProfile>,
): Promise<ContributorProfile> {
  const { data, error } = await client
    .from('contributor_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ContributorProfile;
}

// -- User Profiles --

export async function insertUserProfile(
  client: SupabaseClient,
  profile: UserProfileInsert,
): Promise<UserProfile> {
  const { data, error } = await client.from('user_profiles').insert(profile).select().single();
  if (error) throw error;
  return data as UserProfile;
}

export async function getUserProfileByAuthId(
  client: SupabaseClient,
  authId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select()
    .eq('supabase_auth_id', authId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserProfile) ?? null;
}

export async function getUserProfileById(
  client: SupabaseClient,
  id: string,
): Promise<UserProfile | null> {
  const { data, error } = await client.from('user_profiles').select().eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserProfile) ?? null;
}

// -- Conversations --

export async function insertConversation(
  client: SupabaseClient,
  conversation: ConversationInsert,
): Promise<Conversation> {
  const { data, error } = await client.from('conversations').insert(conversation).select().single();
  if (error) throw error;
  return data as Conversation;
}

export async function getConversationsByUser(
  client: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<Conversation[]> {
  const { data, error } = await client
    .from('conversations')
    .select()
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function getConversationById(
  client: SupabaseClient,
  id: string,
): Promise<Conversation | null> {
  const { data, error } = await client.from('conversations').select().eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Conversation) ?? null;
}

// -- Messages --

export async function insertMessage(
  client: SupabaseClient,
  message: MessageInsert,
): Promise<Message> {
  const { data, error } = await client.from('messages').insert(message).select().single();
  if (error) throw error;
  return data as Message;
}

export async function getMessagesByConversation(
  client: SupabaseClient,
  conversationId: string,
  limit = 50,
): Promise<Message[]> {
  const { data, error } = await client
    .from('messages')
    .select()
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function getUnprocessedMessages(
  client: SupabaseClient,
  limit = 20,
): Promise<Message[]> {
  const { data, error } = await client
    .from('messages')
    .select()
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function markMessageProcessed(
  client: SupabaseClient,
  messageId: string,
): Promise<void> {
  const { error } = await client
    .from('messages')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function updateConversationMessageCount(
  client: SupabaseClient,
  conversationId: string,
): Promise<void> {
  // Count messages in conversation and update the count
  const { count, error: countError } = await client
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  if (countError) throw countError;
  const { error } = await client
    .from('conversations')
    .update({
      message_count: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
  if (error) throw error;
}

// -- Functions (RPC wrappers) --

export async function matchMemories(
  client: SupabaseClient,
  params: {
    query_embedding: number[];
    query_text: string;
    filter_repo_id: string;
    filter_user_id?: string;
    match_threshold?: number;
    match_count?: number;
    semantic_weight?: number;
  },
): Promise<MatchMemoryResult[]> {
  const { data, error } = await client.rpc('match_memories', {
    query_embedding: params.query_embedding,
    query_text: params.query_text,
    filter_repo_id: params.filter_repo_id,
    filter_user_id: params.filter_user_id ?? null,
    match_threshold: params.match_threshold ?? 0.5,
    match_count: params.match_count ?? 10,
    semantic_weight: params.semantic_weight ?? 0.6,
  });
  if (error) throw error;
  return (data ?? []) as MatchMemoryResult[];
}

export async function recordMemoryAccess(
  client: SupabaseClient,
  memoryIds: string[],
): Promise<void> {
  const { error } = await client.rpc('record_memory_access', {
    memory_ids: memoryIds,
  });
  if (error) throw error;
}

// -- Thread Persistence --
// Threads are stored as JSON in the agent_state metadata, keyed by conversation ID.
// This avoids a new database table while keeping thread state persistent.

import type { ConversationThread } from '../agents/thread-tracker.js';

/**
 * Load threads for a conversation from agent_state metadata.
 */
export async function getThreadsForConversation(
  client: SupabaseClient,
  conversationId: string,
): Promise<ConversationThread[]> {
  const state = await getAgentState(client, 'scribe', conversationId);
  if (!state?.metadata) return [];
  const threads = (state.metadata as Record<string, unknown>).threads;
  if (!Array.isArray(threads)) return [];
  return threads as ConversationThread[];
}

/**
 * Save threads for a conversation into agent_state metadata.
 */
export async function saveThreads(
  client: SupabaseClient,
  conversationId: string,
  threads: ConversationThread[],
): Promise<void> {
  const state = await getAgentState(client, 'scribe', conversationId);
  const existingMetadata = (state?.metadata ?? {}) as Record<string, unknown>;

  await upsertAgentState(client, {
    agent_name: 'scribe',
    repo_id: conversationId,
    metadata: { ...existingMetadata, threads },
  });
}
