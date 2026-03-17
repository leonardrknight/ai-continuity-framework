import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import {
  PROFILE_SYNTHESIS_PROMPT,
  PROFILE_SYNTHESIS_TOOL_SCHEMA,
  buildProfileSynthesisMessage,
  type ProfileSynthesisLLM,
} from '../llm/prompts.js';
import { recencyDecay } from './retriever.js';
import {
  getConsolidatedMemoriesForCuration,
  getContributorsWithRecentActivity,
  getMemoriesForContributor,
  updateConsolidatedMemory,
  updateContributorProfile,
  upsertAgentState,
} from '../db/queries.js';
import type { ConsolidatedMemory, MemoryType, MemoryTier } from '../db/schema.js';

const CURATION_MODEL = 'claude-haiku-4-5-20251001';
const MAX_LLM_RETRIES = 3;
const BATCH_SIZE = 100;

/** Type weight map for importance recalculation. */
const TYPE_WEIGHTS: Record<MemoryType, number> = {
  decision: 0.9,
  relationship: 0.85,
  preference: 0.7,
  action_item: 0.6,
  fact: 0.5,
  pattern: 0.5,
  question: 0.3,
};

/** Thresholds for archival flagging. */
const ARCHIVAL_IMPORTANCE_THRESHOLD = 0.2;
const ARCHIVAL_AGE_DAYS = 90;
const ARCHIVAL_ACCESS_THRESHOLD = 3;

/** Result from a single curation run. */
export interface CurationRunResult {
  memoriesCurated: number;
  profilesRefreshed: number;
  archivedCount: number;
  errors: number;
}

/**
 * Get the type weight for a given memory type.
 * Returns 0.5 as a default for unknown types.
 */
export function getTypeWeight(memoryType: string): number {
  return TYPE_WEIGHTS[memoryType as MemoryType] ?? 0.5;
}

/**
 * Determine the tier for a given importance score.
 * long >= 0.8, medium >= 0.4, short < 0.4
 */
export function determineTier(importance: number): MemoryTier {
  if (importance >= 0.8) return 'long';
  if (importance >= 0.4) return 'medium';
  return 'short';
}

/**
 * Check if a memory should be flagged for archival.
 * Criteria: importance < 0.2 AND age > 90 days AND access_count < 3
 */
export function shouldArchive(importance: number, ageDays: number, accessCount: number): boolean {
  return (
    importance < ARCHIVAL_IMPORTANCE_THRESHOLD &&
    ageDays > ARCHIVAL_AGE_DAYS &&
    accessCount < ARCHIVAL_ACCESS_THRESHOLD
  );
}

/**
 * Recalculate importance for a consolidated memory using the formula:
 *
 *   importance = 0.30 * base_importance
 *              + 0.20 * min(1.0, access_count / 10)
 *              + 0.15 * recency_decay(age_days)
 *              + 0.15 * type_weight(memory_type)
 *              + 0.10 * |emotional_valence|
 *              + 0.10 * min(1.0, source_count / 5)
 */
export function recalculateImportance(
  baseImportance: number,
  accessCount: number,
  ageDays: number,
  memoryType: string,
  emotionalValence: number,
  sourceCount: number,
): number {
  const accessFactor = Math.min(1.0, accessCount / 10);
  const recencyFactor = recencyDecay(ageDays);
  const typeWeight = getTypeWeight(memoryType);
  const emotionFactor = Math.abs(emotionalValence);
  const sourceFactor = Math.min(1.0, sourceCount / 5);

  const importance =
    0.3 * baseImportance +
    0.2 * accessFactor +
    0.15 * recencyFactor +
    0.15 * typeWeight +
    0.1 * emotionFactor +
    0.1 * sourceFactor;

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, importance));
}

/**
 * Compute the age in days of a memory given its created_at timestamp.
 */
function ageDays(createdAt: string, now: Date): number {
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Call the LLM to synthesize a contributor profile from their memories.
 */
async function callProfileSynthesisLLM(
  username: string,
  memories: ConsolidatedMemory[],
): Promise<ProfileSynthesisLLM> {
  const anthropic = getAnthropicClient();
  const userMessage = buildProfileSynthesisMessage(username, memories);

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_LLM_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: CURATION_MODEL,
        max_tokens: 1024,
        system: PROFILE_SYNTHESIS_PROMPT,
        tools: [PROFILE_SYNTHESIS_TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'synthesize_profile' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolBlock = response.content.find((block) => block.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('No tool_use block in LLM response');
      }

      return toolBlock.input as ProfileSynthesisLLM;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_LLM_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Run the curator agent: lifecycle management + contributor profile refresh.
 * This is the core function called by the Inngest cron job.
 */
export async function runCurator(
  client: SupabaseClient,
  repoId: string,
): Promise<CurationRunResult> {
  const result: CurationRunResult = {
    memoriesCurated: 0,
    profilesRefreshed: 0,
    archivedCount: 0,
    errors: 0,
  };

  const now = new Date();

  // -- Phase 1: Lifecycle Management --
  const memories = await getConsolidatedMemoriesForCuration(client, repoId, BATCH_SIZE);

  for (const memory of memories) {
    try {
      const age = ageDays(memory.created_at, now);
      const sourceCount = memory.source_memories?.length ?? 0;
      // Default emotional_valence to 0 for consolidated memories (not stored on consolidated)
      const emotionalValence = 0;

      const newImportance = recalculateImportance(
        memory.importance_score,
        memory.access_count,
        age,
        memory.memory_type,
        emotionalValence,
        sourceCount,
      );

      const newTier = determineTier(newImportance);
      const archived = shouldArchive(newImportance, age, memory.access_count);

      const updates: Partial<ConsolidatedMemory> = {
        importance_score: newImportance,
        tier: newTier,
      };

      // Use stability field as an archival flag: set to 0 when flagged for archival
      if (archived) {
        updates.stability = 0;
        result.archivedCount++;
      }

      await updateConsolidatedMemory(client, memory.id, updates);
      result.memoriesCurated++;
    } catch (error) {
      result.errors++;
      console.error(
        `Curator failed for memory ${memory.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  // -- Phase 2: Contributor Profile Refresh --
  try {
    const contributors = await getContributorsWithRecentActivity(client, 30);

    for (const contributor of contributors) {
      try {
        const contributorMemories = await getMemoriesForContributor(client, contributor.id, 50);

        if (contributorMemories.length === 0) continue;

        const profile = await callProfileSynthesisLLM(
          contributor.github_username,
          contributorMemories,
        );

        await updateContributorProfile(client, contributor.id, {
          summary: profile.summary,
          interests: profile.interests,
          expertise: profile.expertise,
          communication_style: profile.communication_style,
        });

        result.profilesRefreshed++;
      } catch (error) {
        result.errors++;
        console.error(
          `Curator profile refresh failed for contributor ${contributor.github_username}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } catch (error) {
    result.errors++;
    console.error(
      'Curator failed to fetch contributors with recent activity:',
      error instanceof Error ? error.message : error,
    );
  }

  // Update agent state
  await upsertAgentState(client, {
    agent_name: 'curator',
    repo_id: repoId,
    last_run_at: now.toISOString(),
    ...(result.errors === 0 ? { last_successful_at: now.toISOString() } : {}),
    items_processed: result.memoriesCurated + result.profilesRefreshed,
    error_count_24h: result.errors,
    ...(result.errors > 0
      ? { last_error: `${result.errors} items failed in last run` }
      : { last_error: null }),
    metadata: {
      last_run_memories_curated: result.memoriesCurated,
      last_run_profiles_refreshed: result.profilesRefreshed,
      last_run_archived: result.archivedCount,
      last_run_errors: result.errors,
    },
  });

  return result;
}
