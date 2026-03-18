/**
 * Retrieval Anticipator — predictive memory pre-fetch.
 *
 * Monitors the conversation stream and predicts what memories will be
 * relevant before they're explicitly requested. Runs in the chat request
 * path, so signal detection must be fast (<100ms).
 *
 * Architecture:
 *   1. Signal detection (regex/keyword, no LLM) → AnticipationSignal[]
 *   2. Score each signal → injection priority
 *   3. Triage into tiers (inject now / stage / index-only / discard)
 *   4. Pre-fetch via existing Retriever for Tier 1 signals
 *   5. Stage Tier 2 predictions for next turn
 *   6. Track accuracy for feedback loop
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { runRetriever, type RankedMemory, type RetrievalResult } from './retriever.js';
import { detectAllSignals, type AnticipationSignal } from './anticipator-signals.js';
import { upsertAgentState, getAgentState } from '../db/queries.js';

// -- Constants --

/** Maximum number of pre-fetch queries to run (to keep latency bounded). */
const MAX_PREFETCH_QUERIES = 3;

/** TTL for staged predictions in milliseconds (5 minutes). */
const STAGED_TTL_MS = 5 * 60 * 1000;

// -- Prediction Types --

/** Confidence tier for a prediction. */
export type PredictionTier = 'tier1' | 'tier2' | 'tier3' | 'discard';

/** A scored prediction combining signal confidence with memory metadata. */
export interface ScoredPrediction {
  /** Unique ID for tracking accuracy. */
  predictionId: string;
  /** The originating signal. */
  signal: AnticipationSignal;
  /** Retrieved memories for this prediction. */
  memories: RankedMemory[];
  /** Computed injection priority (0-1). */
  injectionPriority: number;
  /** Assigned tier based on injectionPriority. */
  tier: PredictionTier;
  /** Timestamp when the prediction was made. */
  createdAt: number;
}

/** Staged predictions awaiting confirmation on the next turn. */
interface StagedEntry {
  predictions: ScoredPrediction[];
  expiresAt: number;
}

// -- In-Memory Cache for Tier 2 Staging --

/** Map of userId → staged predictions. Only needs to persist a few turns. */
const stagedPredictions = new Map<string, StagedEntry>();

// -- Scoring --

/**
 * Score a prediction for injection priority.
 *
 * injection_priority = 0.40 * prediction_confidence
 *                    + 0.30 * memory_importance
 *                    + 0.20 * freshness
 *                    + 0.10 * access_pattern
 */
export function scorePrediction(signal: AnticipationSignal, memories: RankedMemory[]): number {
  const predictionConfidence = signal.confidence;

  // Average importance of retrieved memories (0 if none)
  const memoryImportance =
    memories.length > 0
      ? memories.reduce((sum, m) => sum + m.importance_score, 0) / memories.length
      : 0;

  // Freshness: use average recency score from retriever (0 if none)
  const freshness =
    memories.length > 0
      ? memories.reduce((sum, m) => sum + m.recency_score, 0) / memories.length
      : 0;

  // Access pattern: higher for frequently accessed memories
  // Use a simple heuristic based on semantic_score as a proxy
  const accessPattern =
    memories.length > 0
      ? memories.reduce((sum, m) => sum + m.semantic_score, 0) / memories.length
      : 0;

  return (
    0.4 * predictionConfidence + 0.3 * memoryImportance + 0.2 * freshness + 0.1 * accessPattern
  );
}

/**
 * Assign a tier based on injection priority score.
 */
export function assignTier(injectionPriority: number): PredictionTier {
  if (injectionPriority > 0.85) return 'tier1';
  if (injectionPriority >= 0.6) return 'tier2';
  if (injectionPriority >= 0.4) return 'tier3';
  return 'discard';
}

// -- Triage --

/**
 * Sort predictions into tiers.
 *
 * - Tier 1 (>0.85): Inject into context now
 * - Tier 2 (0.60-0.85): Stage in buffer, inject if conversation confirms
 * - Tier 3 (0.40-0.60): Index only, retrievable on demand
 * - Below 0.40: Discard
 */
export function triagePredictions(predictions: ScoredPrediction[]): {
  tier1: ScoredPrediction[];
  tier2: ScoredPrediction[];
  tier3: ScoredPrediction[];
  discarded: ScoredPrediction[];
} {
  const result = {
    tier1: [] as ScoredPrediction[],
    tier2: [] as ScoredPrediction[],
    tier3: [] as ScoredPrediction[],
    discarded: [] as ScoredPrediction[],
  };

  for (const prediction of predictions) {
    switch (prediction.tier) {
      case 'tier1':
        result.tier1.push(prediction);
        break;
      case 'tier2':
        result.tier2.push(prediction);
        break;
      case 'tier3':
        result.tier3.push(prediction);
        break;
      case 'discard':
        result.discarded.push(prediction);
        break;
    }
  }

  // Sort each tier by priority (highest first)
  result.tier1.sort((a, b) => b.injectionPriority - a.injectionPriority);
  result.tier2.sort((a, b) => b.injectionPriority - a.injectionPriority);
  result.tier3.sort((a, b) => b.injectionPriority - a.injectionPriority);

  return result;
}

// -- Staging --

/**
 * Stage Tier 2 predictions for a user (available for next turn).
 */
export function stagePredictions(userId: string, predictions: ScoredPrediction[]): void {
  stagedPredictions.set(userId, {
    predictions,
    expiresAt: Date.now() + STAGED_TTL_MS,
  });
}

/**
 * Retrieve staged predictions for a user (if still valid).
 */
export function getStagedPredictions(userId: string): ScoredPrediction[] {
  const entry = stagedPredictions.get(userId);
  if (!entry) return [];

  if (Date.now() > entry.expiresAt) {
    stagedPredictions.delete(userId);
    return [];
  }

  return entry.predictions;
}

/**
 * Clear staged predictions for a user (after they've been consumed or expired).
 */
export function clearStagedPredictions(userId: string): void {
  stagedPredictions.delete(userId);
}

// -- Accuracy Tracking --

/** Counter for generating prediction IDs. */
let predictionCounter = 0;

/** Generate a unique prediction ID. */
function generatePredictionId(): string {
  return `pred-${Date.now()}-${++predictionCounter}`;
}

/**
 * Track whether a prediction was accurate (i.e., the pre-fetched memory
 * was actually used in the response). Stores in agent_state metadata.
 */
export async function trackAccuracy(
  client: SupabaseClient,
  repoId: string,
  predictionId: string,
  wasUsed: boolean,
): Promise<void> {
  try {
    const state = await getAgentState(client, 'retriever', repoId);
    const metadata = (state?.metadata ?? {}) as Record<string, unknown>;

    // Maintain a rolling accuracy tracker
    const tracker = (metadata.anticipator_accuracy ?? {
      total: 0,
      hits: 0,
      misses: 0,
      recent: [],
    }) as {
      total: number;
      hits: number;
      misses: number;
      recent: { id: string; used: boolean; ts: number }[];
    };

    tracker.total++;
    if (wasUsed) {
      tracker.hits++;
    } else {
      tracker.misses++;
    }

    // Keep last 100 entries for recency analysis
    tracker.recent.push({ id: predictionId, used: wasUsed, ts: Date.now() });
    if (tracker.recent.length > 100) {
      tracker.recent = tracker.recent.slice(-100);
    }

    await upsertAgentState(client, {
      agent_name: 'retriever',
      repo_id: repoId,
      metadata: { ...metadata, anticipator_accuracy: tracker },
    });
  } catch (err) {
    console.error('Anticipator: trackAccuracy failed:', err instanceof Error ? err.message : err);
  }
}

// -- Main Anticipator --

/** Result from running the anticipator. */
export interface AnticipatorResult {
  /** Tier 1 memories to inject immediately (deduplicated). */
  immediateMemories: RankedMemory[];
  /** Tier 2 predictions staged for next turn. */
  stagedCount: number;
  /** All signals detected. */
  signals: AnticipationSignal[];
  /** All scored predictions (for observability). */
  predictions: ScoredPrediction[];
  /** Latency of anticipator in ms. */
  latencyMs: number;
}

/**
 * Analyze a message for prediction signals.
 * This is the pure signal-detection step (no I/O).
 */
export function analyzeForPredictions(
  message: string,
  conversationHistory: string[] = [],
): AnticipationSignal[] {
  return detectAllSignals(message, conversationHistory);
}

/**
 * Run the Retriever for each predicted query signal and score the results.
 */
export async function predictRelevantMemories(
  client: SupabaseClient,
  signals: AnticipationSignal[],
  userId: string,
  repoId: string,
): Promise<ScoredPrediction[]> {
  if (signals.length === 0) return [];

  // Limit to top N signals by confidence to keep latency bounded
  const topSignals = [...signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_PREFETCH_QUERIES);

  // Run retriever calls in parallel
  const retrievalPromises = topSignals.map(async (signal): Promise<ScoredPrediction> => {
    let memories: RankedMemory[] = [];

    try {
      const result: RetrievalResult = await runRetriever(
        client,
        signal.suggestedQuery,
        repoId,
        userId,
      );
      memories = result.memories;
    } catch (err) {
      console.error(
        'Anticipator: pre-fetch failed for signal:',
        signal.value,
        err instanceof Error ? err.message : err,
      );
    }

    const injectionPriority = scorePrediction(signal, memories);
    const tier = assignTier(injectionPriority);

    return {
      predictionId: generatePredictionId(),
      signal,
      memories,
      injectionPriority,
      tier,
      createdAt: Date.now(),
    };
  });

  return Promise.all(retrievalPromises);
}

/**
 * Run the full anticipator pipeline:
 *   1. Detect signals in the user message
 *   2. Pre-fetch memories for top signals via Retriever
 *   3. Score and triage predictions
 *   4. Return Tier 1 memories for immediate injection
 *   5. Stage Tier 2 for next turn
 */
export async function runAnticipator(
  client: SupabaseClient,
  userMessage: string,
  userId: string,
  repoId: string,
  conversationHistory: string[] = [],
): Promise<AnticipatorResult> {
  const startTime = Date.now();

  // Step 1: Detect signals
  const signals = analyzeForPredictions(userMessage, conversationHistory);

  if (signals.length === 0) {
    return {
      immediateMemories: [],
      stagedCount: 0,
      signals: [],
      predictions: [],
      latencyMs: Date.now() - startTime,
    };
  }

  // Step 2: Pre-fetch and score
  const predictions = await predictRelevantMemories(client, signals, userId, repoId);

  // Step 3: Triage
  const triaged = triagePredictions(predictions);

  // Step 4: Collect Tier 1 memories (deduplicated)
  const seenIds = new Set<string>();
  const immediateMemories: RankedMemory[] = [];
  for (const prediction of triaged.tier1) {
    for (const memory of prediction.memories) {
      if (!seenIds.has(memory.id)) {
        seenIds.add(memory.id);
        immediateMemories.push(memory);
      }
    }
  }

  // Step 5: Stage Tier 2
  if (triaged.tier2.length > 0) {
    stagePredictions(userId, triaged.tier2);
  }

  return {
    immediateMemories,
    stagedCount: triaged.tier2.length,
    signals,
    predictions,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Merge anticipator results with standard retriever results.
 * Deduplicates by memory ID, with retriever results taking priority.
 */
export function mergeWithRetrieval(
  retrieverMemories: RankedMemory[],
  anticipatedMemories: RankedMemory[],
): RankedMemory[] {
  const seenIds = new Set<string>();
  const merged: RankedMemory[] = [];

  // Retriever results take priority
  for (const memory of retrieverMemories) {
    seenIds.add(memory.id);
    merged.push(memory);
  }

  // Add anticipated memories that aren't already in retriever results
  for (const memory of anticipatedMemories) {
    if (!seenIds.has(memory.id)) {
      seenIds.add(memory.id);
      merged.push(memory);
    }
  }

  return merged;
}
