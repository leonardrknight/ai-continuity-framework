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

// -- Functions (RPC wrappers) --

export async function matchMemories(
  client: SupabaseClient,
  params: {
    query_embedding: number[];
    query_text: string;
    filter_repo_id: string;
    match_threshold?: number;
    match_count?: number;
    semantic_weight?: number;
  },
): Promise<MatchMemoryResult[]> {
  const { data, error } = await client.rpc('match_memories', {
    query_embedding: params.query_embedding,
    query_text: params.query_text,
    filter_repo_id: params.filter_repo_id,
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
