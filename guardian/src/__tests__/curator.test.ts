import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConsolidatedMemory, ContributorProfile } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  memoriesForCuration: [] as ConsolidatedMemory[],
  contributorsWithActivity: [] as ContributorProfile[],
  memoriesForContributor: [] as ConsolidatedMemory[],
  updatedMemories: [] as { id: string; updates: Partial<ConsolidatedMemory> }[],
  updatedProfiles: [] as { id: string; updates: Partial<ContributorProfile> }[],
  agentStateUpserts: [] as Record<string, unknown>[],
  llmCallCount: 0,
  llmShouldFail: false,
  contributorsFetchShouldFail: false,
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
              name: 'synthesize_profile',
              input: {
                summary: 'Active contributor focused on memory architecture and agent design.',
                interests: ['memory-systems', 'agent-architecture', 'ai-continuity'],
                expertise: ['TypeScript', 'distributed-systems', 'LLM-integration'],
                communication_style: 'concise and technical',
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
  getConsolidatedMemoriesForCuration: vi.fn(async () => {
    return mockState.memoriesForCuration;
  }),
  getContributorsWithRecentActivity: vi.fn(async () => {
    if (mockState.contributorsFetchShouldFail) {
      throw new Error('Database error fetching contributors');
    }
    return mockState.contributorsWithActivity;
  }),
  getMemoriesForContributor: vi.fn(async () => {
    return mockState.memoriesForContributor;
  }),
  updateConsolidatedMemory: vi.fn(
    async (_client: unknown, id: string, updates: Partial<ConsolidatedMemory>) => {
      mockState.updatedMemories.push({ id, updates });
      return { id, ...updates };
    },
  ),
  updateContributorProfile: vi.fn(
    async (_client: unknown, id: string, updates: Partial<ContributorProfile>) => {
      mockState.updatedProfiles.push({ id, updates });
      return { id, ...updates };
    },
  ),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.agentStateUpserts.push(state);
    return state;
  }),
}));

// Import after mocks
import {
  runCurator,
  recalculateImportance,
  getTypeWeight,
  determineTier,
  shouldArchive,
} from '../agents/curator.js';

// -- Test helpers --

function makeConsolidatedMemory(overrides: Partial<ConsolidatedMemory> = {}): ConsolidatedMemory {
  return {
    id: 'cm-001',
    repo_id: 'leonardrknight/ai-continuity-framework',
    contributor_id: 'contrib-001',
    content: 'Memory decay uses Ebbinghaus curves for importance scoring.',
    content_embedding: null,
    memory_type: 'fact',
    topics: ['memory-decay'],
    importance_score: 0.5,
    stability: 0.5,
    related_memories: null,
    source_memories: ['em-001', 'em-002'],
    tier: 'medium',
    access_count: 5,
    last_accessed_at: '2026-03-10T00:00:00Z',
    version: 1,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function makeContributor(overrides: Partial<ContributorProfile> = {}): ContributorProfile {
  return {
    id: 'contrib-001',
    github_username: 'alice',
    github_id: 12345,
    display_name: 'Alice Smith',
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-16T00:00:00Z',
    interaction_count: 42,
    summary: null,
    interests: null,
    expertise: null,
    communication_style: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
    ...overrides,
  };
}

describe('recalculateImportance', () => {
  it('computes importance correctly with all components', () => {
    // base=0.5, access=5, age=10, type=decision(0.9), emotion=0.3, sources=3
    const result = recalculateImportance(0.5, 5, 10, 'decision', 0.3, 3);

    const expected =
      0.3 * 0.5 +
      0.2 * Math.min(1.0, 5 / 10) +
      0.15 * Math.exp(-10 / 30) +
      0.15 * 0.9 +
      0.1 * 0.3 +
      0.1 * Math.min(1.0, 3 / 5);

    expect(result).toBeCloseTo(expected, 5);
  });

  it('caps access factor at 1.0', () => {
    // access_count=20 → min(1.0, 20/10) = 1.0
    const result = recalculateImportance(0.5, 20, 0, 'fact', 0, 1);
    const expected =
      0.3 * 0.5 + 0.2 * 1.0 + 0.15 * 1.0 + 0.15 * 0.5 + 0.1 * 0 + 0.1 * Math.min(1.0, 1 / 5);

    expect(result).toBeCloseTo(expected, 5);
  });

  it('caps source factor at 1.0', () => {
    // source_count=10 → min(1.0, 10/5) = 1.0
    const result = recalculateImportance(0.5, 5, 0, 'fact', 0, 10);
    const expected = 0.3 * 0.5 + 0.2 * 0.5 + 0.15 * 1.0 + 0.15 * 0.5 + 0.1 * 0 + 0.1 * 1.0;

    expect(result).toBeCloseTo(expected, 5);
  });

  it('uses absolute value of emotional_valence', () => {
    const positive = recalculateImportance(0.5, 5, 10, 'fact', 0.7, 2);
    const negative = recalculateImportance(0.5, 5, 10, 'fact', -0.7, 2);
    expect(positive).toBeCloseTo(negative, 5);
  });

  it('clamps result between 0 and 1', () => {
    // All max values
    const maxResult = recalculateImportance(1.0, 100, 0, 'decision', 1.0, 100);
    expect(maxResult).toBeLessThanOrEqual(1.0);

    // All min values
    const minResult = recalculateImportance(0, 0, 1000, 'question', 0, 0);
    expect(minResult).toBeGreaterThanOrEqual(0);
  });
});

describe('getTypeWeight', () => {
  it('returns correct weight for decision', () => {
    expect(getTypeWeight('decision')).toBe(0.9);
  });

  it('returns correct weight for relationship', () => {
    expect(getTypeWeight('relationship')).toBe(0.85);
  });

  it('returns correct weight for preference', () => {
    expect(getTypeWeight('preference')).toBe(0.7);
  });

  it('returns correct weight for action_item', () => {
    expect(getTypeWeight('action_item')).toBe(0.6);
  });

  it('returns correct weight for fact', () => {
    expect(getTypeWeight('fact')).toBe(0.5);
  });

  it('returns correct weight for pattern', () => {
    expect(getTypeWeight('pattern')).toBe(0.5);
  });

  it('returns correct weight for question', () => {
    expect(getTypeWeight('question')).toBe(0.3);
  });

  it('returns default 0.5 for unknown type', () => {
    expect(getTypeWeight('unknown')).toBe(0.5);
  });
});

describe('determineTier', () => {
  it('assigns long tier for importance >= 0.8', () => {
    expect(determineTier(0.8)).toBe('long');
    expect(determineTier(0.95)).toBe('long');
    expect(determineTier(1.0)).toBe('long');
  });

  it('assigns medium tier for importance >= 0.4 and < 0.8', () => {
    expect(determineTier(0.4)).toBe('medium');
    expect(determineTier(0.5)).toBe('medium');
    expect(determineTier(0.79)).toBe('medium');
  });

  it('assigns short tier for importance < 0.4', () => {
    expect(determineTier(0.0)).toBe('short');
    expect(determineTier(0.2)).toBe('short');
    expect(determineTier(0.39)).toBe('short');
  });
});

describe('shouldArchive', () => {
  it('flags for archival when all criteria met', () => {
    // importance < 0.2, ageDays > 90, access_count < 3
    expect(shouldArchive(0.1, 100, 2)).toBe(true);
  });

  it('does not flag when importance is above threshold', () => {
    expect(shouldArchive(0.3, 100, 2)).toBe(false);
  });

  it('does not flag when age is below threshold', () => {
    expect(shouldArchive(0.1, 80, 2)).toBe(false);
  });

  it('does not flag when access count is above threshold', () => {
    expect(shouldArchive(0.1, 100, 5)).toBe(false);
  });

  it('does not flag when exactly at thresholds (boundary)', () => {
    // importance = 0.2 (not < 0.2)
    expect(shouldArchive(0.2, 91, 2)).toBe(false);
    // age = 90 (not > 90)
    expect(shouldArchive(0.1, 90, 2)).toBe(false);
    // access = 3 (not < 3)
    expect(shouldArchive(0.1, 91, 3)).toBe(false);
  });
});

describe('Curator Agent', () => {
  beforeEach(() => {
    mockState.memoriesForCuration = [];
    mockState.contributorsWithActivity = [];
    mockState.memoriesForContributor = [];
    mockState.updatedMemories = [];
    mockState.updatedProfiles = [];
    mockState.agentStateUpserts = [];
    mockState.llmCallCount = 0;
    mockState.llmShouldFail = false;
    mockState.contributorsFetchShouldFail = false;
  });

  it('returns early when no memories need curation and no contributors', async () => {
    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCurated).toBe(0);
    expect(result.profilesRefreshed).toBe(0);
    expect(result.archivedCount).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('recalculates importance and updates tier for curated memories', async () => {
    mockState.memoriesForCuration = [
      makeConsolidatedMemory({
        id: 'cm-001',
        importance_score: 0.7,
        memory_type: 'decision',
        access_count: 8,
        source_memories: ['em-001', 'em-002', 'em-003'],
        created_at: '2026-03-10T00:00:00Z',
      }),
    ];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCurated).toBe(1);
    expect(mockState.updatedMemories.length).toBe(1);

    const update = mockState.updatedMemories[0];
    expect(update.id).toBe('cm-001');
    expect(update.updates.importance_score).toBeDefined();
    expect(update.updates.tier).toBeDefined();
    // With high base importance, recent creation, good access, decision type → should be medium or long
    expect(['medium', 'long']).toContain(update.updates.tier);
  });

  it('flags old low-importance memories for archival', async () => {
    mockState.memoriesForCuration = [
      makeConsolidatedMemory({
        id: 'cm-archive',
        importance_score: 0.05,
        memory_type: 'question',
        access_count: 1,
        source_memories: null,
        // Very old memory
        created_at: '2025-01-01T00:00:00Z',
      }),
    ];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCurated).toBe(1);
    expect(result.archivedCount).toBe(1);

    const update = mockState.updatedMemories[0];
    expect(update.updates.stability).toBe(0);
  });

  it('does not flag recent high-importance memories for archival', async () => {
    mockState.memoriesForCuration = [
      makeConsolidatedMemory({
        id: 'cm-keep',
        importance_score: 0.9,
        memory_type: 'decision',
        access_count: 10,
        source_memories: ['em-001', 'em-002', 'em-003', 'em-004', 'em-005'],
        created_at: '2026-03-10T00:00:00Z',
      }),
    ];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.archivedCount).toBe(0);
    const update = mockState.updatedMemories[0];
    expect(update.updates.stability).toBeUndefined();
  });

  it('refreshes contributor profiles with LLM-generated data', async () => {
    mockState.contributorsWithActivity = [makeContributor()];
    mockState.memoriesForContributor = [makeConsolidatedMemory({ contributor_id: 'contrib-001' })];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.profilesRefreshed).toBe(1);
    expect(mockState.llmCallCount).toBe(1);

    const profileUpdate = mockState.updatedProfiles[0];
    expect(profileUpdate.id).toBe('contrib-001');
    expect(profileUpdate.updates.summary).toBe(
      'Active contributor focused on memory architecture and agent design.',
    );
    expect(profileUpdate.updates.interests).toContain('memory-systems');
    expect(profileUpdate.updates.expertise).toContain('TypeScript');
    expect(profileUpdate.updates.communication_style).toBe('concise and technical');
  });

  it('handles LLM profile synthesis failure gracefully', async () => {
    mockState.llmShouldFail = true;
    mockState.contributorsWithActivity = [makeContributor()];
    mockState.memoriesForContributor = [makeConsolidatedMemory({ contributor_id: 'contrib-001' })];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.profilesRefreshed).toBe(0);
    expect(result.errors).toBe(1);
    expect(mockState.updatedProfiles.length).toBe(0);
  });

  it('skips profile refresh for contributors with no memories', async () => {
    mockState.contributorsWithActivity = [makeContributor()];
    mockState.memoriesForContributor = []; // no memories

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.profilesRefreshed).toBe(0);
    expect(mockState.llmCallCount).toBe(0);
  });

  it('handles contributor fetch failure gracefully', async () => {
    mockState.contributorsFetchShouldFail = true;

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.errors).toBe(1);
    expect(result.profilesRefreshed).toBe(0);
  });

  it('updates agent_state after run', async () => {
    mockState.memoriesForCuration = [makeConsolidatedMemory()];

    await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.agentStateUpserts.length).toBe(1);
    const state = mockState.agentStateUpserts[0];
    expect(state.agent_name).toBe('curator');
    expect(state.repo_id).toBe('leonardrknight/ai-continuity-framework');
    expect(state.last_run_at).toBeDefined();
    expect(state.last_successful_at).toBeDefined();
    expect(state.items_processed).toBe(1);
  });

  it('applies correct type weights for each memory_type', async () => {
    const memoryTypes = [
      'decision',
      'relationship',
      'preference',
      'action_item',
      'fact',
      'pattern',
      'question',
    ] as const;

    // Create memories of each type with same base parameters
    mockState.memoriesForCuration = memoryTypes.map((type) =>
      makeConsolidatedMemory({
        id: `cm-${type}`,
        memory_type: type,
        importance_score: 0.5,
        access_count: 5,
        source_memories: ['em-001', 'em-002'],
        created_at: '2026-03-01T00:00:00Z',
      }),
    );

    await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(mockState.updatedMemories.length).toBe(7);

    // Decision type should have highest recalculated importance
    const decisionUpdate = mockState.updatedMemories.find((u) => u.id === 'cm-decision');
    const questionUpdate = mockState.updatedMemories.find((u) => u.id === 'cm-question');

    expect(decisionUpdate!.updates.importance_score).toBeGreaterThan(
      questionUpdate!.updates.importance_score!,
    );
  });

  it('handles both curation and profile refresh in one run', async () => {
    mockState.memoriesForCuration = [
      makeConsolidatedMemory({ id: 'cm-001' }),
      makeConsolidatedMemory({ id: 'cm-002' }),
    ];
    mockState.contributorsWithActivity = [makeContributor()];
    mockState.memoriesForContributor = [makeConsolidatedMemory()];

    const result = await runCurator({} as never, 'leonardrknight/ai-continuity-framework');

    expect(result.memoriesCurated).toBe(2);
    expect(result.profilesRefreshed).toBe(1);
    expect(result.errors).toBe(0);

    // Agent state should reflect total items processed
    const state = mockState.agentStateUpserts[0];
    expect(state.items_processed).toBe(3);
  });
});
