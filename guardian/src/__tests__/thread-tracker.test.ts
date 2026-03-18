import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreadTracker, type ConversationThread } from '../agents/thread-tracker.js';

// -- Mock DB queries for persistence tests --

const mockState = vi.hoisted(() => ({
  storedState: null as Record<string, unknown> | null,
}));

vi.mock('../db/queries.js', () => ({
  getAgentState: vi.fn(async () => {
    return mockState.storedState;
  }),
  upsertAgentState: vi.fn(async (_client: unknown, state: Record<string, unknown>) => {
    mockState.storedState = {
      metadata: (state as { metadata: Record<string, unknown> }).metadata,
    };
    return state;
  }),
  getThreadsForConversation: vi.fn(async () => {
    if (!mockState.storedState) return [];
    const metadata = (mockState.storedState as { metadata: Record<string, unknown> }).metadata;
    if (!metadata?.threads) return [];
    return metadata.threads as ConversationThread[];
  }),
  saveThreads: vi.fn(async (_client: unknown, _convId: string, threads: ConversationThread[]) => {
    mockState.storedState = {
      metadata: { threads },
    };
  }),
}));

// Import persistence functions after mock
import { getThreadsForConversation, saveThreads } from '../db/queries.js';

// -- Test Helpers --

function createTracker(threads?: ConversationThread[]): ThreadTracker {
  return new ThreadTracker('conv-1', 'user-1', threads);
}

// -- Tests --

describe('ThreadTracker: detectThread', () => {
  let tracker: ThreadTracker;

  beforeEach(() => {
    tracker = createTracker();
  });

  it('identifies a new thread from a topic introduction', () => {
    const action = tracker.detectThread('Let us discuss the authentication migration strategy');
    expect(action.type).toBe('new');
    if (action.type === 'new') {
      expect(action.topic).toBeTruthy();
      expect(action.topic.length).toBeGreaterThan(0);
    }
  });

  it('identifies continuation of an existing thread', () => {
    // Start a thread first
    tracker.startThread('authentication migration');

    const action = tracker.detectThread('What about the token refresh approach?');
    expect(action.type).toBe('continue');
  });

  it('identifies thread resumption with "back to..."', () => {
    // Create and pause a thread
    const thread = tracker.startThread('authentication migration');
    // Create a new thread (which pauses the first)
    tracker.startThread('database optimization');

    const action = tracker.detectThread("Let's go back to the authentication migration", [
      'We need to optimize the database queries',
    ]);
    expect(action.type).toBe('resume');
    if (action.type === 'resume') {
      expect(action.threadId).toBe(thread.id);
      expect(action.matchedPhrase).toBeTruthy();
    }
  });

  it('identifies thread resumption with "where were we"', () => {
    // Create a paused thread
    tracker.startThread('API design review');
    tracker.startThread('some other topic');

    const action = tracker.detectThread('Where were we on the API?');
    expect(action.type).toBe('resume');
  });

  it('identifies thread completion with "that\'s done"', () => {
    const thread = tracker.startThread('fixing the login bug');
    const action = tracker.detectThread("That's done, the bug is fixed");
    expect(action.type).toBe('complete');
    if (action.type === 'complete') {
      expect(action.threadId).toBe(thread.id);
    }
  });

  it('identifies thread completion with "let\'s move on"', () => {
    const thread = tracker.startThread('refactoring the user module');
    const action = tracker.detectThread("Let's move on to something else");
    expect(action.type).toBe('complete');
    if (action.type === 'complete') {
      expect(action.threadId).toBe(thread.id);
    }
  });

  it('returns "none" for trivial messages', () => {
    const action = tracker.detectThread('ok');
    expect(action.type).toBe('none');
  });

  it('detects topic shift and starts new thread', () => {
    // Start with a thread about auth
    tracker.startThread('authentication system');

    const previousMessages = [
      'We should implement JWT tokens for the auth system',
      'The token refresh needs to be automatic',
    ];

    const action = tracker.detectThread(
      'What about the deployment pipeline and CI/CD configuration?',
      previousMessages,
    );
    expect(action.type).toBe('new');
  });

  it('resumes most recent paused thread when no keyword match', () => {
    // Create two paused threads
    tracker.startThread('first topic alpha');
    tracker.startThread('second topic beta');
    tracker.startThread('third topic gamma');

    // "second topic" is the most recently paused (it was paused when "third" started)
    // Actually: first is paused when second starts, second is paused when third starts
    // So second is the most recently paused

    const action = tracker.detectThread("Let's get back to what we had before");
    expect(action.type).toBe('resume');
  });
});

describe('ThreadTracker: updateThread', () => {
  let tracker: ThreadTracker;

  beforeEach(() => {
    tracker = createTracker();
  });

  it('adds new steps as conversation progresses', () => {
    const thread = tracker.startThread('database schema design');
    tracker.updateThread(thread.id, 'We need a users table with email and name fields');

    const threads = tracker.getThreads();
    const updated = threads.find((t) => t.id === thread.id);
    expect(updated).toBeTruthy();
    expect(updated!.steps.length).toBe(1);
    expect(updated!.steps[0].status).toBe('in_progress');
  });

  it('marks steps completed when decisions are detected', () => {
    const thread = tracker.startThread('choosing a database');
    tracker.updateThread(thread.id, 'We are comparing PostgreSQL and MySQL');

    // Decision message
    tracker.updateThread(thread.id, "Let's go with PostgreSQL for this project");

    const threads = tracker.getThreads();
    const updated = threads.find((t) => t.id === thread.id);
    expect(updated).toBeTruthy();
    // First step should be marked completed by the decision
    expect(updated!.steps[0].status).toBe('completed');
  });

  it('returns null for non-existent thread', () => {
    const result = tracker.updateThread('nonexistent', 'hello');
    expect(result).toBeNull();
  });

  it('updates currentStepIndex to the latest step', () => {
    const thread = tracker.startThread('multi-step process');
    tracker.updateThread(thread.id, 'Step one: plan the architecture');
    tracker.updateThread(thread.id, 'Step two: implement the core');
    tracker.updateThread(thread.id, 'Step three: write tests');

    const threads = tracker.getThreads();
    const updated = threads.find((t) => t.id === thread.id);
    expect(updated!.steps.length).toBe(3);
    expect(updated!.currentStepIndex).toBe(2);
  });
});

describe('ThreadTracker: getActiveThreads', () => {
  let tracker: ThreadTracker;

  beforeEach(() => {
    tracker = createTracker();
  });

  it('returns active and paused threads', () => {
    tracker.startThread('active topic');
    // This pauses 'active topic' and creates a new active one
    tracker.startThread('another active topic');

    const active = tracker.getActiveThreads();
    expect(active.length).toBe(2);
    const statuses = active.map((t) => t.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('paused');
  });

  it('excludes completed and abandoned threads', () => {
    const t1 = tracker.startThread('will be completed');
    tracker.completeThread(t1.id);
    tracker.startThread('still active');

    const active = tracker.getActiveThreads();
    expect(active.length).toBe(1);
    expect(active[0].status).toBe('active');
  });

  it('returns empty when no threads exist', () => {
    const active = tracker.getActiveThreads();
    expect(active.length).toBe(0);
  });
});

describe('ThreadTracker: summarizeThread', () => {
  it('produces a concise one-liner', () => {
    const tracker = createTracker();
    const thread = tracker.startThread('authentication migration');
    tracker.updateThread(thread.id, 'Decided to use Supabase Auth');
    tracker.updateThread(thread.id, 'Need to implement token refresh');

    const summary = tracker.summarizeThread(thread.id);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(100);
    expect(summary).toContain('authentication migration');
  });

  it('includes step progress in summary', () => {
    const tracker = createTracker();
    const thread = tracker.startThread('api design');
    tracker.updateThread(thread.id, 'Define endpoints');
    tracker.updateThread(thread.id, 'Choose REST vs GraphQL');

    const summary = tracker.summarizeThread(thread.id);
    // Should contain step count information
    expect(summary).toMatch(/step \d+ of \d+/);
  });

  it('returns empty string for non-existent thread', () => {
    const tracker = createTracker();
    const summary = tracker.summarizeThread('nonexistent');
    expect(summary).toBe('');
  });
});

describe('ThreadTracker: crossReference', () => {
  it('links related threads bidirectionally', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('auth implementation');
    const t2 = tracker.startThread('user management');

    const result = tracker.crossReference(t1.id, t2.id);
    expect(result).toBe(true);

    const threads = tracker.getThreads();
    const thread1 = threads.find((t) => t.id === t1.id);
    const thread2 = threads.find((t) => t.id === t2.id);

    expect(thread1!.relatedThreadIds).toContain(t2.id);
    expect(thread2!.relatedThreadIds).toContain(t1.id);
  });

  it('does not duplicate cross-references', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('auth implementation');
    const t2 = tracker.startThread('user management');

    tracker.crossReference(t1.id, t2.id);
    tracker.crossReference(t1.id, t2.id); // duplicate

    const threads = tracker.getThreads();
    const thread1 = threads.find((t) => t.id === t1.id);
    expect(thread1!.relatedThreadIds.filter((id) => id === t2.id).length).toBe(1);
  });

  it('returns false for non-existent thread', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('real thread');
    const result = tracker.crossReference(t1.id, 'nonexistent');
    expect(result).toBe(false);
  });
});

describe('ThreadTracker: startThread and resumeThread', () => {
  it('pauses the active thread when starting a new one', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('first topic');
    tracker.startThread('second topic');

    const threads = tracker.getThreads();
    const first = threads.find((t) => t.id === t1.id);
    expect(first!.status).toBe('paused');
  });

  it('resumeThread reactivates a paused thread', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('first topic');
    tracker.startThread('second topic');

    const resumed = tracker.resumeThread(t1.id);
    expect(resumed).not.toBeNull();
    expect(resumed!.status).toBe('active');
  });

  it('resumeThread returns null for non-paused thread', () => {
    const tracker = createTracker();
    const t1 = tracker.startThread('active topic');
    // t1 is active, not paused
    const result = tracker.resumeThread(t1.id);
    expect(result).toBeNull();
  });
});

describe('ThreadTracker: completeThread', () => {
  it('marks thread as completed', () => {
    const tracker = createTracker();
    const thread = tracker.startThread('finishing up');
    const completed = tracker.completeThread(thread.id);
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe('completed');
  });

  it('marks in-progress steps as completed', () => {
    const tracker = createTracker();
    const thread = tracker.startThread('multi-step');
    tracker.updateThread(thread.id, 'step one');
    tracker.completeThread(thread.id);

    const threads = tracker.getThreads();
    const updated = threads.find((t) => t.id === thread.id);
    const inProgressSteps = updated!.steps.filter((s) => s.status === 'in_progress');
    expect(inProgressSteps.length).toBe(0);
  });
});

describe('ThreadTracker: buildThreadContext', () => {
  it('produces context string with active threads', () => {
    const tracker = createTracker();
    tracker.startThread('database migration');
    tracker.updateThread(tracker.getThreads()[0].id, 'planning schema changes');

    const context = tracker.buildThreadContext();
    expect(context).toContain('Current threads:');
    expect(context).toContain('database migration');
  });

  it('marks paused threads with [paused] tag', () => {
    const tracker = createTracker();
    tracker.startThread('first topic');
    tracker.startThread('second topic');

    const context = tracker.buildThreadContext();
    expect(context).toContain('[paused]');
  });

  it('returns empty string when no active threads', () => {
    const tracker = createTracker();
    const context = tracker.buildThreadContext();
    expect(context).toBe('');
  });
});

describe('ThreadTracker: hydration from existing threads', () => {
  it('restores threads from constructor argument', () => {
    const existingThread: ConversationThread = {
      id: 'thread-existing',
      conversationId: 'conv-1',
      userId: 'user-1',
      topic: 'previously tracked topic',
      status: 'active',
      steps: [
        {
          index: 0,
          description: 'discussed initial approach',
          status: 'completed',
          timestamp: new Date().toISOString(),
        },
      ],
      currentStepIndex: 0,
      relatedThreadIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tracker = createTracker([existingThread]);
    const threads = tracker.getActiveThreads();
    expect(threads.length).toBe(1);
    expect(threads[0].topic).toBe('previously tracked topic');
  });
});

describe('Thread persistence: save and load round-trip', () => {
  beforeEach(() => {
    mockState.storedState = null;
  });

  it('persists and restores threads via queries', async () => {
    const tracker = new ThreadTracker('conv-persist', 'user-1');
    tracker.startThread('persistent topic');
    tracker.updateThread(tracker.getThreads()[0].id, 'added a step');

    const threads = tracker.getThreads();

    // Save
    await saveThreads({} as never, 'conv-persist', threads);

    // Load
    const loaded = await getThreadsForConversation({} as never, 'conv-persist');
    expect(loaded.length).toBe(1);
    expect(loaded[0].topic).toBe('persistent topic');
    expect(loaded[0].steps.length).toBe(1);

    // Hydrate a new tracker
    const restoredTracker = new ThreadTracker('conv-persist', 'user-1', loaded);
    const restoredThreads = restoredTracker.getActiveThreads();
    expect(restoredThreads.length).toBe(1);
    expect(restoredThreads[0].topic).toBe('persistent topic');
  });
});

describe('Integration: thread context in system prompt', () => {
  it('thread context includes summary with steps', () => {
    const tracker = createTracker();
    const thread = tracker.startThread('auth migration');
    tracker.updateThread(thread.id, 'decided to use supabase auth');
    tracker.updateThread(thread.id, 'need to implement token refresh');

    const context = tracker.buildThreadContext();
    expect(context).toContain('Current threads:');
    expect(context).toContain('auth migration');
    expect(context).toMatch(/step \d+ of \d+/);
  });

  it('thread context can be injected into system prompt', async () => {
    // Simulate what response.ts does
    const { buildChatSystemPrompt } = await import('../chat/response.js');

    const memories = [
      { content: 'User prefers TypeScript', memory_type: 'preference', topics: ['typescript'] },
    ];

    const threadContext = 'Current threads:\n- auth migration: planning phase (step 1 of 2)';

    const prompt = buildChatSystemPrompt(memories, null, threadContext);
    expect(prompt).toContain('--- Memory Context ---');
    expect(prompt).toContain('--- Active Threads ---');
    expect(prompt).toContain('auth migration');
  });

  it('system prompt omits thread section when no threads', async () => {
    const { buildChatSystemPrompt } = await import('../chat/response.js');

    const memories = [
      { content: 'User prefers TypeScript', memory_type: 'preference', topics: ['typescript'] },
    ];

    const prompt = buildChatSystemPrompt(memories, null, undefined);
    expect(prompt).toContain('--- Memory Context ---');
    expect(prompt).not.toContain('--- Active Threads ---');
  });
});

describe('Thread detection edge cases', () => {
  it('handles empty conversation history', () => {
    const tracker = createTracker();
    const action = tracker.detectThread('Starting a new discussion about APIs', []);
    expect(action.type).toBe('new');
  });

  it('handles very long messages without crashing', () => {
    const tracker = createTracker();
    const longMessage = 'word '.repeat(1000);
    const action = tracker.detectThread(longMessage);
    // Should not throw
    expect(['new', 'none']).toContain(action.type);
  });

  it('handles unicode and special characters', () => {
    const tracker = createTracker();
    const action = tracker.detectThread('Let us discuss the Uber API integration');
    expect(['new', 'none']).toContain(action.type);
  });
});
