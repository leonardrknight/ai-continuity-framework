import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import {
  CONVERSATION_EXTRACTION_PROMPT,
  CONVERSATION_EXTRACTION_TOOL_SCHEMA,
  buildConversationExtractionMessage,
  type ExtractedMemoryLLM,
} from '../llm/prompts.js';
import { generateEmbedding } from '../llm/embeddings.js';
import {
  getUnprocessedMessages,
  getMessagesByConversation,
  markMessageProcessed,
  insertExtractedMemory,
  upsertAgentState,
} from '../db/queries.js';
import type { Message, ExtractedMemoryInsert } from '../db/schema.js';

const EXTRACTION_MODEL = 'claude-haiku-4-20250514';
const MAX_LLM_RETRIES = 3;
const BATCH_SIZE = 30;
const CONTEXT_WINDOW = 10;

/** Result from a single scribe run. */
export interface ScribeRunResult {
  messagesProcessed: number;
  memoriesCreated: number;
  errors: number;
}

/**
 * Group messages by conversation_id.
 */
function groupByConversation(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const existing = groups.get(msg.conversation_id);
    if (existing) {
      existing.push(msg);
    } else {
      groups.set(msg.conversation_id, [msg]);
    }
  }
  return groups;
}

/**
 * Call the LLM to extract memories from a batch of conversation messages.
 */
async function callConversationExtractionLLM(
  messages: { role: string; content: string }[],
  username: string,
): Promise<ExtractedMemoryLLM[]> {
  const anthropic = getAnthropicClient();
  const userMessage = buildConversationExtractionMessage(messages, username);

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_LLM_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 2048,
        system: CONVERSATION_EXTRACTION_PROMPT,
        tools: [CONVERSATION_EXTRACTION_TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'extract_memories' },
        messages: [{ role: 'user', content: userMessage }],
      });

      const toolBlock = response.content.find((block) => block.type === 'tool_use');
      if (!toolBlock || toolBlock.type !== 'tool_use') {
        throw new Error('No tool_use block in LLM response');
      }

      const input = toolBlock.input as { memories: ExtractedMemoryLLM[] };
      return input.memories ?? [];
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
 * Process a conversation batch: extract memories from messages, generate embeddings, store results.
 * Returns the number of memories created.
 */
async function processConversationBatch(
  client: SupabaseClient,
  batchMessages: Message[],
  contextMessages: { role: string; content: string }[],
  repoId: string,
): Promise<number> {
  // Combine context messages with current batch for thread awareness
  const batchForExtraction = batchMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Use context + batch, but only extract from the batch portion
  const allMessages = [...contextMessages, ...batchForExtraction];

  // Get username from the first user message in the batch
  const username = batchMessages[0]?.user_id ?? 'unknown';

  // Extract memories via LLM
  const memories = await callConversationExtractionLLM(allMessages, username);

  // Store each extracted memory
  let created = 0;
  for (const memory of memories) {
    // Generate embedding (null on failure)
    const embedding = await generateEmbedding(memory.content);

    // Link to the first message in the batch as the source
    const insert: ExtractedMemoryInsert = {
      source_message_id: batchMessages[0].id,
      user_id: batchMessages[0].user_id,
      repo_id: repoId,
      content: memory.content,
      content_embedding: embedding,
      memory_type: memory.memory_type,
      topics: memory.topics,
      entities: memory.entities,
      importance_score: memory.importance_score,
      confidence_score: memory.confidence_score,
      source_type: memory.source_type,
      source_channel: 'conversation',
      emotional_valence: memory.emotional_valence,
      emotional_arousal: memory.emotional_arousal,
    };

    await insertExtractedMemory(client, insert);
    created++;
  }

  return created;
}

/**
 * Run the scribe agent: fetch unprocessed messages, extract memories, store results.
 * This is the core function called by the Inngest cron job.
 */
export async function runScribe(client: SupabaseClient, repoId: string): Promise<ScribeRunResult> {
  const result: ScribeRunResult = {
    messagesProcessed: 0,
    memoriesCreated: 0,
    errors: 0,
  };

  const messages = await getUnprocessedMessages(client, BATCH_SIZE);
  if (messages.length === 0) {
    return result;
  }

  // Group messages by conversation for thread awareness
  const conversationGroups = groupByConversation(messages);

  for (const [conversationId, batchMessages] of conversationGroups) {
    try {
      // Get recent conversation context (last N messages for thread awareness)
      const recentMessages = await getMessagesByConversation(
        client,
        conversationId,
        CONTEXT_WINDOW,
      );

      // Build context from already-processed messages (exclude current batch)
      const batchIds = new Set(batchMessages.map((m) => m.id));
      const contextMessages = recentMessages
        .filter((m) => !batchIds.has(m.id))
        .map((m) => ({ role: m.role, content: m.content }));

      const created = await processConversationBatch(
        client,
        batchMessages,
        contextMessages,
        repoId,
      );

      result.memoriesCreated += created;

      // Mark all batch messages as processed
      for (const msg of batchMessages) {
        await markMessageProcessed(client, msg.id);
        result.messagesProcessed++;
      }
    } catch (error) {
      result.errors++;
      console.error(
        `Scribe failed for conversation ${conversationId}:`,
        error instanceof Error ? error.message : error,
      );
      // Messages stay unprocessed — will be retried on next run
    }
  }

  // Update agent state
  await upsertAgentState(client, {
    agent_name: 'scribe',
    repo_id: repoId,
    last_run_at: new Date().toISOString(),
    ...(result.errors === 0 ? { last_successful_at: new Date().toISOString() } : {}),
    items_processed: result.messagesProcessed,
    error_count_24h: result.errors,
    ...(result.errors > 0
      ? { last_error: `${result.errors} conversations failed in last run` }
      : { last_error: null }),
    metadata: {
      last_run_memories_created: result.memoriesCreated,
      last_run_messages_processed: result.messagesProcessed,
      last_run_errors: result.errors,
    },
  });

  return result;
}
