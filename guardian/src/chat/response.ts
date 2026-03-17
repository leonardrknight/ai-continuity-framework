import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import { CHAT_SYSTEM_PROMPT, buildChatContextBlock } from '../llm/prompts.js';
import { runRetriever } from '../agents/retriever.js';
import { getMessagesByConversation } from '../db/queries.js';
import { loadConfig } from '../config.js';
import type { UserProfile, Message } from '../db/schema.js';

/** Claude Sonnet model for chat responses. */
const CHAT_MODEL = 'claude-sonnet-4-20250514';

/** Maximum conversation history messages to include in context. */
const MAX_HISTORY_MESSAGES = 20;

/** Maximum tokens for chat response. */
const MAX_TOKENS = 1024;

/** Get repo ID from config. */
const getRepoId = (): string => loadConfig().GUARDIAN_REPO;

/**
 * Build the full system prompt with memory context injected.
 */
export function buildChatSystemPrompt(
  memories: { content: string; memory_type: string; topics: string[] | null }[],
  userProfile?: UserProfile | null,
): string {
  const contextBlock = buildChatContextBlock(memories, userProfile);

  if (!contextBlock) {
    return CHAT_SYSTEM_PROMPT;
  }

  return `${CHAT_SYSTEM_PROMPT}\n\n--- Memory Context ---\n${contextBlock}`;
}

/**
 * Convert conversation history to Anthropic message format.
 */
function formatConversationHistory(
  messages: Message[],
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/**
 * Generate a chat response augmented with retrieved memories.
 *
 * Steps:
 * 1. Get recent conversation history
 * 2. Call Retriever with user message as query
 * 3. Build system prompt with memories + user profile
 * 4. Call Claude Sonnet
 * 5. Return the response text
 */
export async function generateChatResponse(
  client: SupabaseClient,
  userMessage: string,
  conversationId: string,
  userId: string,
  repoId?: string,
): Promise<{ text: string; memoriesUsed: number }> {
  const effectiveRepoId = repoId ?? getRepoId();

  // Step 1: Get recent conversation history (before the current message)
  const history = await getMessagesByConversation(client, conversationId, MAX_HISTORY_MESSAGES);

  // Step 2: Retrieve relevant memories (filtered by userId for isolation)
  const retrieval = await runRetriever(client, userMessage, effectiveRepoId, userId);

  // Step 3: Build system prompt
  const systemPrompt = buildChatSystemPrompt(retrieval.memories, null);

  // Step 4: Build messages array (history + current message)
  const conversationMessages = formatConversationHistory(history);
  conversationMessages.push({ role: 'user', content: userMessage });

  // Step 5: Call Claude
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CHAT_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationMessages,
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';

  return {
    text,
    memoriesUsed: retrieval.memories.length,
  };
}

/**
 * Generate an auto-title from the first message in a conversation.
 * Uses a simple heuristic: take the first sentence or first 50 chars.
 */
export function generateAutoTitle(message: string): string {
  // Take first sentence
  const firstSentence = message.split(/[.!?\n]/)[0]?.trim() ?? message.trim();

  // Cap at 60 characters
  if (firstSentence.length <= 60) {
    return firstSentence;
  }

  return firstSentence.slice(0, 57) + '...';
}
