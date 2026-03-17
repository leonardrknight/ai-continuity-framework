import { inngest } from '../client.js';
import { getSupabaseClient } from '../../db/client.js';
import { loadConfig } from '../../config.js';
import { runConsolidator } from '../../agents/consolidator.js';

/**
 * Inngest cron function: runs every hour to consolidate extracted memories.
 */
export const consolidatorCron = inngest.createFunction(
  {
    id: 'consolidator-cron',
    name: 'Consolidator Agent — Deduplicate & Merge Memories',
  },
  { cron: '0 * * * *' },
  async () => {
    const config = loadConfig();
    const client = getSupabaseClient();
    const result = await runConsolidator(client, config.GUARDIAN_REPO);

    console.log(
      `Consolidator run complete: ${result.memoriesProcessed} processed, ${result.memoriesMerged} merged, ${result.memoriesLinked} linked, ${result.memoriesCreated} created, ${result.errors} errors`,
    );

    return result;
  },
);
