import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedMemory, ConsolidatedMemory } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  unconsolidatedMemories: [] as ExtractedMemory[],
  consolidatedMemories: [] as ConsolidatedMemory[],
  insertedConsolidated: [] as Record<string, unknown>[],
  updatedConsolidated: [] as { id: string; updates: Record<string, unknown> }[],
  markedConsolidated: [] as { memoryId: string; consolidatedInto: string }[],
  agentStateUpserts: [] as Record<string, unknown>[],
  llmCallCount: 0,
  llmShouldFail: false,
  insertCounter: 0,
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
              id: 'tool-call-merge-001',
              name: 'merge_memories',
              input: {
                merged_content:
                  'Combined memory: both the existing and new information are preserved.',
                topics: ['memory-decay', 'consolidation'],
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

// -- Mock DB --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../db/queries.js', () => ({
  getUnconsolidatedMemories: vi.fn(async () => {
    return mockState.unconsolidatedMemories;
  }),
  getConsolidatedMemoriesWithEmbeddings: vi.fn(async () => {
    return mockState.consolidatedMemories;
  }),
  markMemoryConsolidated: vi.fn(
    async (_client: unknown, memoryId: string, consolidatedInto: string) => {
      mockState.markedConsolidated.push({ memoryId, consolidatedInto });
    },
  ),
  insertConsolidatedMemory: vi.fn(async (_client: unknown, memory: Record<string, unknown>) => {
    mockState.insertCounter++;
    const id = `consolidated-new-${mockState.insertCounter}`;
    mockState.insertedConsolidated.push({ ...memory, id });
    return { ...memory, id, version: 1, stability: 0.5, tier: 'short' };
  }),
  updateConsolidatedMemory: vi.fn(
    async (_client: unknown, id: string, updates: Record<string, unknown>) => {
      mockState.updatedConsolidated.push({ id, updates });
      return { id, ...updates };
    },
  ),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.agentStateUpserts.push(state);
    return state;
  }),
}));

// Import after mocks
import { runConsolidator, cosineSimilarity } from '../agents/consolidator.js';

// -- Test helpers --

/** Create a fake 1536-d embedding with a specific "direction" controlled by the seed. */
function makeEmbedding(seed: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => Math.sin(seed + i * 0.01));
}

/** Create a very similar embedding (high cosine similarity). */
function makeSimilarEmbedding(base: number[], noise: number): number[] {
  return base.map((v) => v + noise * 0.001);
}

function makeExtractedMemory(overrides: Partial<ExtractedMemory> = {}): ExtractedMemory {
  return {
    id: 'ext-001',
    source_event_id: 'event-001',
    source_message_id: null,
    contributor_id: 'contrib-001',
    user_id: null,
    repo_id: 'leonardrknight/ai-continuity-framework',
    content: 'Memory decay uses Ebbinghaus curves for importance scoring.',
    content_embedding: makeEmbedding(1),
    memory_type: 'fact',
    topics: ['memory-decay'],
    entities: ['ebbinghaus'],
    importance_score: 0.7,
    confidence_score: 0.9,
    source_type: 'stated',
    source_channel: 'github',
    emotional_valence: null,
    emotional_arousal: null,
    access_count: 0,
    last_accessed_at: null,
    consolidated: false,
    consolidated_into: null,
    created_at: '2026-03-10T10:00:00Z',
    ...overrides,
  };
}

function makeConsolidatedMemory(overrides: Partial<ConsolidatedMemory> = {}): ConsolidatedMemory {
  return {
    id: 'cons-001',
    repo_id: 'leonardrknight/ai-continuity-framework',
    contributor_id: 'contrib-001',
    user_id: null,
    content: 'Memory decay uses Ebbinghaus curves.',
    content_embedding: makeEmbedding(1),
    memory_type: 'fact',
    topics: ['memory-decay'],
    importance_score: 0.6,
    stability: 0.5,
    related_memories: null,
    source_memories: ['ext-prev-001'],
    source_channel: 'github',
    tier: 'short',
    access_count: 0,
    last_accessed_at: null,
    version: 1,
    created_at: '2026-03-09T10:00:00Z',
    updated_at: '2026-03-09T10:00:00Z',
    ...overrides,
  };
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });
});

describe('Consolidator Agent', () => {
  beforeEach(() => {
    mockState.unconsolidatedMemories = [];
    mockState.consolidatedMemories = [];
    mockState.insertedConsolidated = [];
    mockState.updatedConsolidated = [];
    mockState.markedConsolidated = [];
    mockState.agentStateUpserts = [];
    mockState.llmCallCount = 0;
    mockState.llmShouldFail = false;
    mockState.insertCounter = 0;
  });

  it('returns early when no unconsolidated memories exist', async () => {
    mockState.unconsolidatedMemories = [];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesProcessed).toBe(0);
    expect(result.memoriesMerged).toBe(0);
    expect(result.memoriesLinked).toBe(0);
    expect(result.memoriesCreated).toBe(0);
    expect(result.errors).toBe(0);
    // No agent state update when nothing to process
    expect(mockState.agentStateUpserts.length).toBe(0);
  });

  it('creates new consolidated memory when no existing memories to compare', async () => {
    const extracted = makeExtractedMemory();
    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesProcessed).toBe(1);
    expect(result.memoriesCreated).toBe(1);
    expect(result.memoriesMerged).toBe(0);
    expect(result.memoriesLinked).toBe(0);

    // Verify a consolidated memory was inserted
    expect(mockState.insertedConsolidated.length).toBe(1);
    const inserted = mockState.insertedConsolidated[0];
    expect(inserted.content).toBe(extracted.content);
    expect(inserted.source_memories).toEqual([extracted.id]);

    // Verify extracted memory was marked consolidated
    expect(mockState.markedConsolidated.length).toBe(1);
    expect(mockState.markedConsolidated[0].memoryId).toBe(extracted.id);
  });

  it('merges duplicate memories (>0.92 similarity) via LLM', async () => {
    const baseEmbedding = makeEmbedding(1);
    const nearDuplicateEmbedding = makeSimilarEmbedding(baseEmbedding, 0.5);

    // Verify they are indeed very similar
    const sim = cosineSimilarity(baseEmbedding, nearDuplicateEmbedding);
    expect(sim).toBeGreaterThan(DUPLICATE_THRESHOLD);

    const existing = makeConsolidatedMemory({
      content_embedding: baseEmbedding,
      importance_score: 0.6,
    });
    const extracted = makeExtractedMemory({
      content_embedding: nearDuplicateEmbedding,
      importance_score: 0.7,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesMerged).toBe(1);
    expect(result.memoriesProcessed).toBe(1);
    expect(mockState.llmCallCount).toBe(1);

    // Verify the existing consolidated memory was updated
    expect(mockState.updatedConsolidated.length).toBe(1);
    const update = mockState.updatedConsolidated[0];
    expect(update.id).toBe(existing.id);
    expect(update.updates.content).toBe(
      'Combined memory: both the existing and new information are preserved.',
    );

    // Verify extracted memory was marked consolidated into the existing one
    expect(mockState.markedConsolidated[0].consolidatedInto).toBe(existing.id);
  });

  it('boosts importance by 10% on merge (takes higher, capped at 1.0)', async () => {
    const baseEmbedding = makeEmbedding(1);
    const nearDuplicateEmbedding = makeSimilarEmbedding(baseEmbedding, 0.5);

    const existing = makeConsolidatedMemory({
      content_embedding: baseEmbedding,
      importance_score: 0.6,
    });
    const extracted = makeExtractedMemory({
      content_embedding: nearDuplicateEmbedding,
      importance_score: 0.7,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    const update = mockState.updatedConsolidated[0];
    // Higher is 0.7, boosted by 10% = 0.77
    expect(update.updates.importance_score).toBeCloseTo(0.77, 2);
  });

  it('caps boosted importance at 1.0', async () => {
    const baseEmbedding = makeEmbedding(1);
    const nearDuplicateEmbedding = makeSimilarEmbedding(baseEmbedding, 0.5);

    const existing = makeConsolidatedMemory({
      content_embedding: baseEmbedding,
      importance_score: 0.95,
    });
    const extracted = makeExtractedMemory({
      content_embedding: nearDuplicateEmbedding,
      importance_score: 0.98,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    const update = mockState.updatedConsolidated[0];
    // 0.98 * 1.1 = 1.078, capped at 1.0
    expect(update.updates.importance_score).toBe(1.0);
  });

  it('links related memories (0.75-0.92 similarity)', async () => {
    // Create embeddings that are similar but not duplicate
    const baseEmbedding = makeEmbedding(1);
    // Add more noise to push similarity into the 0.75-0.92 range
    const relatedEmbedding = baseEmbedding.map((v, i) => v + Math.sin(i * 0.5) * 0.6);

    const sim = cosineSimilarity(baseEmbedding, relatedEmbedding);
    // Verify similarity is in the related range
    expect(sim).toBeGreaterThanOrEqual(RELATED_THRESHOLD);
    expect(sim).toBeLessThan(DUPLICATE_THRESHOLD);

    const existing = makeConsolidatedMemory({ content_embedding: baseEmbedding });
    const extracted = makeExtractedMemory({
      id: 'ext-related',
      content_embedding: relatedEmbedding,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesLinked).toBe(1);
    expect(result.memoriesProcessed).toBe(1);

    // A new consolidated memory is created for the extracted content
    expect(mockState.insertedConsolidated.length).toBe(1);

    // The existing consolidated memory's related_memories is updated
    const relatedUpdate = mockState.updatedConsolidated.find((u) => u.id === existing.id);
    expect(relatedUpdate).toBeDefined();
    expect(relatedUpdate!.updates.related_memories).toBeDefined();
    const relatedIds = relatedUpdate!.updates.related_memories as string[];
    expect(relatedIds.length).toBe(1);

    // No LLM call for linking (only merging uses LLM)
    expect(mockState.llmCallCount).toBe(0);
  });

  it('creates new consolidated memory for novel content (<0.75 similarity)', async () => {
    // Create very different embeddings
    const baseEmbedding = makeEmbedding(1);
    const differentEmbedding = makeEmbedding(100);

    const sim = cosineSimilarity(baseEmbedding, differentEmbedding);
    expect(sim).toBeLessThan(RELATED_THRESHOLD);

    const existing = makeConsolidatedMemory({ content_embedding: baseEmbedding });
    const extracted = makeExtractedMemory({
      id: 'ext-novel',
      content: 'Completely different topic about agent architecture.',
      content_embedding: differentEmbedding,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCreated).toBe(1);
    expect(result.memoriesProcessed).toBe(1);
    expect(result.memoriesMerged).toBe(0);
    expect(result.memoriesLinked).toBe(0);

    // New consolidated memory inserted
    expect(mockState.insertedConsolidated.length).toBe(1);
    expect(mockState.insertedConsolidated[0].content).toBe(
      'Completely different topic about agent architecture.',
    );
  });

  it('handles LLM merge failures gracefully (leaves unconsolidated for retry)', async () => {
    mockState.llmShouldFail = true;

    const baseEmbedding = makeEmbedding(1);
    const nearDuplicateEmbedding = makeSimilarEmbedding(baseEmbedding, 0.5);

    const existing = makeConsolidatedMemory({ content_embedding: baseEmbedding });
    const extracted = makeExtractedMemory({
      content_embedding: nearDuplicateEmbedding,
    });

    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [existing];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.errors).toBe(1);
    expect(result.memoriesMerged).toBe(0);
    // Memory should NOT be marked consolidated
    expect(mockState.markedConsolidated.length).toBe(0);
  });

  it('updates agent_state after a run', async () => {
    const extracted = makeExtractedMemory();
    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [];

    await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.agentStateUpserts.length).toBe(1);
    const state = mockState.agentStateUpserts[0];
    expect(state.agent_name).toBe('consolidator');
    expect(state.repo_id).toBe('leonardrknight/ai-continuity-framework');
    expect(state.items_processed).toBe(1);
    expect(state.last_run_at).toBeDefined();
    expect(state.last_successful_at).toBeDefined();
  });

  it('creates new consolidated entries for memories without embeddings', async () => {
    const extracted = makeExtractedMemory({
      id: 'ext-no-embedding',
      content_embedding: null,
    });
    mockState.unconsolidatedMemories = [extracted];
    mockState.consolidatedMemories = [makeConsolidatedMemory()];

    const result = await runConsolidator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCreated).toBe(1);
    expect(result.memoriesProcessed).toBe(1);
    expect(result.memoriesMerged).toBe(0);
    expect(result.memoriesLinked).toBe(0);

    // Should have inserted a new consolidated memory
    expect(mockState.insertedConsolidated.length).toBe(1);
    expect(mockState.insertedConsolidated[0].content_embedding).toBeNull();
  });
});

// Threshold constants used in assertions
const DUPLICATE_THRESHOLD = 0.92;
const RELATED_THRESHOLD = 0.75;
