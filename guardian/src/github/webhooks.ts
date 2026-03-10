import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  insertRawEvent,
  upsertContributorProfile,
  incrementInteractionCount,
} from '../db/queries.js';
import type { RawEventInsert } from '../db/schema.js';

// -- Signature verification --

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// -- Content text extraction --

interface EventPayload {
  action?: string;
  issue?: { number?: number; title?: string; body?: string };
  comment?: { body?: string };
  pull_request?: { number?: number; title?: string; body?: string; merged?: boolean };
  review?: { body?: string; state?: string };
  commits?: Array<{ message?: string }>;
  ref?: string;
  sender?: { login?: string; id?: number };
  repository?: { full_name?: string };
  [key: string]: unknown;
}

export function extractContentText(eventType: string, payload: EventPayload): string | null {
  switch (eventType) {
    case 'issues': {
      const issue = payload.issue;
      if (!issue) return null;
      return `[Issue #${issue.number}] ${issue.title ?? ''}\n\n${issue.body ?? ''}`.trim();
    }

    case 'issue_comment': {
      const comment = payload.comment;
      const issue = payload.issue;
      if (!comment) return null;
      return `[Comment on #${issue?.number ?? '?'}] ${comment.body ?? ''}`.trim();
    }

    case 'pull_request': {
      const pr = payload.pull_request;
      if (!pr) return null;
      const action =
        payload.action === 'closed' && pr.merged ? 'merged' : (payload.action ?? 'unknown');
      return `[PR #${pr.number} ${action}] ${pr.title ?? ''}\n\n${pr.body ?? ''}`.trim();
    }

    case 'pull_request_review': {
      const review = payload.review;
      const pr = payload.pull_request;
      if (!review) return null;
      return `[Review on PR #${pr?.number ?? '?'} — ${review.state ?? 'unknown'}] ${review.body ?? ''}`.trim();
    }

    case 'push': {
      const commits = payload.commits ?? [];
      if (commits.length === 0) return null;
      const messages = commits.map((c) => c.message ?? '').filter(Boolean);
      const ref = payload.ref?.replace('refs/heads/', '') ?? 'unknown';
      return `[Push to ${ref}] ${messages.join(' | ')}`.trim();
    }

    default:
      return null;
  }
}

// -- Username extraction --

export function extractUsername(payload: EventPayload): string {
  return payload.sender?.login ?? 'unknown';
}

// -- GitHub timestamp extraction --

export function extractGitHubTimestamp(eventType: string, payload: EventPayload): string | null {
  switch (eventType) {
    case 'issues':
      return (
        ((payload.issue as Record<string, unknown> | undefined)?.created_at as string | null) ??
        null
      );
    case 'issue_comment':
      return (
        ((payload.comment as Record<string, unknown> | undefined)?.created_at as string | null) ??
        null
      );
    case 'pull_request':
      return (
        ((payload.pull_request as Record<string, unknown> | undefined)?.created_at as
          | string
          | null) ?? null
      );
    case 'pull_request_review':
      return (
        ((payload.review as Record<string, unknown> | undefined)?.submitted_at as string | null) ??
        null
      );
    case 'push': {
      const commits = payload.commits ?? [];
      return commits.length > 0
        ? (((commits[commits.length - 1] as Record<string, unknown>).timestamp as string | null) ??
            null)
        : null;
    }
    default:
      return null;
  }
}

// -- Repo extraction --

export function extractRepoId(payload: EventPayload): string {
  return payload.repository?.full_name ?? 'unknown/unknown';
}

// -- Composite event type (e.g. "issues.opened") --

export function compositeEventType(eventType: string, payload: EventPayload): string {
  const action = payload.action;
  if (action) return `${eventType}.${action}`;
  return eventType;
}

// -- Main handler: process a webhook event --

export interface WebhookProcessResult {
  rawEventId: string;
  contributorId: string;
  eventType: string;
  isNewContributor: boolean;
}

export async function processWebhookEvent(
  client: SupabaseClient,
  eventType: string,
  deliveryId: string,
  payload: EventPayload,
): Promise<WebhookProcessResult> {
  const username = extractUsername(payload);
  const repoId = extractRepoId(payload);

  // Upsert contributor profile
  const profile = await upsertContributorProfile(client, {
    github_username: username,
    github_id: payload.sender?.id ?? null,
  });

  const isNew = profile.interaction_count === 0;

  // Increment interaction count
  await incrementInteractionCount(client, profile.id);

  // Build raw event record
  const rawEvent: RawEventInsert = {
    github_event_type: compositeEventType(eventType, payload),
    github_delivery_id: deliveryId,
    repo_id: repoId,
    contributor_id: profile.id,
    github_username: username,
    payload: payload as Record<string, unknown>,
    content_text: extractContentText(eventType, payload),
    github_created_at: extractGitHubTimestamp(eventType, payload),
  };

  const inserted = await insertRawEvent(client, rawEvent);

  return {
    rawEventId: inserted.id,
    contributorId: profile.id,
    eventType: compositeEventType(eventType, payload),
    isNewContributor: isNew,
  };
}
