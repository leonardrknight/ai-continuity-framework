import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../db/schema.js';
import { getUserProfileByAuthId, insertUserProfile } from '../db/queries.js';

/**
 * Ensure a user profile exists for the given Supabase Auth user.
 * Creates one on first login, returns existing on subsequent calls.
 */
export async function ensureUserProfile(
  client: SupabaseClient,
  authId: string,
  email: string | undefined,
  displayName?: string,
): Promise<UserProfile> {
  // Check for existing profile
  const existing = await getUserProfileByAuthId(client, authId);
  if (existing) {
    return existing;
  }

  // Create new profile
  return insertUserProfile(client, {
    supabase_auth_id: authId,
    email: email ?? null,
    display_name: displayName ?? null,
  });
}

/**
 * Link a user profile to a GitHub contributor profile.
 * Sets the github_contributor_id on the user_profiles record.
 */
export async function linkGitHubIdentity(
  client: SupabaseClient,
  userId: string,
  githubContributorId: string,
): Promise<UserProfile> {
  const { data, error } = await client
    .from('user_profiles')
    .update({
      github_contributor_id: githubContributorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}

/**
 * Unlink a user profile from its GitHub contributor profile.
 * Removes the github_contributor_id from the user_profiles record.
 */
export async function unlinkGitHubIdentity(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await client
    .from('user_profiles')
    .update({
      github_contributor_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}
