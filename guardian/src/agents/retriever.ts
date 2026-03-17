import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../llm/embeddings.js';
import { matchMemories, recordMemoryAccess, getContributorById } from '../db/queries.js';
import type { MatchMemoryResult, ContributorProfile } from '../db/schema.js';

/** How many top memories to return after re-ranking. */
const TOP_K = 10;

/** Maximum candidates to fetch from the initial search. */
const CANDIDATE_COUNT = 30;

/** Minimum combined score threshold for initial search. */
const MATCH_THRESHOLD = 0.3;

/** Re-ranking weights. */
const SEMANTIC_WEIGHT = 0.5;
const IMPORTANCE_WEIGHT = 0.3;
const RECENCY_WEIGHT = 0.2;

/** Recency decay half-life in days (exp(-d/30)). */
const RECENCY_HALF_LIFE = 30;

/** Degradation levels for observability. */
export type DegradationLevel = 'full' | 'reduced' | 'minimal' | 'empty';

/** Result from a retrieval call. */
export interface RetrievalResult {
  memories: RankedMemory[];
  contributorProfile: ContributorProfile | null;
  contextBlock: string;
  latencyMs: number;
  degradation: DegradationLevel;
}

/** A memory with its final re-ranked score. */
export interface RankedMemory {
  id: string;
  content: string;
  memory_type: string;
  topics: string[] | null;
  importance_score: number;
  semantic_score: number;
  recency_score: number;
  final_score: number;
}

/**
 * Compute recency decay: exp(-age_days / 30).
 * Returns 1.0 for today, decays toward 0 for older memories.
 */
export function recencyDecay(ageDays: number): number {
  return Math.exp(-ageDays / RECENCY_HALF_LIFE);
}

/**
 * Re-rank candidates using the two-stage formula:
 *   final_score = 0.50 * semantic_similarity
 *               + 0.30 * importance_score
 *               + 0.20 * recency_decay(age_days)
 *
 * Since MatchMemoryResult doesn't include created_at, we use semantic_score
 * as a proxy for the database-side scoring, and apply importance + recency on top.
 * For recency, we default to ageDays=0 (today) since the match_memories RPC
 * doesn't return timestamps — the recency component rewards recently-accessed memories.
 */
function rerank(candidates: MatchMemoryResult[], now: Date = new Date()): RankedMemory[] {
  // MatchMemoryResult doesn't include created_at, so we assign a uniform
  // recency score of 1.0 (present-day). This keeps the formula honest —
  // once the RPC returns timestamps, we plug them in here.
  void now; // reserved for future timestamp-based decay

  return candidates
    .map((c) => {
      const recencyScore = 1.0; // placeholder until timestamps available
      const finalScore =
        SEMANTIC_WEIGHT * c.semantic_score +
        IMPORTANCE_WEIGHT * c.importance_score +
        RECENCY_WEIGHT * recencyScore;

      return {
        id: c.id,
        content: c.content,
        memory_type: c.memory_type,
        topics: c.topics,
        importance_score: c.importance_score,
        semantic_score: c.semantic_score,
        recency_score: recencyScore,
        final_score: finalScore,
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, TOP_K);
}

/**
 * Re-rank candidates with explicit age information.
 * Used when age data is available (e.g., from test fixtures or future RPC enhancements).
 */
export function rerankWithAge(
  candidates: (MatchMemoryResult & { age_days?: number })[],
): RankedMemory[] {
  return candidates
    .map((c) => {
      const ageDays = c.age_days ?? 0;
      const recencyScore = recencyDecay(ageDays);
      const finalScore =
        SEMANTIC_WEIGHT * c.semantic_score +
        IMPORTANCE_WEIGHT * c.importance_score +
        RECENCY_WEIGHT * recencyScore;

      return {
        id: c.id,
        content: c.content,
        memory_type: c.memory_type,
        topics: c.topics,
        importance_score: c.importance_score,
        semantic_score: c.semantic_score,
        recency_score: recencyScore,
        final_score: finalScore,
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, TOP_K);
}

/**
 * Format ranked memories and optional contributor profile into a context block
 * suitable for LLM prompt injection.
 */
function formatContextBlock(memories: RankedMemory[], profile: ContributorProfile | null): string {
  const sections: string[] = [];

  if (profile) {
    const profileLines: string[] = [`## Contributor: ${profile.github_username}`];
    if (profile.display_name) profileLines.push(`Name: ${profile.display_name}`);
    if (profile.summary) profileLines.push(`Summary: ${profile.summary}`);
    if (profile.expertise?.length) profileLines.push(`Expertise: ${profile.expertise.join(', ')}`);
    if (profile.interests?.length) profileLines.push(`Interests: ${profile.interests.join(', ')}`);
    if (profile.communication_style) {
      profileLines.push(`Communication style: ${profile.communication_style}`);
    }
    sections.push(profileLines.join('\n'));
  }

  if (memories.length > 0) {
    const memoryLines: string[] = ['## Relevant Memories'];
    for (const mem of memories) {
      const topicStr = mem.topics?.length ? ` [${mem.topics.join(', ')}]` : '';
      memoryLines.push(`- (${mem.memory_type}${topicStr}) ${mem.content}`);
    }
    sections.push(memoryLines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Run the retriever agent: two-stage retrieval with graceful degradation.
 *
 * Degradation levels:
 * - full: semantic + keyword + contributor context
 * - reduced: keyword only (embedding generation failed)
 * - minimal: contributor profile only (database search failed)
 * - empty: nothing available (all systems down)
 */
export async function runRetriever(
  client: SupabaseClient,
  query: string,
  repoId: string,
  userId?: string,
  contributorId?: string,
): Promise<RetrievalResult> {
  const startTime = Date.now();

  // Launch contributor profile fetch in parallel with Stage 1
  const profilePromise = contributorId
    ? getContributorById(client, contributorId).catch((err) => {
        console.error(
          'Retriever: contributor profile fetch failed:',
          err instanceof Error ? err.message : err,
        );
        return null;
      })
    : Promise.resolve(null);

  // Stage 1: Generate query embedding + semantic search
  let candidates: MatchMemoryResult[] = [];
  let degradation: DegradationLevel = 'full';

  try {
    const embedding = await generateEmbedding(query);

    if (embedding) {
      // Full search: semantic + keyword
      try {
        candidates = await matchMemories(client, {
          query_embedding: embedding,
          query_text: query,
          filter_repo_id: repoId,
          filter_user_id: userId,
          match_threshold: MATCH_THRESHOLD,
          match_count: CANDIDATE_COUNT,
        });
      } catch (dbError) {
        console.error(
          'Retriever: matchMemories failed:',
          dbError instanceof Error ? dbError.message : dbError,
        );
        degradation = 'minimal';
      }
    } else {
      // Embedding failed — try keyword-only search with zero vector
      degradation = 'reduced';
      try {
        candidates = await matchMemories(client, {
          query_embedding: Array.from({ length: 1536 }, () => 0),
          query_text: query,
          filter_repo_id: repoId,
          filter_user_id: userId,
          match_threshold: MATCH_THRESHOLD,
          match_count: CANDIDATE_COUNT,
          semantic_weight: 0, // keyword only
        });
      } catch (dbError) {
        console.error(
          'Retriever: keyword-only matchMemories failed:',
          dbError instanceof Error ? dbError.message : dbError,
        );
        degradation = 'minimal';
      }
    }
  } catch (embeddingError) {
    // Embedding generation threw (not just returned null)
    console.error(
      'Retriever: embedding generation threw:',
      embeddingError instanceof Error ? embeddingError.message : embeddingError,
    );
    degradation = 'reduced';
    try {
      candidates = await matchMemories(client, {
        query_embedding: Array.from({ length: 1536 }, () => 0),
        query_text: query,
        filter_repo_id: repoId,
        filter_user_id: userId,
        match_threshold: MATCH_THRESHOLD,
        match_count: CANDIDATE_COUNT,
        semantic_weight: 0,
      });
    } catch (dbError) {
      console.error(
        'Retriever: fallback matchMemories failed:',
        dbError instanceof Error ? dbError.message : dbError,
      );
      degradation = 'minimal';
    }
  }

  // Wait for contributor profile
  const contributorProfile = await profilePromise;

  // Stage 2: Re-rank candidates
  const memories = rerank(candidates);

  // If we have nothing at all, mark as empty
  if (memories.length === 0 && !contributorProfile) {
    degradation = degradation === 'full' ? 'full' : 'empty';
    // If degradation was already minimal and we got no profile either, it's empty
    if (degradation !== 'full') {
      degradation = 'empty';
    }
  }

  // Record access for retrieved memories (fire-and-forget)
  if (memories.length > 0) {
    const memoryIds = memories.map((m) => m.id);
    recordMemoryAccess(client, memoryIds).catch((err) => {
      console.error(
        'Retriever: recordMemoryAccess failed:',
        err instanceof Error ? err.message : err,
      );
    });
  }

  // Synthesize context block
  const contextBlock = formatContextBlock(memories, contributorProfile);

  return {
    memories,
    contributorProfile,
    contextBlock,
    latencyMs: Date.now() - startTime,
    degradation,
  };
}
