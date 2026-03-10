import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from '../config.js';

let client: SupabaseClient | null = null;

/**
 * Get the Supabase client singleton.
 * Uses service role key for full access (bypasses RLS).
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = loadConfig();
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
  }
  return client;
}

/**
 * Reset the client singleton (for testing).
 */
export function resetSupabaseClient(): void {
  client = null;
}
