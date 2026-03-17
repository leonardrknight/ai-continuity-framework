import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import {
  MERGE_SYSTEM_PROMPT,
  MERGE_TOOL_SCHEMA,
  buildMergeUserMessage,
  type MergedMemoryLLM,
} from '../llm/prompts.js';
import {
  getUnconsolidatedMemories,
  getConsolidatedMemoriesWithEmbeddings,
  markMemoryConsolidated,
  insertConsolidatedMemory,
  updateConsolidatedMemory,
  upsertAgentState,
} from '../db/queries.js';
import type {
  ExtractedMemory,
  ConsolidatedMemory,
  ConsolidatedMemoryInsert,
} from '../db/schema.js';

const CONSOLIDATION_MODEL = 'claude-sonnet-4-6-20250514';
const MAX_LLM_RETRIES = 3;
const BATCH_SIZE = 50;
const DUPLICATE_THRESHOLD = 0.92;
const RELATED_THRESHOLD = 0.75;

/** Result from a single consolidation run. */
export interface ConsolidationRunResult {
  memoriesProcessed: number;
  memoriesMerged: number;
  memoriesLinked: number;
  memoriesCreated: number;
  errors: number;
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Find the most similar consolidated memory for a given embedding.
 * Returns the best match and its similarity score, or null if no matches exist.
 */
function findBestMatch(
  embedding: number[],
  consolidated: ConsolidatedMemory[],
): { match: ConsolidatedMemory; similarity: number } | null {
  let bestMatch: ConsolidatedMemory | null = null;
  let bestSimilarity = -1;

  for (const cm of consolidated) {
    if (!cm.content_embedding) continue;
    const sim = cosineSimilarity(embedding, cm.content_embedding);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = cm;
    }
  }

  if (!bestMatch) return null;
  return { match: bestMatch, similarity: bestSimilarity };
}

/**
 * Call the LLM to merge two memory contents into one.
 * Returns the merged content and topics, or throws on failure.
 */
async function callMergeLLM(existingContent: string, newContent: string): Promise<MergedMemoryLLM> {
  const anthropic = getAnthropicClient();
  const userMessage = buildMergeUserMessage(existingContent, newContent);

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_LLM_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: CONSOLIDATION_MODEL,
        max_tokens: 1024,
        system: MERGE_SYSTEM_PROMPT,
        tools: [MERGE_TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'merge_memories' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolBlock = response.content.find((block) => block.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('No tool_use block in LLM response');
      }

      const input = toolBlock.input as MergedMemoryLLM;
      return input;
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
 * Merge an extracted memory into an existing consolidated memory.
 * Uses LLM to synthesize content, boosts importance by 10%.
 */
async function mergeMemory(
  client: SupabaseClient,
  extracted: ExtractedMemory,
  existing: ConsolidatedMemory,
): Promise<void> {
  const merged = await callMergeLLM(existing.content, extracted.content);

  // Importance: take the higher of the two, boost by 10%, cap at 1.0
  const higherImportance = Math.max(existing.importance_score, extracted.importance_score);
  const boostedImportance = Math.min(higherImportance * 1.1, 1.0);

  // Merge source_memories list
  const sourceMemories = [...(existing.source_memories ?? []), extracted.id];

  await updateConsolidatedMemory(client, existing.id, {
    content: merged.merged_content,
    topics: merged.topics,
    importance_score: boostedImportance,
    source_memories: sourceMemories,
    content_embedding: extracted.content_embedding,
    version: existing.version + 1,
  });

  await markMemoryConsolidated(client, extracted.id, existing.id);
}

/**
 * Link an extracted memory as related to an existing consolidated memory.
 */
async function linkMemory(
  client: SupabaseClient,
  extracted: ExtractedMemory,
  existing: ConsolidatedMemory,
): Promise<string> {
  // Create a new consolidated memory for the extracted content
  const insert: ConsolidatedMemoryInsert = {
    repo_id: extracted.repo_id,
    contributor_id: extracted.contributor_id,
    content: extracted.content,
    content_embedding: extracted.content_embedding,
    memory_type: extracted.memory_type,
    topics: extracted.topics,
    importance_score: extracted.importance_score,
    source_memories: [extracted.id],
  };

  const newConsolidated = await insertConsolidatedMemory(client, insert);

  // Add the new consolidated memory ID to the existing memory's related_memories
  const relatedMemories = [...(existing.related_memories ?? []), newConsolidated.id];
  await updateConsolidatedMemory(client, existing.id, {
    related_memories: relatedMemories,
  });

  await markMemoryConsolidated(client, extracted.id, newConsolidated.id);
  return newConsolidated.id;
}

/**
 * Create a new consolidated memory from an extracted memory.
 */
async function createNewConsolidated(
  client: SupabaseClient,
  extracted: ExtractedMemory,
): Promise<string> {
  const insert: ConsolidatedMemoryInsert = {
    repo_id: extracted.repo_id,
    contributor_id: extracted.contributor_id,
    content: extracted.content,
    content_embedding: extracted.content_embedding,
    memory_type: extracted.memory_type,
    topics: extracted.topics,
    importance_score: extracted.importance_score,
    source_memories: [extracted.id],
  };

  const consolidated = await insertConsolidatedMemory(client, insert);
  await markMemoryConsolidated(client, extracted.id, consolidated.id);
  return consolidated.id;
}

/**
 * Run the consolidator agent: fetch unconsolidated memories, deduplicate, merge, or create.
 * This is the core function called by the Inngest cron job.
 */
export async function runConsolidator(
  client: SupabaseClient,
  repoId: string,
): Promise<ConsolidationRunResult> {
  const result: ConsolidationRunResult = {
    memoriesProcessed: 0,
    memoriesMerged: 0,
    memoriesLinked: 0,
    memoriesCreated: 0,
    errors: 0,
  };

  const unconsolidated = await getUnconsolidatedMemories(client, BATCH_SIZE);
  if (unconsolidated.length === 0) {
    return result;
  }

  // Load all consolidated memories with embeddings for similarity comparison
  const consolidated = await getConsolidatedMemoriesWithEmbeddings(client, repoId);

  for (const memory of unconsolidated) {
    try {
      // If memory has no embedding, create new consolidated entry (can't compare similarity)
      if (!memory.content_embedding) {
        await createNewConsolidated(client, memory);
        result.memoriesProcessed++;
        result.memoriesCreated++;
        continue;
      }

      const bestMatch = findBestMatch(memory.content_embedding, consolidated);

      if (bestMatch && bestMatch.similarity >= DUPLICATE_THRESHOLD) {
        // Duplicate — merge via LLM
        await mergeMemory(client, memory, bestMatch.match);
        result.memoriesProcessed++;
        result.memoriesMerged++;
      } else if (bestMatch && bestMatch.similarity >= RELATED_THRESHOLD) {
        // Related — link
        const newId = await linkMemory(client, memory, bestMatch.match);
        result.memoriesProcessed++;
        result.memoriesLinked++;

        // Add the newly created consolidated memory to the pool for subsequent comparisons
        consolidated.push({
          id: newId,
          repo_id: memory.repo_id,
          contributor_id: memory.contributor_id,
          user_id: memory.user_id ?? null,
          content: memory.content,
          content_embedding: memory.content_embedding,
          memory_type: memory.memory_type,
          topics: memory.topics,
          importance_score: memory.importance_score,
          stability: 0.5,
          related_memories: null,
          source_memories: [memory.id],
          source_channel: memory.source_channel ?? 'github',
          tier: 'short',
          access_count: 0,
          last_accessed_at: null,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Novel — create new
        const newId = await createNewConsolidated(client, memory);
        result.memoriesProcessed++;
        result.memoriesCreated++;

        // Add to pool for subsequent comparisons
        consolidated.push({
          id: newId,
          repo_id: memory.repo_id,
          contributor_id: memory.contributor_id,
          user_id: memory.user_id ?? null,
          content: memory.content,
          content_embedding: memory.content_embedding,
          memory_type: memory.memory_type,
          topics: memory.topics,
          importance_score: memory.importance_score,
          stability: 0.5,
          related_memories: null,
          source_memories: [memory.id],
          source_channel: memory.source_channel ?? 'github',
          tier: 'short',
          access_count: 0,
          last_accessed_at: null,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      result.errors++;
      console.error(
        `Consolidator failed for memory ${memory.id}:`,
        error instanceof Error ? error.message : error,
      );
      // Memory stays unconsolidated — will be retried on next run
    }
  }

  // Update agent state
  await upsertAgentState(client, {
    agent_name: 'consolidator',
    repo_id: repoId,
    last_run_at: new Date().toISOString(),
    ...(result.errors === 0 ? { last_successful_at: new Date().toISOString() } : {}),
    items_processed: result.memoriesProcessed,
    error_count_24h: result.errors,
    ...(result.errors > 0
      ? { last_error: `${result.errors} memories failed in last run` }
      : { last_error: null }),
    metadata: {
      last_run_memories_processed: result.memoriesProcessed,
      last_run_merged: result.memoriesMerged,
      last_run_linked: result.memoriesLinked,
      last_run_created: result.memoriesCreated,
      last_run_errors: result.errors,
    },
  });

  return result;
}
