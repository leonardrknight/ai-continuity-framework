import type { SupabaseClient } from '@supabase/supabase-js';
import { recencyDecay } from './retriever.js';
import { insertExtractedMemory } from '../db/queries.js';
import type { ExtractedMemoryInsert } from '../db/schema.js';

// -- Budget Zone Configuration --

/** Default context window size (Claude Sonnet). */
const DEFAULT_MAX_TOKENS = 180_000;

/** Budget zone percentages (must sum to 1.0). */
export interface BudgetZones {
  /** System prompt, soul, identity — pinned, never paged. */
  identity: number;
  /** Current conversation messages — managed by relevance. */
  activeThread: number;
  /** Retrieved memories from long-term storage — rotated. */
  retrievedMemory: number;
  /** Headroom for new messages. */
  buffer: number;
}

/** Default budget allocation. */
export const DEFAULT_BUDGET_ZONES: BudgetZones = {
  identity: 0.125, // 12.5%
  activeThread: 0.55, // 55%
  retrievedMemory: 0.175, // 17.5%
  buffer: 0.15, // 15%
};

// -- Paging Levels --

/** How aggressively we need to page content out. */
export type PagingLevel = 'none' | 'flag' | 'warm' | 'aggressive';

// -- Relevance Scoring Weights --

const RECENCY_WEIGHT = 0.35;
const REFERENCE_WEIGHT = 0.25;
const THREAD_AFFINITY_WEIGHT = 0.2;
const DECISION_WEIGHT = 0.1;
const ENTITY_DENSITY_WEIGHT = 0.1;

/** Decision-related keywords for scoring. */
const DECISION_KEYWORDS = [
  'decided',
  'decision',
  'agreed',
  'chose',
  'approved',
  'resolved',
  'confirmed',
  'committed',
  'selected',
  'will use',
  'going with',
  "let's go with",
];

// -- Managed Message --

/** A message annotated with relevance metadata for budget management. */
export interface ScoredMessage {
  /** Original message. */
  message: { role: 'user' | 'assistant' | 'system'; content: string };
  /** Position in conversation (0-based turn index). */
  turnIndex: number;
  /** Relevance score (0-1). */
  relevanceScore: number;
  /** Whether this message is pinned (system/identity — never paged). */
  pinned: boolean;
  /** Estimated token count. */
  tokenEstimate: number;
}

/** Result of manageBudget: the trimmed message list. */
export interface ManagedBudgetResult {
  /** Messages to include in the LLM prompt (with stubs for paged messages). */
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  /** Number of messages that were paged out. */
  pagedCount: number;
  /** Total estimated tokens in the managed list. */
  totalTokens: number;
  /** Paging level that was applied. */
  pagingLevel: PagingLevel;
}

// -- Core Functions --

/**
 * Estimate token count for a text string.
 * Uses the chars/4 heuristic — good enough for budget management.
 * Can be replaced with tiktoken later for precision.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Determine paging level based on how full the active thread zone is.
 *
 * @param currentTokens - current token usage in active thread zone
 * @param maxTokens - maximum tokens allocated to active thread zone
 */
export function shouldPage(currentTokens: number, maxTokens: number): PagingLevel {
  if (maxTokens <= 0) return 'aggressive';

  const usage = currentTokens / maxTokens;

  if (usage < 0.5) return 'none';
  if (usage < 0.75) return 'flag';
  if (usage < 0.9) return 'warm';
  return 'aggressive';
}

/**
 * Extract entities (capitalized multi-word phrases and significant nouns)
 * from text. Simple heuristic — not NER.
 */
function extractEntities(text: string): string[] {
  // Match capitalized words/phrases (2+ chars) that aren't at sentence start
  const words = text.split(/\s+/);
  const entities: Set<string> = new Set();

  for (const word of words) {
    // Simple: treat capitalized words (not at start) as potential entities
    const cleaned = word.replace(/[^a-zA-Z0-9-_]/g, '');
    if (cleaned.length >= 3 && /^[A-Z]/.test(cleaned)) {
      entities.add(cleaned.toLowerCase());
    }
  }

  return [...entities];
}

/**
 * Score the relevance of a message block within a conversation.
 *
 * relevance = 0.35 * recency_decay(age_in_turns)
 *           + 0.25 * reference_count(block)
 *           + 0.20 * thread_affinity(block, active_topic)
 *           + 0.10 * decision_weight(block)
 *           + 0.10 * entity_density(block)
 */
export function scoreRelevance(
  message: { role: string; content: string },
  turnIndex: number,
  totalTurns: number,
  activeTopicKeywords: string[],
  allMessages: { role: string; content: string }[],
): number {
  const content = message.content.toLowerCase();

  // 1. Recency: treat age in turns like age in days for the decay curve
  // Scale so latest turn = 0, oldest = totalTurns
  const ageInTurns = totalTurns - turnIndex;
  // Use a half-life of 20 turns (so conversation history decays faster than days)
  const recencyScore = Math.exp(-ageInTurns / 20);

  // 2. Reference count: how many other messages reference content from this one
  const messageWords = new Set(
    content
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.replace(/[^a-z0-9]/g, '')),
  );
  let referenceCount = 0;
  for (let i = turnIndex + 1; i < allMessages.length; i++) {
    const otherContent = allMessages[i].content.toLowerCase();
    let hasRef = false;
    for (const word of messageWords) {
      if (word && otherContent.includes(word)) {
        hasRef = true;
        break;
      }
    }
    if (hasRef) referenceCount++;
  }
  // Normalize: cap at 5 references = 1.0
  const referenceScore = Math.min(referenceCount / 5, 1.0);

  // 3. Thread affinity: overlap with active topic keywords
  let topicHits = 0;
  for (const keyword of activeTopicKeywords) {
    if (content.includes(keyword.toLowerCase())) {
      topicHits++;
    }
  }
  const threadAffinityScore =
    activeTopicKeywords.length > 0 ? Math.min(topicHits / activeTopicKeywords.length, 1.0) : 0;

  // 4. Decision weight: does this message contain decisions?
  let decisionScore = 0;
  for (const keyword of DECISION_KEYWORDS) {
    if (content.includes(keyword)) {
      decisionScore = 1.0;
      break;
    }
  }

  // 5. Entity density: ratio of entities to total words
  const entities = extractEntities(message.content);
  const wordCount = message.content.split(/\s+/).length;
  const entityDensity = wordCount > 0 ? Math.min(entities.length / wordCount, 1.0) : 0;

  return (
    RECENCY_WEIGHT * recencyScore +
    REFERENCE_WEIGHT * referenceScore +
    THREAD_AFFINITY_WEIGHT * threadAffinityScore +
    DECISION_WEIGHT * decisionScore +
    ENTITY_DENSITY_WEIGHT * entityDensity
  );
}

/**
 * Generate a one-line summary stub for a paged-out message.
 */
function generateStub(message: { role: string; content: string }, memoryId: string): string {
  // Take first 80 chars as a summary hint
  const preview = message.content.slice(0, 80).replace(/\n/g, ' ').trim();
  const ellipsis = message.content.length > 80 ? '...' : '';
  return `[Memory paged: "${preview}${ellipsis}", see memory #${memoryId}]`;
}

/**
 * Extract active topic keywords from recent messages.
 * Uses the last N messages to determine what the conversation is currently about.
 */
export function extractActiveTopics(
  messages: { role: string; content: string }[],
  recentCount = 4,
): string[] {
  const recentMessages = messages.slice(-recentCount);
  const wordFreq = new Map<string, number>();

  for (const msg of recentMessages) {
    const words = msg.content
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length >= 4);

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
  }

  // Return top 10 most frequent significant words
  return [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Page out a message to warm storage as an extracted_memory.
 * The content is preserved so the Retriever can find it later.
 */
export async function pageOut(
  client: SupabaseClient,
  message: { role: string; content: string },
  userId: string,
  repoId: string,
): Promise<string> {
  const memoryInsert: ExtractedMemoryInsert = {
    repo_id: repoId,
    content: `[${message.role}] ${message.content}`,
    memory_type: 'fact',
    user_id: userId,
    topics: ['paged-context'],
    source_type: 'stated',
    source_channel: 'conversation',
    importance_score: 0.3,
    confidence_score: 0.8,
  };

  const stored = await insertExtractedMemory(client, memoryInsert);
  return stored.id;
}

/**
 * Manage the conversation history to fit within the context window budget.
 *
 * Scores all messages, and if over budget, pages out the lowest-scoring
 * messages. System messages (identity zone) are pinned and never paged.
 * Paged messages are replaced with one-line stubs.
 *
 * @param client - Supabase client for storing paged messages
 * @param messages - conversation history (user/assistant/system messages)
 * @param userId - user ID for paged memory ownership
 * @param repoId - repo ID for paged memory storage
 * @param maxTokens - total context window size (default 180,000)
 * @param zones - budget zone allocation
 */
export async function manageBudget(
  client: SupabaseClient,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  userId: string,
  repoId: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  zones: BudgetZones = DEFAULT_BUDGET_ZONES,
): Promise<ManagedBudgetResult> {
  // Calculate active thread budget
  const activeThreadBudget = Math.floor(maxTokens * zones.activeThread);

  // Score all messages
  const activeTopics = extractActiveTopics(messages);
  const scored: ScoredMessage[] = messages.map((msg, idx) => ({
    message: msg,
    turnIndex: idx,
    relevanceScore:
      msg.role === 'system'
        ? 1.0
        : scoreRelevance(msg, idx, messages.length, activeTopics, messages),
    pinned: msg.role === 'system',
    tokenEstimate: estimateTokens(msg.content),
  }));

  // Calculate current token usage (non-system messages only for active thread zone)
  const activeThreadTokens = scored
    .filter((s) => !s.pinned)
    .reduce((sum, s) => sum + s.tokenEstimate, 0);

  const pagingLevel = shouldPage(activeThreadTokens, activeThreadBudget);

  // If under budget, return everything unchanged
  if (pagingLevel === 'none' || pagingLevel === 'flag') {
    return {
      messages: messages.map((m) => ({ ...m })),
      pagedCount: 0,
      totalTokens: scored.reduce((sum, s) => sum + s.tokenEstimate, 0),
      pagingLevel,
    };
  }

  // Need to page: sort non-pinned messages by relevance (lowest first)
  const pageable = scored
    .filter((s) => !s.pinned)
    .sort((a, b) => a.relevanceScore - b.relevanceScore);

  // Page out messages until we're under budget
  const targetTokens = Math.floor(activeThreadBudget * 0.7); // Page down to 70% of budget
  let currentTokens = activeThreadTokens;
  const pagedIndices = new Set<number>();

  for (const item of pageable) {
    if (currentTokens <= targetTokens) break;
    pagedIndices.add(item.turnIndex);
    currentTokens -= item.tokenEstimate;
  }

  // Store paged messages and create stubs
  const resultMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
  let pagedCount = 0;

  for (let i = 0; i < messages.length; i++) {
    if (pagedIndices.has(i)) {
      // Page this message out
      const memoryId = await pageOut(client, messages[i], userId, repoId);
      const stub = generateStub(messages[i], memoryId);
      resultMessages.push({ role: messages[i].role, content: stub });
      pagedCount++;
    } else {
      resultMessages.push({ ...messages[i] });
    }
  }

  const totalTokens = resultMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  return {
    messages: resultMessages,
    pagedCount,
    totalTokens,
    pagingLevel,
  };
}

// -- Context Window Manager Class --

/**
 * ContextWindowManager: orchestrates token budget management
 * for the Guardian chat system.
 *
 * Usage:
 *   const manager = new ContextWindowManager();
 *   const result = await manager.manage(client, messages, userId, repoId);
 */
export class ContextWindowManager {
  private maxTokens: number;
  private zones: BudgetZones;

  constructor(maxTokens: number = DEFAULT_MAX_TOKENS, zones: BudgetZones = DEFAULT_BUDGET_ZONES) {
    this.maxTokens = maxTokens;
    this.zones = zones;
  }

  /** Get the token budget for each zone. */
  getZoneBudgets(): Record<keyof BudgetZones, number> {
    return {
      identity: Math.floor(this.maxTokens * this.zones.identity),
      activeThread: Math.floor(this.maxTokens * this.zones.activeThread),
      retrievedMemory: Math.floor(this.maxTokens * this.zones.retrievedMemory),
      buffer: Math.floor(this.maxTokens * this.zones.buffer),
    };
  }

  /** Estimate tokens for a text string. */
  estimateTokens(text: string): number {
    return estimateTokens(text);
  }

  /** Check paging level for given token counts. */
  shouldPage(currentTokens: number): PagingLevel {
    const budget = this.getZoneBudgets().activeThread;
    return shouldPage(currentTokens, budget);
  }

  /**
   * Run budget management on a conversation.
   * This is the main entry point for response.ts integration.
   */
  async manage(
    client: SupabaseClient,
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    userId: string,
    repoId: string,
  ): Promise<ManagedBudgetResult> {
    return manageBudget(client, messages, userId, repoId, this.maxTokens, this.zones);
  }
}

// Re-export recencyDecay for use in scoring (imported from retriever)
export { recencyDecay };
