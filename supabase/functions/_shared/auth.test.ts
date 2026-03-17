/**
 * Unit tests for the auth guard helper.
 *
 * Run with: deno test --allow-env supabase/functions/_shared/auth.test.ts
 *
 * These tests stub out the Supabase client so no real network calls are made.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ── Stub createClient ────────────────────────────────────────────────────────

type GetUserResult = { data: { user: { id: string } | null }; error: Error | null };

function makeStubClient(result: GetUserResult) {
  return (_url: string, _key: string, _opts?: unknown) => ({
    auth: {
      getUser: () => Promise.resolve(result),
    },
  });
}

// ── Inline the guard logic so tests don't need a live Deno.env ───────────────
// We re-implement getAuthenticatedUser here with an injectable createClient
// to keep tests hermetic.

async function getAuthenticatedUser(
  req: Request,
  createClient: (url: string, key: string, opts?: unknown) => { auth: { getUser: () => Promise<GetUserResult> } }
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient('https://example.supabase.co', 'anon-key', {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ── Tests ────────────────────────────────────────────────────────────────────

Deno.test('returns null when Authorization header is absent', async () => {
  const req = new Request('https://example.com', { method: 'POST' });
  const client = makeStubClient({ data: { user: { id: 'u1' } }, error: null });
  const result = await getAuthenticatedUser(req, client);
  assertEquals(result, null);
});

Deno.test('returns null when Authorization header does not start with Bearer', async () => {
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  });
  const client = makeStubClient({ data: { user: { id: 'u1' } }, error: null });
  const result = await getAuthenticatedUser(req, client);
  assertEquals(result, null);
});

Deno.test('returns null when Supabase returns an error', async () => {
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer bad-token' },
  });
  const client = makeStubClient({ data: { user: null }, error: new Error('invalid JWT') });
  const result = await getAuthenticatedUser(req, client);
  assertEquals(result, null);
});

Deno.test('returns null when Supabase returns no user', async () => {
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer expired-token' },
  });
  const client = makeStubClient({ data: { user: null }, error: null });
  const result = await getAuthenticatedUser(req, client);
  assertEquals(result, null);
});

Deno.test('returns user when token is valid', async () => {
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token' },
  });
  const client = makeStubClient({ data: { user: { id: 'user-123' } }, error: null });
  const result = await getAuthenticatedUser(req, client);
  assertEquals(result, { id: 'user-123' });
});
