import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import {
  verifySignature,
  processWebhookEvent,
  compositeEventType,
  extractRepoId,
} from './github/webhooks.js';
import { getSupabaseClient } from './db/client.js';
import { isGitHubConfigured, isInngestConfigured } from './config.js';
import { chatRouter, conversationsRouter } from './chat/router.js';

export const app = new Hono();

// Public config endpoint — exposes safe-to-share Supabase config for the frontend
app.get('/api/config', (c) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return c.json({ error: 'Server configuration incomplete' }, 500);
  }

  return c.json({
    supabaseUrl,
    supabaseAnonKey,
  });
});

// Chat API routes (authenticated)
app.route('/api/chat', chatRouter);
app.route('/api/conversations', conversationsRouter);

// Inngest endpoint — only active when Inngest is configured
if (isInngestConfigured()) {
  import('inngest/hono').then(({ serve: serveInngest }) => {
    import('./inngest/client.js').then(({ inngest }) => {
      Promise.all([
        import('./inngest/functions/extractor.js'),
        import('./inngest/functions/consolidator.js'),
        import('./inngest/functions/curator.js'),
        import('./inngest/functions/scribe.js'),
        import('./inngest/functions/responder.js'),
      ]).then(([extractor, consolidator, curator, scribe, responder]) => {
        app.on(
          ['GET', 'POST', 'PUT'],
          '/api/inngest',
          serveInngest({
            client: inngest,
            functions: [
              extractor.extractorCron,
              consolidator.consolidatorCron,
              curator.curatorCron,
              scribe.scribeCron,
              responder.responderHandler,
            ],
          }),
        );
      });
    });
  });
}

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    github: isGitHubConfigured() ? 'configured' : 'not configured',
    inngest: isInngestConfigured() ? 'configured' : 'not configured',
  });
});

// GitHub webhook endpoint — always registered, guards internally
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

    // Fire-and-forget: queue response handling via Inngest (if configured)
    if (isInngestConfigured()) {
      const { inngest } = await import('./inngest/client.js');
      const composite = compositeEventType(
        eventType,
        payload as Record<string, unknown> & { action?: string },
      );
      const repoId = extractRepoId(
        payload as Record<string, unknown> & { repository?: { full_name?: string } },
      );
      inngest
        .send({
          name: 'guardian/event.respond',
          data: {
            eventType: composite,
            payload,
            repoId,
            rawEventId: result.rawEventId,
            contributorId: result.contributorId,
          },
        })
        .catch((err: unknown) => {
          console.error('Failed to send Inngest event:', err instanceof Error ? err.message : err);
        });
    }

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

// Serve static files from public/ directory
app.use('/*', serveStatic({ root: './public' }));

// Fallback: serve index.html for root and unknown non-API paths (SPA-style)
app.get('/', serveStatic({ root: './public', path: '/index.html' }));
