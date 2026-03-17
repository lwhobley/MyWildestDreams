import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Verifies the caller's JWT from the Authorization header.
 *
 * Returns the authenticated user on success, or null if the token is
 * missing, malformed, or invalid. Uses the anon key so RLS still applies
 * to any subsequent queries made with this client.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  return user;
}
