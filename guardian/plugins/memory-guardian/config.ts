/**
 * Memory Guardian — Configuration Schema
 *
 * Zod-based config for the Guardian-powered memory plugin.
 * Supports three-plane knowledge boundaries, human identity resolution,
 * and configurable background agents (consolidator, curator).
 */

import { z } from "zod";

// ============================================================================
// Config Schema
// ============================================================================

export const memoryGuardianConfigSchema = z.object({
  /** Supabase project URL (e.g. https://xxx.supabase.co) */
  supabaseUrl: z.string().url(),

  /** Supabase service-role key for server-side access */
  supabaseServiceKey: z.string(),

  /** Organization ID for multi-tenant memory scoping */
  orgId: z.string(),

  /** Embedding provider configuration */
  embedding: z.object({
    /** Embedding provider name (e.g. "openai") */
    provider: z.string(),
    /** Embedding model identifier (e.g. "text-embedding-3-small") */
    model: z.string(),
    /** API key for the embedding provider */
    apiKey: z.string(),
  }),

  /** Anthropic API key for Claude-based Guardian agents */
  anthropicApiKey: z.string(),

  /**
   * Maps session keys to human UUIDs for identity resolution.
   * Keys are session identifiers (e.g. "telegram:12345"),
   * values are human UUIDs in the amigo_humans table.
   */
  humanMappings: z.record(z.string(), z.string()).default({}),

  /** Whether to automatically capture memories from conversations */
  autoCapture: z.boolean().default(true),

  /** Whether to automatically inject relevant memories into agent context */
  autoRecall: z.boolean().default(true),

  /** Whether to run the background consolidator agent (dedup/merge) */
  enableConsolidator: z.boolean().default(true),

  /** Whether to run the background curator agent (quality scoring) */
  enableCurator: z.boolean().default(true),

  /** How often the consolidator runs, in milliseconds (default: 1 hour) */
  consolidatorIntervalMs: z.number().default(3_600_000),

  /** How often the curator runs, in milliseconds (default: 24 hours) */
  curatorIntervalMs: z.number().default(86_400_000),

  /** Maximum number of memories to return from recall (default: 10) */
  recallLimit: z.number().default(10),

  /** Minimum similarity score for recall results (default: 0.35) */
  recallMinScore: z.number().default(0.35),

  /** Maximum memories to extract per session (default: 10) */
  extractionMaxPerSession: z.number().default(10),
});

/** Inferred TypeScript type for the Guardian memory config */
export type MemoryGuardianConfig = z.infer<typeof memoryGuardianConfigSchema>;

// ============================================================================
// Environment Variable Resolution
// ============================================================================

/**
 * Resolve ${ENV_VAR} placeholders in a string value.
 * Throws if the referenced environment variable is not set.
 */
export function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) throw new Error(`Environment variable ${envVar} is not set`);
    return envValue;
  });
}

/**
 * Parse raw plugin config, resolving environment variable placeholders
 * in string fields before Zod validation.
 */
export function parseConfig(raw: unknown): MemoryGuardianConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("memory-guardian config required");
  }

  const cfg = raw as Record<string, unknown>;

  // Resolve env vars in string fields that commonly use them
  const resolved = { ...cfg };

  if (typeof resolved.supabaseUrl === "string") {
    resolved.supabaseUrl = resolveEnvVars(resolved.supabaseUrl);
  }
  if (typeof resolved.supabaseServiceKey === "string") {
    resolved.supabaseServiceKey = resolveEnvVars(resolved.supabaseServiceKey);
  }
  if (typeof resolved.anthropicApiKey === "string") {
    resolved.anthropicApiKey = resolveEnvVars(resolved.anthropicApiKey);
  }

  // Resolve env vars within the embedding object
  if (resolved.embedding && typeof resolved.embedding === "object") {
    const emb = { ...(resolved.embedding as Record<string, unknown>) };
    if (typeof emb.apiKey === "string") {
      emb.apiKey = resolveEnvVars(emb.apiKey);
    }
    resolved.embedding = emb;
  }

  return memoryGuardianConfigSchema.parse(resolved);
}
