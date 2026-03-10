import { Hono } from 'hono';
import { verifySignature, processWebhookEvent } from './github/webhooks.js';
import { getSupabaseClient } from './db/client.js';

export const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// GitHub webhook endpoint
app.post('/api/webhooks/github', async (c) => {
  const eventType = c.req.header('x-github-event');
  const deliveryId = c.req.header('x-github-delivery');
  const signature = c.req.header('x-hub-signature-256');

  if (!eventType || !deliveryId) {
    return c.json({ error: 'Missing required GitHub headers' }, 400);
  }

  // Read raw body for signature verification
  const rawBody = await c.req.text();

  // Verify signature if GITHUB_WEBHOOK_SECRET is set
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    if (!signature || !verifySignature(rawBody, signature, secret)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
  }

  // Supported event types
  const supported = new Set([
    'issues',
    'issue_comment',
    'pull_request',
    'pull_request_review',
    'push',
  ]);

  if (!supported.has(eventType)) {
    return c.json({ status: 'ignored', reason: `Unsupported event type: ${eventType}` }, 200);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  try {
    const client = getSupabaseClient();
    const result = await processWebhookEvent(client, eventType, deliveryId, payload);
    return c.json(
      {
        status: 'captured',
        event_id: result.rawEventId,
        event_type: result.eventType,
        contributor: result.contributorId,
        new_contributor: result.isNewContributor,
      },
      201,
    );
  } catch (err) {
    // Check for idempotency violation (duplicate delivery ID)
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string })?.code;
    if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
      return c.json({ status: 'duplicate', delivery_id: deliveryId }, 200);
    }

    console.error('Webhook processing error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
