import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  authMiddleware,
  getAuthUser,
  setAnonClient,
  resetAnonClient,
  type AuthUser,
} from '../auth/supabase-auth.js';
import { ensureUserProfile, linkGitHubIdentity, unlinkGitHubIdentity } from '../auth/identity.js';

// -- Auth Middleware Tests --

// Mock Supabase auth.getUser
const mockGetUser = vi.fn();

function createMockSupabaseClient() {
  return {
    auth: {
      getUser: mockGetUser,
    },
  };
}

describe('authMiddleware', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAnonClient();

    // Set up mock anon client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAnonClient(createMockSupabaseClient() as any);

    // Create a fresh Hono app with auth middleware protecting a test route
    app = new Hono();
    app.use('/protected/*', authMiddleware());
    app.get('/protected/test', (c) => {
      const user = getAuthUser(c);
      return c.json({ user });
    });
  });

  it('rejects requests without Authorization header', async () => {
    const res = await app.request('/protected/test');
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Missing Authorization header');
  });

  it('rejects requests with invalid Authorization format', async () => {
    const res = await app.request('/protected/test', {
      headers: { Authorization: 'InvalidFormat' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Invalid Authorization header format');
  });

  it('rejects invalid JWT token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await app.request('/protected/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Invalid or expired token');
  });

  it('sets user context for valid JWT', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-uid-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    const res = await app.request('/protected/test', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: AuthUser };
    expect(body.user.id).toBe('auth-uid-123');
    expect(body.user.email).toBe('test@example.com');
  });

  it('handles auth service errors gracefully', async () => {
    mockGetUser.mockRejectedValue(new Error('Service unavailable'));

    const res = await app.request('/protected/test', {
      headers: { Authorization: 'Bearer some-token' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe('Authentication failed');
  });
});

// -- Identity Tests --

// Hoist mock state so it's available when vi.mock factories run
const mockState = vi.hoisted(() => ({
  existingProfile: null as Record<string, unknown> | null,
  insertedProfile: null as Record<string, unknown> | null,
  updatedProfile: null as Record<string, unknown> | null,
}));

vi.mock('../db/queries.js', () => ({
  getUserProfileByAuthId: vi.fn(() => {
    if (mockState.existingProfile) {
      return Promise.resolve(mockState.existingProfile);
    }
    // Return null to simulate no existing profile
    return Promise.resolve(null);
  }),
  insertUserProfile: vi.fn((_client: unknown, data: Record<string, unknown>) => {
    mockState.insertedProfile = data;
    return Promise.resolve({
      id: 'user-uuid-001',
      supabase_auth_id: data.supabase_auth_id,
      email: data.email,
      display_name: data.display_name,
      github_contributor_id: null,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      interaction_count: 0,
      summary: null,
      interests: null,
      communication_style: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
}));

// Mock Supabase client for identity functions (direct DB calls)
function createMockDbClient(returnData: Record<string, unknown> | null = null) {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: returnData,
                error: null,
              }),
            ),
          })),
        })),
      })),
    })),
  };
}

describe('ensureUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.existingProfile = null;
    mockState.insertedProfile = null;
  });

  it('creates new profile on first call', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = {} as any;
    const result = await ensureUserProfile(client, 'auth-123', 'test@example.com', 'Test User');

    expect(mockState.insertedProfile).not.toBeNull();
    expect(mockState.insertedProfile!.supabase_auth_id).toBe('auth-123');
    expect(mockState.insertedProfile!.email).toBe('test@example.com');
    expect(mockState.insertedProfile!.display_name).toBe('Test User');
    expect(result.id).toBe('user-uuid-001');
  });

  it('returns existing profile on subsequent calls', async () => {
    mockState.existingProfile = {
      id: 'existing-uuid',
      supabase_auth_id: 'auth-123',
      email: 'existing@example.com',
      display_name: 'Existing User',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = {} as any;
    const result = await ensureUserProfile(client, 'auth-123', 'existing@example.com');

    expect(result.id).toBe('existing-uuid');
    expect(mockState.insertedProfile).toBeNull();
  });

  it('handles missing email and display name', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = {} as any;
    const result = await ensureUserProfile(client, 'auth-456', undefined);

    expect(mockState.insertedProfile).not.toBeNull();
    expect(mockState.insertedProfile!.email).toBeNull();
    expect(mockState.insertedProfile!.display_name).toBeNull();
    expect(result.id).toBe('user-uuid-001');
  });
});

describe('linkGitHubIdentity', () => {
  it('links user to contributor profile', async () => {
    const linkedProfile = {
      id: 'user-uuid-001',
      github_contributor_id: 'contrib-uuid-001',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createMockDbClient(linkedProfile) as any;

    const result = await linkGitHubIdentity(client, 'user-uuid-001', 'contrib-uuid-001');
    expect(result.github_contributor_id).toBe('contrib-uuid-001');
    expect(client.from).toHaveBeenCalledWith('user_profiles');
  });
});

describe('unlinkGitHubIdentity', () => {
  it('removes the link from user profile', async () => {
    const unlinkedProfile = {
      id: 'user-uuid-001',
      github_contributor_id: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createMockDbClient(unlinkedProfile) as any;

    const result = await unlinkGitHubIdentity(client, 'user-uuid-001');
    expect(result.github_contributor_id).toBeNull();
    expect(client.from).toHaveBeenCalledWith('user_profiles');
  });
});
