import { inngest } from '../client.js';
import { getSupabaseClient } from '../../db/client.js';
import { loadConfig } from '../../config.js';
import { handleEventWithMemory } from '../../github/responder.js';
import { createGitHubActionsClient, createNoopActionsClient } from '../../github/actions.js';

/**
 * Inngest function: triggered by 'guardian/event.respond' events.
 * Runs the full response pipeline: retrieve → decide → generate → post.
 */
export const responderHandler = inngest.createFunction(
  {
    id: 'responder-handler',
    name: 'Responder — Handle Event with Memory Context',
    retries: 2,
  },
  { event: 'guardian/event.respond' },
  async ({ event }) => {
    const config = loadConfig();
    const client = getSupabaseClient();

    const { eventType, payload, repoId } = event.data as {
      eventType: string;
      payload: Record<string, unknown>;
      repoId: string;
    };

    // Create GitHub actions client — use real client if token available, no-op otherwise
    const githubToken = process.env.GITHUB_INSTALLATION_TOKEN;
    const githubActions = githubToken
      ? createGitHubActionsClient(githubToken)
      : createNoopActionsClient();

    const result = await handleEventWithMemory(
      client,
      eventType,
      payload,
      repoId || config.GUARDIAN_REPO,
      githubActions,
    );

    console.log(
      `Responder: event=${eventType}, responded=${result.responded}, reason=${result.reason}`,
    );

    return result;
  },
);
