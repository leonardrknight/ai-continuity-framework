import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../llm/client.js';
import { CHAT_SYSTEM_PROMPT, buildChatContextBlock } from '../llm/prompts.js';
import { runRetriever } from '../agents/retriever.js';
import {
  runAnticipator,
  mergeWithRetrieval,
  getStagedPredictions,
  clearStagedPredictions,
} from '../agents/anticipator.js';
import { ContextWindowManager } from '../agents/context-monitor.js';
import { ThreadTracker } from '../agents/thread-tracker.js';
import {
  getMessagesByConversation,
  getThreadsForConversation,
  saveThreads,
} from '../db/queries.js';
import { loadConfig } from '../config.js';
import type { UserProfile, Message } from '../db/schema.js';

/** Claude Sonnet model for chat responses. */
const CHAT_MODEL = 'claude-sonnet-4-20250514';

/** Maximum conversation history messages to include in context. */
const MAX_HISTORY_MESSAGES = 20;

/** Maximum tokens for chat response. */
const MAX_TOKENS = 1024;

/** Context window manager for intelligent paging. */
const contextManager = new ContextWindowManager();

/** Get repo ID from config. */
const getRepoId = (): string => loadConfig().GUARDIAN_REPO;

/**
 * Build the full system prompt with memory context and thread context injected.
 */
export function buildChatSystemPrompt(
  memories: { content: string; memory_type: string; topics: string[] | null }[],
  userProfile?: UserProfile | null,
  threadContext?: string,
): string {
  const contextBlock = buildChatContextBlock(memories, userProfile);

  const sections: string[] = [];

  if (contextBlock) {
    sections.push(`--- Memory Context ---\n${contextBlock}`);
  }

  if (threadContext) {
    sections.push(`--- Active Threads ---\n${threadContext}`);
  }

  if (sections.length === 0) {
    return CHAT_SYSTEM_PROMPT;
  }

  return `${CHAT_SYSTEM_PROMPT}\n\n${sections.join('\n\n')}`;
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

  // Step 1.2: Load thread state for this conversation
  let threadContext = '';
  try {
    const existingThreads = await getThreadsForConversation(client, conversationId);
    const tracker = new ThreadTracker(conversationId, userId, existingThreads);

    const conversationTextsForThreads = history
      .filter((m) => m.role === 'user')
      .map((m) => m.content);
    const action = tracker.detectThread(userMessage, conversationTextsForThreads);

    // Apply thread action
    switch (action.type) {
      case 'new':
        tracker.startThread(action.topic);
        break;
      case 'resume':
        tracker.resumeThread(action.threadId);
        break;
      case 'complete':
        tracker.completeThread(action.threadId);
        break;
      case 'continue':
        tracker.updateThread(action.threadId, userMessage);
        break;
      case 'none':
        break;
    }

    // Build thread context for system prompt
    threadContext = tracker.buildThreadContext();

    // Persist updated threads (fire-and-forget to avoid blocking response)
    saveThreads(client, conversationId, tracker.getThreads()).catch((err) =>
      console.error('Failed to save threads:', err instanceof Error ? err.message : err),
    );
  } catch (err) {
    // Thread tracking is non-critical — don't let it block the response
    console.error('Thread tracking error:', err instanceof Error ? err.message : err);
  }

  // Step 1.5: Run Anticipator — predict relevant memories before explicit retrieval
  const conversationTexts = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => m.content);
  const anticipation = await runAnticipator(
    client,
    userMessage,
    userId,
    effectiveRepoId,
    conversationTexts,
  );

  // Check for staged predictions from previous turn
  const staged = getStagedPredictions(userId);
  const stagedMemories = staged.flatMap((p) => p.memories);
  if (staged.length > 0) {
    clearStagedPredictions(userId);
  }

  // Step 2: Retrieve relevant memories (filtered by userId for isolation)
  const retrieval = await runRetriever(client, userMessage, effectiveRepoId, userId);

  // Step 2.5: Merge retriever results with anticipated + staged memories (deduplicate)
  const allAnticipated = [...anticipation.immediateMemories, ...stagedMemories];
  const mergedMemories = mergeWithRetrieval(retrieval.memories, allAnticipated);

  // Step 3: Build system prompt (now includes thread context)
  const systemPrompt = buildChatSystemPrompt(mergedMemories, null, threadContext || undefined);

  // Step 4: Build messages array (history + current message)
  const conversationMessages = formatConversationHistory(history);
  conversationMessages.push({ role: 'user', content: userMessage });

  // Step 4.5: Manage context window budget — page out low-value messages if needed
  const budgetResult = await contextManager.manage(
    client,
    conversationMessages,
    userId,
    effectiveRepoId,
  );
  const managedMessages = budgetResult.messages.filter(
    (m): m is { role: 'user' | 'assistant'; content: string } =>
      m.role === 'user' || m.role === 'assistant',
  );

  // Step 5: Call Claude
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CHAT_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: managedMessages,
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text');
  const text = textBlock && 'text' in textBlock ? textBlock.text : '';

  return {
    text,
    memoriesUsed: mergedMemories.length,
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
