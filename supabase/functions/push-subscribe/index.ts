/**
 * Edge Function: push-subscribe
 * Saves a Web Push subscription endpoint to Supabase.
 * Called by src/lib/pwa.ts → subscribeToPushNotifications()
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { subscription, platform = 'web' } = await req.json();
    const { endpoint, keys: { p256dh, auth } } = subscription;

    if (!endpoint || !p256dh || !auth) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Upsert — same endpoint = update keys
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        platform,
        user_agent: req.headers.get('user-agent') ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
