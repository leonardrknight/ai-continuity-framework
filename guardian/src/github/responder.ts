/**
 * Response logic — decides when and how Guardian should respond to GitHub events.
 * Ties the Retriever Agent and LLM together to produce actionable GitHub comments.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runRetriever } from '../agents/retriever.js';
import type { RetrievalResult } from '../agents/retriever.js';
import { getAnthropicClient } from '../llm/client.js';
import { RESPONSE_SYSTEM_PROMPT, buildResponseUserMessage } from '../llm/prompts.js';
import { extractContentText, extractUsername, extractRepoId } from './webhooks.js';
import { getContributorByUsername } from '../db/queries.js';
import type { GitHubActionsClient } from './actions.js';

/** Result of the shouldRespond decision. */
export interface RespondDecision {
  shouldRespond: boolean;
  reason: string;
}

/** Minimum number of memories needed to justify a response. */
const MIN_MEMORIES_FOR_RESPONSE = 1;

/** Minimum score for the top memory to justify a response. */
const MIN_TOP_MEMORY_SCORE = 0.4;

/** Event types that Guardian should consider responding to. */
const RESPONDABLE_EVENTS = new Set([
  'issues.opened',
  'pull_request.opened',
  'issue_comment.created',
]);

/**
 * Decide whether Guardian should respond to a given event.
 *
 * Responds when:
 * - The event is a new issue or PR and relevant memories exist
 * - The event is a comment that mentions @guardian
 * - The retrieval result has sufficient context quality
 *
 * Does NOT respond when:
 * - The event is not in the respondable set (push, close, etc.)
 * - No relevant memories were retrieved
 * - Memory quality is too low (below threshold)
 */
export function shouldRespond(
  eventType: string,
  payload: Record<string, unknown>,
  retrieval: RetrievalResult,
): RespondDecision {
  // Check for @guardian mention in comments — always respond
  if (eventType === 'issue_comment.created') {
    const comment = payload.comment as { body?: string } | undefined;
    const body = comment?.body ?? '';
    if (body.toLowerCase().includes('@guardian')) {
      return { shouldRespond: true, reason: '@guardian mentioned in comment' };
    }
    // Don't respond to random comments without a mention
    return { shouldRespond: false, reason: 'Comment does not mention @guardian' };
  }

  // Only respond to specific event types
  if (!RESPONDABLE_EVENTS.has(eventType)) {
    return { shouldRespond: false, reason: `Event type ${eventType} is not respondable` };
  }

  // Check if we have enough relevant context
  if (retrieval.memories.length < MIN_MEMORIES_FOR_RESPONSE) {
    return { shouldRespond: false, reason: 'No relevant memories found' };
  }

  // Check quality of top memory
  const topScore = retrieval.memories[0]?.final_score ?? 0;
  if (topScore < MIN_TOP_MEMORY_SCORE) {
    return {
      shouldRespond: false,
      reason: `Top memory score (${topScore.toFixed(2)}) below threshold (${MIN_TOP_MEMORY_SCORE})`,
    };
  }

  // Good context available — respond
  const eventLabel = eventType === 'issues.opened' ? 'issue' : 'PR';
  return {
    shouldRespond: true,
    reason: `Relevant context found for new ${eventLabel} (${retrieval.memories.length} memories, top score: ${topScore.toFixed(2)})`,
  };
}

/**
 * Generate a response comment using Claude Sonnet with memory context.
 */
export async function generateResponse(
  eventType: string,
  contentText: string,
  retrieval: RetrievalResult,
): Promise<string> {
  const anthropic = getAnthropicClient();

  const userMessage = buildResponseUserMessage(
    eventType,
    contentText,
    retrieval.contextBlock,
    retrieval.contributorProfile,
  );

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: RESPONSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

/**
 * Extract the issue/PR number from a webhook payload.
 */
function extractIssueNumber(eventType: string, payload: Record<string, unknown>): number | null {
  if (eventType.startsWith('issues') || eventType.startsWith('issue_comment')) {
    const issue = payload.issue as { number?: number } | undefined;
    return issue?.number ?? null;
  }
  if (eventType.startsWith('pull_request')) {
    const pr = payload.pull_request as { number?: number } | undefined;
    return pr?.number ?? null;
  }
  return null;
}

/**
 * Full orchestration: retrieve context, decide, generate, and post.
 *
 * 1. Run the Retriever to get relevant memories for this event
 * 2. Call shouldRespond to decide
 * 3. If yes, generate a response via LLM
 * 4. Post the comment via GitHubActionsClient
 */
export async function handleEventWithMemory(
  client: SupabaseClient,
  eventType: string,
  payload: Record<string, unknown>,
  repoId: string,
  githubActions: GitHubActionsClient,
): Promise<{ responded: boolean; reason: string }> {
  // Extract base event type (e.g., 'issues' from 'issues.opened') for content extraction
  const baseEventType = eventType.split('.')[0];

  // Extract content for retrieval query
  const contentText = extractContentText(baseEventType, payload);
  if (!contentText) {
    return { responded: false, reason: 'No content text to query' };
  }

  // Look up contributor for contextual retrieval
  const username = extractUsername(payload);
  const contributor = await getContributorByUsername(client, username).catch(() => null);

  // Run the Retriever
  const retrieval = await runRetriever(client, contentText, repoId, contributor?.id);

  // Decide whether to respond
  const decision = shouldRespond(eventType, payload, retrieval);
  if (!decision.shouldRespond) {
    return { responded: false, reason: decision.reason };
  }

  // Generate the response
  const comment = await generateResponse(eventType, contentText, retrieval);
  if (!comment.trim()) {
    return { responded: false, reason: 'LLM generated empty response' };
  }

  // Post the comment
  const fullRepoId = extractRepoId(payload);
  const [owner, repo] = fullRepoId.split('/');
  const issueNumber = extractIssueNumber(eventType, payload);

  if (!owner || !repo || !issueNumber) {
    return { responded: false, reason: 'Could not extract owner/repo/issue number from payload' };
  }

  await githubActions.postComment(owner, repo, issueNumber, comment);

  return { responded: true, reason: decision.reason };
}
