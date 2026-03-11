import { inngest } from '../client.js';
import { getSupabaseClient } from '../../db/client.js';
import { loadConfig } from '../../config.js';
import { runExtractor } from '../../agents/extractor.js';

/**
 * Inngest cron function: runs every 5 minutes to process unprocessed raw events.
 */
export const extractorCron = inngest.createFunction(
  {
    id: 'extractor-cron',
    name: 'Extractor Agent — Process Raw Events',
  },
  { cron: '*/5 * * * *' },
  async () => {
    const config = loadConfig();
    const client = getSupabaseClient();
    const result = await runExtractor(client, config.GUARDIAN_REPO);

    console.log(
      `Extractor run complete: ${result.eventsProcessed} events, ${result.memoriesCreated} memories, ${result.errors} errors`,
    );

    return result;
  },
);
