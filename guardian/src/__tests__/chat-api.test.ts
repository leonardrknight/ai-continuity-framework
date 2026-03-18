import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// -- Hoisted mock state --

const mockState = vi.hoisted(() => ({
  // Auth
  authUser: { id: 'auth-uid-123', email: 'test@example.com' } as {
    id: string;
    email: string | undefined;
  } | null,
  // User profile
  userProfile: {
    id: 'user-uuid-001',
    supabase_auth_id: 'auth-uid-123',
    email: 'test@example.com',
    display_name: 'Test User',
    github_contributor_id: null,
    first_seen_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-03-16T00:00:00Z',
    interaction_count: 5,
    summary: null,
    interests: null,
    communication_style: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-16T00:00:00Z',
  },
  // Conversations
  conversations: [] as Array<{
    id: string;
    user_id: string;
    title: string | null;
    status: string;
    message_count: number;
    created_at: string;
    updated_at: string;
  }>,
  // Messages
  messages: [] as Array<{
    id: string;
    conversation_id: string;
    user_id: string;
    role: string;
    content: string;
    processed: boolean;
    processed_at: string | null;
    created_at: string;
  }>,
  // LLM response
  llmResponseText: 'I remember that. Here is my response based on your memories.',
  // Retrieval result
  memoriesUsed: 2,
  // Counters for tracking calls
  insertedMessages: [] as Array<{
    conversation_id: string;
    user_id: string;
    role: string;
    content: string;
  }>,
  insertedConversations: [] as Array<{ user_id: string; title: string | null }>,
  // Error simulation
  llmShouldFail: false,
}));

// -- Mock auth middleware --

vi.mock('../auth/supabase-auth.js', () => ({
  authMiddleware: vi.fn(() => {
    return async (
      c: {
        set: (key: string, val: unknown) => void;
        json: (body: unknown, status: number) => unknown;
        req: { header: (name: string) => string | undefined };
      },
      next: () => Promise<void>,
    ) => {
      if (!mockState.authUser) {
        return c.json({ error: 'Missing Authorization header' }, 401);
      }
      // Check for Authorization header
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        return c.json({ error: 'Missing Authorization header' }, 401);
      }
      c.set('authUser', mockState.authUser);
      await next();
    };
  }),
  getAuthUser: vi.fn((c: { get: (key: string) => unknown }) => {
    return c.get('authUser');
  }),
  resetAnonClient: vi.fn(),
  setAnonClient: vi.fn(),
}));

// -- Mock identity --

vi.mock('../auth/identity.js', () => ({
  ensureUserProfile: vi.fn(async () => mockState.userProfile),
}));

// -- Mock DB client --

vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

// -- Mock DB queries --

let messageIdCounter = 0;
let conversationIdCounter = 0;

vi.mock('../db/queries.js', () => ({
  insertConversation: vi.fn(
    async (_client: unknown, data: { user_id: string; title?: string | null }) => {
      conversationIdCounter++;
      const conv = {
        id: `conv-uuid-${conversationIdCounter}`,
        user_id: data.user_id,
        title: data.title ?? null,
        status: 'active',
        message_count: 0,
        created_at: '2026-03-16T00:00:00Z',
        updated_at: '2026-03-16T00:00:00Z',
      };
      mockState.insertedConversations.push({ user_id: data.user_id, title: data.title ?? null });
      mockState.conversations.push(conv);
      return conv;
    },
  ),
  getConversationsByUser: vi.fn(async (_client: unknown, userId: string) => {
    return mockState.conversations.filter((c) => c.user_id === userId);
  }),
  getConversationById: vi.fn(async (_client: unknown, id: string) => {
    return mockState.conversations.find((c) => c.id === id) ?? null;
  }),
  insertMessage: vi.fn(
    async (
      _client: unknown,
      data: { conversation_id: string; user_id: string; role: string; content: string },
    ) => {
      messageIdCounter++;
      const msg = {
        id: `msg-uuid-${messageIdCounter}`,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        role: data.role,
        content: data.content,
        processed: false,
        processed_at: null,
        created_at: '2026-03-16T00:00:00Z',
      };
      mockState.insertedMessages.push(data);
      mockState.messages.push(msg);
      return msg;
    },
  ),
  getMessagesByConversation: vi.fn(async (_client: unknown, convId: string) => {
    return mockState.messages.filter((m) => m.conversation_id === convId);
  }),
  updateConversationMessageCount: vi.fn(async () => {}),
  matchMemories: vi.fn(async () => []),
  recordMemoryAccess: vi.fn(async () => {}),
  getContributorById: vi.fn(async () => null),
  getUserProfileByAuthId: vi.fn(async () => mockState.userProfile),
  insertUserProfile: vi.fn(async () => mockState.userProfile),
  getAgentState: vi.fn(async () => null),
  getThreadsForConversation: vi.fn(async () => []),
  saveThreads: vi.fn(async () => {}),
}));

// -- Mock retriever --

vi.mock('../agents/retriever.js', () => ({
  runRetriever: vi.fn(async () => ({
    memories: [
      {
        id: 'mem-001',
        content: 'The team decided to use TypeScript strict mode.',
        memory_type: 'decision',
        topics: ['typescript'],
        importance_score: 0.8,
        semantic_score: 0.85,
        recency_score: 1.0,
        final_score: 0.67,
      },
      {
        id: 'mem-002',
        content: 'Hub-and-spoke architecture is the preferred pattern.',
        memory_type: 'decision',
        topics: ['architecture'],
        importance_score: 0.9,
        semantic_score: 0.8,
        recency_score: 0.9,
        final_score: 0.72,
      },
    ],
    contributorProfile: null,
    contextBlock: '## Relevant Memories\n- (decision [typescript]) TypeScript strict mode.',
    latencyMs: 30,
    degradation: 'full' as const,
  })),
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

// -- Mock embeddings --

vi.mock('../llm/embeddings.js', () => ({
  generateEmbedding: vi.fn(async () => null),
}));

// -- Mock config --

vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({
    PORT: 3000,
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    OPENAI_API_KEY: 'test-openai-key',
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_PRIVATE_KEY: 'test-private-key',
    GITHUB_WEBHOOK_SECRET: 'test-webhook-secret',
    GUARDIAN_REPO: 'leonardrknight/ai-continuity-framework',
  })),
}));

// Import after mocks
import { chatRouter, conversationsRouter } from '../chat/router.js';

// -- Test app setup --

function createTestApp() {
  const app = new Hono();
  app.route('/api/chat', chatRouter);
  app.route('/api/conversations', conversationsRouter);
  return app;
}

// -- Tests --

describe('POST /api/chat', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authUser = { id: 'auth-uid-123', email: 'test@example.com' };
    mockState.conversations = [];
    mockState.messages = [];
    mockState.insertedMessages = [];
    mockState.insertedConversations = [];
    mockState.llmResponseText = 'I remember that. Here is my response based on your memories.';
    mockState.llmShouldFail = false;
    messageIdCounter = 0;
    conversationIdCounter = 0;
    app = createTestApp();
  });

  it('sends message and gets response with memory context', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ message: 'What architecture do we use?' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.response).toBe(mockState.llmResponseText);
    expect(body.conversation_id).toBeDefined();
    expect(body.user_message_id).toBeDefined();
    expect(body.assistant_message_id).toBeDefined();
    expect(body.memories_used).toBe(2);
  });

  it('creates new conversation when no conversation_id provided', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ message: 'Hello Guardian' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.conversation_id).toBeDefined();
    expect(mockState.insertedConversations.length).toBe(1);
    expect(mockState.insertedConversations[0].title).toBe('Hello Guardian');
  });

  it('appends to existing conversation', async () => {
    // Create a conversation first
    const existingConv = {
      id: 'conv-existing',
      user_id: 'user-uuid-001',
      title: 'Existing conversation',
      status: 'active',
      message_count: 2,
      created_at: '2026-03-16T00:00:00Z',
      updated_at: '2026-03-16T00:00:00Z',
    };
    mockState.conversations.push(existingConv);

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        conversation_id: 'conv-existing',
        message: 'Follow up question',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.conversation_id).toBe('conv-existing');
    // No new conversation should be created
    expect(mockState.insertedConversations.length).toBe(0);
  });

  it('rejects unauthenticated requests (401)', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header
      },
      body: JSON.stringify({ message: 'Hello' }),
    });

    expect(res.status).toBe(401);
  });

  it('stores both user and assistant messages', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ message: 'Tell me about memory systems' }),
    });

    expect(res.status).toBe(200);
    // Should have inserted 2 messages: user + assistant
    expect(mockState.insertedMessages.length).toBe(2);
    expect(mockState.insertedMessages[0].role).toBe('user');
    expect(mockState.insertedMessages[0].content).toBe('Tell me about memory systems');
    expect(mockState.insertedMessages[1].role).toBe('assistant');
    expect(mockState.insertedMessages[1].content).toBe(mockState.llmResponseText);
  });

  it('rejects empty message', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ message: '' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Message is required');
  });

  it('returns 404 for non-existent conversation', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        conversation_id: 'non-existent',
        message: 'Hello',
      }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 for another user's conversation", async () => {
    // Create a conversation owned by a different user
    mockState.conversations.push({
      id: 'conv-other',
      user_id: 'other-user-uuid',
      title: 'Other user chat',
      status: 'active',
      message_count: 0,
      created_at: '2026-03-16T00:00:00Z',
      updated_at: '2026-03-16T00:00:00Z',
    });

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        conversation_id: 'conv-other',
        message: 'Sneaky message',
      }),
    });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/conversations', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authUser = { id: 'auth-uid-123', email: 'test@example.com' };
    mockState.conversations = [];
    mockState.messages = [];
    mockState.insertedMessages = [];
    mockState.insertedConversations = [];
    messageIdCounter = 0;
    conversationIdCounter = 0;
    app = createTestApp();
  });

  it("returns user's conversations", async () => {
    // Add some conversations for this user
    mockState.conversations = [
      {
        id: 'conv-1',
        user_id: 'user-uuid-001',
        title: 'First chat',
        status: 'active',
        message_count: 5,
        created_at: '2026-03-16T00:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      },
      {
        id: 'conv-2',
        user_id: 'user-uuid-001',
        title: 'Second chat',
        status: 'active',
        message_count: 3,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-16T08:00:00Z',
      },
    ];

    const res = await app.request('/api/conversations', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { conversations: Array<{ id: string }> };
    expect(body.conversations).toHaveLength(2);
    expect(body.conversations[0].id).toBe('conv-1');
  });

  it('rejects unauthenticated requests (401)', async () => {
    const res = await app.request('/api/conversations');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/conversations', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authUser = { id: 'auth-uid-123', email: 'test@example.com' };
    mockState.conversations = [];
    mockState.insertedConversations = [];
    conversationIdCounter = 0;
    app = createTestApp();
  });

  it('creates a new conversation with title', async () => {
    const res = await app.request('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ title: 'Memory architecture discussion' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { conversation: { id: string; title: string } };
    expect(body.conversation.title).toBe('Memory architecture discussion');
    expect(body.conversation.id).toBeDefined();
  });

  it('creates a new conversation without title', async () => {
    const res = await app.request('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { conversation: { id: string; title: string | null } };
    expect(body.conversation.title).toBeNull();
  });
});

describe('GET /api/conversations/:id', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authUser = { id: 'auth-uid-123', email: 'test@example.com' };
    mockState.conversations = [];
    mockState.messages = [];
    messageIdCounter = 0;
    app = createTestApp();
  });

  it('returns conversation with messages', async () => {
    mockState.conversations = [
      {
        id: 'conv-abc',
        user_id: 'user-uuid-001',
        title: 'Test chat',
        status: 'active',
        message_count: 2,
        created_at: '2026-03-16T00:00:00Z',
        updated_at: '2026-03-16T00:00:00Z',
      },
    ];
    mockState.messages = [
      {
        id: 'msg-1',
        conversation_id: 'conv-abc',
        user_id: 'user-uuid-001',
        role: 'user',
        content: 'Hello',
        processed: false,
        processed_at: null,
        created_at: '2026-03-16T00:00:00Z',
      },
      {
        id: 'msg-2',
        conversation_id: 'conv-abc',
        user_id: 'user-uuid-001',
        role: 'assistant',
        content: 'Hi there!',
        processed: false,
        processed_at: null,
        created_at: '2026-03-16T00:01:00Z',
      },
    ];

    const res = await app.request('/api/conversations/conv-abc', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      conversation: { id: string };
      messages: Array<{ id: string; role: string; content: string }>;
    };
    expect(body.conversation.id).toBe('conv-abc');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[1].role).toBe('assistant');
  });

  it("rejects access to other user's conversations", async () => {
    mockState.conversations = [
      {
        id: 'conv-other',
        user_id: 'different-user-uuid',
        title: 'Not your chat',
        status: 'active',
        message_count: 0,
        created_at: '2026-03-16T00:00:00Z',
        updated_at: '2026-03-16T00:00:00Z',
      },
    ];

    const res = await app.request('/api/conversations/conv-other', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Access denied');
  });

  it('returns 404 for non-existent conversation', async () => {
    const res = await app.request('/api/conversations/non-existent', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(res.status).toBe(404);
  });
});

describe('Response generation includes retrieved memories', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.authUser = { id: 'auth-uid-123', email: 'test@example.com' };
    mockState.conversations = [];
    mockState.messages = [];
    mockState.insertedMessages = [];
    mockState.insertedConversations = [];
    mockState.llmResponseText = 'Based on my memories, TypeScript strict mode is standard.';
    mockState.llmShouldFail = false;
    messageIdCounter = 0;
    conversationIdCounter = 0;
    app = createTestApp();
  });

  it('memories_used count is included in response', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ message: 'What TypeScript config do we use?' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.memories_used).toBe(2);
    expect(body.response).toContain('TypeScript');
  });
});

describe('Auto-title generation', () => {
  it('generates title from first message', async () => {
    // Import after mocks are set up
    const { generateAutoTitle } = await import('../chat/response.js');

    // '!' is a sentence delimiter, so 'Hello Guardian!' -> 'Hello Guardian'
    expect(generateAutoTitle('Hello Guardian!')).toBe('Hello Guardian');
    // '?' is a sentence delimiter, so the title is 'What is the architecture of this project'
    expect(generateAutoTitle('What is the architecture of this project?')).toBe(
      'What is the architecture of this project',
    );
  });

  it('truncates long messages for title', async () => {
    const { generateAutoTitle } = await import('../chat/response.js');

    const longMessage =
      'This is a very long message that should be truncated because it exceeds sixty characters in total length';
    const title = generateAutoTitle(longMessage);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('...');
  });

  it('uses first sentence as title', async () => {
    const { generateAutoTitle } = await import('../chat/response.js');

    expect(generateAutoTitle('First sentence. Second sentence.')).toBe('First sentence');
    expect(generateAutoTitle('Question? More text.')).toBe('Question');
  });
});
