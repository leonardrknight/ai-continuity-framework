import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MatchMemoryResult, ContributorProfile } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  matchMemoriesResults: [] as MatchMemoryResult[],
  matchMemoriesShouldFail: false,
  embeddingResult: null as number[] | null,
  embeddingShouldThrow: false,
  contributorProfile: null as ContributorProfile | null,
  contributorShouldFail: false,
  accessedMemoryIds: [] as string[][],
  accessShouldFail: false,
}));

// -- Mock embeddings --

vi.mock('../llm/embeddings.js', () => ({
  generateEmbedding: vi.fn(async () => {
    if (mockState.embeddingShouldThrow) {
      throw new Error('Embedding API error');
    }
    return mockState.embeddingResult;
  }),
}));

// -- Mock DB --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../db/queries.js', () => ({
  matchMemories: vi.fn(async () => {
    if (mockState.matchMemoriesShouldFail) {
      throw new Error('Database error');
    }
    return mockState.matchMemoriesResults;
  }),
  recordMemoryAccess: vi.fn(async (_client: unknown, memoryIds: string[]) => {
    if (mockState.accessShouldFail) {
      throw new Error('Access record error');
    }
    mockState.accessedMemoryIds.push(memoryIds);
  }),
  getContributorById: vi.fn(async () => {
    if (mockState.contributorShouldFail) {
      throw new Error('Contributor fetch error');
    }
    return mockState.contributorProfile;
  }),
}));

// Import after mocks
import { runRetriever, recencyDecay, rerankWithAge } from '../agents/retriever.js';
import { matchMemories } from '../db/queries.js';

// -- Test helpers --

function makeMatchResult(overrides: Partial<MatchMemoryResult> = {}): MatchMemoryResult {
  return {
    id: 'mem-001',
    content: 'Memory decay uses Ebbinghaus curves for importance scoring.',
    memory_type: 'fact',
    topics: ['memory-decay'],
    importance_score: 0.7,
    semantic_score: 0.85,
    keyword_score: 0.5,
    combined_score: 0.72,
    ...overrides,
  };
}

function makeContributorProfile(overrides: Partial<ContributorProfile> = {}): ContributorProfile {
  return {
    id: 'contrib-001',
    github_username: 'alice',
    github_id: 12345,
    display_name: 'Alice Smith',
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-16T00:00:00Z',
    interaction_count: 42,
    summary: 'Experienced contributor focused on memory architecture.',
    interests: ['AI', 'memory-systems'],
    expertise: ['TypeScript', 'distributed-systems'],
    communication_style: 'concise and technical',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
    ...overrides,
  };
}

const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);

describe('recencyDecay', () => {
  it('returns 1.0 for zero age (today)', () => {
    expect(recencyDecay(0)).toBe(1.0);
  });

  it('returns ~0.717 for 10-day-old memory', () => {
    expect(recencyDecay(10)).toBeCloseTo(Math.exp(-10 / 30), 5);
  });

  it('returns ~0.368 for 30-day-old memory (one half-life)', () => {
    expect(recencyDecay(30)).toBeCloseTo(Math.exp(-1), 5);
  });

  it('returns small value for very old memories', () => {
    expect(recencyDecay(90)).toBeCloseTo(Math.exp(-3), 5);
    expect(recencyDecay(90)).toBeLessThan(0.1);
  });

  it('decays monotonically — older memories score lower', () => {
    const scores = [0, 5, 10, 30, 60, 90].map(recencyDecay);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });
});

describe('rerankWithAge', () => {
  it('applies recency decay to re-ranking formula', () => {
    const candidates = [
      makeMatchResult({
        id: 'old',
        semantic_score: 0.8,
        importance_score: 0.9,
      }),
      makeMatchResult({
        id: 'new',
        semantic_score: 0.8,
        importance_score: 0.9,
      }),
    ];

    const result = rerankWithAge([
      { ...candidates[0], age_days: 60 },
      { ...candidates[1], age_days: 1 },
    ]);

    // Both have same semantic + importance, but 'new' has better recency
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('old');
    expect(result[0].recency_score).toBeGreaterThan(result[1].recency_score);
  });

  it('computes correct final score with the formula', () => {
    const candidate = makeMatchResult({
      semantic_score: 0.9,
      importance_score: 0.8,
    });

    const result = rerankWithAge([{ ...candidate, age_days: 0 }]);

    // final_score = 0.50 * 0.9 + 0.30 * 0.8 + 0.20 * 1.0
    // = 0.45 + 0.24 + 0.20 = 0.89
    expect(result[0].final_score).toBeCloseTo(0.89, 5);
  });

  it('ranks by combined score, not just semantic similarity', () => {
    const candidates = [
      makeMatchResult({
        id: 'high-semantic',
        semantic_score: 0.95,
        importance_score: 0.2,
      }),
      makeMatchResult({
        id: 'balanced',
        semantic_score: 0.7,
        importance_score: 0.9,
      }),
    ];

    const result = rerankWithAge([
      { ...candidates[0], age_days: 0 },
      { ...candidates[1], age_days: 0 },
    ]);

    // high-semantic: 0.50*0.95 + 0.30*0.2 + 0.20*1.0 = 0.475 + 0.06 + 0.20 = 0.735
    // balanced:      0.50*0.70 + 0.30*0.9 + 0.20*1.0 = 0.35  + 0.27 + 0.20 = 0.82
    expect(result[0].id).toBe('balanced');
    expect(result[1].id).toBe('high-semantic');
  });
});

describe('Retriever Agent', () => {
  beforeEach(() => {
    mockState.matchMemoriesResults = [];
    mockState.matchMemoriesShouldFail = false;
    mockState.embeddingResult = fakeEmbedding;
    mockState.embeddingShouldThrow = false;
    mockState.contributorProfile = null;
    mockState.contributorShouldFail = false;
    mockState.accessedMemoryIds = [];
    mockState.accessShouldFail = false;
  });

  it('retrieves and re-ranks memories for a query', async () => {
    mockState.matchMemoriesResults = [
      makeMatchResult({ id: 'mem-1', semantic_score: 0.9, importance_score: 0.5 }),
      makeMatchResult({ id: 'mem-2', semantic_score: 0.7, importance_score: 0.9 }),
      makeMatchResult({ id: 'mem-3', semantic_score: 0.6, importance_score: 0.3 }),
    ];

    const result = await runRetriever(
      {} as never,
      'How does memory decay work?',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.memories.length).toBe(3);
    expect(result.degradation).toBe('full');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('two-stage ranking order is correct (re-ranked by combined score)', async () => {
    // mem-1 has higher semantic but lower importance
    // mem-2 has lower semantic but higher importance
    mockState.matchMemoriesResults = [
      makeMatchResult({ id: 'mem-1', semantic_score: 0.95, importance_score: 0.2 }),
      makeMatchResult({ id: 'mem-2', semantic_score: 0.7, importance_score: 0.9 }),
    ];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    // mem-2 should rank higher due to importance weight
    // mem-1: 0.50*0.95 + 0.30*0.2 + 0.20*1.0 = 0.735
    // mem-2: 0.50*0.70 + 0.30*0.9 + 0.20*1.0 = 0.82
    expect(result.memories[0].id).toBe('mem-2');
    expect(result.memories[1].id).toBe('mem-1');
  });

  it('loads contributor profile and includes it in context block', async () => {
    const profile = makeContributorProfile();
    mockState.contributorProfile = profile;
    mockState.matchMemoriesResults = [makeMatchResult()];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
      undefined,
      'contrib-001',
    );

    expect(result.contributorProfile).toBeDefined();
    expect(result.contributorProfile?.github_username).toBe('alice');
    expect(result.contextBlock).toContain('## Contributor: alice');
    expect(result.contextBlock).toContain('Alice Smith');
    expect(result.contextBlock).toContain('TypeScript');
    expect(result.contextBlock).toContain('concise and technical');
  });

  it('records access counts for retrieved memories', async () => {
    mockState.matchMemoriesResults = [
      makeMatchResult({ id: 'mem-1' }),
      makeMatchResult({ id: 'mem-2' }),
    ];

    await runRetriever({} as never, 'test query', 'leonardrknight/ai-continuity-framework');

    // Wait for fire-and-forget promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockState.accessedMemoryIds.length).toBe(1);
    expect(mockState.accessedMemoryIds[0]).toContain('mem-1');
    expect(mockState.accessedMemoryIds[0]).toContain('mem-2');
  });

  it('returns empty result when no memories match', async () => {
    mockState.matchMemoriesResults = [];
    mockState.embeddingResult = fakeEmbedding;

    const result = await runRetriever(
      {} as never,
      'completely unrelated query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.memories.length).toBe(0);
    expect(result.contextBlock).toBe('');
    expect(result.degradation).toBe('full');
  });

  it('degrades to keyword-only when embedding returns null', async () => {
    mockState.embeddingResult = null;
    mockState.matchMemoriesResults = [makeMatchResult({ id: 'keyword-hit' })];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.degradation).toBe('reduced');
    expect(result.memories.length).toBe(1);

    // Verify keyword-only search was called with semantic_weight=0
    const calls = vi.mocked(matchMemories).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1].semantic_weight).toBe(0);
  });

  it('degrades to keyword-only when embedding throws', async () => {
    mockState.embeddingShouldThrow = true;
    mockState.matchMemoriesResults = [makeMatchResult({ id: 'keyword-hit' })];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.degradation).toBe('reduced');
    expect(result.memories.length).toBe(1);
  });

  it('degrades to empty when database fails and no contributor', async () => {
    mockState.matchMemoriesShouldFail = true;
    mockState.embeddingResult = fakeEmbedding;

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.memories.length).toBe(0);
    expect(result.degradation).toBe('empty');
  });

  it('degrades to minimal when database fails but contributor available', async () => {
    mockState.matchMemoriesShouldFail = true;
    mockState.embeddingResult = fakeEmbedding;
    mockState.contributorProfile = makeContributorProfile();

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
      undefined,
      'contrib-001',
    );

    expect(result.memories.length).toBe(0);
    expect(result.contributorProfile).toBeDefined();
    expect(result.degradation).toBe('minimal');
    expect(result.contextBlock).toContain('## Contributor: alice');
  });

  it('handles contributor profile fetch failure gracefully', async () => {
    mockState.contributorShouldFail = true;
    mockState.matchMemoriesResults = [makeMatchResult()];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
      undefined,
      'contrib-001',
    );

    // Should still return memories even if profile fails
    expect(result.memories.length).toBe(1);
    expect(result.contributorProfile).toBeNull();
    expect(result.degradation).toBe('full');
  });

  it('does not record access when no memories retrieved', async () => {
    mockState.matchMemoriesResults = [];

    await runRetriever({} as never, 'test query', 'leonardrknight/ai-continuity-framework');

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockState.accessedMemoryIds.length).toBe(0);
  });

  it('context block format is suitable for LLM prompt injection', async () => {
    mockState.contributorProfile = makeContributorProfile();
    mockState.matchMemoriesResults = [
      makeMatchResult({
        id: 'mem-1',
        content: 'Memory decay uses Ebbinghaus curves.',
        memory_type: 'fact',
        topics: ['memory-decay', 'ebbinghaus'],
      }),
      makeMatchResult({
        id: 'mem-2',
        content: 'The team prefers TypeScript for backend work.',
        memory_type: 'preference',
        topics: ['typescript'],
      }),
    ];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
      undefined,
      'contrib-001',
    );

    const ctx = result.contextBlock;

    // Should have contributor section
    expect(ctx).toContain('## Contributor: alice');
    expect(ctx).toContain('Expertise: TypeScript, distributed-systems');

    // Should have memories section
    expect(ctx).toContain('## Relevant Memories');
    expect(ctx).toContain('(fact [memory-decay, ebbinghaus]) Memory decay uses Ebbinghaus curves.');
    expect(ctx).toContain(
      '(preference [typescript]) The team prefers TypeScript for backend work.',
    );

    // Should use markdown formatting (sections separated by blank lines)
    expect(ctx).toContain('\n\n');
  });

  it('handles access count recording failure gracefully', async () => {
    mockState.matchMemoriesResults = [makeMatchResult({ id: 'mem-1' })];
    mockState.accessShouldFail = true;

    // Should not throw even though recording fails
    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.memories.length).toBe(1);
    expect(result.degradation).toBe('full');
  });

  it('does not include contributor section when no contributorId provided', async () => {
    mockState.matchMemoriesResults = [makeMatchResult()];

    const result = await runRetriever(
      {} as never,
      'test query',
      'leonardrknight/ai-continuity-framework',
    );

    expect(result.contributorProfile).toBeNull();
    expect(result.contextBlock).not.toContain('## Contributor');
    expect(result.contextBlock).toContain('## Relevant Memories');
  });
});
