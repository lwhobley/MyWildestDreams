/**
 * Edge Function: push-send
 * Sends Web Push notifications to one or all of a user's subscriptions.
 * Uses VAPID auth — keys set in Supabase project secrets.
 *
 * Env vars required:
 *   VAPID_PUBLIC_KEY   — base64url encoded
 *   VAPID_PRIVATE_KEY  — base64url encoded
 *   VAPID_SUBJECT      — mailto: or https: contact
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Notification payloads by type ────────────────────────────────────────────
type NotificationType =
  | 'morning_reminder'
  | 'render_complete'
  | 'streak_alert'
  | 'streak_milestone'
  | 'weekly_report'
  | 'custom';

interface NotificationPayload {
  type: NotificationType;
  userId: string;
  data?: Record<string, unknown>; // type-specific context
}

function buildNotification(type: NotificationType, data: Record<string, unknown> = {}) {
  const MORNING_MESSAGES = [
    "Your dream is still fresh. Don't let it fade.",
    "You were somewhere extraordinary last night. Tell us.",
    "The subconscious spoke. What did it say?",
    "Capture it before the day takes over.",
    "Last night's film is ready to be made.",
  ];

  switch (type) {
    case 'morning_reminder':
      return {
        title: 'My Wildest Dreams 🌙',
        body: MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)],
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/capture',
        actions: [
          { action: 'capture', title: '🎙️ Record Now' },
          { action: 'dismiss', title: 'Later' },
        ],
        tag: 'morning-reminder',       // replaces previous if unread
        renotify: false,
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };

    case 'render_complete':
      return {
        title: 'Your dreamscape is ready ✨',
        body: data.dreamTitle
          ? `"${data.dreamTitle}" has been rendered. Tap to watch.`
          : 'Your dream has been rendered into a cinematic film.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: data.thumbnailUrl as string | undefined,
        url: `/dream/${data.dreamId}/playback`,
        actions: [
          { action: 'watch', title: '▶ Watch Now' },
          { action: 'library', title: '📚 View Library' },
        ],
        tag: `render-${data.dreamId}`,
        renotify: true,
        requireInteraction: true,       // stays until tapped
        vibrate: [200, 100, 200, 100, 200],
      };

    case 'streak_alert':
      return {
        title: `Don't break your ${data.streakCount}-night streak 🔥`,
        body: "Record tonight's dream before midnight to keep it alive.",
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/capture',
        actions: [
          { action: 'capture', title: '🎙️ Record Now' },
        ],
        tag: 'streak-alert',
        renotify: true,
        requireInteraction: false,
        vibrate: [300, 100, 300],
      };

    case 'streak_milestone':
      return {
        title: `${data.streakCount} nights in a row 🌟`,
        body: `You've built an incredible ${data.streakCount}-night dream streak. Keep going.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/library',
        tag: `milestone-${data.streakCount}`,
        renotify: false,
        requireInteraction: false,
        vibrate: [100, 50, 100, 50, 100],
      };

    case 'weekly_report':
      return {
        title: 'Your weekly dream report 📊',
        body: data.summary as string
          ?? `You dreamed ${data.dreamCount ?? 0} times this week. See your patterns.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/library',
        tag: 'weekly-report',
        renotify: false,
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };

    case 'custom':
      return {
        title: data.title as string ?? 'My Wildest Dreams',
        body: data.body as string ?? '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: data.url as string ?? '/',
        tag: data.tag as string ?? 'custom',
        renotify: false,
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };
  }
}

// ─── VAPID signing ────────────────────────────────────────────────────────────
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKeys: { publicKey: string; privateKey: string; subject: string },
): Promise<{ success: boolean; error?: string }> {
  const payloadString = JSON.stringify(payload);

  // Build VAPID JWT header
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const claims = btoa(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: vapidKeys.subject,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Import VAPID private key
  const privateKeyBytes = Uint8Array.from(
    atob(vapidKeys.privateKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0),
  );

  const cryptoKey = await crypto.subtle.importKey(
    'raw', privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );

  const signingInput = new TextEncoder().encode(`${header}.${claims}`);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    signingInput,
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${claims}.${sig}`;

  try {
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt},k=${vapidKeys.publicKey}`,
        'Urgency': 'normal',
      },
      body: payloadString,
    });

    if (res.status === 410 || res.status === 404) {
      // Subscription expired — caller should deactivate it
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }

    if (!res.ok) {
      return { success: false, error: `HTTP_${res.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@mywildestdreams.app';

    const body = await req.json() as NotificationPayload;
    const { type, userId, data = {} } = body;

    if (!type || !userId) {
      return new Response(
        JSON.stringify({ error: 'type and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch active subscriptions for this user
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subsError) throw subsError;
    if (!subs?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const notification = buildNotification(type, data);
    const results = await Promise.allSettled(
      subs.map(sub => sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notification,
        { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject },
      )),
    );

    // Deactivate expired subscriptions
    const expiredIds: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.error === 'SUBSCRIPTION_EXPIRED') {
        expiredIds.push(subs[i].id);
      }
    });

    if (expiredIds.length) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', expiredIds);
    }

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: userId,
      type,
      title: notification.title,
      body: notification.body,
      delivered: sent > 0,
    });

    return new Response(
      JSON.stringify({ success: true, sent, total: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
