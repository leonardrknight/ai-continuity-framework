import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../app.js';
import {
  verifySignature,
  extractContentText,
  extractUsername,
  extractRepoId,
  compositeEventType,
} from '../github/webhooks.js';
import { FIXTURES } from './fixtures/github-events.js';

// -- Unit tests: pure functions --

describe('verifySignature', () => {
  const secret = 'test-webhook-secret';

  function sign(payload: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  it('accepts valid signature', () => {
    const payload = '{"test": true}';
    const sig = sign(payload);
    expect(verifySignature(payload, sig, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifySignature('{"test": true}', 'sha256=invalid', secret)).toBe(false);
  });

  it('rejects empty signature', () => {
    expect(verifySignature('body', '', secret)).toBe(false);
  });

  it('rejects mismatched payload', () => {
    const sig = sign('original');
    expect(verifySignature('tampered', sig, secret)).toBe(false);
  });
});

describe('extractContentText', () => {
  it('extracts issue content', () => {
    const text = extractContentText('issues', FIXTURES.issueOpened.payload);
    expect(text).toContain('[Issue #42]');
    expect(text).toContain('Add memory decay algorithm');
    expect(text).toContain('Ebbinghaus-inspired');
  });

  it('extracts issue comment content', () => {
    const text = extractContentText('issue_comment', FIXTURES.issueComment.payload);
    expect(text).toContain('[Comment on #42]');
    expect(text).toContain('SM-2 reinforcement');
  });

  it('extracts PR opened content', () => {
    const text = extractContentText('pull_request', FIXTURES.pullRequestOpened.payload);
    expect(text).toContain('[PR #15 opened]');
    expect(text).toContain('Extractor Agent');
  });

  it('extracts PR merged content', () => {
    const text = extractContentText('pull_request', FIXTURES.pullRequestClosed.payload);
    expect(text).toContain('[PR #15 merged]');
  });

  it('extracts PR review content', () => {
    const text = extractContentText('pull_request_review', FIXTURES.pullRequestReview.payload);
    expect(text).toContain('[Review on PR #15');
    expect(text).toContain('approved');
    expect(text).toContain('LGTM');
  });

  it('extracts push content', () => {
    const text = extractContentText('push', FIXTURES.push.payload);
    expect(text).toContain('[Push to main]');
    expect(text).toContain('voice capture template');
  });

  it('returns null for unknown event types', () => {
    expect(extractContentText('unknown_event', {})).toBeNull();
  });
});

describe('extractUsername', () => {
  it('extracts username from sender', () => {
    expect(extractUsername(FIXTURES.issueOpened.payload)).toBe('alice');
    expect(extractUsername(FIXTURES.issueComment.payload)).toBe('bob');
  });

  it('returns unknown for missing sender', () => {
    expect(extractUsername({})).toBe('unknown');
  });
});

describe('extractRepoId', () => {
  it('extracts repo full name', () => {
    expect(extractRepoId(FIXTURES.issueOpened.payload)).toBe(
      'leonardrknight/ai-continuity-framework',
    );
  });

  it('returns unknown for missing repo', () => {
    expect(extractRepoId({})).toBe('unknown/unknown');
  });
});

describe('compositeEventType', () => {
  it('combines event type and action', () => {
    expect(compositeEventType('issues', { action: 'opened' })).toBe('issues.opened');
    expect(compositeEventType('pull_request', { action: 'closed' })).toBe('pull_request.closed');
  });

  it('returns event type alone when no action', () => {
    expect(compositeEventType('push', {})).toBe('push');
  });
});

// -- Integration tests: webhook endpoint --

// Hoist mock state so it's available when vi.mock factories run
const mockState = vi.hoisted(() => ({
  insertedRawEvents: [] as Record<string, unknown>[],
  upsertedProfiles: [] as Record<string, unknown>[],
  incrementedIds: [] as string[],
}));

// Mock DB client (just returns a dummy — queries are mocked separately)
vi.mock('../db/client.js', () => ({
  getSupabaseClient: vi.fn(() => ({})),
}));

// Mock query functions directly — cleaner than simulating Supabase chain
vi.mock('../db/queries.js', () => ({
  insertRawEvent: vi.fn((_client: unknown, data: Record<string, unknown>) => {
    mockState.insertedRawEvents.push(data);
    return Promise.resolve({
      ...data,
      id: 'raw-event-uuid-001',
      created_at: new Date().toISOString(),
    });
  }),
  upsertContributorProfile: vi.fn((_client: unknown, data: Record<string, unknown>) => {
    mockState.upsertedProfiles.push(data);
    return Promise.resolve({
      id: 'contrib-uuid-001',
      github_username: data.github_username,
      interaction_count: 0,
    });
  }),
  incrementInteractionCount: vi.fn((_client: unknown, id: string) => {
    mockState.incrementedIds.push(id);
    return Promise.resolve();
  }),
}));

describe('POST /api/webhooks/github', () => {
  const secret = 'test-secret';

  beforeEach(() => {
    vi.stubEnv('GITHUB_WEBHOOK_SECRET', secret);
    mockState.insertedRawEvents = [];
    mockState.upsertedProfiles = [];
    mockState.incrementedIds = [];
  });

  function sign(body: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }

  it('rejects requests without required headers', async () => {
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  it('rejects requests with invalid signature', async () => {
    const body = JSON.stringify(FIXTURES.issueOpened.payload);
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'issues',
        'x-github-delivery': 'test-delivery-001',
        'x-hub-signature-256': 'sha256=invalid',
        'content-type': 'application/json',
      },
      body,
    });
    expect(res.status).toBe(401);
  });

  it('accepts valid webhook and returns 201', async () => {
    const body = JSON.stringify(FIXTURES.issueOpened.payload);
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'issues',
        'x-github-delivery': 'test-delivery-002',
        'x-hub-signature-256': sign(body),
        'content-type': 'application/json',
      },
      body,
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.status).toBe('captured');
    expect(json.event_type).toBe('issues.opened');
  });

  it('ignores unsupported event types with 200', async () => {
    const body = JSON.stringify({ action: 'completed' });
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'check_run',
        'x-github-delivery': 'test-delivery-003',
        'x-hub-signature-256': sign(body),
        'content-type': 'application/json',
      },
      body,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.status).toBe('ignored');
  });

  it('rejects invalid JSON payload', async () => {
    const body = 'not-json';
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'issues',
        'x-github-delivery': 'test-delivery-004',
        'x-hub-signature-256': sign(body),
        'content-type': 'application/json',
      },
      body,
    });
    expect(res.status).toBe(400);
  });

  it('captures raw event with correct fields', async () => {
    const body = JSON.stringify(FIXTURES.issueComment.payload);
    const res = await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'issue_comment',
        'x-github-delivery': 'test-delivery-005',
        'x-hub-signature-256': sign(body),
        'content-type': 'application/json',
      },
      body,
    });
    expect(res.status).toBe(201);

    // Verify the raw event was constructed correctly
    expect(mockState.insertedRawEvents.length).toBeGreaterThanOrEqual(1);
    const event = mockState.insertedRawEvents[mockState.insertedRawEvents.length - 1];
    expect(event.github_event_type).toBe('issue_comment.created');
    expect(event.github_delivery_id).toBe('test-delivery-005');
    expect(event.github_username).toBe('bob');
    expect(event.content_text).toContain('SM-2 reinforcement');
  });

  it('upserts contributor profile on each event', async () => {
    const body = JSON.stringify(FIXTURES.pullRequestOpened.payload);
    await app.request('/api/webhooks/github', {
      method: 'POST',
      headers: {
        'x-github-event': 'pull_request',
        'x-github-delivery': 'test-delivery-006',
        'x-hub-signature-256': sign(body),
        'content-type': 'application/json',
      },
      body,
    });

    expect(mockState.upsertedProfiles.length).toBeGreaterThanOrEqual(1);
    const profile = mockState.upsertedProfiles[mockState.upsertedProfiles.length - 1];
    expect(profile.github_username).toBe('alice');
  });

  it('handles all supported event types', async () => {
    const events = [
      { type: 'issues', fixture: FIXTURES.issueOpened },
      { type: 'issue_comment', fixture: FIXTURES.issueComment },
      { type: 'pull_request', fixture: FIXTURES.pullRequestOpened },
      { type: 'pull_request', fixture: FIXTURES.pullRequestClosed },
      { type: 'pull_request_review', fixture: FIXTURES.pullRequestReview },
      { type: 'push', fixture: FIXTURES.push },
    ];

    for (const { type, fixture } of events) {
      const body = JSON.stringify(fixture.payload);
      const res = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-github-event': type,
          'x-github-delivery': `test-delivery-${type}-${Date.now()}`,
          'x-hub-signature-256': sign(body),
          'content-type': 'application/json',
        },
        body,
      });
      expect(res.status).toBe(201);
    }
  });
});
