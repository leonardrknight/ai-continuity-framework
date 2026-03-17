import { inngest } from '../client.js';
import { getSupabaseClient } from '../../db/client.js';
import { loadConfig } from '../../config.js';
import { runScribe } from '../../agents/scribe.js';

/**
 * Inngest cron function: runs every 2 minutes to process unprocessed conversation messages.
 */
export const scribeCron = inngest.createFunction(
  {
    id: 'scribe-cron',
    name: 'Scribe Agent — Process Conversation Messages',
  },
  { cron: '*/2 * * * *' },
  async () => {
    const config = loadConfig();
    const client = getSupabaseClient();
    const result = await runScribe(client, config.GUARDIAN_REPO);

    console.log(
      `Scribe run complete: ${result.messagesProcessed} messages, ${result.memoriesCreated} memories, ${result.errors} errors`,
    );

    return result;
  },
);
