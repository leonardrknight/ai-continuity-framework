import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_TOOL_SCHEMA,
  buildExtractionUserMessage,
  type ExtractedMemoryLLM,
} from '../llm/prompts.js';
import { generateEmbedding } from '../llm/embeddings.js';
import {
  getUnprocessedEvents,
  markEventProcessed,
  insertExtractedMemory,
  upsertAgentState,
} from '../db/queries.js';
import type { RawEvent, ExtractedMemoryInsert } from '../db/schema.js';

const EXTRACTION_MODEL = 'claude-3-haiku-20240307';
const MAX_LLM_RETRIES = 3;
const BATCH_SIZE = 20;

/** Result from a single extraction run. */
export interface ExtractionRunResult {
  eventsProcessed: number;
  memoriesCreated: number;
  errors: number;
}

/**
 * Extract memories from a single raw event using Claude.
 * Returns parsed memories or throws on unrecoverable failure.
 */
async function callExtractionLLM(event: RawEvent): Promise<ExtractedMemoryLLM[]> {
  const anthropic = getAnthropicClient();
  const userMessage = buildExtractionUserMessage(
    event.github_event_type,
    event.content_text ?? '',
    event.github_username,
  );

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_LLM_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 2048,
        system: EXTRACTION_SYSTEM_PROMPT,
        tools: [EXTRACTION_TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'extract_memories' },
        messages: [{ role: 'user', content: userMessage }],
      });

      // Find the tool_use block in the response
      const toolBlock = response.content.find((block) => block.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('No tool_use block in LLM response');
      }

      const input = toolBlock.input as { memories: ExtractedMemoryLLM[] };
      return input.memories ?? [];
    } catch (error) {
      lastError = error;
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_LLM_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Process a single raw event: extract memories, generate embeddings, store results.
 * Returns the number of memories created.
 */
async function processEvent(client: SupabaseClient, event: RawEvent): Promise<number> {
  // Skip events without content — mark processed, no memories
  if (!event.content_text) {
    await markEventProcessed(client, event.id);
    return 0;
  }

  // Extract memories via LLM
  const memories = await callExtractionLLM(event);

  // Store each extracted memory
  let created = 0;
  for (const memory of memories) {
    // Generate embedding (null on failure — stored without embedding)
    const embedding = await generateEmbedding(memory.content);

    const insert: ExtractedMemoryInsert = {
      source_event_id: event.id,
      repo_id: event.repo_id,
      contributor_id: event.contributor_id,
      content: memory.content,
      content_embedding: embedding,
      memory_type: memory.memory_type,
      topics: memory.topics,
      entities: memory.entities,
      importance_score: memory.importance_score,
      confidence_score: memory.confidence_score,
      source_type: memory.source_type,
      emotional_valence: memory.emotional_valence,
      emotional_arousal: memory.emotional_arousal,
    };

    await insertExtractedMemory(client, insert);
    created++;
  }

  // Mark raw event as processed
  await markEventProcessed(client, event.id);
  return created;
}

/**
 * Run the extractor agent: fetch unprocessed events, extract memories, store results.
 * This is the core function called by the Inngest cron job.
 */
export async function runExtractor(
  client: SupabaseClient,
  repoId: string,
): Promise<ExtractionRunResult> {
  const result: ExtractionRunResult = {
    eventsProcessed: 0,
    memoriesCreated: 0,
    errors: 0,
  };

  const events = await getUnprocessedEvents(client, BATCH_SIZE);
  if (events.length === 0) {
    return result;
  }

  for (const event of events) {
    try {
      const created = await processEvent(client, event);
      result.eventsProcessed++;
      result.memoriesCreated += created;
    } catch (error) {
      result.errors++;
      console.error(
        `Extractor failed for event ${event.id}:`,
        error instanceof Error ? error.message : error,
      );
      // Event stays unprocessed — will be retried on next run
    }
  }

  // Update agent state
  await upsertAgentState(client, {
    agent_name: 'extractor',
    repo_id: repoId,
    last_run_at: new Date().toISOString(),
    ...(result.errors === 0 ? { last_successful_at: new Date().toISOString() } : {}),
    items_processed: result.eventsProcessed,
    error_count_24h: result.errors,
    ...(result.errors > 0
      ? { last_error: `${result.errors} events failed in last run` }
      : { last_error: null }),
    metadata: {
      last_run_memories_created: result.memoriesCreated,
      last_run_events_processed: result.eventsProcessed,
      last_run_errors: result.errors,
    },
  });

  return result;
}
