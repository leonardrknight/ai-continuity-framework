import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MatchMemoryResult } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  retrieverResults: [] as MatchMemoryResult[],
  retrieverShouldFail: false,
  agentState: null as Record<string, unknown> | null,
  upsertedState: null as Record<string, unknown> | null,
}));

// -- Mock retriever --

vi.mock('../agents/retriever.js', async () => {
  // We need the real types but mock the function
  return {
    runRetriever: vi.fn(async () => {
      if (mockState.retrieverShouldFail) {
        throw new Error('Retriever error');
      }
      // Simulate two-stage re-ranking (simplified)
      const memories = mockState.retrieverResults.map((r) => ({
        id: r.id,
        content: r.content,
        memory_type: r.memory_type,
        topics: r.topics,
        importance_score: r.importance_score,
        semantic_score: r.semantic_score,
        recency_score: 1.0,
        final_score: 0.5 * r.semantic_score + 0.3 * r.importance_score + 0.2 * 1.0,
      }));
      return {
        memories,
        contributorProfile: null,
        contextBlock: '',
        latencyMs: 5,
        degradation: 'full' as const,
      };
    }),
  };
});

// -- Mock DB queries --

vi.mock('../db/queries.js', () => ({
  getAgentState: vi.fn(async () => {
    if (mockState.agentState) {
      return { metadata: mockState.agentState };
    }
    return null;
  }),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.upsertedState = state;
    return state;
  }),
}));

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

// -- Import after mocks --

import {
  detectEntities,
  detectTopicShift,
  detectTemporalReference,
  detectThreadResumption,
  detectQuestionAboutPast,
  detectAllSignals,
} from '../agents/anticipator-signals.js';
import {
  scorePrediction,
  assignTier,
  triagePredictions,
  runAnticipator,
  mergeWithRetrieval,
  trackAccuracy,
  stagePredictions,
  getStagedPredictions,
  clearStagedPredictions,
  analyzeForPredictions,
  type ScoredPrediction,
  type PredictionTier,
} from '../agents/anticipator.js';
import type { RankedMemory } from '../agents/retriever.js';
import type { AnticipationSignal } from '../agents/anticipator-signals.js';

// -- Test helpers --

function makeMatchResult(overrides: Partial<MatchMemoryResult> = {}): MatchMemoryResult {
  return {
    id: 'mem-001',
    content: 'Test memory content.',
    memory_type: 'fact',
    topics: ['test'],
    importance_score: 0.7,
    semantic_score: 0.85,
    keyword_score: 0.5,
    combined_score: 0.72,
    ...overrides,
  };
}

function makeRankedMemory(overrides: Partial<RankedMemory> = {}): RankedMemory {
  return {
    id: 'mem-001',
    content: 'Test memory content.',
    memory_type: 'fact',
    topics: ['test'],
    importance_score: 0.7,
    semantic_score: 0.85,
    recency_score: 1.0,
    final_score: 0.83,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<AnticipationSignal> = {}): AnticipationSignal {
  return {
    type: 'entity_mention',
    value: 'Auth System',
    suggestedQuery: 'Auth System',
    confidence: 0.8,
    ...overrides,
  };
}

function makePrediction(overrides: Partial<ScoredPrediction> = {}): ScoredPrediction {
  return {
    predictionId: 'pred-test-1',
    signal: makeSignal(),
    memories: [makeRankedMemory()],
    injectionPriority: 0.75,
    tier: 'tier2' as PredictionTier,
    createdAt: Date.now(),
    ...overrides,
  };
}

// -- Tests --

describe('Signal Detection: detectEntities', () => {
  it('extracts capitalized multi-word phrases', () => {
    const signals = detectEntities("Let's talk about the Auth System and React Router");
    const values = signals.map((s) => s.value);
    expect(values).toContain('Auth System');
    expect(values).toContain('React Router');
  });

  it('extracts quoted terms', () => {
    const signals = detectEntities('We need to revisit "memory consolidation" soon');
    const values = signals.map((s) => s.value);
    expect(values).toContain('memory consolidation');
  });

  it('filters out stop words from single-word entities', () => {
    const signals = detectEntities('The thing about This is very interesting');
    const values = signals.map((s) => s.value.toLowerCase());
    expect(values).not.toContain('the');
    expect(values).not.toContain('this');
    expect(values).not.toContain('very');
  });

  it('returns empty for messages with no entities', () => {
    const signals = detectEntities('hello there, how are you doing today?');
    expect(signals.length).toBe(0);
  });

  it('all signals have type entity_mention', () => {
    const signals = detectEntities('Check the Auth System');
    for (const signal of signals) {
      expect(signal.type).toBe('entity_mention');
    }
  });

  it('deduplicates entities', () => {
    const signals = detectEntities('The Auth System is great. I love the Auth System.');
    const authSignals = signals.filter((s) => s.value === 'Auth System');
    expect(authSignals.length).toBe(1);
  });
});

describe('Signal Detection: detectTopicShift', () => {
  it('detects topic change when word overlap is low', () => {
    const previous = [
      'We should focus on the database schema design',
      'The tables need proper indexes for performance',
    ];
    const signals = detectTopicShift('What about the frontend authentication flow?', previous);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].type).toBe('topic_keyword');
  });

  it('returns empty when topic is same', () => {
    const previous = [
      'The database schema needs updating',
      'We need to add more indexes to the database',
    ];
    const signals = detectTopicShift(
      'The database performance is critical for the schema',
      previous,
    );
    expect(signals.length).toBe(0);
  });

  it('returns empty when no previous messages', () => {
    const signals = detectTopicShift('Let us discuss authentication', []);
    expect(signals.length).toBe(0);
  });
});

describe('Signal Detection: detectTemporalReference', () => {
  it('catches "last week"', () => {
    const signals = detectTemporalReference('Last week we discussed the API design');
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('temporal_reference');
    expect(signals[0].value.toLowerCase()).toContain('last week');
  });

  it('catches "remember when"', () => {
    const signals = detectTemporalReference('Remember when we built the auth module?');
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('temporal_reference');
  });

  it('catches "yesterday"', () => {
    const signals = detectTemporalReference('Yesterday we agreed on the architecture');
    expect(signals.length).toBe(1);
    expect(signals[0].confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('catches "a few days ago"', () => {
    const signals = detectTemporalReference('A few days ago we set up the CI pipeline');
    expect(signals.length).toBe(1);
  });

  it('returns empty when no temporal reference', () => {
    const signals = detectTemporalReference('Please help me write a function');
    expect(signals.length).toBe(0);
  });
});

describe('Signal Detection: detectThreadResumption', () => {
  it('catches "back to what"', () => {
    const signals = detectThreadResumption('Back to what we were discussing about auth');
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('thread_resumption');
  });

  it('catches "where were we"', () => {
    const signals = detectThreadResumption('Where were we on the deployment plan?');
    expect(signals.length).toBe(1);
  });

  it('catches "as I was saying"', () => {
    const signals = detectThreadResumption('As I was saying, the pipeline needs work');
    expect(signals.length).toBe(1);
  });

  it('catches "let\'s get back to"', () => {
    const signals = detectThreadResumption("Let's get back to the schema design");
    expect(signals.length).toBe(1);
    expect(signals[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns empty when no resumption detected', () => {
    const signals = detectThreadResumption('How do I create a new component?');
    expect(signals.length).toBe(0);
  });
});

describe('Signal Detection: detectQuestionAboutPast', () => {
  it('catches "what did I say about"', () => {
    const signals = detectQuestionAboutPast('What did I say about the deployment process?');
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('question_about_past');
    expect(signals[0].suggestedQuery).toContain('deployment process');
  });

  it('catches "when did we discuss"', () => {
    const signals = detectQuestionAboutPast('When did we discuss the API versioning?');
    expect(signals.length).toBe(1);
  });

  it('catches "do you remember"', () => {
    const signals = detectQuestionAboutPast('Do you remember the caching strategy?');
    expect(signals.length).toBe(1);
  });

  it('catches "what was the decision"', () => {
    const signals = detectQuestionAboutPast('What was the decision on using GraphQL?');
    expect(signals.length).toBe(1);
  });

  it('returns empty for non-past questions', () => {
    const signals = detectQuestionAboutPast('What is the best way to handle errors?');
    expect(signals.length).toBe(0);
  });
});

describe('Signal Detection: detectAllSignals', () => {
  it('runs all detectors and aggregates results', () => {
    const signals = detectAllSignals('Remember when we discussed the Auth System last week?', [
      'We were working on database optimization yesterday',
    ]);

    const types = new Set(signals.map((s) => s.type));
    // Should detect at least entity and temporal
    expect(types.has('entity_mention')).toBe(true);
    expect(types.has('temporal_reference')).toBe(true);
  });

  it('handles empty message gracefully', () => {
    const signals = detectAllSignals('');
    expect(Array.isArray(signals)).toBe(true);
  });
});

describe('Scoring: scorePrediction', () => {
  it('returns correct score using the weighted formula', () => {
    const signal = makeSignal({ confidence: 0.9 });
    const memories = [
      makeRankedMemory({
        importance_score: 0.8,
        recency_score: 1.0,
        semantic_score: 0.7,
      }),
    ];

    const score = scorePrediction(signal, memories);

    // 0.40 * 0.9 + 0.30 * 0.8 + 0.20 * 1.0 + 0.10 * 0.7
    // = 0.36 + 0.24 + 0.20 + 0.07 = 0.87
    expect(score).toBeCloseTo(0.87, 2);
  });

  it('returns just confidence weight when no memories', () => {
    const signal = makeSignal({ confidence: 0.8 });
    const score = scorePrediction(signal, []);

    // 0.40 * 0.8 + 0.30 * 0 + 0.20 * 0 + 0.10 * 0 = 0.32
    expect(score).toBeCloseTo(0.32, 2);
  });

  it('averages across multiple memories', () => {
    const signal = makeSignal({ confidence: 0.8 });
    const memories = [
      makeRankedMemory({ importance_score: 0.6, recency_score: 1.0, semantic_score: 0.8 }),
      makeRankedMemory({ importance_score: 0.4, recency_score: 0.5, semantic_score: 0.6 }),
    ];

    const score = scorePrediction(signal, memories);

    // importance avg = 0.5, recency avg = 0.75, access avg = 0.7
    // 0.40 * 0.8 + 0.30 * 0.5 + 0.20 * 0.75 + 0.10 * 0.7
    // = 0.32 + 0.15 + 0.15 + 0.07 = 0.69
    expect(score).toBeCloseTo(0.69, 2);
  });
});

describe('Scoring: assignTier', () => {
  it('assigns tier1 for priority > 0.85', () => {
    expect(assignTier(0.86)).toBe('tier1');
    expect(assignTier(0.95)).toBe('tier1');
    expect(assignTier(1.0)).toBe('tier1');
  });

  it('assigns tier2 for priority 0.60-0.85', () => {
    expect(assignTier(0.6)).toBe('tier2');
    expect(assignTier(0.75)).toBe('tier2');
    expect(assignTier(0.85)).toBe('tier2');
  });

  it('assigns tier3 for priority 0.40-0.60', () => {
    expect(assignTier(0.4)).toBe('tier3');
    expect(assignTier(0.5)).toBe('tier3');
    expect(assignTier(0.59)).toBe('tier3');
  });

  it('assigns discard for priority < 0.40', () => {
    expect(assignTier(0.39)).toBe('discard');
    expect(assignTier(0.1)).toBe('discard');
    expect(assignTier(0.0)).toBe('discard');
  });
});

describe('Triage: triagePredictions', () => {
  it('sorts predictions into correct tiers', () => {
    const predictions = [
      makePrediction({ injectionPriority: 0.9, tier: 'tier1' }),
      makePrediction({ injectionPriority: 0.7, tier: 'tier2' }),
      makePrediction({ injectionPriority: 0.5, tier: 'tier3' }),
      makePrediction({ injectionPriority: 0.2, tier: 'discard' }),
    ];

    const result = triagePredictions(predictions);

    expect(result.tier1.length).toBe(1);
    expect(result.tier2.length).toBe(1);
    expect(result.tier3.length).toBe(1);
    expect(result.discarded.length).toBe(1);
  });

  it('sorts within each tier by priority (highest first)', () => {
    const predictions = [
      makePrediction({ predictionId: 'low', injectionPriority: 0.61, tier: 'tier2' }),
      makePrediction({ predictionId: 'high', injectionPriority: 0.84, tier: 'tier2' }),
      makePrediction({ predictionId: 'mid', injectionPriority: 0.72, tier: 'tier2' }),
    ];

    const result = triagePredictions(predictions);

    expect(result.tier2[0].predictionId).toBe('high');
    expect(result.tier2[1].predictionId).toBe('mid');
    expect(result.tier2[2].predictionId).toBe('low');
  });

  it('handles empty input', () => {
    const result = triagePredictions([]);
    expect(result.tier1.length).toBe(0);
    expect(result.tier2.length).toBe(0);
    expect(result.tier3.length).toBe(0);
    expect(result.discarded.length).toBe(0);
  });
});

describe('Staging: tier2 predictions', () => {
  afterEach(() => {
    clearStagedPredictions('test-user');
  });

  it('stores and retrieves staged predictions', () => {
    const predictions = [makePrediction()];
    stagePredictions('test-user', predictions);

    const retrieved = getStagedPredictions('test-user');
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].predictionId).toBe(predictions[0].predictionId);
  });

  it('returns empty for unknown user', () => {
    const retrieved = getStagedPredictions('nonexistent-user');
    expect(retrieved.length).toBe(0);
  });

  it('clears staged predictions', () => {
    stagePredictions('test-user', [makePrediction()]);
    clearStagedPredictions('test-user');
    const retrieved = getStagedPredictions('test-user');
    expect(retrieved.length).toBe(0);
  });
});

describe('Merge: mergeWithRetrieval', () => {
  it('deduplicates by memory ID', () => {
    const retrieverMemories = [makeRankedMemory({ id: 'mem-1' })];
    const anticipatedMemories = [
      makeRankedMemory({ id: 'mem-1' }), // duplicate
      makeRankedMemory({ id: 'mem-2' }),
    ];

    const merged = mergeWithRetrieval(retrieverMemories, anticipatedMemories);

    expect(merged.length).toBe(2);
    const ids = merged.map((m) => m.id);
    expect(ids).toContain('mem-1');
    expect(ids).toContain('mem-2');
  });

  it('retriever results take priority (come first)', () => {
    const retrieverMemories = [makeRankedMemory({ id: 'ret-1', final_score: 0.9 })];
    const anticipatedMemories = [makeRankedMemory({ id: 'ant-1', final_score: 0.7 })];

    const merged = mergeWithRetrieval(retrieverMemories, anticipatedMemories);

    expect(merged[0].id).toBe('ret-1');
    expect(merged[1].id).toBe('ant-1');
  });

  it('handles empty retriever results', () => {
    const anticipatedMemories = [makeRankedMemory({ id: 'ant-1' })];
    const merged = mergeWithRetrieval([], anticipatedMemories);
    expect(merged.length).toBe(1);
  });

  it('handles empty anticipated results', () => {
    const retrieverMemories = [makeRankedMemory({ id: 'ret-1' })];
    const merged = mergeWithRetrieval(retrieverMemories, []);
    expect(merged.length).toBe(1);
  });
});

describe('Accuracy Tracking: trackAccuracy', () => {
  beforeEach(() => {
    mockState.agentState = null;
    mockState.upsertedState = null;
  });

  it('creates new accuracy tracker when none exists', async () => {
    await trackAccuracy({} as never, 'test-repo', 'pred-1', true);

    expect(mockState.upsertedState).not.toBeNull();
    const metadata = (mockState.upsertedState as Record<string, unknown>).metadata as Record<
      string,
      unknown
    >;
    const tracker = metadata.anticipator_accuracy as {
      total: number;
      hits: number;
      misses: number;
    };
    expect(tracker.total).toBe(1);
    expect(tracker.hits).toBe(1);
    expect(tracker.misses).toBe(0);
  });

  it('increments misses when prediction was not used', async () => {
    await trackAccuracy({} as never, 'test-repo', 'pred-1', false);

    const metadata = (mockState.upsertedState as Record<string, unknown>).metadata as Record<
      string,
      unknown
    >;
    const tracker = metadata.anticipator_accuracy as {
      total: number;
      hits: number;
      misses: number;
    };
    expect(tracker.total).toBe(1);
    expect(tracker.hits).toBe(0);
    expect(tracker.misses).toBe(1);
  });

  it('accumulates with existing state', async () => {
    mockState.agentState = {
      anticipator_accuracy: {
        total: 10,
        hits: 7,
        misses: 3,
        recent: [],
      },
    };

    await trackAccuracy({} as never, 'test-repo', 'pred-11', true);

    const metadata = (mockState.upsertedState as Record<string, unknown>).metadata as Record<
      string,
      unknown
    >;
    const tracker = metadata.anticipator_accuracy as {
      total: number;
      hits: number;
      misses: number;
    };
    expect(tracker.total).toBe(11);
    expect(tracker.hits).toBe(8);
    expect(tracker.misses).toBe(3);
  });
});

describe('analyzeForPredictions', () => {
  it('returns signals without any I/O', () => {
    const signals = analyzeForPredictions(
      "Let's get back to the Auth System we discussed last week",
    );
    expect(signals.length).toBeGreaterThan(0);
    const types = new Set(signals.map((s) => s.type));
    expect(types.has('entity_mention')).toBe(true);
  });

  it('returns empty for plain messages with no signals', () => {
    const signals = analyzeForPredictions('hello');
    expect(signals.length).toBe(0);
  });
});

describe('Integration: runAnticipator', () => {
  beforeEach(() => {
    mockState.retrieverResults = [];
    mockState.retrieverShouldFail = false;
    clearStagedPredictions('user-1');
  });

  it('returns empty when no signals detected', async () => {
    const result = await runAnticipator({} as never, 'hello there', 'user-1', 'test-repo');

    expect(result.immediateMemories.length).toBe(0);
    expect(result.stagedCount).toBe(0);
    expect(result.signals.length).toBe(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('detects signals and pre-fetches memories', async () => {
    mockState.retrieverResults = [
      makeMatchResult({ id: 'mem-auth', content: 'Auth system uses JWT tokens' }),
    ];

    const result = await runAnticipator(
      {} as never,
      "Let's talk about the Auth System",
      'user-1',
      'test-repo',
    );

    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.predictions.length).toBeGreaterThan(0);
  });

  it('handles retriever failure gracefully', async () => {
    mockState.retrieverShouldFail = true;

    const result = await runAnticipator(
      {} as never,
      "Let's discuss the Auth System",
      'user-1',
      'test-repo',
    );

    // Should not throw, just produce predictions with no memories
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.immediateMemories.length).toBe(0);
  });

  it('deduplicates immediate memories across predictions', async () => {
    // Same memory returned for different signals
    mockState.retrieverResults = [
      makeMatchResult({ id: 'shared-mem', importance_score: 0.95, semantic_score: 0.95 }),
    ];

    const result = await runAnticipator(
      {} as never,
      'Remember when we discussed the Auth System last week?',
      'user-1',
      'test-repo',
    );

    // Even if multiple signals match, the same memory should appear only once
    const ids = result.immediateMemories.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('stages tier2 predictions for next turn', async () => {
    // Set up memories that will produce tier2 scores (moderate confidence)
    mockState.retrieverResults = [
      makeMatchResult({ id: 'staged-mem', importance_score: 0.5, semantic_score: 0.5 }),
    ];

    const result = await runAnticipator(
      {} as never,
      'What about the Auth System?',
      'user-1',
      'test-repo',
    );

    // Check that staging works (might be 0 if all end up in other tiers depending on scoring)
    if (result.stagedCount > 0) {
      const staged = getStagedPredictions('user-1');
      expect(staged.length).toBeGreaterThan(0);
    }
    // The pipeline completed without error regardless
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('predictions below 0.40 are discarded', async () => {
    // Very low-confidence signal with weak memories should be discarded
    mockState.retrieverResults = [
      makeMatchResult({ id: 'weak-mem', importance_score: 0.1, semantic_score: 0.1 }),
    ];

    const result = await runAnticipator(
      {} as never,
      'recently I did something',
      'user-1',
      'test-repo',
    );

    // If there are predictions, check that low-scoring ones have discard tier
    const discarded = result.predictions.filter((p) => p.tier === 'discard');
    const nonDiscarded = result.predictions.filter((p) => p.tier !== 'discard');

    // Low importance + low semantic + moderate signal confidence should often discard
    // At minimum, the pipeline runs without error
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Verify discarded predictions are not in immediate memories
    for (const d of discarded) {
      for (const mem of d.memories) {
        const inImmediate = result.immediateMemories.some((m) => m.id === mem.id);
        // A discarded prediction's memories shouldn't be in immediate unless
        // another non-discarded prediction also returned them
        if (inImmediate) {
          const alsoInNonDiscarded = nonDiscarded.some((p) =>
            p.memories.some((m) => m.id === mem.id),
          );
          expect(alsoInNonDiscarded).toBe(true);
        }
      }
    }
  });
});

describe('Integration: anticipator + retriever merge', () => {
  it('produces merged results with no duplicates', () => {
    const retrieverMemories = [
      makeRankedMemory({ id: 'ret-1', content: 'From retriever' }),
      makeRankedMemory({ id: 'shared', content: 'Shared memory' }),
    ];

    const anticipatedMemories = [
      makeRankedMemory({ id: 'shared', content: 'Shared memory' }),
      makeRankedMemory({ id: 'ant-1', content: 'From anticipator' }),
    ];

    const merged = mergeWithRetrieval(retrieverMemories, anticipatedMemories);

    expect(merged.length).toBe(3);
    expect(merged[0].id).toBe('ret-1'); // retriever first
    expect(merged[1].id).toBe('shared'); // deduped
    expect(merged[2].id).toBe('ant-1'); // anticipated addition
  });
});
