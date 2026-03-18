import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Message } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  insertedMemories: [] as Record<string, unknown>[],
  processedMessageIds: [] as string[],
  agentStateUpserts: [] as Record<string, unknown>[],
  llmCallCount: 0,
  llmShouldFail: false,
  embeddingShouldFail: false,
  unprocessedMessages: [] as Message[],
  conversationMessages: [] as Message[],
}));

// -- Mock LLM client --

vi.mock('../llm/client.js', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn(async () => {
        mockState.llmCallCount++;
        if (mockState.llmShouldFail) {
          throw new Error('LLM API error');
        }
        return {
          content: [
            {
              type: 'tool_use',
              id: 'tool-call-001',
              name: 'extract_memories',
              input: {
                memories: [
                  {
                    content: 'User prefers dark mode for all their applications.',
                    memory_type: 'preference',
                    topics: ['personal-preference', 'ui-settings'],
                    entities: ['user-001'],
                    importance_score: 0.5,
                    confidence_score: 0.9,
                    source_type: 'stated',
                    emotional_valence: 0.2,
                    emotional_arousal: 0.1,
                  },
                  {
                    content:
                      'User decided to migrate their project to TypeScript for better type safety.',
                    memory_type: 'decision',
                    topics: ['project-migration', 'typescript'],
                    entities: ['user-001', 'typescript'],
                    importance_score: 0.7,
                    confidence_score: 0.85,
                    source_type: 'stated',
                    emotional_valence: null,
                    emotional_arousal: null,
                  },
                ],
              },
            },
          ],
        };
      }),
    },
  })),
  getOpenAIClient: vi.fn(),
  resetLLMClients: vi.fn(),
}));

// -- Mock embeddings --

vi.mock('../llm/embeddings.js', () => ({
  generateEmbedding: vi.fn(async () => {
    if (mockState.embeddingShouldFail) {
      return null;
    }
    return Array.from({ length: 1536 }, (_, i) => i * 0.001);
  }),
}));

// -- Mock DB --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../db/queries.js', () => ({
  getUnprocessedMessages: vi.fn(async () => mockState.unprocessedMessages),
  getMessagesByConversation: vi.fn(async () => mockState.conversationMessages),
  markMessageProcessed: vi.fn(async (_client: unknown, messageId: string) => {
    mockState.processedMessageIds.push(messageId);
  }),
  insertExtractedMemory: vi.fn(async (_client: unknown, memory: Record<string, unknown>) => {
    mockState.insertedMemories.push(memory);
    return { ...memory, id: `mem-${mockState.insertedMemories.length}` };
  }),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.agentStateUpserts.push(state);
    return state;
  }),
  getAgentState: vi.fn(async () => null),
  getThreadsForConversation: vi.fn(async () => []),
  saveThreads: vi.fn(async () => {}),
}));

// Import after mocks
import { runScribe } from '../agents/scribe.js';
import { getUnprocessedMessages } from '../db/queries.js';

// -- Fixtures --

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-001',
    conversation_id: 'conv-001',
    user_id: 'user-001',
    role: 'user',
    content: 'I really prefer dark mode in all my apps. Also, I decided to migrate to TypeScript.',
    processed: false,
    processed_at: null,
    created_at: '2026-03-15T10:00:00Z',
    ...overrides,
  };
}

const REPO_ID = 'leonardrknight/ai-continuity-framework';

describe('Scribe Agent', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.processedMessageIds = [];
    mockState.agentStateUpserts = [];
    mockState.llmCallCount = 0;
    mockState.llmShouldFail = false;
    mockState.embeddingShouldFail = false;
    mockState.unprocessedMessages = [makeMessage()];
    mockState.conversationMessages = [makeMessage()];
  });

  it('extracts memories from conversation messages', async () => {
    const result = await runScribe({} as never, REPO_ID);

    expect(result.messagesProcessed).toBe(1);
    expect(result.memoriesCreated).toBe(2);
    expect(result.errors).toBe(0);

    const mem1 = mockState.insertedMemories[0];
    expect(mem1.memory_type).toBe('preference');
    expect(mem1.topics).toContain('personal-preference');
    expect(mem1.content).toContain('dark mode');
  });

  it('sets source_message_id (not source_event_id) on extracted memories', async () => {
    await runScribe({} as never, REPO_ID);

    for (const mem of mockState.insertedMemories) {
      expect(mem.source_message_id).toBe('msg-001');
      expect(mem).not.toHaveProperty('source_event_id');
    }
  });

  it('sets user_id on extracted memories', async () => {
    await runScribe({} as never, REPO_ID);

    for (const mem of mockState.insertedMemories) {
      expect(mem.user_id).toBe('user-001');
    }
  });

  it('sets source_channel to conversation', async () => {
    await runScribe({} as never, REPO_ID);

    for (const mem of mockState.insertedMemories) {
      expect(mem.source_channel).toBe('conversation');
    }
  });

  it('groups messages by conversation and processes each batch', async () => {
    mockState.unprocessedMessages = [
      makeMessage({ id: 'msg-001', conversation_id: 'conv-001' }),
      makeMessage({ id: 'msg-002', conversation_id: 'conv-001' }),
      makeMessage({ id: 'msg-003', conversation_id: 'conv-002' }),
    ];
    mockState.conversationMessages = [
      makeMessage({ id: 'msg-001', conversation_id: 'conv-001' }),
      makeMessage({ id: 'msg-002', conversation_id: 'conv-001' }),
    ];

    const result = await runScribe({} as never, REPO_ID);

    // Two conversations processed = 2 LLM calls
    expect(mockState.llmCallCount).toBe(2);
    expect(result.messagesProcessed).toBe(3);
    // 2 memories per LLM call x 2 conversations = 4
    expect(result.memoriesCreated).toBe(4);
  });

  it('generates embeddings for each memory', async () => {
    await runScribe({} as never, REPO_ID);

    for (const mem of mockState.insertedMemories) {
      expect(mem.content_embedding).toBeDefined();
      expect(Array.isArray(mem.content_embedding)).toBe(true);
      expect((mem.content_embedding as number[]).length).toBe(1536);
    }
  });

  it('stores without embedding on embedding failure', async () => {
    mockState.embeddingShouldFail = true;

    const result = await runScribe({} as never, REPO_ID);

    expect(result.memoriesCreated).toBe(2);
    for (const mem of mockState.insertedMemories) {
      expect(mem.content_embedding).toBeNull();
    }
  });

  it('marks messages as processed', async () => {
    mockState.unprocessedMessages = [
      makeMessage({ id: 'msg-001' }),
      makeMessage({ id: 'msg-002' }),
    ];

    await runScribe({} as never, REPO_ID);

    expect(mockState.processedMessageIds).toContain('msg-001');
    expect(mockState.processedMessageIds).toContain('msg-002');
  });

  it('processes both user and assistant messages', async () => {
    mockState.unprocessedMessages = [
      makeMessage({ id: 'msg-user', role: 'user', content: 'I prefer dark mode.' }),
      makeMessage({
        id: 'msg-assistant',
        role: 'assistant',
        content: 'I will remember your dark mode preference.',
      }),
    ];

    const result = await runScribe({} as never, REPO_ID);

    // Both messages should be processed (grouped by conversation, sent together)
    expect(result.messagesProcessed).toBe(2);
    expect(mockState.processedMessageIds).toContain('msg-user');
    expect(mockState.processedMessageIds).toContain('msg-assistant');
  });

  it('updates agent_state with scribe stats', async () => {
    await runScribe({} as never, REPO_ID);

    expect(mockState.agentStateUpserts.length).toBe(1);
    const state = mockState.agentStateUpserts[0];
    expect(state.agent_name).toBe('scribe');
    expect(state.repo_id).toBe(REPO_ID);
    expect(state.items_processed).toBe(1);
    expect(state.last_run_at).toBeDefined();
    expect(state.last_successful_at).toBeDefined();
    const metadata = state.metadata as Record<string, unknown>;
    expect(metadata.last_run_memories_created).toBe(2);
    expect(metadata.last_run_messages_processed).toBe(1);
    expect(metadata.last_run_errors).toBe(0);
  });

  it('returns early when no unprocessed messages', async () => {
    vi.mocked(getUnprocessedMessages).mockResolvedValueOnce([]);

    const result = await runScribe({} as never, REPO_ID);

    expect(result.messagesProcessed).toBe(0);
    expect(result.memoriesCreated).toBe(0);
    expect(result.errors).toBe(0);
    expect(mockState.agentStateUpserts.length).toBe(0);
  });

  it('handles LLM extraction failure gracefully', async () => {
    mockState.llmShouldFail = true;

    const result = await runScribe({} as never, REPO_ID);

    expect(result.errors).toBe(1);
    expect(result.messagesProcessed).toBe(0);
    expect(result.memoriesCreated).toBe(0);
    // Messages should NOT be marked processed (will retry next run)
    expect(mockState.processedMessageIds).not.toContain('msg-001');
  });

  it('extracts emotional context (valence + arousal)', async () => {
    await runScribe({} as never, REPO_ID);

    // First memory has emotional data
    const mem1 = mockState.insertedMemories[0];
    expect(mem1.emotional_valence).toBe(0.2);
    expect(mem1.emotional_arousal).toBe(0.1);

    // Second memory has null emotional data
    const mem2 = mockState.insertedMemories[1];
    expect(mem2.emotional_valence).toBeNull();
    expect(mem2.emotional_arousal).toBeNull();
  });
});
