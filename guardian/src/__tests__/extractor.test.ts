import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawEvent } from '../db/schema.js';
import { FIXTURES } from './fixtures/github-events.js';
import { extractContentText } from '../github/webhooks.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  insertedMemories: [] as Record<string, unknown>[],
  processedEventIds: [] as string[],
  agentStateUpserts: [] as Record<string, unknown>[],
  llmCallCount: 0,
  llmShouldFail: false,
  embeddingShouldFail: false,
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
                    content:
                      'A memory decay algorithm based on Ebbinghaus curves is proposed for memory importance.',
                    memory_type: 'action_item',
                    topics: ['memory-decay', 'ebbinghaus'],
                    entities: ['alice'],
                    importance_score: 0.7,
                    confidence_score: 0.9,
                    source_type: 'stated',
                    emotional_valence: 0.3,
                    emotional_arousal: 0.4,
                  },
                  {
                    content: 'The ai-continuity-framework needs an importance decay mechanism.',
                    memory_type: 'fact',
                    topics: ['memory-decay', 'importance-scoring'],
                    entities: ['ai-continuity-framework'],
                    importance_score: 0.5,
                    confidence_score: 0.8,
                    source_type: 'inferred',
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
    // Return a fake 1536-d vector (just first 5 values for test)
    return Array.from({ length: 1536 }, (_, i) => i * 0.001);
  }),
}));

// -- Mock DB --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../db/queries.js', () => ({
  getUnprocessedEvents: vi.fn(async () => {
    // Return a fixture raw event
    const fixture = FIXTURES.issueOpened;
    const contentText = extractContentText('issues', fixture.payload);
    return [
      {
        id: 'raw-event-001',
        github_event_type: 'issues.opened',
        github_delivery_id: 'delivery-001',
        repo_id: 'leonardrknight/ai-continuity-framework',
        contributor_id: 'contrib-001',
        github_username: 'alice',
        payload: fixture.payload,
        content_text: contentText,
        processed: false,
        processed_at: null,
        created_at: '2026-03-10T10:00:00Z',
        github_created_at: '2026-03-10T10:00:00Z',
      } satisfies RawEvent,
    ];
  }),
  markEventProcessed: vi.fn(async (_client: unknown, eventId: string) => {
    mockState.processedEventIds.push(eventId);
  }),
  insertExtractedMemory: vi.fn(async (_client: unknown, memory: Record<string, unknown>) => {
    mockState.insertedMemories.push(memory);
    return { ...memory, id: `mem-${mockState.insertedMemories.length}` };
  }),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.agentStateUpserts.push(state);
    return state;
  }),
  // Re-export functions used by other test files (webhook tests import these)
  insertRawEvent: vi.fn(),
  upsertContributorProfile: vi.fn(),
  incrementInteractionCount: vi.fn(),
}));

// Import after mocks
import { runExtractor } from '../agents/extractor.js';
import { getUnprocessedEvents } from '../db/queries.js';

describe('Extractor Agent', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.processedEventIds = [];
    mockState.agentStateUpserts = [];
    mockState.llmCallCount = 0;
    mockState.llmShouldFail = false;
    mockState.embeddingShouldFail = false;
  });

  it('extracts memories from an issue event', async () => {
    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.eventsProcessed).toBe(1);
    expect(result.memoriesCreated).toBe(2);
    expect(result.errors).toBe(0);

    // Verify first memory
    const mem1 = mockState.insertedMemories[0];
    expect(mem1.memory_type).toBe('action_item');
    expect(mem1.topics).toContain('memory-decay');
    expect(mem1.source_event_id).toBe('raw-event-001');
    expect(mem1.repo_id).toBe('leonardrknight/ai-continuity-framework');
  });

  it('handles multiple memories per event', async () => {
    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.insertedMemories.length).toBe(2);
    expect(result.memoriesCreated).toBe(2);

    // Second memory should be a fact
    const mem2 = mockState.insertedMemories[1];
    expect(mem2.memory_type).toBe('fact');
    expect(mem2.topics).toContain('importance-scoring');
  });

  it('generates embeddings for each memory', async () => {
    await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    for (const mem of mockState.insertedMemories) {
      expect(mem.content_embedding).toBeDefined();
      expect(Array.isArray(mem.content_embedding)).toBe(true);
      expect((mem.content_embedding as number[]).length).toBe(1536);
    }
  });

  it('stores memory without embedding on embedding failure', async () => {
    mockState.embeddingShouldFail = true;

    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCreated).toBe(2);
    for (const mem of mockState.insertedMemories) {
      expect(mem.content_embedding).toBeNull();
    }
  });

  it('marks events as processed after success', async () => {
    await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.processedEventIds).toContain('raw-event-001');
  });

  it('skips events without content_text', async () => {
    // Override to return an event with no content_text
    vi.mocked(getUnprocessedEvents).mockResolvedValueOnce([
      {
        id: 'raw-event-no-content',
        github_event_type: 'push',
        github_delivery_id: 'delivery-no-content',
        repo_id: 'leonardrknight/ai-continuity-framework',
        contributor_id: 'contrib-001',
        github_username: 'alice',
        payload: {},
        content_text: null,
        processed: false,
        processed_at: null,
        created_at: '2026-03-10T10:00:00Z',
        github_created_at: null,
      },
    ]);

    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.eventsProcessed).toBe(1);
    expect(result.memoriesCreated).toBe(0);
    expect(mockState.processedEventIds).toContain('raw-event-no-content');
    expect(mockState.llmCallCount).toBe(0);
  });

  it('updates agent_state after a run', async () => {
    await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.agentStateUpserts.length).toBe(1);
    const state = mockState.agentStateUpserts[0];
    expect(state.agent_name).toBe('extractor');
    expect(state.repo_id).toBe('leonardrknight/ai-continuity-framework');
    expect(state.items_processed).toBe(1);
    expect(state.last_run_at).toBeDefined();
    expect(state.last_successful_at).toBeDefined();
  });

  it('handles LLM extraction failure gracefully', async () => {
    mockState.llmShouldFail = true;

    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.errors).toBe(1);
    expect(result.eventsProcessed).toBe(0);
    expect(result.memoriesCreated).toBe(0);
    // Event should NOT be marked processed (will retry next run)
    expect(mockState.processedEventIds).not.toContain('raw-event-001');
  });

  it('extracts emotional context when present', async () => {
    await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    // First memory has emotional data
    const mem1 = mockState.insertedMemories[0];
    expect(mem1.emotional_valence).toBe(0.3);
    expect(mem1.emotional_arousal).toBe(0.4);

    // Second memory has null emotional data
    const mem2 = mockState.insertedMemories[1];
    expect(mem2.emotional_valence).toBeNull();
    expect(mem2.emotional_arousal).toBeNull();
  });

  it('returns early when no unprocessed events', async () => {
    vi.mocked(getUnprocessedEvents).mockResolvedValueOnce([]);

    const result = await runExtractor({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.eventsProcessed).toBe(0);
    expect(result.memoriesCreated).toBe(0);
    expect(result.errors).toBe(0);
    // No agent state update when nothing to process
    expect(mockState.agentStateUpserts.length).toBe(0);
  });
});
