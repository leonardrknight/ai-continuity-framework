import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Context, MiddlewareHandler } from 'hono';
import { loadConfig } from '../config.js';

/**
 * Authenticated user extracted from Supabase JWT.
 */
export interface AuthUser {
  id: string; // Supabase Auth UID
  email: string | undefined;
}

// Hono context variable key for the authenticated user
const AUTH_USER_KEY = 'authUser';

let anonClient: SupabaseClient | null = null;

/**
 * Get a Supabase client initialized with the anon key.
 * Used for JWT verification via auth.getUser().
 */
function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    const config = loadConfig();
    if (!config.SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_ANON_KEY is required for auth middleware');
    }
    anonClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
  return anonClient;
}

/**
 * Reset the anon client singleton (for testing).
 */
export function resetAnonClient(): void {
  anonClient = null;
}

/**
 * Set a pre-built anon client (for testing).
 */
export function setAnonClient(client: SupabaseClient): void {
  anonClient = client;
}

/**
 * Hono middleware that validates Supabase JWT from Authorization header.
 *
 * On success, sets the authenticated user on the Hono context.
 * On failure, returns 401.
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token === authHeader) {
      return c.json({ error: 'Invalid Authorization header format' }, 401);
    }

    try {
      const client = getAnonClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token);

      if (error || !user) {
        return c.json({ error: 'Invalid or expired token' }, 401);
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
      };

      c.set(AUTH_USER_KEY, authUser);
      await next();
    } catch {
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
}

/**
 * Get the authenticated user from the Hono context.
 * Must be used after authMiddleware().
 */
export function getAuthUser(c: Context): AuthUser {
  const user = c.get(AUTH_USER_KEY) as AuthUser | undefined;
  if (!user) {
    throw new Error('No authenticated user in context. Is authMiddleware() applied?');
  }
  return user;
}
