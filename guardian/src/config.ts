import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase (required)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // Anthropic (required for chat)
  ANTHROPIC_API_KEY: z.string().min(1),

  // OpenAI (required for embeddings)
  OPENAI_API_KEY: z.string().min(1),

  // GitHub App (optional — only needed for repo management)
  GITHUB_APP_ID: z.string().min(1).optional(),
  GITHUB_PRIVATE_KEY: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
  GITHUB_INSTALLATION_ID: z.string().optional(),

  // Inngest (optional — only needed for scheduled agents)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Config
  GUARDIAN_REPO: z.string().default('leonardrknight/ai-continuity-framework'),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('Invalid environment variables:', errors);
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

/** Check if GitHub integration is configured */
export function isGitHubConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_PRIVATE_KEY &&
    process.env.GITHUB_WEBHOOK_SECRET
  );
}

/** Check if Inngest is configured */
export function isInngestConfigured(): boolean {
  return !!(process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY);
}

const coreEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;

export function loadCoreConfig(): CoreEnv {
  return coreEnvSchema.parse(process.env);
}
