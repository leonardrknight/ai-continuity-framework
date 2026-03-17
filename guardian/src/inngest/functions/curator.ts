import { inngest } from '../client.js';
import { getSupabaseClient } from '../../db/client.js';
import { loadConfig } from '../../config.js';
import { runCurator } from '../../agents/curator.js';

/**
 * Inngest cron function: runs daily at 3 AM UTC to curate memories and refresh profiles.
 */
export const curatorCron = inngest.createFunction(
  {
    id: 'curator-cron',
    name: 'Curator Agent — Lifecycle Management & Profile Refresh',
  },
  { cron: '0 3 * * *' },
  async () => {
    const config = loadConfig();
    const client = getSupabaseClient();
    const result = await runCurator(client, config.GUARDIAN_REPO);

    console.log(
      `Curator run complete: ${result.memoriesCurated} curated, ${result.profilesRefreshed} profiles refreshed, ${result.archivedCount} archived, ${result.errors} errors`,
    );

    return result;
  },
);
