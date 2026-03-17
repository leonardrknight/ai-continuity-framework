import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from '../app.js';

describe('GET /api/config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key-123';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns supabaseUrl and supabaseAnonKey from environment', async () => {
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key-123',
    });
  });

  it('returns 500 when SUPABASE_URL is missing', async () => {
    delete process.env.SUPABASE_URL;
    const res = await app.request('/api/config');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server configuration incomplete' });
  });

  it('returns 500 when SUPABASE_ANON_KEY is missing', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    const res = await app.request('/api/config');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server configuration incomplete' });
  });
});
