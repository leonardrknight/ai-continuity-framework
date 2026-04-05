/**
 * Clawdbot Memory Guardian Plugin
 *
 * Guardian-powered memory with three-plane knowledge boundaries.
 * Replaces memory-supabase with structured identity resolution,
 * consolidator/curator background agents, and human-scoped memory.
 *
 * Provides memory_search, memory_get, memory_store, memory_forget tools.
 * Auto-recall injects context; auto-capture stores learned facts.
 *
 * Tool implementations use Guardian pipeline with plane-aware filtering.
 */

import { Type } from "@sinclair/typebox";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { stringEnum } from "clawdbot/plugin-sdk";

import {
  type MemoryGuardianConfig,
  memoryGuardianConfigSchema,
  parseConfig,
} from "./config.js";

// ============================================================================
// Types for Recall Pipeline
// ============================================================================

/** Cached human profile with TTL */
type CachedProfile = {
  profile: HumanProfileData;
  fetchedAt: number;
};

/** Human profile data fetched from the humans table */
type HumanProfileData = {
  display_name: string | null;
  summary: string | null;
  communication_style: Record<string, unknown> | null;
  interests: string[] | null;
  expertise: string[] | null;
  preferences: Record<string, unknown> | null;
  role_title: string | null;
};

/** A memory result from the match_memories_for_human RPC */
type MatchedMemory = {
  id: string;
  content: string;
  memory_type: string;
  knowledge_plane: string | null;
  importance_score: number;
  similarity: number;
  created_at: string;
  topics: string[] | null;
};

/** Profile cache: humanId -> CachedProfile */
const profileCache = new Map<string, CachedProfile>();
const PROFILE_TTL_MS = 300_000; // 5 minutes

// ============================================================================
// Types for Scribe Integration + Plane Classification
// ============================================================================

type KnowledgePlane = "company" | "role" | "private";

interface ExtractedMemoryLLM {
  content: string;
  memory_type: string;
  topics: string[];
  entities: string[];
  importance_score: number;
  confidence_score: number;
  knowledge_plane: KnowledgePlane;
  classification_confidence: number;
}

interface SessionState {
  lastMessageTs: number;
  messageCount: number;
  conversationSnippets: string[];
}

// ============================================================================
// Constants (Scribe)
// ============================================================================

const EXTRACTION_MODEL = "claude-3-haiku-20240307";
const EMBEDDING_MODEL = "text-embedding-3-small";
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
const MIN_MESSAGES_FOR_SUMMARY = 3;
const SNIPPET_MAX_CHARS = 4000;
const SESSION_SNIPPET_MAX_CHARS = 6000;
const MAX_SESSION_SNIPPETS = 20;

/** System tags to strip from user messages before extraction */
const SYSTEM_TAG_RE =
  /<(?:relevant-memories|working-memory|human-profile)[\s\S]*?<\/(?:relevant-memories|working-memory|human-profile)>/gi;

/** Messages that are pure greetings / emoji-only / too short */
const NOISE_RE =
  /^(?:hi|hello|hey|sup|yo|ok|okay|k|thanks|thank you|ty|thx|bye|goodbye|gn|gm|good\s*(?:morning|night|evening|afternoon))[\s!.?]*$/i;
const EMOJI_ONLY_RE = /^[\p{Emoji}\s]+$/u;
const MIN_MESSAGE_LENGTH = 15;

// ============================================================================
// Extraction Prompt (Enhanced with Three-Plane Classification)
// ============================================================================

const GUARDIAN_EXTRACTION_PROMPT = `You are a memory extraction agent processing conversation turns. Extract structured memories that capture important information the user has shared — facts about themselves, decisions they've made, preferences they've expressed, questions they've asked, relationships they've mentioned, and patterns in how they communicate.

Also extract important information from assistant responses — decisions made, recommendations given, explanations provided, and commitments made.

For each memory, classify into exactly one knowledge plane:
- COMPANY: organizational info — strategy, decisions, financials, partnerships, culture, product
- ROLE: job-specific knowledge — workflows, technical decisions, project status, performance patterns
- PRIVATE: personal disclosures — concerns, family, health, frustrations, career goals, compensation

IMPORTANT: When a human expresses personal emotions about a company topic, classify as PRIVATE.
"Revenue is down 20%" → COMPANY. "I'm terrified revenue is down" → PRIVATE.
When in doubt, classify as COMPANY.

Guidelines:
- Extract facts, decisions, preferences, patterns, questions, action items, and relationships
- Assign importance_score (0-1): casual chat ~0.2, personal preferences ~0.5, important decisions ~0.8, life events ~0.9
- Assign confidence_score (0-1): explicit statements ~0.9, inferred patterns ~0.6
- Assign classification_confidence (0-1): clear-cut plane assignment ~0.95, ambiguous ~0.6
- Topics should be lowercase, hyphenated (e.g., "personal-preference", "project-decision")
- Entities should be usernames, names, file paths, or concept names
- Skip trivial messages like "ok", "thanks", simple greetings with no substance
- If the conversation has no meaningful content to extract, return an empty array`;

const GUARDIAN_EXTRACTION_TOOL_SCHEMA: Anthropic.Tool = {
  name: "extract_memories",
  description:
    "Extract structured memories with three-plane classification from a conversation",
  input_schema: {
    type: "object" as const,
    properties: {
      memories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "The extracted memory content — a clear, self-contained statement",
            },
            memory_type: {
              type: "string",
              enum: [
                "fact",
                "decision",
                "preference",
                "pattern",
                "question",
                "action_item",
                "relationship",
              ],
            },
            topics: {
              type: "array",
              items: { type: "string" },
              description: "Lowercase hyphenated topic tags",
            },
            entities: {
              type: "array",
              items: { type: "string" },
              description: "Usernames, names, file paths, or concept names",
            },
            importance_score: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            confidence_score: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            knowledge_plane: {
              type: "string",
              enum: ["company", "role", "private"],
              description:
                "Which knowledge plane this memory belongs to: company, role, or private",
            },
            classification_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description:
                "Confidence in the knowledge_plane classification (0-1)",
            },
          },
          required: [
            "content",
            "memory_type",
            "topics",
            "entities",
            "importance_score",
            "confidence_score",
            "knowledge_plane",
            "classification_confidence",
          ],
        },
      },
    },
    required: ["memories"],
  },
};

const SESSION_SUMMARY_PROMPT = `You are a session summarizer. Given a conversation transcript, produce a concise 2-4 sentence summary capturing:
- The main topics discussed
- Any decisions made or action items identified
- The overall tone/mood of the conversation
Return ONLY the summary text, no preamble.`;

// ============================================================================
// Helpers (Scribe)
// ============================================================================

/**
 * Extract plain text from a message content field,
 * handling both string and array-of-blocks formats.
 */
function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        "type" in block &&
        (block as Record<string, unknown>).type === "text" &&
        "text" in block
      ) {
        parts.push((block as Record<string, unknown>).text as string);
      }
    }
    return parts.join("\n");
  }
  return "";
}

/**
 * Check if a message should be skipped (noise, system content, too short).
 */
function isNoise(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < MIN_MESSAGE_LENGTH) return true;
  if (NOISE_RE.test(cleaned)) return true;
  if (EMOJI_ONLY_RE.test(cleaned)) return true;
  return false;
}

/**
 * Strip system-injected context tags from message text.
 */
function stripSystemTags(text: string): string {
  return text.replace(SYSTEM_TAG_RE, "").trim();
}

/**
 * Update the session tracker for early-return paths where
 * extraction was skipped but we still want to track the session.
 */
function updateSessionTracker(
  tracker: Map<string, SessionState>,
  sessionKey: string,
  snippetParts: string[],
): void {
  const now = Date.now();
  const prev = tracker.get(sessionKey);
  if (prev) {
    // If gap detected, just reset (no summary since extraction was skipped)
    if (now - prev.lastMessageTs >= SESSION_GAP_MS) {
      tracker.set(sessionKey, {
        lastMessageTs: now,
        messageCount: 1,
        conversationSnippets:
          snippetParts.length > 0 ? [snippetParts.join("\n")] : [],
      });
    } else {
      prev.lastMessageTs = now;
      prev.messageCount++;
      if (snippetParts.length > 0) {
        prev.conversationSnippets.push(snippetParts.join("\n"));
        if (prev.conversationSnippets.length > MAX_SESSION_SNIPPETS) {
          prev.conversationSnippets =
            prev.conversationSnippets.slice(-MAX_SESSION_SNIPPETS);
        }
      }
    }
  } else {
    tracker.set(sessionKey, {
      lastMessageTs: now,
      messageCount: 1,
      conversationSnippets:
        snippetParts.length > 0 ? [snippetParts.join("\n")] : [],
    });
  }
}

/**
 * Generate an embedding vector using OpenAI text-embedding-3-small.
 * Returns null on failure (memory will be stored without embedding).
 */
async function generateGuardianEmbedding(
  openai: OpenAI,
  text: string,
  logger: ClawdbotPluginApi["logger"],
): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    logger.warn(
      `memory-guardian: embedding generation failed: ${String(err)}`,
    );
    return null;
  }
}

// ============================================================================
// Identity Resolution
// ============================================================================

/**
 * Resolve a session key (e.g. "telegram:12345") to a human UUID
 * using the configured humanMappings.
 *
 * @param sessionKey - The session identifier to resolve
 * @param mappings - Record mapping session keys to human UUIDs
 * @param logger - Logger instance for warnings
 * @returns The human UUID, or null if the session key is unknown
 */
function resolveHuman(
  sessionKey: string,
  mappings: Record<string, string>,
  logger: ClawdbotPluginApi["logger"],
): string | null {
  const humanId = mappings[sessionKey];
  if (!humanId) {
    logger.warn(
      `memory-guardian: unknown sessionKey "${sessionKey}" — no human mapping found`,
    );
    return null;
  }
  return humanId;
}

// ============================================================================
// Plugin Definition
// ============================================================================

const memoryGuardianPlugin = {
  id: "memory-guardian",
  name: "Memory (Guardian)",
  description:
    "Guardian-powered memory with three-plane knowledge boundaries — multi-tenant, org-scoped",
  kind: "memory" as const,
  configSchema: {
    parse(value: unknown): MemoryGuardianConfig {
      return parseConfig(value);
    },
  },

  register(api: ClawdbotPluginApi) {
    const cfg = parseConfig(api.pluginConfig);

    // ========================================================================
    // Supabase Client Initialization
    // ========================================================================

    let supabase: SupabaseClient;
    try {
      supabase = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
        auth: { persistSession: false },
      });
    } catch (err) {
      api.logger.warn(
        `memory-guardian: Supabase client creation failed: ${String(err)} — plugin will operate in degraded mode`,
      );
      // Create a minimal client that will fail gracefully on operations
      supabase = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, {
        auth: { persistSession: false },
      });
    }

    // ========================================================================
    // Anthropic Client Initialization (for Scribe extraction)
    // ========================================================================

    let anthropic: Anthropic;
    try {
      anthropic = new Anthropic({ apiKey: cfg.anthropicApiKey });
    } catch (err) {
      api.logger.warn(
        `memory-guardian: Anthropic client creation failed: ${String(err)} — extraction will be disabled`,
      );
      anthropic = new Anthropic({ apiKey: cfg.anthropicApiKey });
    }

    // ========================================================================
    // OpenAI Client Initialization (for embeddings)
    // ========================================================================

    let openai: OpenAI;
    try {
      openai = new OpenAI({ apiKey: cfg.embedding.apiKey });
    } catch (err) {
      api.logger.warn(
        `memory-guardian: OpenAI client creation failed: ${String(err)} — embeddings will be disabled`,
      );
      openai = new OpenAI({ apiKey: cfg.embedding.apiKey });
    }

    // ========================================================================
    // Session Tracker (Working Memory)
    // ========================================================================

    const sessionTracker = new Map<string, SessionState>();

    api.logger.info(
      `memory-guardian: registered (org: ${cfg.orgId}, embedding: ${cfg.embedding.provider}/${cfg.embedding.model}, consolidator: ${cfg.enableConsolidator ? "on" : "off"}, curator: ${cfg.enableCurator ? "on" : "off"})`,
    );

    // ========================================================================
    // Recall Pipeline Helpers
    // ========================================================================

    /**
     * Load a human profile from the humans table, with in-memory caching.
     * Returns null if the profile cannot be fetched.
     */
    async function loadHumanProfile(
      humanId: string,
    ): Promise<HumanProfileData | null> {
      const cached = profileCache.get(humanId);
      if (cached && Date.now() - cached.fetchedAt < PROFILE_TTL_MS) {
        return cached.profile;
      }

      try {
        const { data, error } = await supabase
          .from("humans")
          .select(
            "display_name, summary, communication_style, interests, expertise, preferences, roles(title)",
          )
          .eq("id", humanId)
          .single();

        if (error || !data) {
          api.logger.warn(
            `memory-guardian: human profile fetch failed for ${humanId}: ${error?.message ?? "no data"}`,
          );
          return null;
        }

        const profile: HumanProfileData = {
          display_name: data.display_name ?? null,
          summary: data.summary ?? null,
          communication_style: data.communication_style ?? null,
          interests: data.interests ?? null,
          expertise: data.expertise ?? null,
          preferences: data.preferences ?? null,
          role_title:
            (data.roles as Record<string, unknown> | null)?.title as
              | string
              | null ?? null,
        };

        profileCache.set(humanId, { profile, fetchedAt: Date.now() });
        return profile;
      } catch (err) {
        api.logger.warn(
          `memory-guardian: human profile fetch threw: ${String(err)}`,
        );
        return null;
      }
    }

    /**
     * Fetch recent session summaries (working memory) for a human.
     */
    async function fetchWorkingMemory(
      humanId: string,
    ): Promise<Array<{ content: string; created_at: string }>> {
      try {
        const { data, error } = await supabase
          .from("extracted_memories")
          .select("content, created_at")
          .eq("human_id", humanId)
          .eq("memory_type", "session_summary")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) {
          api.logger.warn(
            `memory-guardian: working memory fetch failed: ${error.message}`,
          );
          return [];
        }

        return (data ?? []) as Array<{
          content: string;
          created_at: string;
        }>;
      } catch (err) {
        api.logger.warn(
          `memory-guardian: working memory fetch threw: ${String(err)}`,
        );
        return [];
      }
    }

    /**
     * Rewrite a raw user message into a focused search query using Claude Haiku.
     * Resolves pronouns, extracts entities, detects recency requests.
     * Returns skip=true for greetings/reactions/meta-commentary.
     */
    async function rewriteRecallQuery(
      rawMessage: string,
      recentMessages?: string[],
    ): Promise<{
      query: string;
      recencyDays: number | null;
      skip: boolean;
    }> {
      try {
        const conversationContext =
          recentMessages && recentMessages.length > 0
            ? `\n\nRecent conversation (for resolving pronouns and references like "that", "it", "this", "he", "she", "they"):\n${recentMessages.join("\n")}\n`
            : "";

        const response = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 150,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: `You rewrite user messages into memory search queries. Given a raw conversational message, extract the core information need.${conversationContext}

Return JSON only (no markdown fencing):
{
  "query": "concise search query focusing on key entities, topics, and intent (max 30 words)",
  "recency_days": number or null,
  "skip": boolean
}

Rules:
- IGNORE platform metadata like [Telegram ...], message IDs, timestamps — focus on actual user text
- Extract named entities (people, products, companies) and put them first
- Remove filler words, greetings, and meta-commentary
- Focus on WHAT information would help answer this question
- RESOLVE PRONOUNS using recent conversation context
- Set skip=true for: greetings ("hi", "hey"), reactions ("nice", "cool", "thanks"), meta-commentary, acknowledgments, or messages with no factual information need
- Set skip=false for: any question about a person, project, event, decision, preference, or factual topic
- recency_days: if user asks about recent/this week/today/yesterday, set approximate days (7 for "this week", 1 for "today", 30 for "this month"), otherwise null

Raw message: ${rawMessage}`,
            },
          ],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        const content = textBlock?.text;
        if (!content)
          return { query: rawMessage, recencyDays: null, skip: false };

        // Strip markdown code fences if present (LLM sometimes wraps JSON)
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        return {
          query:
            typeof parsed.query === "string" && parsed.query.length > 3
              ? parsed.query
              : rawMessage,
          recencyDays:
            typeof parsed.recency_days === "number"
              ? parsed.recency_days
              : null,
          skip: parsed.skip === true,
        };
      } catch (err) {
        api.logger.warn(
          `memory-guardian: query rewrite failed: ${String(err)} — using raw message`,
        );
        return { query: rawMessage, recencyDays: null, skip: false };
      }
    }

    /**
     * Retrieve memories using the match_memories_for_human RPC.
     * Falls back to direct vector search if the RPC fails.
     */
    async function retrieveMemories(
      embedding: number[],
      queryText: string,
      humanId: string,
    ): Promise<MatchedMemory[]> {
      // Try the plane-aware RPC first
      try {
        const { data, error } = await supabase.rpc(
          "match_memories_for_human",
          {
            query_embedding: JSON.stringify(embedding),
            query_text: queryText,
            requesting_human_id: humanId,
            filter_org_id: cfg.orgId,
            match_threshold: cfg.recallMinScore,
            match_count: 20,
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        return ((data ?? []) as Array<Record<string, unknown>>).map(
          (r) => ({
            id: r.id as string,
            content: r.content as string,
            memory_type: (r.memory_type as string) ?? "fact",
            knowledge_plane: (r.knowledge_plane as string) ?? null,
            importance_score: (r.importance_score as number) ?? 0.5,
            similarity:
              (r.similarity as number) ??
              (r.combined_score as number) ??
              0,
            created_at:
              (r.created_at as string) ?? new Date().toISOString(),
            topics: (r.topics as string[]) ?? null,
          }),
        );
      } catch (rpcErr) {
        api.logger.warn(
          `memory-guardian: match_memories_for_human RPC failed: ${String(rpcErr)} — trying fallback`,
        );
      }

      // Fallback: direct vector search on consolidated_memories
      try {
        const { data, error } = await supabase.rpc("match_memories", {
          query_embedding: JSON.stringify(embedding),
          query_text: "",
          filter_repo_id: cfg.orgId,
          match_threshold: cfg.recallMinScore,
          match_count: 20,
          semantic_weight: 0.9,
        });

        if (error) {
          api.logger.warn(
            `memory-guardian: fallback match_memories failed: ${error.message}`,
          );
          return [];
        }

        return ((data ?? []) as Array<Record<string, unknown>>).map(
          (r) => ({
            id: r.id as string,
            content: r.content as string,
            memory_type: (r.memory_type as string) ?? "fact",
            knowledge_plane: null,
            importance_score: (r.importance_score as number) ?? 0.5,
            similarity: (r.similarity as number) ?? 0,
            created_at:
              (r.created_at as string) ?? new Date().toISOString(),
            topics: (r.topics as string[]) ?? null,
          }),
        );
      } catch (fallbackErr) {
        api.logger.warn(
          `memory-guardian: fallback search also failed: ${String(fallbackErr)}`,
        );
        return [];
      }
    }

    /**
     * Rerank memory results using the Guardian formula:
     *   finalScore = 0.50 * similarity + 0.30 * importance + 0.20 * recencyScore
     * with decay exemptions for preferences and high-importance memories.
     */
    function rerankMemories(
      memories: MatchedMemory[],
      limit: number,
    ): Array<MatchedMemory & { finalScore: number }> {
      const RECENCY_HALF_LIFE = 60; // 60-day decay
      const now = Date.now();

      const ranked = memories.map((m) => {
        const ageDays =
          (now - new Date(m.created_at).getTime()) / 86_400_000;

        // Decay exemptions: preferences and very important memories
        const exempt =
          m.memory_type === "preference" || m.importance_score >= 0.9;

        const recencyScore = exempt
          ? 1.0
          : Math.exp(-ageDays / RECENCY_HALF_LIFE);

        const finalScore =
          0.5 * m.similarity +
          0.3 * m.importance_score +
          0.2 * recencyScore;

        return { ...m, finalScore };
      });

      ranked.sort((a, b) => b.finalScore - a.finalScore);
      return ranked.slice(0, limit);
    }

    // ========================================================================
    // Memory Type Normalization (used by auto-capture AND memory_store tool)
    // ========================================================================

    /** Map memory types to Guardian's allowed set */
    const VALID_MEMORY_TYPES = new Set([
      "fact",
      "decision",
      "preference",
      "pattern",
      "question",
      "action_item",
      "relationship",
    ]);
    const TYPE_MAP: Record<string, string> = {
      event: "fact",
      summary: "fact",
      session_summary: "fact",
      entity: "fact",
      other: "fact",
    };
    function normalizeMemoryType(t: string | undefined | null): string {
      if (!t) return "fact";
      if (VALID_MEMORY_TYPES.has(t)) return t;
      return TYPE_MAP[t] ?? "fact";
    }

    /**
     * Format a human profile into an XML context block.
     * Returns null if the profile has no useful data.
     */
    function formatProfileBlock(
      profile: HumanProfileData,
    ): string | null {
      const lines: string[] = [];

      if (profile.display_name) {
        const rolePart = profile.role_title
          ? ` (${profile.role_title})`
          : "";
        lines.push(`Talking to: ${profile.display_name}${rolePart}`);
      }

      if (profile.communication_style) {
        const styleStr =
          typeof profile.communication_style === "object"
            ? Object.entries(profile.communication_style)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : String(profile.communication_style);
        if (styleStr) lines.push(`Style: ${styleStr}`);
      }

      if (profile.interests?.length) {
        lines.push(`Current focus: ${profile.interests.join(", ")}`);
      }

      if (profile.expertise?.length) {
        lines.push(`Expertise: ${profile.expertise.join(", ")}`);
      }

      if (lines.length === 0) return null;

      return `<human-profile source="guardian">\n${lines.join("\n")}\n</human-profile>`;
    }

    // ========================================================================
    // Lifecycle: Auto-Recall (before_agent_start)
    // ========================================================================

    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event, ctx) => {
        if (!event.prompt || event.prompt.length < 5) return;

        try {
          const startTime = Date.now();
          const contextParts: string[] = [];
          const sessionKey =
            ((ctx as Record<string, unknown>)?.sessionKey as string) ??
            "unknown";

          // ==============================================================
          // Step 1: Resolve human identity
          // ==============================================================

          const humanId = resolveHuman(
            sessionKey,
            cfg.humanMappings,
            api.logger,
          );
          if (!humanId) {
            // Unknown session — no context injection
            return undefined;
          }

          // ==============================================================
          // Step 2: Load human profile (cached, 5-min TTL)
          // ==============================================================

          let profile: HumanProfileData | null = null;
          try {
            profile = await loadHumanProfile(humanId);
          } catch (err) {
            api.logger.warn(
              `memory-guardian: profile load failed: ${String(err)}`,
            );
          }

          // ==============================================================
          // Step 3: Fetch working memory (recent session summaries)
          // ==============================================================

          const workingMemoryParts: string[] = [];
          try {
            const sessionSummaries = await fetchWorkingMemory(humanId);
            for (const summary of sessionSummaries) {
              const age =
                Date.now() - new Date(summary.created_at).getTime();
              const hoursAgo = Math.round(age / 3_600_000);
              workingMemoryParts.push(
                `[Session ${hoursAgo}h ago] ${summary.content}`,
              );
            }
            if (sessionSummaries.length > 0) {
              api.logger.info(
                `memory-guardian: working memory: ${sessionSummaries.length} session summaries loaded`,
              );
            }
          } catch (err) {
            api.logger.warn(
              `memory-guardian: working memory fetch failed: ${String(err)}`,
            );
          }

          // Build working memory XML block
          if (workingMemoryParts.length > 0) {
            contextParts.push(
              `<working-memory source="guardian">\nRecent session context:\n${workingMemoryParts.join("\n\n")}\n</working-memory>`,
            );
          }

          // ==============================================================
          // Step 4: Rewrite query for better recall (conversation-aware)
          // ==============================================================

          // Extract recent conversation messages for pronoun resolution
          const recentMessages: string[] = [];
          try {
            const messages = (event as Record<string, unknown>)
              .messages as
              | Array<Record<string, unknown>>
              | undefined;
            if (messages && messages.length > 1) {
              const relevant = messages
                .slice(-7)
                .filter((m) => {
                  const role = m.role as string;
                  const msgContent =
                    typeof m.content === "string" ? m.content : "";
                  return (
                    (role === "user" || role === "assistant") &&
                    msgContent.length > 5 &&
                    msgContent.length < 2000
                  );
                })
                .slice(-3);
              for (const m of relevant) {
                const role =
                  (m.role as string) === "user" ? "User" : "Assistant";
                const msgContent = (m.content as string).slice(0, 300);
                recentMessages.push(`${role}: ${msgContent}`);
              }
            }
          } catch {
            // Best-effort conversation history extraction
          }

          const rewritten = await rewriteRecallQuery(
            event.prompt,
            recentMessages.length > 0 ? recentMessages : undefined,
          );

          if (rewritten.skip) {
            api.logger.info(
              `memory-guardian: query rewrite: skip (no recall needed for "${event.prompt.slice(0, 50)}...")`,
            );

            // Still inject profile + working memory even when recall is skipped
            if (profile) {
              const profileBlock = formatProfileBlock(profile);
              if (profileBlock) contextParts.push(profileBlock);
            }

            if (contextParts.length > 0) {
              return { prependContext: contextParts.join("\n\n") };
            }
            return undefined;
          }

          const searchQuery = rewritten.query;
          api.logger.info(
            `memory-guardian: query rewrite: "${event.prompt.slice(0, 60)}..." -> "${searchQuery}"${rewritten.recencyDays ? ` (recency: ${rewritten.recencyDays}d)` : ""}${recentMessages.length > 0 ? ` (with ${recentMessages.length} context msgs)` : ""}`,
          );

          // ==============================================================
          // Step 5: Retrieve memories (plane-aware search)
          // ==============================================================

          const embedding = await generateGuardianEmbedding(
            openai,
            searchQuery,
            api.logger,
          );

          let rankedMemories: Array<
            MatchedMemory & { finalScore: number }
          > = [];

          if (embedding) {
            const candidates = await retrieveMemories(
              embedding,
              searchQuery,
              humanId,
            );

            if (candidates.length > 0) {
              // ============================================================
              // Step 6: Rerank results with Guardian formula
              // ============================================================

              rankedMemories = rerankMemories(
                candidates,
                cfg.recallLimit,
              );
            }
          } else {
            api.logger.warn(
              "memory-guardian: embedding failed — skipping memory retrieval (degraded mode)",
            );
          }

          // ==============================================================
          // Step 7: Format prependContext with XML blocks
          // ==============================================================

          // Profile block
          if (profile) {
            const profileBlock = formatProfileBlock(profile);
            if (profileBlock) contextParts.push(profileBlock);
          }

          // Relevant memories block
          if (rankedMemories.length > 0) {
            const memoryLines = rankedMemories.map((m) => {
              const plane = m.knowledge_plane ?? "shared";
              const simPct = (m.similarity * 100).toFixed(0);
              return `- [${plane}/${m.memory_type}] ${m.content} (${simPct}% sim, importance ${m.importance_score.toFixed(2)})`;
            });

            contextParts.push(
              `<relevant-memories source="guardian">\nRelevant context for this conversation:\n${memoryLines.join("\n")}\n</relevant-memories>`,
            );
          }

          // ==============================================================
          // Step 8: Return prependContext (skip empty blocks)
          // ==============================================================

          const latencyMs = Date.now() - startTime;
          api.logger.info(
            `memory-guardian: recall complete in ${latencyMs}ms — ${rankedMemories.length} memories, profile: ${profile ? "yes" : "no"}, working memory: ${workingMemoryParts.length} items`,
          );

          if (contextParts.length > 0) {
            return { prependContext: contextParts.join("\n\n") };
          }

          return undefined;
        } catch (err) {
          api.logger.warn(
            `memory-guardian: recall failed: ${String(err)}`,
          );
        }
      });
    }

    // ========================================================================
    // Lifecycle: Auto-Capture (agent_end)
    // ========================================================================

    if (cfg.autoCapture) {
      api.on("agent_end", async (event, ctx) => {
        try {
          // ==================================================================
          // 1. Resolve session + human identity
          // ==================================================================

          const sessionKey =
            ((ctx as Record<string, unknown>)?.sessionKey as string) ??
            "unknown";
          const humanId = resolveHuman(
            sessionKey,
            cfg.humanMappings,
            api.logger,
          );

          if (!humanId) {
            api.logger.warn(
              `memory-guardian: skipping extraction — no human mapping for session "${sessionKey}"`,
            );
            // Still update session tracker even for unknown sessions
            updateSessionTracker(sessionTracker, sessionKey, []);
            return;
          }

          if (
            !event.success ||
            !event.messages ||
            event.messages.length === 0
          ) {
            return;
          }

          // ==================================================================
          // 2. Extract message text, filter noise
          // ==================================================================

          const snippetParts: string[] = [];

          for (const msg of event.messages) {
            if (!msg || typeof msg !== "object") continue;
            const msgObj = msg as Record<string, unknown>;
            const role = msgObj.role;
            if (role !== "user" && role !== "assistant") continue;

            let text = extractMessageText(msgObj.content);
            if (!text) continue;

            // Strip system-injected context tags
            text = stripSystemTags(text);
            if (!text) continue;

            // Filter heartbeats and system noise
            if (/HEARTBEAT_OK|NO_REPLY|SILENT_REPLY/i.test(text)) continue;
            if (/^System:\s*\[/i.test(text)) continue;
            if (/^\[Telegram\s/i.test(text)) continue;
            if (/^A new session was started via/i.test(text)) continue;

            // Skip noise (too short, greetings, emojis-only)
            if (isNoise(text)) continue;

            snippetParts.push(
              `${role === "user" ? "User" : "Assistant"}: ${text.trim()}`,
            );
          }

          if (snippetParts.length === 0) {
            updateSessionTracker(sessionTracker, sessionKey, []);
            return;
          }

          // Cap conversation snippet
          let snippet = snippetParts.join("\n\n");
          if (snippet.length > SNIPPET_MAX_CHARS) {
            snippet = snippet.slice(-SNIPPET_MAX_CHARS);
          }

          // ==================================================================
          // 3. Call extraction LLM (Anthropic Claude Haiku)
          // ==================================================================

          let extracted: ExtractedMemoryLLM[] = [];
          try {
            const response = await anthropic.messages.create({
              model: EXTRACTION_MODEL,
              max_tokens: 2048,
              system: GUARDIAN_EXTRACTION_PROMPT,
              tools: [GUARDIAN_EXTRACTION_TOOL_SCHEMA],
              tool_choice: { type: "tool", name: "extract_memories" },
              messages: [
                {
                  role: "user",
                  content: `Conversation with session ${sessionKey}:\n\n${snippet}`,
                },
              ],
            });

            const toolBlock = response.content.find(
              (block) => block.type === "tool_use",
            );
            if (toolBlock && toolBlock.type === "tool_use") {
              const input = toolBlock.input as {
                memories: ExtractedMemoryLLM[];
              };
              extracted = input.memories ?? [];
            }
          } catch (err) {
            api.logger.warn(
              `memory-guardian: LLM extraction failed: ${String(err)}`,
            );
            // Still update session tracker even on extraction failure
            updateSessionTracker(sessionTracker, sessionKey, snippetParts);
            return;
          }

          if (extracted.length === 0) {
            api.logger.info(
              "memory-guardian: extraction found nothing worth remembering",
            );
            updateSessionTracker(sessionTracker, sessionKey, snippetParts);
            return;
          }

          // Limit to configured max per session
          const maxExtract = cfg.extractionMaxPerSession ?? 10;
          const toStore = extracted.slice(0, maxExtract);

          // ==================================================================
          // 4 & 5. Generate embeddings + Store to Supabase
          // ==================================================================

          let stored = 0;

          for (const memory of toStore) {
            try {
              // Generate embedding
              const embedding = await generateGuardianEmbedding(
                openai,
                memory.content,
                api.logger,
              );

              // Validate knowledge_plane
              const validPlanes: KnowledgePlane[] = [
                "company",
                "role",
                "private",
              ];
              const plane: KnowledgePlane = validPlanes.includes(
                memory.knowledge_plane as KnowledgePlane,
              )
                ? (memory.knowledge_plane as KnowledgePlane)
                : "company";

              // Insert into extracted_memories table
              const { error } = await supabase
                .from("extracted_memories")
                .insert({
                  content: memory.content,
                  content_embedding: embedding,
                  memory_type: normalizeMemoryType(memory.memory_type),
                  topics: memory.topics ?? [],
                  entities: memory.entities ?? [],
                  importance_score: memory.importance_score ?? 0.5,
                  confidence_score: memory.confidence_score ?? 0.7,
                  knowledge_plane: plane,
                  human_id: humanId,
                  role_id: null,
                  classification_confidence:
                    memory.classification_confidence ?? 0.8,
                  classified_by: "scribe",
                  repo_id: cfg.orgId,
                  source_event_id: "76d62e33-21ad-4b03-8296-428da9bc38cc",
                  source_channel: "conversation",
                  source_type: "stated",
                });

              if (error) {
                api.logger.warn(
                  `memory-guardian: failed to store memory: ${error.message}`,
                );
              } else {
                stored++;
              }
            } catch (err) {
              api.logger.warn(
                `memory-guardian: error storing memory: ${String(err)}`,
              );
            }
          }

          api.logger.info(
            `memory-guardian: extracted ${toStore.length}, stored ${stored} memories (session: ${sessionKey}, human: ${humanId})`,
          );

          // ==================================================================
          // 6. Session Tracking + Summary Generation
          // ==================================================================

          try {
            const now = Date.now();
            const prev = sessionTracker.get(sessionKey);

            if (prev) {
              const gap = now - prev.lastMessageTs;

              if (
                gap >= SESSION_GAP_MS &&
                prev.messageCount >= MIN_MESSAGES_FOR_SUMMARY
              ) {
                // Session boundary detected — generate summary
                api.logger.info(
                  `memory-guardian: session boundary detected for ${sessionKey} (gap: ${Math.round(gap / 60000)}min, messages: ${prev.messageCount})`,
                );

                const sessionSnippet = prev.conversationSnippets.join("\n\n");
                if (sessionSnippet.length > 50) {
                  try {
                    const summaryResponse = await anthropic.messages.create({
                      model: EXTRACTION_MODEL,
                      max_tokens: 512,
                      system: SESSION_SUMMARY_PROMPT,
                      messages: [
                        {
                          role: "user",
                          content: sessionSnippet.slice(
                            -SESSION_SNIPPET_MAX_CHARS,
                          ),
                        },
                      ],
                    });

                    const summaryText = summaryResponse.content
                      .filter((b) => b.type === "text")
                      .map(
                        (b) => (b as { type: "text"; text: string }).text,
                      )
                      .join("");

                    if (summaryText && summaryText.length > 10) {
                      const summaryEmbedding =
                        await generateGuardianEmbedding(
                          openai,
                          summaryText,
                          api.logger,
                        );

                      const { error: summaryError } = await supabase
                        .from("extracted_memories")
                        .insert({
                          content: summaryText,
                          content_embedding: summaryEmbedding,
                          memory_type: "session_summary",
                          topics: ["session-summary"],
                          entities: [],
                          importance_score: 0.6,
                          confidence_score: 0.9,
                          knowledge_plane: "private" as KnowledgePlane,
                          human_id: humanId,
                          role_id: null,
                          classification_confidence: 0.95,
                          classified_by: "scribe",
                          repo_id: cfg.orgId,
                          source_event_id: "76d62e33-21ad-4b03-8296-428da9bc38cc",
                          source_channel: "conversation",
                          source_type: "inferred",
                        });

                      if (summaryError) {
                        api.logger.warn(
                          `memory-guardian: failed to store session summary: ${summaryError.message}`,
                        );
                      } else {
                        api.logger.info(
                          `memory-guardian: session summary stored (${summaryText.length} chars)`,
                        );
                      }
                    }
                  } catch (err) {
                    api.logger.warn(
                      `memory-guardian: session summary generation failed: ${String(err)}`,
                    );
                  }
                }

                // Reset tracker for new session
                sessionTracker.set(sessionKey, {
                  lastMessageTs: now,
                  messageCount: 1,
                  conversationSnippets:
                    snippetParts.length > 0
                      ? [snippetParts.join("\n")]
                      : [],
                });
              } else if (gap >= SESSION_GAP_MS) {
                // Gap detected but too few messages — skip summary, reset
                api.logger.info(
                  `memory-guardian: session boundary skipped (only ${prev.messageCount} messages, need ${MIN_MESSAGES_FOR_SUMMARY})`,
                );
                sessionTracker.set(sessionKey, {
                  lastMessageTs: now,
                  messageCount: 1,
                  conversationSnippets:
                    snippetParts.length > 0
                      ? [snippetParts.join("\n")]
                      : [],
                });
              } else {
                // Same session — update tracker
                prev.lastMessageTs = now;
                prev.messageCount++;
                if (snippetParts.length > 0) {
                  prev.conversationSnippets.push(snippetParts.join("\n"));
                  // Keep only last N snippet entries to avoid unbounded growth
                  if (prev.conversationSnippets.length > MAX_SESSION_SNIPPETS) {
                    prev.conversationSnippets =
                      prev.conversationSnippets.slice(-MAX_SESSION_SNIPPETS);
                  }
                }
              }
            } else {
              // First message in this session — initialize tracker
              sessionTracker.set(sessionKey, {
                lastMessageTs: now,
                messageCount: 1,
                conversationSnippets:
                  snippetParts.length > 0
                    ? [snippetParts.join("\n")]
                    : [],
              });
              api.logger.info(
                `memory-guardian: session tracker initialized for ${sessionKey}`,
              );
            }
          } catch (err) {
            api.logger.warn(
              `memory-guardian: session tracking failed: ${String(err)}`,
            );
          }
        } catch (err) {
          api.logger.warn(
            `memory-guardian: capture failed: ${String(err)}`,
          );
        }
      });
    }

    // ========================================================================
    // Background Agents: Consolidator + Curator
    // ========================================================================

    /** Interval handles for graceful shutdown */
    const bgIntervals: NodeJS.Timeout[] = [];

    // -- Helper: cosine similarity --
    function cosineSimilarity(a: number[], b: number[]): number {
      if (a.length !== b.length || a.length === 0) return 0;
      let dot = 0, nA = 0, nB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        nA += a[i] * a[i];
        nB += b[i] * b[i];
      }
      const denom = Math.sqrt(nA) * Math.sqrt(nB);
      return denom === 0 ? 0 : dot / denom;
    }

    // -- Helper: type weight for importance recalculation --
    function getTypeWeight(memoryType: string): number {
      const weights: Record<string, number> = {
        decision: 0.9, relationship: 0.85, preference: 0.8,
        pattern: 0.75, fact: 0.7, action_item: 0.65, question: 0.5,
      };
      return weights[memoryType] ?? 0.5;
    }

    // -- Helper: determine tier from importance --
    function determineTier(importance: number): string {
      if (importance >= 0.8) return "long";
      if (importance >= 0.4) return "medium";
      return "short";
    }

    // -- Helper: archival check --
    function shouldArchive(importance: number, ageDays: number, accessCount: number): boolean {
      return importance < 0.2 && ageDays > 90 && accessCount < 3;
    }

    // -- Consolidator Cycle --
    async function runConsolidatorCycle(): Promise<void> {
      try {
        const BATCH_SIZE = 50;
        const DUPLICATE_THRESHOLD = 0.92;
        const RELATED_THRESHOLD = 0.75;

        // Fetch unconsolidated extracted memories
        const { data: unconsolidated, error: fetchErr } = await supabase
          .from("extracted_memories")
          .select("id, content, content_embedding, memory_type, topics, entities, importance_score, confidence_score, knowledge_plane, human_id, repo_id, source_channel")
          .is("consolidated_into", null)
          .eq("repo_id", cfg.orgId)
          .limit(BATCH_SIZE);

        if (fetchErr || !unconsolidated || unconsolidated.length === 0) {
          if (fetchErr) api.logger.warn(`memory-guardian: consolidator fetch error: ${fetchErr.message}`);
          return;
        }

        // Load all consolidated memories with embeddings
        const { data: consolidated, error: conErr } = await supabase
          .from("consolidated_memories")
          .select("id, content, content_embedding, memory_type, topics, importance_score, source_memories, related_memories, knowledge_plane, version, repo_id")
          .eq("repo_id", cfg.orgId);

        if (conErr) {
          api.logger.warn(`memory-guardian: consolidator load error: ${conErr.message}`);
          return;
        }

        const pool = consolidated ?? [];
        let merged = 0, linked = 0, created = 0, errors = 0;

        for (const mem of unconsolidated) {
          try {
            if (!mem.content_embedding) {
              // No embedding — create new consolidated entry
              const { data: newCon, error: insErr } = await supabase
                .from("consolidated_memories")
                .insert({
                  repo_id: mem.repo_id,
                  human_id: mem.human_id,
                  content: mem.content,
                  content_embedding: mem.content_embedding,
                  memory_type: mem.memory_type,
                  topics: mem.topics,
                  importance_score: mem.importance_score,
                  knowledge_plane: mem.knowledge_plane,
                  source_memories: [mem.id],
                  version: 1,
                })
                .select("id")
                .single();

              if (!insErr && newCon) {
                await supabase.from("extracted_memories").update({ consolidated_into: newCon.id }).eq("id", mem.id);
                pool.push({ ...mem, id: newCon.id, source_memories: [mem.id], related_memories: null, version: 1 });
                created++;
              } else { errors++; }
              continue;
            }

            // Find best match — NEVER merge across different knowledge_planes
            let bestMatch: (typeof pool)[number] | null = null;
            let bestSim = -1;
            for (const cm of pool) {
              if (!cm.content_embedding) continue;
              // Enforce same knowledge_plane (Finding 3)
              if (cm.knowledge_plane !== mem.knowledge_plane) continue;
              const sim = cosineSimilarity(mem.content_embedding, cm.content_embedding);
              if (sim > bestSim) { bestSim = sim; bestMatch = cm; }
            }

            if (bestMatch && bestSim >= DUPLICATE_THRESHOLD) {
              // Merge via Claude Sonnet
              const mergeResp = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1024,
                messages: [{
                  role: "user",
                  content: `Merge these two memories into one comprehensive statement. Preserve all unique details.\n\nExisting: ${bestMatch.content}\n\nNew: ${mem.content}\n\nReturn ONLY the merged text, nothing else.`,
                }],
              });
              const mergedContent = mergeResp.content[0]?.type === "text" ? mergeResp.content[0].text : mem.content;
              const boostedImportance = Math.min((Math.max(bestMatch.importance_score, mem.importance_score)) * 1.1, 1.0);

              // Re-embed the merged content
              const embResp = await openai.embeddings.create({
                model: cfg.embedding.model,
                input: mergedContent,
              });
              const newEmbedding = embResp.data[0]?.embedding ?? mem.content_embedding;

              const srcMemories = [...(bestMatch.source_memories ?? []), mem.id];
              await supabase.from("consolidated_memories").update({
                content: mergedContent,
                content_embedding: newEmbedding,
                importance_score: boostedImportance,
                source_memories: srcMemories,
                version: (bestMatch.version ?? 1) + 1,
              }).eq("id", bestMatch.id);

              await supabase.from("extracted_memories").update({ consolidated_into: bestMatch.id }).eq("id", mem.id);
              // Update pool entry
              bestMatch.content = mergedContent;
              bestMatch.content_embedding = newEmbedding;
              bestMatch.importance_score = boostedImportance;
              bestMatch.source_memories = srcMemories;
              merged++;
            } else if (bestMatch && bestSim >= RELATED_THRESHOLD) {
              // Link as related — create new consolidated + update related_memories
              const { data: newCon, error: insErr } = await supabase
                .from("consolidated_memories")
                .insert({
                  repo_id: mem.repo_id,
                  human_id: mem.human_id,
                  content: mem.content,
                  content_embedding: mem.content_embedding,
                  memory_type: mem.memory_type,
                  topics: mem.topics,
                  importance_score: mem.importance_score,
                  knowledge_plane: mem.knowledge_plane,
                  source_memories: [mem.id],
                  version: 1,
                })
                .select("id")
                .single();

              if (!insErr && newCon) {
                const relatedArr = [...(bestMatch.related_memories ?? []), newCon.id];
                await supabase.from("consolidated_memories").update({ related_memories: relatedArr }).eq("id", bestMatch.id);
                await supabase.from("extracted_memories").update({ consolidated_into: newCon.id }).eq("id", mem.id);
                bestMatch.related_memories = relatedArr;
                pool.push({ ...mem, id: newCon.id, source_memories: [mem.id], related_memories: null, version: 1 });
                linked++;
              } else { errors++; }
            } else {
              // No match — create new consolidated
              const { data: newCon, error: insErr } = await supabase
                .from("consolidated_memories")
                .insert({
                  repo_id: mem.repo_id,
                  human_id: mem.human_id,
                  content: mem.content,
                  content_embedding: mem.content_embedding,
                  memory_type: mem.memory_type,
                  topics: mem.topics,
                  importance_score: mem.importance_score,
                  knowledge_plane: mem.knowledge_plane,
                  source_memories: [mem.id],
                  version: 1,
                })
                .select("id")
                .single();

              if (!insErr && newCon) {
                await supabase.from("extracted_memories").update({ consolidated_into: newCon.id }).eq("id", mem.id);
                pool.push({ ...mem, id: newCon.id, source_memories: [mem.id], related_memories: null, version: 1 });
                created++;
              } else { errors++; }
            }
          } catch (memErr) {
            errors++;
            api.logger.warn(`memory-guardian: consolidator failed for ${mem.id}: ${String(memErr)}`);
          }
        }

        // Update agent_state
        await supabase.from("agent_state").upsert({
          agent_name: "consolidator",
          repo_id: cfg.orgId,
          last_run_at: new Date().toISOString(),
          items_processed: unconsolidated.length,
          errors,
          metadata: { merged, linked, created, errors },
        }, { onConflict: "agent_name,repo_id" });

        api.logger.info(
          `memory-guardian: Consolidator: processed ${unconsolidated.length} memories, merged ${merged}, linked ${linked}, created ${created}`,
        );
      } catch (err) {
        api.logger.warn(`memory-guardian: consolidator cycle failed: ${String(err)}`);
      }
    }

    // -- Curator Cycle --
    async function runCuratorCycle(): Promise<void> {
      try {
        let curated = 0, archived = 0, profilesRefreshed = 0, errors = 0;
        const now = new Date();

        // ==== Phase 1: Lifecycle management ====
        // Fetch consolidated_memories not curated in 7+ days
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: staleMems, error: staleErr } = await supabase
          .from("consolidated_memories")
          .select("id, content, memory_type, importance_score, access_count, created_at, source_memories, knowledge_plane, updated_at")
          .eq("repo_id", cfg.orgId)
          .or(`updated_at.lt.${sevenDaysAgo},updated_at.is.null`)
          .limit(100);

        if (staleErr) {
          api.logger.warn(`memory-guardian: curator fetch error: ${staleErr.message}`);
        }

        for (const mem of staleMems ?? []) {
          try {
            const createdDate = new Date(mem.created_at);
            const ageDays = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            const accessCount = mem.access_count ?? 0;
            const sourceCount = mem.source_memories?.length ?? 0;
            const baseImportance = mem.importance_score ?? 0.5;

            // Recalculate importance
            const accessFactor = Math.min(1.0, accessCount / 10);
            const recencyFactor = Math.max(0, 1.0 - ageDays / 365); // linear decay over a year
            const typeWeight = getTypeWeight(mem.memory_type);
            const emotionMagnitude = 0; // not stored on consolidated
            const srcFactor = Math.min(1.0, sourceCount / 5);

            const newImportance = Math.max(0, Math.min(1,
              0.30 * baseImportance +
              0.20 * accessFactor +
              0.15 * recencyFactor +
              0.15 * typeWeight +
              0.10 * emotionMagnitude +
              0.10 * srcFactor
            ));

            const newTier = determineTier(newImportance);
            const archiveFlag = shouldArchive(newImportance, ageDays, accessCount);

            const updates: Record<string, unknown> = {
              importance_score: newImportance,
              tier: newTier,
              stability: archiveFlag ? 0 : undefined,
              updated_at: now.toISOString(),
            };
            // Remove undefined keys
            Object.keys(updates).forEach(k => { if (updates[k] === undefined) delete updates[k]; });

            await supabase.from("consolidated_memories").update(updates).eq("id", mem.id);
            curated++;
            if (archiveFlag) archived++;
          } catch (memErr) {
            errors++;
            api.logger.warn(`memory-guardian: curator failed for memory ${mem.id}: ${String(memErr)}`);
          }
        }

        // ==== Phase 2: Profile synthesis ====
        try {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: activeHumans, error: humErr } = await supabase
            .from("humans")
            .select("id, display_name")
            .gte("last_active_at", thirtyDaysAgo)
            .eq("org_id", cfg.orgId);

          if (humErr) {
            api.logger.warn(`memory-guardian: curator humans fetch error: ${humErr.message}`);
          }

          for (const human of activeHumans ?? []) {
            try {
              // Fetch 50 most recent memories — ALL planes including private (Finding 1)
              const { data: humanMems, error: hMemErr } = await supabase
                .from("consolidated_memories")
                .select("content, memory_type, knowledge_plane, importance_score, topics, created_at")
                .eq("human_id", human.id)
                .eq("repo_id", cfg.orgId)
                .order("created_at", { ascending: false })
                .limit(50);

              if (hMemErr || !humanMems || humanMems.length === 0) continue;

              const memoryBlock = humanMems
                .map((m, i) => `[${i + 1}] (${m.memory_type}, ${m.knowledge_plane ?? "shared"}) ${m.content}`)
                .join("\n");

              const profileResp = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                messages: [{
                  role: "user",
                  content: `Analyze these memories for ${human.display_name ?? "this person"} and synthesize a profile.

Extract behavioral patterns and emotional state as meta-insights. Do NOT include specific private content in the profile. Output observations like 'appears stressed' without revealing why.

Memories:
${memoryBlock}

Return JSON with these fields (no markdown fencing):
{
  "summary": "2-3 sentence personality/work summary",
  "interests": ["topic1", "topic2"],
  "expertise": ["skill1", "skill2"],
  "communication_style": { "tone": "...", "formality": "...", "patterns": ["..."] }
}`,
                }],
              });

              const profileText = profileResp.content[0]?.type === "text" ? profileResp.content[0].text : null;
              if (profileText) {
                try {
                  // Strip markdown code fences if present (LLM sometimes wraps JSON)
                  let jsonStr = profileText.trim();
                  if (jsonStr.startsWith("```")) {
                    // Remove opening fence (```json or ```)
                    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "");
                    // Remove closing fence
                    jsonStr = jsonStr.replace(/\n?```\s*$/, "");
                  }
                  const profile = JSON.parse(jsonStr);
                  await supabase.from("humans").update({
                    summary: profile.summary ?? null,
                    interests: profile.interests ?? null,
                    expertise: profile.expertise ?? null,
                    communication_style: profile.communication_style ?? null,
                  }).eq("id", human.id);
                  profilesRefreshed++;
                  // Clear profile cache for this human
                  profileCache.delete(human.id);
                } catch (parseErr) {
                  api.logger.warn(`memory-guardian: curator profile parse failed for ${human.id}: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
                  api.logger.debug(`memory-guardian: raw profile response: ${profileText.slice(0, 200)}...`);
                  errors++;
                }
              }
            } catch (profErr) {
              errors++;
              api.logger.warn(`memory-guardian: curator profile failed for ${human.id}: ${String(profErr)}`);
            }
          }
        } catch (phaseErr) {
          errors++;
          api.logger.warn(`memory-guardian: curator phase 2 failed: ${String(phaseErr)}`);
        }

        // Update agent_state
        await supabase.from("agent_state").upsert({
          agent_name: "curator",
          repo_id: cfg.orgId,
          last_run_at: now.toISOString(),
          items_processed: curated + profilesRefreshed,
          errors,
          metadata: { curated, profilesRefreshed, archived, errors },
        }, { onConflict: "agent_name,repo_id" });

        api.logger.info(
          `memory-guardian: Curator: curated ${curated} memories, refreshed ${profilesRefreshed} profiles, archived ${archived}`,
        );
      } catch (err) {
        api.logger.warn(`memory-guardian: curator cycle failed: ${String(err)}`);
      }
    }

    // -- Schedule background agents with initial delay --
    if (cfg.enableConsolidator) {
      // First run after 60 seconds, then on interval
      setTimeout(() => {
        runConsolidatorCycle();
        bgIntervals.push(setInterval(runConsolidatorCycle, cfg.consolidatorIntervalMs));
      }, 60_000);
      api.logger.info(`memory-guardian: consolidator scheduled (interval: ${cfg.consolidatorIntervalMs}ms)`);
    }

    if (cfg.enableCurator) {
      // First run after 120 seconds, then on interval
      setTimeout(() => {
        runCuratorCycle();
        bgIntervals.push(setInterval(runCuratorCycle, cfg.curatorIntervalMs));
      }, 120_000);
      api.logger.info(`memory-guardian: curator scheduled (interval: ${cfg.curatorIntervalMs}ms)`);
    }

    // ========================================================================
    // Tool: memory_search
    // ========================================================================

    api.registerTool(
      (ctx) => ({
        name: "memory_search",
        label: "Memory Search",
        description:
          "Search through Amigo's long-term memory using semantic similarity. Returns relevant memories about people, decisions, preferences, and facts.",
        parameters: Type.Object({
          query: Type.String({ description: "Natural language search query" }),
          limit: Type.Optional(
            Type.Number({
              description: `Max results (default: ${cfg.recallLimit})`,
            }),
          ),
          minScore: Type.Optional(
            Type.Number({
              description: `Min similarity 0-1 (default: ${cfg.recallMinScore})`,
            }),
          ),
        }),
        async execute(_toolCallId, params) {
          const {
            query,
            limit = cfg.recallLimit ?? 6,
            minScore = cfg.recallMinScore ?? 0.35,
          } = params as {
            query: string;
            limit?: number;
            minScore?: number;
          };

          try {
            // 1. Generate embedding for the query
            const embedding = await generateGuardianEmbedding(
              openai,
              query,
              api.logger,
            );
            if (!embedding) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "Memory search failed: could not generate query embedding.",
                  },
                ],
                details: { error: "embedding_failed", provider: "memory-guardian" },
              };
            }

            // 2. Resolve human identity from session context
            const sessionKey = ctx?.sessionKey ?? "unknown";
            const humanId = resolveHuman(
              sessionKey,
              cfg.humanMappings,
              api.logger,
            );

            let rawResults: MatchedMemory[];

            if (humanId) {
              // Full plane-aware search via Guardian RPC
              rawResults = await retrieveMemories(embedding, query, humanId);
            } else {
              // Fallback: company-plane-only search (no human context)
              api.logger.info(
                `memory-guardian: memory_search: no human mapping for "${sessionKey}" — falling back to company-plane search`,
              );
              try {
                const { data, error } = await supabase.rpc("match_memories", {
                  query_embedding: JSON.stringify(embedding),
                  query_text: "",
                  filter_repo_id: cfg.orgId,
                  match_threshold: minScore,
                  match_count: 20,
                  semantic_weight: 0.9,
                });
                if (error) {
                  throw new Error(error.message);
                }
                rawResults = ((data ?? []) as Array<Record<string, unknown>>).map(
                  (r) => ({
                    id: r.id as string,
                    content: r.content as string,
                    memory_type: (r.memory_type as string) ?? "fact",
                    knowledge_plane: (r.knowledge_plane as string) ?? null,
                    importance_score: (r.importance_score as number) ?? 0.5,
                    similarity: (r.similarity as number) ?? 0,
                    created_at:
                      (r.created_at as string) ?? new Date().toISOString(),
                    topics: (r.topics as string[]) ?? null,
                  }),
                );
              } catch (fallbackErr) {
                api.logger.warn(
                  `memory-guardian: memory_search fallback failed: ${String(fallbackErr)}`,
                );
                rawResults = [];
              }
            }

            // 3. Filter by minScore
            const filtered = rawResults.filter((m) => m.similarity >= minScore);

            if (filtered.length === 0) {
              return {
                content: [
                  { type: "text" as const, text: "No relevant memories found." },
                ],
                details: { count: 0, provider: "memory-guardian" },
              };
            }

            // 4. Rerank using Guardian formula
            const ranked = rerankMemories(filtered, limit);

            // 5. Format results (matching memory-supabase output format)
            const text = ranked
              .map(
                (r, i) =>
                  `${i + 1}. [${r.knowledge_plane ?? "company"}/${r.memory_type}] ${r.content.slice(0, 200)}${r.content.length > 200 ? "..." : ""} (${((r.finalScore) * 100).toFixed(0)}% relevance)`,
              )
              .join("\n\n");

            api.logger.info(
              `memory-guardian: memory_search returned ${ranked.length} results for "${query.slice(0, 50)}" (session: ${sessionKey})`,
            );

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Found ${ranked.length} relevant memories:\n\n${text}`,
                },
              ],
              details: {
                count: ranked.length,
                provider: "memory-guardian",
                results: ranked.map((r) => ({
                  id: r.id,
                  content: r.content,
                  memory_type: r.memory_type,
                  knowledge_plane: r.knowledge_plane,
                  similarity: r.similarity,
                  finalScore: r.finalScore,
                  topics: r.topics,
                })),
              },
            };
          } catch (err) {
            api.logger.warn(
              `memory-guardian: memory_search failed: ${String(err)}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Memory search error: ${String(err)}`,
                },
              ],
              details: { error: String(err), provider: "memory-guardian" },
            };
          }
        },
      }),
      { name: "memory_search" },
    );

    // ========================================================================
    // Tool: memory_store
    // ========================================================================

    api.registerTool(
      (ctx) => ({
        name: "memory_store",
        label: "Memory Store",
        description:
          "Save important information to long-term memory. Use for preferences, facts, decisions, events.",
        parameters: Type.Object({
          text: Type.String({ description: "Information to remember" }),
          memory_type: Type.Optional(
            stringEnum(["fact", "preference", "event", "summary"]),
          ),
          tags: Type.Optional(
            Type.Array(Type.String(), {
              description: "Tags for categorization",
            }),
          ),
          confidence: Type.Optional(
            Type.Number({ description: "Confidence 0-1 (default: 0.8)" }),
          ),
        }),
        async execute(_toolCallId, params) {
          const {
            text,
            memory_type = "fact",
            tags = [],
            confidence = 0.8,
            plane = "company",
          } = params as {
            text: string;
            memory_type?: string;
            tags?: string[];
            confidence?: number;
            plane?: string;
          };

          try {
            // 1. Generate embedding
            const embedding = await generateGuardianEmbedding(
              openai,
              text,
              api.logger,
            );
            if (!embedding) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "Failed to store: could not generate embedding.",
                  },
                ],
                details: { error: "embedding_failed", provider: "memory-guardian" },
              };
            }

            // 2. Resolve human identity
            const sessionKey = ctx?.sessionKey ?? "unknown";
            const humanId = resolveHuman(
              sessionKey,
              cfg.humanMappings,
              api.logger,
            );

            // 3. Near-duplicate check via vector search
            try {
              const { data: existing } = await supabase.rpc("match_memories", {
                query_embedding: JSON.stringify(embedding),
                query_text: "",
                filter_repo_id: cfg.orgId,
                match_threshold: 0.90,
                match_count: 1,
                semantic_weight: 0.9,
              });

              if (existing && existing.length > 0) {
                const best = existing[0] as Record<string, unknown>;
                const bestSimilarity = (best.similarity as number) ?? 0;

                // Skip if exact duplicate (>= 0.95)
                if (bestSimilarity >= 0.95) {
                  api.logger.info(
                    `memory-guardian: memory_store: duplicate skipped (${(bestSimilarity * 100).toFixed(0)}% match)`,
                  );
                  return {
                    content: [
                      {
                        type: "text" as const,
                        text: `Similar memory already exists: "${(best.content as string).slice(0, 100)}..."`,
                      },
                    ],
                    details: {
                      action: "duplicate",
                      existingId: best.id as string,
                      provider: "memory-guardian",
                    },
                  };
                }

                // Close match (0.90-0.95): update existing memory
                if (bestSimilarity >= 0.90) {
                  const bestId = best.id as string;
                  const bestTags = (best.tags as string[]) ?? [];
                  const mergedTags = [...new Set([...bestTags, ...tags])];
                  const bestConfidence = (best.confidence as number) ?? 0;

                  const { error: updateErr } = await supabase
                    .from("amigo_memories")
                    .update({
                      content: text,
                      embedding: JSON.stringify(embedding),
                      confidence: Math.max(bestConfidence, confidence),
                      tags: mergedTags,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", bestId);

                  if (updateErr) {
                    api.logger.warn(
                      `memory-guardian: memory_store: update failed: ${updateErr.message}`,
                    );
                  } else {
                    api.logger.info(
                      `memory-guardian: memory_store: updated ${memory_type} (${(bestSimilarity * 100).toFixed(0)}% match, ${text.length} chars)`,
                    );
                    return {
                      content: [
                        {
                          type: "text" as const,
                          text: `Updated existing memory (${(bestSimilarity * 100).toFixed(0)}% match): "${text.slice(0, 100)}..."`,
                        },
                      ],
                      details: {
                        action: "updated",
                        id: bestId,
                        provider: "memory-guardian",
                      },
                    };
                  }
                }
              }
            } catch (dedupErr) {
              // Dedup check failed — proceed with insert anyway
              api.logger.warn(
                `memory-guardian: memory_store: dedup check failed: ${String(dedupErr)} — inserting as new`,
              );
            }

            // 4. Validate knowledge plane
            const validPlanes: KnowledgePlane[] = ["company", "role", "private"];
            const knowledgePlane: KnowledgePlane = validPlanes.includes(
              plane as KnowledgePlane,
            )
              ? (plane as KnowledgePlane)
              : "company";

            // 5. Insert into extracted_memories
            const { data: inserted, error: insertErr } = await supabase
              .from("extracted_memories")
              .insert({
                content: text,
                content_embedding: embedding,
                memory_type: normalizeMemoryType(memory_type),
                topics: tags,
                entities: [],
                importance_score: 0.5,
                confidence_score: confidence,
                knowledge_plane: knowledgePlane,
                human_id: humanId,
                role_id: null,
                classification_confidence: 0.9,
                classified_by: "human",
                repo_id: cfg.orgId,
                source_event_id: "76d62e33-21ad-4b03-8296-428da9bc38cc",
                source_channel: "conversation",
                source_type: "stated",
              })
              .select("id")
              .single();

            if (insertErr) {
              api.logger.warn(
                `memory-guardian: memory_store: insert failed: ${insertErr.message}`,
              );
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Failed to store: ${insertErr.message}`,
                  },
                ],
                details: { error: insertErr.message, provider: "memory-guardian" },
              };
            }

            const newId = inserted?.id ?? "unknown";

            api.logger.info(
              `memory-guardian: memory_store: created ${memory_type} (${text.length} chars, plane: ${knowledgePlane}, tags: [${tags.join(", ")}])`,
            );

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Stored: "${text.slice(0, 100)}..."`,
                },
              ],
              details: {
                action: "created",
                id: newId,
                provider: "memory-guardian",
              },
            };
          } catch (err) {
            api.logger.warn(
              `memory-guardian: memory_store failed: ${String(err)}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to store: ${String(err)}`,
                },
              ],
              details: { error: String(err), provider: "memory-guardian" },
            };
          }
        },
      }),
      { name: "memory_store" },
    );

    // ========================================================================
    // Tool: memory_forget
    // ========================================================================

    api.registerTool(
      (ctx) => ({
        name: "memory_forget",
        label: "Memory Forget",
        description: "Delete a specific memory by ID or search for it first.",
        parameters: Type.Object({
          query: Type.Optional(
            Type.String({ description: "Search to find memory to forget" }),
          ),
          memoryId: Type.Optional(
            Type.String({ description: "Specific memory ID to delete" }),
          ),
        }),
        async execute(_toolCallId, params) {
          const { query, memoryId } = params as {
            query?: string;
            memoryId?: string;
          };

          try {
            // Soft-delete by ID
            if (memoryId) {
              // Try extracted_memories first, then amigo_memories
              const now = new Date().toISOString();
              const { error: extErr } = await supabase
                .from("extracted_memories")
                .update({ deleted_at: now })
                .eq("id", memoryId);

              if (extErr) {
                // Try amigo_memories table
                const { error: amigoErr } = await supabase
                  .from("amigo_memories")
                  .update({ deleted_at: now })
                  .eq("id", memoryId);

                if (amigoErr) {
                  return {
                    content: [
                      {
                        type: "text" as const,
                        text: `Could not forget memory ${memoryId}: ${amigoErr.message}`,
                      },
                    ],
                    details: { error: amigoErr.message, provider: "memory-guardian" },
                  };
                }
              }

              api.logger.info(
                `memory-guardian: memory_forget: soft-deleted ${memoryId}`,
              );
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Memory ${memoryId} forgotten.`,
                  },
                ],
                details: {
                  action: "deleted",
                  id: memoryId,
                  provider: "memory-guardian",
                },
              };
            }

            // Search by query and soft-delete best match
            if (query) {
              const embedding = await generateGuardianEmbedding(
                openai,
                query,
                api.logger,
              );
              if (!embedding) {
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: "Cannot search for memory to forget: embedding generation failed.",
                    },
                  ],
                  details: { error: "embedding_failed", provider: "memory-guardian" },
                };
              }

              // Use the Guardian RPC if we have a human context
              const sessionKey = ctx?.sessionKey ?? "unknown";
              const humanId = resolveHuman(
                sessionKey,
                cfg.humanMappings,
                api.logger,
              );

              let results: MatchedMemory[];
              if (humanId) {
                results = await retrieveMemories(embedding, query, humanId);
              } else {
                // Fallback: search without human scoping
                try {
                  const { data, error } = await supabase.rpc("match_memories", {
                    query_embedding: JSON.stringify(embedding),
                    query_text: "",
                    filter_repo_id: cfg.orgId,
                    match_threshold: 0.7,
                    match_count: 5,
                    semantic_weight: 0.9,
                  });
                  if (error) throw new Error(error.message);
                  results = ((data ?? []) as Array<Record<string, unknown>>).map(
                    (r) => ({
                      id: r.id as string,
                      content: r.content as string,
                      memory_type: (r.memory_type as string) ?? "fact",
                      knowledge_plane: (r.knowledge_plane as string) ?? null,
                      importance_score: (r.importance_score as number) ?? 0.5,
                      similarity: (r.similarity as number) ?? 0,
                      created_at:
                        (r.created_at as string) ?? new Date().toISOString(),
                      topics: (r.topics as string[]) ?? null,
                    }),
                  );
                } catch {
                  results = [];
                }
              }

              // Filter to reasonable matches
              const candidates = results.filter((r) => r.similarity >= 0.7);

              if (candidates.length === 0) {
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: "No matching memories found.",
                    },
                  ],
                  details: { found: 0, provider: "memory-guardian" },
                };
              }

              // Auto-delete if single high-confidence match
              if (
                candidates.length === 1 &&
                candidates[0].similarity > 0.9
              ) {
                const target = candidates[0];
                const now = new Date().toISOString();

                // Try both tables
                await supabase
                  .from("extracted_memories")
                  .update({ deleted_at: now })
                  .eq("id", target.id);
                await supabase
                  .from("amigo_memories")
                  .update({ deleted_at: now })
                  .eq("id", target.id);

                api.logger.info(
                  `memory-guardian: memory_forget: soft-deleted ${target.id} via query`,
                );
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: `Forgotten: "${target.content.slice(0, 100)}"`,
                    },
                  ],
                  details: {
                    action: "deleted",
                    id: target.id,
                    provider: "memory-guardian",
                  },
                };
              }

              // Multiple candidates — return list for user to choose
              const list = candidates
                .map(
                  (r) =>
                    `- [${r.id.slice(0, 8)}] ${r.content.slice(0, 80)}...`,
                )
                .join("\n");

              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Found ${candidates.length} candidates. Specify memoryId:\n${list}`,
                  },
                ],
                details: {
                  action: "candidates",
                  provider: "memory-guardian",
                  candidates: candidates.map((r) => ({
                    id: r.id,
                    content: r.content.slice(0, 100),
                    similarity: r.similarity,
                  })),
                },
              };
            }

            return {
              content: [
                { type: "text" as const, text: "Provide query or memoryId." },
              ],
              details: { error: "missing_param", provider: "memory-guardian" },
            };
          } catch (err) {
            api.logger.warn(
              `memory-guardian: memory_forget failed: ${String(err)}`,
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Forget failed: ${String(err)}`,
                },
              ],
              details: { error: String(err), provider: "memory-guardian" },
            };
          }
        },
      }),
      { name: "memory_forget" },
    );

    // ========================================================================
    // Tool: memory_get (file-reading fallback, compatible with memory-supabase)
    // ========================================================================

    api.registerTool(
      {
        name: "memory_get",
        label: "Memory Get",
        description:
          "Read a specific memory file from the workspace by path. Use for reading daily logs, MEMORY.md, etc.",
        parameters: Type.Object({
          path: Type.String({
            description: "Relative path within workspace",
          }),
          from: Type.Optional(
            Type.Number({ description: "Start line (1-indexed)" }),
          ),
          lines: Type.Optional(
            Type.Number({ description: "Number of lines to read" }),
          ),
        }),
        async execute(_toolCallId, params) {
          const { path: relPath, from, lines } = params as {
            path: string;
            from?: number;
            lines?: number;
          };

          try {
            const workspace =
              (api as Record<string, unknown>).workspaceDir as string ??
              process.env.HOME ?? "/home/leonardknight";
            const absPath = resolve(workspace, relPath);

            // Security: ensure path stays within workspace
            if (!absPath.startsWith(resolve(workspace))) {
              return {
                content: [
                  { type: "text" as const, text: "Path outside workspace." },
                ],
                details: { error: "path_escape", provider: "memory-guardian" },
              };
            }

            const content = readFileSync(absPath, "utf-8");
            const allLines = content.split("\n");

            let result: string;
            if (from !== undefined || lines !== undefined) {
              const start = Math.max(0, (from ?? 1) - 1);
              const count = lines ?? allLines.length;
              result = allLines.slice(start, start + count).join("\n");
            } else {
              result = content;
            }

            return {
              content: [{ type: "text" as const, text: result }],
              details: {
                path: relPath,
                totalLines: allLines.length,
                provider: "memory-guardian",
              },
            };
          } catch (err) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Cannot read ${relPath}: ${String(err)}`,
                },
              ],
              details: { error: String(err), provider: "memory-guardian" },
            };
          }
        },
      },
      { name: "memory_get" },
    );

    // ========================================================================
    // Service
    // ========================================================================

    api.registerService({
      id: "memory-guardian",
      async start() {
        try {
          // Verify Supabase connectivity (non-blocking)
          const { error } = await supabase
            .from("amigo_memories")
            .select("id", { count: "exact", head: true })
            .eq("org_id", cfg.orgId)
            .is("deleted_at", null);

          if (error) {
            api.logger.warn(
              `memory-guardian: Supabase connectivity check failed: ${error.message} — will retry on first operation`,
            );
          } else {
            api.logger.info(
              `memory-guardian: connected (org: ${cfg.orgId}, model: ${cfg.embedding.provider}/${cfg.embedding.model})`,
            );
          }
        } catch (err) {
          api.logger.warn(
            `memory-guardian: startup connectivity check failed: ${String(err)} — will retry on first operation`,
          );
        }
      },
      stop() {
        // Clear background agent intervals
        for (const id of bgIntervals) clearInterval(id);
        bgIntervals.length = 0;
        api.logger.info("memory-guardian: stopped (background agents cleared)");
      },
    });
  },
};

export default memoryGuardianPlugin;
