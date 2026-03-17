import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RetrievalResult, RankedMemory } from '../agents/retriever.js';
import type { ContributorProfile } from '../db/schema.js';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  retrievalResult: null as RetrievalResult | null,
  llmResponseText: 'Here is some relevant context from past discussions.\n\n— Guardian',
  llmShouldFail: false,
  postedComments: [] as { owner: string; repo: string; issueNumber: number; body: string }[],
  contributorProfile: null as ContributorProfile | null,
}));

// -- Mock retriever --

vi.mock('../agents/retriever.js', () => ({
  runRetriever: vi.fn(async () => {
    return mockState.retrievalResult;
  }),
}));

// -- Mock LLM client --

vi.mock('../llm/client.js', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: vi.fn(async () => {
        if (mockState.llmShouldFail) {
          throw new Error('LLM API error');
        }
        return {
          content: [{ type: 'text', text: mockState.llmResponseText }],
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
  getContributorByUsername: vi.fn(async () => {
    return mockState.contributorProfile;
  }),
  matchMemories: vi.fn(async () => []),
  recordMemoryAccess: vi.fn(async () => {}),
  getContributorById: vi.fn(async () => mockState.contributorProfile),
}));

// -- Mock embeddings --

vi.mock('../llm/embeddings.js', () => ({
  generateEmbedding: vi.fn(async () => null),
}));

// Import after mocks
import { shouldRespond, generateResponse, handleEventWithMemory } from '../github/responder.js';
import { createNoopActionsClient } from '../github/actions.js';
import type { GitHubActionsClient } from '../github/actions.js';

// -- Test helpers --

function makeRankedMemory(overrides: Partial<RankedMemory> = {}): RankedMemory {
  return {
    id: 'mem-001',
    content: 'The team decided to use TypeScript strict mode for all modules.',
    memory_type: 'decision',
    topics: ['typescript', 'code-standards'],
    importance_score: 0.8,
    semantic_score: 0.85,
    recency_score: 1.0,
    final_score: 0.67,
    ...overrides,
  };
}

function makeRetrievalResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    memories: [makeRankedMemory()],
    contributorProfile: null,
    contextBlock:
      '## Relevant Memories\n- (decision [typescript]) The team decided to use TypeScript strict mode.',
    latencyMs: 42,
    degradation: 'full',
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
    summary: 'Active contributor focused on memory architecture.',
    interests: ['memory-systems'],
    expertise: ['TypeScript'],
    communication_style: 'concise and technical',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
    ...overrides,
  };
}

function makeTrackingActionsClient(): GitHubActionsClient & {
  comments: typeof mockState.postedComments;
} {
  const comments: typeof mockState.postedComments = [];
  return {
    comments,
    async postComment(owner, repo, issueNumber, body) {
      comments.push({ owner, repo, issueNumber, body });
    },
    async addLabels() {},
  };
}

// -- shouldRespond tests --

describe('shouldRespond', () => {
  it('returns true for issues.opened with relevant context', () => {
    const retrieval = makeRetrievalResult();
    const payload = {
      action: 'opened',
      issue: { number: 1, title: 'Test issue' },
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('issues.opened', payload, retrieval);

    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('issue');
  });

  it('returns true for PR with architectural context', () => {
    const retrieval = makeRetrievalResult({
      memories: [
        makeRankedMemory({
          content: 'Architecture uses hub-and-spoke pattern.',
          memory_type: 'decision',
          final_score: 0.75,
        }),
      ],
    });
    const payload = {
      action: 'opened',
      pull_request: { number: 42, title: 'Refactor agent architecture' },
      sender: { login: 'bob' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('pull_request.opened', payload, retrieval);

    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('PR');
  });

  it('returns true for @guardian mention in comment', () => {
    const retrieval = makeRetrievalResult({ memories: [] }); // No memories needed for mentions
    const payload = {
      action: 'created',
      comment: { body: 'Hey @guardian, what do you think about this?' },
      issue: { number: 5 },
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('issue_comment.created', payload, retrieval);

    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('@guardian');
  });

  it('returns false for push events', () => {
    const retrieval = makeRetrievalResult();
    const payload = {
      ref: 'refs/heads/main',
      commits: [{ message: 'fix typo' }],
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('push', payload, retrieval);

    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('not respondable');
  });

  it('returns false when no relevant memories exist', () => {
    const retrieval = makeRetrievalResult({ memories: [] });
    const payload = {
      action: 'opened',
      issue: { number: 1, title: 'Random issue' },
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('issues.opened', payload, retrieval);

    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('No relevant memories');
  });

  it('returns false when top memory score is below threshold', () => {
    const retrieval = makeRetrievalResult({
      memories: [makeRankedMemory({ final_score: 0.2 })],
    });
    const payload = {
      action: 'opened',
      issue: { number: 1, title: 'Low relevance issue' },
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('issues.opened', payload, retrieval);

    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('below threshold');
  });

  it('returns false for comment without @guardian mention', () => {
    const retrieval = makeRetrievalResult();
    const payload = {
      action: 'created',
      comment: { body: 'This looks good to me!' },
      issue: { number: 5 },
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = shouldRespond('issue_comment.created', payload, retrieval);

    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('does not mention @guardian');
  });
});

// -- generateResponse tests --

describe('generateResponse', () => {
  beforeEach(() => {
    mockState.llmResponseText =
      'Based on past discussions, the team prefers strict TypeScript.\n\n— Guardian';
    mockState.llmShouldFail = false;
  });

  it('produces helpful comment with memory context', async () => {
    const retrieval = makeRetrievalResult();

    const result = await generateResponse(
      'issues.opened',
      '[Issue #1] How should we configure TypeScript?',
      retrieval,
    );

    expect(result).toContain('Guardian');
    expect(result.length).toBeGreaterThan(0);
  });

  it('throws when LLM fails', async () => {
    mockState.llmShouldFail = true;
    const retrieval = makeRetrievalResult();

    await expect(generateResponse('issues.opened', 'test content', retrieval)).rejects.toThrow(
      'LLM API error',
    );
  });
});

// -- handleEventWithMemory tests --

describe('handleEventWithMemory', () => {
  beforeEach(() => {
    mockState.retrievalResult = makeRetrievalResult();
    mockState.llmResponseText =
      'Based on past discussions, TypeScript strict mode is the standard.\n\n— Guardian';
    mockState.llmShouldFail = false;
    mockState.postedComments = [];
    mockState.contributorProfile = makeContributor();
  });

  it('full flow from event to comment', async () => {
    const actionsClient = makeTrackingActionsClient();
    const payload = {
      action: 'opened',
      issue: { number: 7, title: 'TypeScript config question', body: 'How strict should TS be?' },
      sender: { login: 'alice', id: 12345 },
      repository: { full_name: 'owner/repo' },
    };

    const result = await handleEventWithMemory(
      {} as never,
      'issues.opened',
      payload,
      'owner/repo',
      actionsClient,
    );

    expect(result.responded).toBe(true);
    expect(actionsClient.comments.length).toBe(1);
    expect(actionsClient.comments[0].owner).toBe('owner');
    expect(actionsClient.comments[0].repo).toBe('repo');
    expect(actionsClient.comments[0].issueNumber).toBe(7);
    expect(actionsClient.comments[0].body).toContain('Guardian');
  });

  it('skips when shouldRespond is false', async () => {
    mockState.retrievalResult = makeRetrievalResult({ memories: [] });
    const actionsClient = makeTrackingActionsClient();
    const payload = {
      action: 'opened',
      issue: { number: 1, title: 'No context', body: 'Something unrelated.' },
      sender: { login: 'alice', id: 12345 },
      repository: { full_name: 'owner/repo' },
    };

    const result = await handleEventWithMemory(
      {} as never,
      'issues.opened',
      payload,
      'owner/repo',
      actionsClient,
    );

    expect(result.responded).toBe(false);
    expect(actionsClient.comments.length).toBe(0);
  });

  it('skips when no content text is extractable', async () => {
    const actionsClient = makeTrackingActionsClient();
    const payload = {
      sender: { login: 'alice' },
      repository: { full_name: 'owner/repo' },
    };

    const result = await handleEventWithMemory(
      {} as never,
      'unknown_event',
      payload,
      'owner/repo',
      actionsClient,
    );

    expect(result.responded).toBe(false);
    expect(result.reason).toContain('No content text');
  });

  it('handles PR events correctly', async () => {
    const actionsClient = makeTrackingActionsClient();
    const payload = {
      action: 'opened',
      pull_request: {
        number: 15,
        title: 'Add memory decay feature',
        body: 'Implements Ebbinghaus curves for memory importance.',
      },
      sender: { login: 'bob', id: 999 },
      repository: { full_name: 'owner/repo' },
    };

    const result = await handleEventWithMemory(
      {} as never,
      'pull_request.opened',
      payload,
      'owner/repo',
      actionsClient,
    );

    expect(result.responded).toBe(true);
    expect(actionsClient.comments[0].issueNumber).toBe(15);
  });

  it('uses no-op actions client without errors', async () => {
    const noopClient = createNoopActionsClient();
    const payload = {
      action: 'opened',
      issue: { number: 1, title: 'Test', body: 'Body' },
      sender: { login: 'alice', id: 12345 },
      repository: { full_name: 'owner/repo' },
    };

    // Should not throw
    const result = await handleEventWithMemory(
      {} as never,
      'issues.opened',
      payload,
      'owner/repo',
      noopClient,
    );

    expect(result.responded).toBe(true);
  });
});
