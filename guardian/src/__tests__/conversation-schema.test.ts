import { describe, it, expect, expectTypeOf } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  UserProfileInsert,
  Conversation,
  ConversationInsert,
  Message,
  MessageInsert,
  ExtractedMemory,
  ExtractedMemoryInsert,
  ConsolidatedMemory,
  ConsolidatedMemoryInsert,
  AgentName,
  SourceChannel,
  MessageRole,
  ConversationStatus,
} from '../db/schema.js';
import {
  insertUserProfile,
  getUserProfileByAuthId,
  getUserProfileById,
  insertConversation,
  getConversationsByUser,
  getConversationById,
  insertMessage,
  getMessagesByConversation,
  getUnprocessedMessages,
  markMessageProcessed,
  updateConversationMessageCount,
  matchMemories,
} from '../db/queries.js';

// =================================================================
// Schema types — conversation tables
// =================================================================

describe('Conversation schema types', () => {
  it('UserProfile has all required fields', () => {
    expectTypeOf<UserProfile>().toHaveProperty('id');
    expectTypeOf<UserProfile>().toHaveProperty('supabase_auth_id');
    expectTypeOf<UserProfile>().toHaveProperty('email');
    expectTypeOf<UserProfile>().toHaveProperty('display_name');
    expectTypeOf<UserProfile>().toHaveProperty('github_contributor_id');
    expectTypeOf<UserProfile>().toHaveProperty('first_seen_at');
    expectTypeOf<UserProfile>().toHaveProperty('last_seen_at');
    expectTypeOf<UserProfile>().toHaveProperty('interaction_count');
    expectTypeOf<UserProfile>().toHaveProperty('summary');
    expectTypeOf<UserProfile>().toHaveProperty('interests');
    expectTypeOf<UserProfile>().toHaveProperty('communication_style');
    expectTypeOf<UserProfile>().toHaveProperty('created_at');
    expectTypeOf<UserProfile>().toHaveProperty('updated_at');
  });

  it('Conversation has all required fields', () => {
    expectTypeOf<Conversation>().toHaveProperty('id');
    expectTypeOf<Conversation>().toHaveProperty('user_id');
    expectTypeOf<Conversation>().toHaveProperty('title');
    expectTypeOf<Conversation>().toHaveProperty('status');
    expectTypeOf<Conversation>().toHaveProperty('message_count');
    expectTypeOf<Conversation>().toHaveProperty('created_at');
    expectTypeOf<Conversation>().toHaveProperty('updated_at');
  });

  it('Message has all required fields', () => {
    expectTypeOf<Message>().toHaveProperty('id');
    expectTypeOf<Message>().toHaveProperty('conversation_id');
    expectTypeOf<Message>().toHaveProperty('user_id');
    expectTypeOf<Message>().toHaveProperty('role');
    expectTypeOf<Message>().toHaveProperty('content');
    expectTypeOf<Message>().toHaveProperty('processed');
    expectTypeOf<Message>().toHaveProperty('processed_at');
    expectTypeOf<Message>().toHaveProperty('created_at');
  });

  it('ConversationStatus accepts valid values', () => {
    const statuses: ConversationStatus[] = ['active', 'archived'];
    expect(statuses).toHaveLength(2);
  });

  it('MessageRole accepts valid values', () => {
    const roles: MessageRole[] = ['user', 'assistant', 'system'];
    expect(roles).toHaveLength(3);
  });

  it('SourceChannel accepts valid values', () => {
    const channels: SourceChannel[] = ['github', 'conversation'];
    expect(channels).toHaveLength(2);
  });

  it('AgentName includes scribe', () => {
    const agents: AgentName[] = ['extractor', 'consolidator', 'retriever', 'curator', 'scribe'];
    expect(agents).toHaveLength(5);
    expect(agents).toContain('scribe');
  });
});

// =================================================================
// Extended fields on existing types
// =================================================================

describe('Extended memory fields', () => {
  it('ExtractedMemory includes source_message_id', () => {
    expectTypeOf<ExtractedMemory>().toHaveProperty('source_message_id');
  });

  it('ExtractedMemory includes user_id', () => {
    expectTypeOf<ExtractedMemory>().toHaveProperty('user_id');
  });

  it('ExtractedMemory includes source_channel', () => {
    expectTypeOf<ExtractedMemory>().toHaveProperty('source_channel');
  });

  it('ExtractedMemory source_event_id is nullable', () => {
    // source_event_id is now nullable (for conversation-sourced memories)
    expectTypeOf<ExtractedMemory['source_event_id']>().toEqualTypeOf<string | null>();
  });

  it('ConsolidatedMemory includes user_id', () => {
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('user_id');
  });

  it('ConsolidatedMemory includes source_channel', () => {
    expectTypeOf<ConsolidatedMemory>().toHaveProperty('source_channel');
  });

  it('ExtractedMemoryInsert allows conversation-sourced memory (no source_event_id)', () => {
    // Can insert with source_message_id instead of source_event_id
    const insert: ExtractedMemoryInsert = {
      repo_id: 'owner/repo',
      content: 'User prefers dark mode',
      memory_type: 'preference',
      source_message_id: 'msg-uuid',
      source_channel: 'conversation',
      user_id: 'user-uuid',
    };
    expect(insert.source_message_id).toBe('msg-uuid');
    expect(insert.source_channel).toBe('conversation');
    expect(insert.source_event_id).toBeUndefined();
  });

  it('ExtractedMemoryInsert still works with source_event_id (backward compat)', () => {
    const insert: ExtractedMemoryInsert = {
      source_event_id: 'event-uuid',
      repo_id: 'owner/repo',
      content: 'A fact from GitHub',
      memory_type: 'fact',
    };
    expect(insert.source_event_id).toBe('event-uuid');
  });

  it('ConsolidatedMemoryInsert accepts user_id and source_channel', () => {
    const insert: ConsolidatedMemoryInsert = {
      repo_id: 'owner/repo',
      content: 'Consolidated preference',
      memory_type: 'preference',
      importance_score: 0.7,
      user_id: 'user-uuid',
      source_channel: 'conversation',
    };
    expect(insert.user_id).toBe('user-uuid');
    expect(insert.source_channel).toBe('conversation');
  });
});

// =================================================================
// Insert types — conversation tables
// =================================================================

describe('Conversation insert types', () => {
  it('UserProfileInsert has all fields optional', () => {
    // All fields on UserProfileInsert are optional (server generates id, timestamps)
    const insert: UserProfileInsert = {};
    expect(insert).toBeDefined();
  });

  it('UserProfileInsert accepts optional fields', () => {
    const insert: UserProfileInsert = {
      supabase_auth_id: 'auth-uuid',
      email: 'test@example.com',
      display_name: 'Test User',
      github_contributor_id: 'contrib-uuid',
      summary: 'Active user',
      interests: ['ai', 'memory'],
      communication_style: 'casual',
    };
    expect(insert.email).toBe('test@example.com');
  });

  it('ConversationInsert requires user_id', () => {
    const insert: ConversationInsert = {
      user_id: 'user-uuid',
    };
    expect(insert.user_id).toBe('user-uuid');
  });

  it('ConversationInsert accepts optional title and status', () => {
    const insert: ConversationInsert = {
      user_id: 'user-uuid',
      title: 'Help with project setup',
      status: 'active',
    };
    expect(insert.title).toBe('Help with project setup');
  });

  it('MessageInsert requires conversation_id, user_id, role, content', () => {
    const insert: MessageInsert = {
      conversation_id: 'conv-uuid',
      user_id: 'user-uuid',
      role: 'user',
      content: 'How do I set up the project?',
    };
    expect(insert.role).toBe('user');
    expect(insert.content).toBe('How do I set up the project?');
  });
});

// =================================================================
// Query helper signatures — conversation tables
// =================================================================

describe('Conversation query helper signatures', () => {
  it('user profile queries have correct signatures', () => {
    expectTypeOf(insertUserProfile).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertUserProfile).parameter(1).toMatchTypeOf<UserProfileInsert>();
    expectTypeOf(insertUserProfile).returns.toMatchTypeOf<Promise<UserProfile>>();

    expectTypeOf(getUserProfileByAuthId).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getUserProfileByAuthId).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getUserProfileByAuthId).returns.toMatchTypeOf<Promise<UserProfile | null>>();

    expectTypeOf(getUserProfileById).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getUserProfileById).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getUserProfileById).returns.toMatchTypeOf<Promise<UserProfile | null>>();
  });

  it('conversation queries have correct signatures', () => {
    expectTypeOf(insertConversation).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertConversation).parameter(1).toMatchTypeOf<ConversationInsert>();
    expectTypeOf(insertConversation).returns.toMatchTypeOf<Promise<Conversation>>();

    expectTypeOf(getConversationsByUser).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getConversationsByUser).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getConversationsByUser).returns.toMatchTypeOf<Promise<Conversation[]>>();

    expectTypeOf(getConversationById).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getConversationById).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getConversationById).returns.toMatchTypeOf<Promise<Conversation | null>>();
  });

  it('message queries have correct signatures', () => {
    expectTypeOf(insertMessage).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(insertMessage).parameter(1).toMatchTypeOf<MessageInsert>();
    expectTypeOf(insertMessage).returns.toMatchTypeOf<Promise<Message>>();

    expectTypeOf(getMessagesByConversation).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getMessagesByConversation).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(getMessagesByConversation).returns.toMatchTypeOf<Promise<Message[]>>();

    expectTypeOf(getUnprocessedMessages).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(getUnprocessedMessages).returns.toMatchTypeOf<Promise<Message[]>>();

    expectTypeOf(markMessageProcessed).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(markMessageProcessed).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(markMessageProcessed).returns.toMatchTypeOf<Promise<void>>();
  });

  it('updateConversationMessageCount has correct signature', () => {
    expectTypeOf(updateConversationMessageCount).parameter(0).toMatchTypeOf<SupabaseClient>();
    expectTypeOf(updateConversationMessageCount).parameter(1).toMatchTypeOf<string>();
    expectTypeOf(updateConversationMessageCount).returns.toMatchTypeOf<Promise<void>>();
  });

  it('matchMemories accepts optional filter_user_id', () => {
    expectTypeOf(matchMemories).parameter(0).toMatchTypeOf<SupabaseClient>();
    // Verify the params type accepts filter_user_id
    type MatchParams = Parameters<typeof matchMemories>[1];
    expectTypeOf<MatchParams>().toHaveProperty('filter_user_id');
  });
});
