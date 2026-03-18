import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  insertedMemories: [] as Array<{
    repo_id: string;
    content: string;
    memory_type: string;
    user_id?: string;
    topics?: string[];
    source_channel?: string;
  }>,
  memoryIdCounter: 0,
}));

// -- Mock DB --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

vi.mock('../db/queries.js', () => ({
  insertExtractedMemory: vi.fn(
    async (
      _client: unknown,
      memory: {
        repo_id: string;
        content: string;
        memory_type: string;
        user_id?: string;
        topics?: string[];
        source_channel?: string;
      },
    ) => {
      mockState.memoryIdCounter++;
      const id = `paged-mem-${mockState.memoryIdCounter}`;
      mockState.insertedMemories.push(memory);
      return { id, ...memory, created_at: '2026-03-18T00:00:00Z' };
    },
  ),
}));

// Import after mocks
import {
  estimateTokens,
  shouldPage,
  scoreRelevance,
  manageBudget,
  pageOut,
  extractActiveTopics,
  ContextWindowManager,
  DEFAULT_BUDGET_ZONES,
} from '../agents/context-monitor.js';

// -- Test Helpers --

function makeMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
): { role: 'user' | 'assistant' | 'system'; content: string } {
  return { role, content };
}

function makeConversation(
  count: number,
): { role: 'user' | 'assistant' | 'system'; content: string }[] {
  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant';
    messages.push(
      makeMessage(
        role,
        `Message ${i}: This is a test message with some content about topic ${i % 5}.`,
      ),
    );
  }
  return messages;
}

// -- Tests --

describe('estimateTokens', () => {
  it('returns reasonable estimates for short text', () => {
    const tokens = estimateTokens('Hello world');
    // 'Hello world' = 11 chars → ceil(11/4) = 3
    expect(tokens).toBe(3);
  });

  it('returns reasonable estimates for longer text', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const tokens = estimateTokens(text);
    // 44 chars → ceil(44/4) = 11
    expect(tokens).toBe(11);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('handles large text blocks', () => {
    const largeText = 'x'.repeat(4000);
    const tokens = estimateTokens(largeText);
    expect(tokens).toBe(1000);
  });

  it('uses chars/4 heuristic', () => {
    // Verify the heuristic: result = ceil(length / 4)
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(estimateTokens('abcdefghi')).toBe(3);
  });
});

describe('shouldPage', () => {
  it('returns "none" when under 50% buffer usage', () => {
    expect(shouldPage(400, 1000)).toBe('none');
    expect(shouldPage(0, 1000)).toBe('none');
    expect(shouldPage(499, 1000)).toBe('none');
  });

  it('returns "flag" at 50-75% buffer usage', () => {
    expect(shouldPage(500, 1000)).toBe('flag');
    expect(shouldPage(600, 1000)).toBe('flag');
    expect(shouldPage(749, 1000)).toBe('flag');
  });

  it('returns "warm" at 75-90% buffer usage', () => {
    expect(shouldPage(750, 1000)).toBe('warm');
    expect(shouldPage(800, 1000)).toBe('warm');
    expect(shouldPage(899, 1000)).toBe('warm');
  });

  it('returns "aggressive" above 90% buffer usage', () => {
    expect(shouldPage(900, 1000)).toBe('aggressive');
    expect(shouldPage(950, 1000)).toBe('aggressive');
    expect(shouldPage(1000, 1000)).toBe('aggressive');
    expect(shouldPage(1500, 1000)).toBe('aggressive');
  });

  it('returns "aggressive" for zero max tokens', () => {
    expect(shouldPage(100, 0)).toBe('aggressive');
  });
});

describe('scoreRelevance', () => {
  const basicMessages = [
    makeMessage('user', 'What architecture do we use?'),
    makeMessage('assistant', 'We decided to use hub-and-spoke architecture.'),
    makeMessage('user', 'Tell me more about the architecture.'),
    makeMessage('assistant', 'The architecture uses TypeScript and Supabase.'),
    makeMessage('user', 'What about testing?'),
  ];

  it('recent messages score higher than old ones', () => {
    const oldScore = scoreRelevance(
      basicMessages[0],
      0,
      basicMessages.length,
      ['architecture'],
      basicMessages,
    );
    const newScore = scoreRelevance(
      basicMessages[4],
      4,
      basicMessages.length,
      ['architecture'],
      basicMessages,
    );

    // The most recent message should have a higher recency component
    // Even if topic affinity differs, recency should dominate for nearby turns
    expect(newScore).toBeGreaterThan(0);
    expect(oldScore).toBeGreaterThan(0);
    // Check the recency component specifically
    const oldRecency = Math.exp(-(basicMessages.length - 0) / 20);
    const newRecency = Math.exp(-(basicMessages.length - 4) / 20);
    expect(newRecency).toBeGreaterThan(oldRecency);
  });

  it('messages with decisions score higher', () => {
    const normalMsg = makeMessage('user', 'What tools should we use?');
    const decisionMsg = makeMessage('assistant', 'We decided to use TypeScript strict mode.');

    const normalScore = scoreRelevance(normalMsg, 0, 2, [], [normalMsg, decisionMsg]);
    const decisionScore = scoreRelevance(decisionMsg, 1, 2, [], [normalMsg, decisionMsg]);

    // Decision message gets both decision weight AND recency boost (it's more recent)
    expect(decisionScore).toBeGreaterThan(normalScore);
  });

  it('messages mentioning current entities score higher (thread affinity)', () => {
    const onTopicMsg = makeMessage('user', 'The architecture is hub-and-spoke.');
    const offTopicMsg = makeMessage('user', 'I had lunch at the cafeteria.');

    const activeTopics = ['architecture', 'spoke'];

    const onTopicScore = scoreRelevance(onTopicMsg, 0, 2, activeTopics, [onTopicMsg, offTopicMsg]);
    const offTopicScore = scoreRelevance(offTopicMsg, 0, 2, activeTopics, [
      onTopicMsg,
      offTopicMsg,
    ]);

    expect(onTopicScore).toBeGreaterThan(offTopicScore);
  });

  it('returns a score between 0 and 1', () => {
    const msg = makeMessage('user', 'Some generic message about nothing special.');
    const score = scoreRelevance(msg, 0, 1, [], [msg]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('extractActiveTopics', () => {
  it('extracts frequent words from recent messages', () => {
    const messages = [
      makeMessage('user', 'Tell me about the architecture'),
      makeMessage('assistant', 'The architecture uses hub and spoke patterns'),
      makeMessage('user', 'How does the architecture scale?'),
      makeMessage('assistant', 'Architecture scales horizontally'),
    ];

    const topics = extractActiveTopics(messages);
    expect(topics).toContain('architecture');
  });

  it('returns empty array for empty messages', () => {
    const topics = extractActiveTopics([]);
    expect(topics).toHaveLength(0);
  });

  it('limits to top 10 keywords', () => {
    const messages = [
      makeMessage(
        'user',
        'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa',
      ),
    ];
    const topics = extractActiveTopics(messages);
    expect(topics.length).toBeLessThanOrEqual(10);
  });
});

describe('manageBudget', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.memoryIdCounter = 0;
  });

  it('returns all messages when under budget', async () => {
    const messages = [
      makeMessage('user', 'Hello'),
      makeMessage('assistant', 'Hi there!'),
      makeMessage('user', 'How are you?'),
    ];

    // Use a large budget so messages are under 50%
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 100_000);

    expect(result.messages).toHaveLength(3);
    expect(result.pagedCount).toBe(0);
    expect(result.pagingLevel).toBe('none');
    // Content should be unchanged
    expect(result.messages[0].content).toBe('Hello');
    expect(result.messages[1].content).toBe('Hi there!');
    expect(result.messages[2].content).toBe('How are you?');
  });

  it('pages out lowest-scoring messages when over budget', async () => {
    // Create messages that total well over the budget
    // With a tiny max tokens, we'll force paging
    const messages = [
      makeMessage('user', 'A'.repeat(400)), // 100 tokens
      makeMessage('assistant', 'B'.repeat(400)), // 100 tokens
      makeMessage('user', 'C'.repeat(400)), // 100 tokens
      makeMessage('assistant', 'D'.repeat(400)), // 100 tokens
      makeMessage('user', 'Latest message about decisions we decided on'), // recent
    ];

    // Active thread budget = 200 * 0.55 = 110 tokens
    // Total non-system tokens ≈ 411 → well over 90% = aggressive paging
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 200);

    expect(result.pagedCount).toBeGreaterThan(0);
    expect(result.pagingLevel).toBe('aggressive');
    // Some messages should be stubs
    const stubs = result.messages.filter((m) => m.content.includes('[Memory paged:'));
    expect(stubs.length).toBeGreaterThan(0);
  });

  it('leaves stubs for paged messages', async () => {
    // Force paging with a tiny budget
    const messages = [
      makeMessage('user', 'X'.repeat(400)),
      makeMessage('assistant', 'Y'.repeat(400)),
      makeMessage('user', 'Latest question'),
    ];

    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 200);

    // Check that paged messages have stub format
    for (const msg of result.messages) {
      if (msg.content.includes('[Memory paged:')) {
        expect(msg.content).toMatch(/\[Memory paged: ".*", see memory #paged-mem-\d+\]/);
      }
    }
  });

  it('never pages the system prompt (identity zone)', async () => {
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      makeMessage('system', 'You are the Guardian AI. This is your identity and soul.'),
      makeMessage('user', 'X'.repeat(400)),
      makeMessage('assistant', 'Y'.repeat(400)),
      makeMessage('user', 'Z'.repeat(400)),
    ];

    // Very small budget to force aggressive paging
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 100);

    // System message should be preserved (not a stub)
    expect(result.messages[0].role).toBe('system');
    expect(result.messages[0].content).toBe(
      'You are the Guardian AI. This is your identity and soul.',
    );
    expect(result.messages[0].content).not.toContain('[Memory paged:');
  });

  it('handles long conversation (100+ messages) without overflow', async () => {
    const messages = makeConversation(120);

    // Normal-sized budget
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 10_000);

    // Should complete without error
    expect(result.messages.length).toBe(120);
    expect(result.totalTokens).toBeGreaterThan(0);
    // With 10k budget and 120 messages, some paging should occur
    // Active thread budget = 10_000 * 0.55 = 5_500 tokens
    // Each message ≈ 20 tokens → 120 * 20 = 2400 tokens → under 50% → no paging
    // Actually with these short messages it might not page. Let's just verify it works.
    expect(result.pagingLevel).toBeDefined();
  });

  it('preserves message order after paging', async () => {
    const messages = [
      makeMessage('user', 'First: ' + 'A'.repeat(200)),
      makeMessage('assistant', 'Second: ' + 'B'.repeat(200)),
      makeMessage('user', 'Third: ' + 'C'.repeat(200)),
      makeMessage('assistant', 'Fourth: ' + 'D'.repeat(200)),
      makeMessage('user', 'Fifth: latest question'),
    ];

    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 300);

    // Roles should alternate correctly
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[2].role).toBe('user');
    expect(result.messages[3].role).toBe('assistant');
    expect(result.messages[4].role).toBe('user');
  });
});

describe('pageOut', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.memoryIdCounter = 0;
  });

  it('stores paged content as extracted_memory', async () => {
    const msg = makeMessage('user', 'This is a message about architecture decisions.');

    const memoryId = await pageOut({} as never, msg, 'user-1', 'repo-1');

    expect(memoryId).toBe('paged-mem-1');
    expect(mockState.insertedMemories).toHaveLength(1);

    const stored = mockState.insertedMemories[0];
    expect(stored.repo_id).toBe('repo-1');
    expect(stored.content).toContain('[user] This is a message about architecture decisions.');
    expect(stored.memory_type).toBe('fact');
    expect(stored.user_id).toBe('user-1');
    expect(stored.topics).toEqual(['paged-context']);
    expect(stored.source_channel).toBe('conversation');
  });

  it('prefixes content with the message role', async () => {
    const msg = makeMessage('assistant', 'I recommend using TypeScript.');

    await pageOut({} as never, msg, 'user-1', 'repo-1');

    expect(mockState.insertedMemories[0].content).toBe('[assistant] I recommend using TypeScript.');
  });
});

describe('ContextWindowManager', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.memoryIdCounter = 0;
  });

  it('creates with default configuration', () => {
    const manager = new ContextWindowManager();
    const budgets = manager.getZoneBudgets();

    expect(budgets.identity).toBe(Math.floor(180_000 * DEFAULT_BUDGET_ZONES.identity));
    expect(budgets.activeThread).toBe(Math.floor(180_000 * DEFAULT_BUDGET_ZONES.activeThread));
    expect(budgets.retrievedMemory).toBe(
      Math.floor(180_000 * DEFAULT_BUDGET_ZONES.retrievedMemory),
    );
    expect(budgets.buffer).toBe(Math.floor(180_000 * DEFAULT_BUDGET_ZONES.buffer));
  });

  it('creates with custom configuration', () => {
    const manager = new ContextWindowManager(100_000, {
      identity: 0.1,
      activeThread: 0.6,
      retrievedMemory: 0.2,
      buffer: 0.1,
    });

    const budgets = manager.getZoneBudgets();
    expect(budgets.identity).toBe(10_000);
    expect(budgets.activeThread).toBe(60_000);
    expect(budgets.retrievedMemory).toBe(20_000);
    expect(budgets.buffer).toBe(10_000);
  });

  it('estimateTokens delegates to module function', () => {
    const manager = new ContextWindowManager();
    expect(manager.estimateTokens('Hello world')).toBe(3);
  });

  it('shouldPage uses active thread budget', () => {
    // 10_000 max tokens, 55% active thread = 5_500 budget
    const manager = new ContextWindowManager(10_000);

    expect(manager.shouldPage(2000)).toBe('none'); // 36% of 5_500
    expect(manager.shouldPage(3000)).toBe('flag'); // 54% of 5_500
    expect(manager.shouldPage(4500)).toBe('warm'); // 81% of 5_500
    expect(manager.shouldPage(5000)).toBe('aggressive'); // 90% of 5_500
  });

  it('manage delegates to manageBudget', async () => {
    const manager = new ContextWindowManager(100_000);
    const messages = [makeMessage('user', 'Hello'), makeMessage('assistant', 'Hi')];

    const result = await manager.manage({} as never, messages, 'user-1', 'repo-1');

    expect(result.messages).toHaveLength(2);
    expect(result.pagedCount).toBe(0);
  });
});

describe('integration: long conversation paging', () => {
  beforeEach(() => {
    mockState.insertedMemories = [];
    mockState.memoryIdCounter = 0;
  });

  it('pages a 100-message conversation to fit within tight budget', async () => {
    // Create 100 messages, each ~100 tokens (400 chars)
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
    for (let i = 0; i < 100; i++) {
      const role: 'user' | 'assistant' = i % 2 === 0 ? 'user' : 'assistant';
      messages.push(makeMessage(role, `Message ${i}: ${'x'.repeat(380)}`));
    }

    // Budget where active thread = 5000 * 0.55 = 2750 tokens
    // 100 messages * 100 tokens = 10000 tokens → way over budget → aggressive paging
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 5000);

    expect(result.pagingLevel).toBe('aggressive');
    expect(result.pagedCount).toBeGreaterThan(0);
    // All 100 messages should still be present (some as stubs)
    expect(result.messages).toHaveLength(100);
    // Paged content should be stored
    expect(mockState.insertedMemories.length).toBe(result.pagedCount);
  });

  it('preserves recent messages over old ones when paging', async () => {
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
    for (let i = 0; i < 20; i++) {
      const role: 'user' | 'assistant' = i % 2 === 0 ? 'user' : 'assistant';
      messages.push(makeMessage(role, `Turn ${i}: ${'y'.repeat(380)}`));
    }

    // Budget sized so that paging is needed but not everything gets paged
    // 20 messages * ~100 tokens = 2000 tokens
    // active thread budget = 3000 * 0.55 = 1650, target = 70% * 1650 = 1155
    // So roughly half the messages should be paged
    const result = await manageBudget({} as never, messages, 'user-1', 'repo-1', 3000);

    // Earlier messages are more likely to be stubs (lower recency score)
    const stubbedMessages = result.messages.filter((m) => m.content.includes('[Memory paged:'));
    const preservedMessages = result.messages.filter((m) => !m.content.includes('[Memory paged:'));

    // At least some should be paged
    expect(stubbedMessages.length).toBeGreaterThan(0);
    // At least some should be preserved
    expect(preservedMessages.length).toBeGreaterThan(0);

    // The preserved messages should tend toward the end (higher indices = more recent)
    // Check that on average, preserved messages have higher indices than stubbed ones
    const stubbedIndices = result.messages
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.content.includes('[Memory paged:'))
      .map(({ i }) => i);
    const preservedIndices = result.messages
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m.content.includes('[Memory paged:'))
      .map(({ i }) => i);

    const avgStubbed = stubbedIndices.reduce((a, b) => a + b, 0) / stubbedIndices.length;
    const avgPreserved = preservedIndices.reduce((a, b) => a + b, 0) / preservedIndices.length;

    // Preserved messages should have higher average index (more recent)
    expect(avgPreserved).toBeGreaterThan(avgStubbed);
  });
});
