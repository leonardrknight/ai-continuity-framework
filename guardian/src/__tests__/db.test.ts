import { describe, it, expect, expectTypeOf } from 'vitest';
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
  MemoryType,
  SourceType,
  MemoryTier,
  AgentName,
  MatchMemoryResult,
} from '../db/schema.js';
import {
  insertRawEvent,
  getUnprocessedEvents,
  markEventProcessed,
  insertExtractedMemory,
  getUnconsolidatedMemories,
  markMemoryConsolidated,
  insertConsolidatedMemory,
  updateConsolidatedMemory,
  upsertContributorProfile,
  getContributorByUsername,
  incrementInteractionCount,
  upsertAgentState,
  getAgentState,
  matchMemories,
  recordMemoryAccess,
} from '../db/queries.js';

describe('Schema types', () => {
  it('MemoryType accepts all valid values', () => {
    const types: MemoryType[] = [
      'fact',
      'decision',
      'preference',
      'pattern',
      'question',
      'action_item',
      'relationship',
    ];
    expect(types).toHaveLength(7);
  });

  it('SourceType accepts valid values', () => {
    const types: SourceType[] = ['stated', 'inferred'];
    expect(types).toHaveLength(2);
  });

  it('MemoryTier accepts valid values', () => {
    const tiers: MemoryTier[] = ['short', 'medium', 'long'];
    expect(tiers).toHaveLength(3);
  });

  it('AgentName accepts valid values', () => {
    const agents: AgentName[] = ['extractor', 'consolidator', 'retriever', 'curator'];
    expect(agents).toHaveLength(4);
  });

  it('RawEvent has required fields', () => {
    expectTypeOf<RawEvent>().toHaveProperty('id');
    expectTypeOf<RawEvent>().toHaveProperty('github_event_type');
    expectTypeOf<RawEvent>().toHaveProperty('github_delivery_id');
    expectTypeOf<RawEvent>().toHaveProperty('repo_id');
    expectTypeOf<RawEvent>().toHaveProperty('payload');
    expectTypeOf<RawEvent>().toHaveProperty('processed');
    expectTypeOf<RawEvent>().toHaveProperty('created_at');
  });

  it('ExtractedMemory includes emotional context fields', () => {
    expectTypeOf<ExtractedMemory>().toHaveProperty('emotional_valence');
    expectTypeOf<ExtractedMemory>().toHaveProperty('emotional_arousal');
    expectTypeOf<ExtractedMemory>().toHaveProperty('importance_score');
    expectTypeOf<ExtractedMemory>().toHaveProperty('confidence_score');
    expectTypeOf<ExtractedMemory>().toHaveProperty('source_type');
  });

  it('ConsolidatedMemory has tier and version fields', () => {
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('tier');
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('version');
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('stability');
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('related_memories');
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('source_memories');
  });

  it('AgentState uses composite key fields', () => {
    expectTypeOf<AgentState>().toHaveProperty('agent_name');
    expectTypeOf<AgentState>().toHaveProperty('repo_id');
    expectTypeOf<AgentState>().toHaveProperty('items_processed');
    expectTypeOf<AgentState>().toHaveProperty('error_count_24h');
  });

  it('ContributorProfile has curator-computed fields', () => {
    expectTypeOf<ContributorProfile>().toHaveProperty('summary');
    expectTypeOf<ContributorProfile>().toHaveProperty('interests');
    expectTypeOf<ContributorProfile>().toHaveProperty('expertise');
    expectTypeOf<ContributorProfile>().toHaveProperty('communication_style');
  });

  it('MatchMemoryResult has all score fields', () => {
    expectTypeOf<MatchMemoryResult>().toHaveProperty('semantic_score');
    expectTypeOf<MatchMemoryResult>().toHaveProperty('keyword_score');
    expectTypeOf<MatchMemoryResult>().toHaveProperty('combined_score');
  });

  it('Insert types require only mandatory fields', () => {
    // RawEventInsert requires event_type, delivery_id, repo_id, username, payload
    const rawInsert: RawEventInsert = {
      github_event_type: 'issues.opened',
      github_delivery_id: 'abc-123',
      repo_id: 'owner/repo',
      github_username: 'testuser',
      payload: { action: 'opened' },
    };
    expect(rawInsert.github_event_type).toBe('issues.opened');

    // ContributorProfileInsert requires only github_username
    const profileInsert: ContributorProfileInsert = {
      github_username: 'testuser',
    };
    expect(profileInsert.github_username).toBe('testuser');

    // ExtractedMemoryInsert requires source_event_id, repo_id, content, memory_type
    const memoryInsert: ExtractedMemoryInsert = {
      source_event_id: 'uuid-here',
      repo_id: 'owner/repo',
      content: 'Test memory',
      memory_type: 'fact',
    };
    expect(memoryInsert.memory_type).toBe('fact');

    // ConsolidatedMemoryInsert requires repo_id, content, memory_type, importance_score
    const consolidatedInsert: ConsolidatedMemoryInsert = {
      repo_id: 'owner/repo',
      content: 'Consolidated memory',
      memory_type: 'decision',
      importance_score: 0.8,
    };
    expect(consolidatedInsert.importance_score).toBe(0.8);

    // AgentStateUpsert requires agent_name, repo_id
    const stateUpsert: AgentStateUpsert = {
      agent_name: 'extractor',
      repo_id: 'owner/repo',
    };
    expect(stateUpsert.agent_name).toBe('extractor');
  });
});

describe('Query helper signatures', () => {
  // We verify function signatures at the type level without calling them.
  // Each function takes a SupabaseClient as first arg and returns a Promise.

  it('raw event queries have correct signatures', () => {
    expectTypeOf(insertRawEvent).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertRawEvent).parameter(1).toMatchTypeOf<RawEventInsert>();
    expectTypeOf(insertRawEvent).returns.toMatchTypeOf<Promise<RawEvent>>();

    expectTypeOf(getUnprocessedEvents).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getUnprocessedEvents).returns.toMatchTypeOf<Promise<RawEvent[]>>();

    expectTypeOf(markEventProcessed).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(markEventProcessed).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(markEventProcessed).returns.toMatchTypeOf<Promise<void>>();
  });

  it('extracted memory queries have correct signatures', () => {
    expectTypeOf(insertExtractedMemory).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertExtractedMemory).parameter(1).toMatchTypeOf<ExtractedMemoryInsert>();
    expectTypeOf(insertExtractedMemory).returns.toMatchTypeOf<Promise<ExtractedMemory>>();

    expectTypeOf(getUnconsolidatedMemories).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getUnconsolidatedMemories).returns.toMatchTypeOf<Promise<ExtractedMemory[]>>();

    expectTypeOf(markMemoryConsolidated).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(markMemoryConsolidated).returns.toMatchTypeOf<Promise<void>>();
  });

  it('consolidated memory queries have correct signatures', () => {
    expectTypeOf(insertConsolidatedMemory).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertConsolidatedMemory).parameter(1).toMatchTypeOf<ConsolidatedMemoryInsert>();
    expectTypeOf(insertConsolidatedMemory).returns.toMatchTypeOf<Promise<ConsolidatedMemory>>();

    expectTypeOf(updateConsolidatedMemory).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(updateConsolidatedMemory).returns.toMatchTypeOf<Promise<ConsolidatedMemory>>();
  });

  it('contributor profile queries have correct signatures', () => {
    expectTypeOf(upsertContributorProfile).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(upsertContributorProfile).parameter(1).toMatchTypeOf<ContributorProfileInsert>();
    expectTypeOf(upsertContributorProfile).returns.toMatchTypeOf<Promise<ContributorProfile>>();

    expectTypeOf(getContributorByUsername).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getContributorByUsername).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getContributorByUsername).returns.toMatchTypeOf<
      Promise<ContributorProfile | null>
    >();

    expectTypeOf(incrementInteractionCount).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(incrementInteractionCount).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(incrementInteractionCount).returns.toMatchTypeOf<Promise<void>>();
  });

  it('agent state queries have correct signatures', () => {
    expectTypeOf(upsertAgentState).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(upsertAgentState).parameter(1).toMatchTypeOf<AgentStateUpsert>();
    expectTypeOf(upsertAgentState).returns.toMatchTypeOf<Promise<AgentState>>();

    expectTypeOf(getAgentState).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getAgentState).returns.toMatchTypeOf<Promise<AgentState | null>>();
  });

  it('RPC wrappers have correct signatures', () => {
    expectTypeOf(matchMemories).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(matchMemories).returns.toMatchTypeOf<Promise<MatchMemoryResult[]>>();

    expectTypeOf(recordMemoryAccess).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(recordMemoryAccess).returns.toMatchTypeOf<Promise<void>>();
  });
});
