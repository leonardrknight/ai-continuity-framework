/**
 * Sample GitHub webhook payloads for testing.
 * Simplified to contain only the fields the Guardian actually reads.
 */

export const FIXTURES = {
  issueOpened: {
    headers: {
      'x-github-event': 'issues',
      'x-github-delivery': 'delivery-issue-opened-001',
      'x-hub-signature-256': '', // filled by test helper
      'content-type': 'application/json',
    },
    payload: {
      action: 'opened',
      issue: {
        number: 42,
        title: 'Add memory decay algorithm',
        body: 'We need an Ebbinghaus-inspired decay curve for memory importance.',
        user: { login: 'alice', id: 1001 },
        created_at: '2026-03-10T10:00:00Z',
      },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
      sender: { login: 'alice', id: 1001 },
    },
  },

  issueComment: {
    headers: {
      'x-github-event': 'issue_comment',
      'x-github-delivery': 'delivery-issue-comment-001',
      'x-hub-signature-256': '',
      'content-type': 'application/json',
    },
    payload: {
      action: 'created',
      issue: {
        number: 42,
        title: 'Add memory decay algorithm',
      },
      comment: {
        id: 9001,
        body: 'I think we should use SM-2 reinforcement instead of pure Ebbinghaus.',
        user: { login: 'bob', id: 1002 },
        created_at: '2026-03-10T11:00:00Z',
      },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
      sender: { login: 'bob', id: 1002 },
    },
  },

  pullRequestOpened: {
    headers: {
      'x-github-event': 'pull_request',
      'x-github-delivery': 'delivery-pr-opened-001',
      'x-hub-signature-256': '',
      'content-type': 'application/json',
    },
    payload: {
      action: 'opened',
      number: 15,
      pull_request: {
        number: 15,
        title: 'feat: implement Extractor Agent',
        body: 'Implements the Extractor Agent per BUILDPLAN PR 4.',
        user: { login: 'alice', id: 1001 },
        created_at: '2026-03-10T12:00:00Z',
      },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
      sender: { login: 'alice', id: 1001 },
    },
  },

  pullRequestClosed: {
    headers: {
      'x-github-event': 'pull_request',
      'x-github-delivery': 'delivery-pr-closed-001',
      'x-hub-signature-256': '',
      'content-type': 'application/json',
    },
    payload: {
      action: 'closed',
      number: 15,
      pull_request: {
        number: 15,
        title: 'feat: implement Extractor Agent',
        body: 'Implements the Extractor Agent per BUILDPLAN PR 4.',
        merged: true,
        user: { login: 'alice', id: 1001 },
        created_at: '2026-03-10T12:00:00Z',
        merged_at: '2026-03-10T14:00:00Z',
      },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
      sender: { login: 'alice', id: 1001 },
    },
  },

  pullRequestReview: {
    headers: {
      'x-github-event': 'pull_request_review',
      'x-github-delivery': 'delivery-pr-review-001',
      'x-hub-signature-256': '',
      'content-type': 'application/json',
    },
    payload: {
      action: 'submitted',
      review: {
        id: 5001,
        body: 'LGTM! The hybrid search approach is solid.',
        state: 'approved',
        user: { login: 'bob', id: 1002 },
        submitted_at: '2026-03-10T13:00:00Z',
      },
      pull_request: {
        number: 15,
        title: 'feat: implement Extractor Agent',
      },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
      sender: { login: 'bob', id: 1002 },
    },
  },

  push: {
    headers: {
      'x-github-event': 'push',
      'x-github-delivery': 'delivery-push-001',
      'x-hub-signature-256': '',
      'content-type': 'application/json',
    },
    payload: {
      ref: 'refs/heads/main',
      commits: [
        {
          id: 'abc123',
          message: 'feat: add voice capture template',
          author: { name: 'Alice', username: 'alice' },
          timestamp: '2026-03-10T15:00:00Z',
        },
        {
          id: 'def456',
          message: 'docs: update research iteration log',
          author: { name: 'Alice', username: 'alice' },
          timestamp: '2026-03-10T15:01:00Z',
        },
      ],
      pusher: { name: 'alice' },
      sender: { login: 'alice', id: 1001 },
      repository: {
        full_name: 'leonardrknight/ai-continuity-framework',
      },
    },
  },
};
