/**
 * Edge Function: push-send
 * Sends Web Push notifications using correct VAPID JWT signing.
 *
 * Required Supabase secrets:
 *   VAPID_PUBLIC_KEY   — base64url EC public key
 *   VAPID_PRIVATE_KEY  — base64url EC private key (raw 32-byte scalar)
 *   VAPID_SUBJECT      — mailto: or https: contact URI
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Notification types ────────────────────────────────────────────────────────
type NotificationType =
  | 'morning_reminder' | 'render_complete' | 'streak_alert'
  | 'streak_milestone' | 'weekly_report'   | 'custom';

const MORNING_MESSAGES = [
  "Your dream is still fresh. Don't let it fade.",
  "You were somewhere extraordinary last night. Tell us.",
  "The subconscious spoke. What did it say?",
  "Capture it before the day takes over.",
  "Last night's film is ready to be made.",
];

function buildPayload(type: NotificationType, data: Record<string, unknown> = {}) {
  switch (type) {
    case 'morning_reminder':
      return {
        title: 'My Wildest Dreams 🌙',
        body:  MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)],
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   '/capture',
        tag:   'morning-reminder',
        actions: [
          { action: 'capture', title: '🎙️ Record Now' },
          { action: 'dismiss', title: 'Later' },
        ],
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };
    case 'render_complete':
      return {
        title: 'Your dreamscape is ready ✨',
        body:  data.dreamTitle ? `"${data.dreamTitle}" has been rendered.` : 'Your dream film is ready.',
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   `/dream/${data.dreamId}/playback`,
        tag:   `render-${data.dreamId}`,
        actions: [{ action: 'watch', title: '▶ Watch Now' }],
        requireInteraction: true,
        vibrate: [200, 100, 200],
      };
    case 'streak_alert':
      return {
        title: `Don't break your ${data.streakCount}-night streak 🔥`,
        body:  "Record tonight's dream before midnight.",
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   '/capture',
        tag:   'streak-alert',
        actions: [{ action: 'capture', title: '🎙️ Record Now' }],
        requireInteraction: false,
        vibrate: [300, 100, 300],
      };
    case 'streak_milestone':
      return {
        title: `${data.streakCount} nights in a row 🌟`,
        body:  `You've built a ${data.streakCount}-night dream streak.`,
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   '/library',
        tag:   `milestone-${data.streakCount}`,
        requireInteraction: false,
        vibrate: [100, 50, 100, 50, 100],
      };
    case 'weekly_report':
      return {
        title: 'Your weekly dream report 📊',
        body:  (data.summary as string) ?? `You dreamed ${data.dreamCount ?? 0} times this week.`,
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   '/library',
        tag:   'weekly-report',
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };
    default:
      return {
        title: (data.title as string) ?? 'My Wildest Dreams',
        body:  (data.body  as string) ?? '',
        icon:  '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url:   (data.url   as string) ?? '/',
        tag:   (data.tag   as string) ?? 'custom',
        requireInteraction: false,
        vibrate: [100, 50, 100],
      };
  }
}

// ─── VAPID JWT + Web Push ──────────────────────────────────────────────────────
/**
 * Build and sign a VAPID JWT.
 * The private key is expected as a raw 32-byte EC scalar in base64url encoding
 * (as produced by `npx web-push generate-vapid-keys`).
 * We wrap it into PKCS#8 DER format so Web Crypto can import it.
 */
async function buildVapidJwt(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = base64urlEncode(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: subject,
  }));

  const signingInput = `${header}.${claims}`;

  // Decode the raw 32-byte private key scalar from base64url
  const rawPrivate = base64urlDecode(privateKeyB64);

  // Wrap raw EC private key in PKCS#8 DER structure so Web Crypto accepts it
  const pkcs8 = wrapInPkcs8(rawPrivate);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sig = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${sig}`;
}

/** Wrap a raw 32-byte P-256 private key scalar into PKCS#8 DER */
function wrapInPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // PKCS#8 DER structure for P-256:
  // SEQUENCE {
  //   INTEGER 0 (version)
  //   SEQUENCE { OID ecPublicKey, OID prime256v1 }
  //   OCTET STRING {
  //     SEQUENCE {
  //       INTEGER 1 (ecPrivateKey version)
  //       OCTET STRING <32 bytes raw key>
  //     }
  //   }
  // }
  const ecHeader = new Uint8Array([
    0x30, 0x41,       // SEQUENCE (65 bytes)
    0x02, 0x01, 0x00, // INTEGER 0 (version = 0)
    0x30, 0x13,       // SEQUENCE (19 bytes) — AlgorithmIdentifier
      0x06, 0x07,     // OID (7 bytes) ecPublicKey
        0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
      0x06, 0x08,     // OID (8 bytes) prime256v1
        0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27,       // OCTET STRING (39 bytes) — PrivateKey
      0x30, 0x25,     // SEQUENCE (37 bytes) ECPrivateKey
        0x02, 0x01, 0x01, // INTEGER 1 (ecPrivateKey version)
        0x04, 0x20,       // OCTET STRING (32 bytes) — privateKey
  ]);
  const der = new Uint8Array(ecHeader.length + rawKey.length);
  der.set(ecHeader);
  der.set(rawKey, ecHeader.length);
  return der.buffer;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapid: { publicKey: string; privateKey: string; subject: string },
): Promise<{ ok: boolean; expired?: boolean; error?: string }> {
  const url      = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await buildVapidJwt(audience, vapid.subject, vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify(payload);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'TTL':           '86400',
      'Urgency':       'normal',
      'Authorization': `vapid t=${jwt},k=${vapid.publicKey}`,
    },
    body,
  });

  if (res.status === 404 || res.status === 410) return { ok: false, expired: true };
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return { ok: true };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function base64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const b64   = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64url.length + (4 - b64url.length % 4) % 4, '=',
  );
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@mywildestdreams.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { type, userId, data = {} } = await req.json();
    if (!type || !userId) {
      return new Response(
        JSON.stringify({ error: 'type and userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Security: verify caller owns the userId ──────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: { user } } = await anonClient.auth.getUser();
      if (user && user.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!subs?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = buildPayload(type, data);
    const results = await Promise.allSettled(
      subs.map(s => sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
        { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject },
      )),
    );

    // Deactivate expired subscriptions
    const expiredIds = subs
      .filter((_, i) => {
        const r = results[i];
        return r.status === 'fulfilled' && r.value.expired;
      })
      .map(s => s.id);

    if (expiredIds.length) {
      await supabase.from('push_subscriptions')
        .update({ is_active: false })
        .in('id', expiredIds);
    }

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;

    await supabase.from('notification_log').insert({
      user_id:   userId,
      type,
      title:     payload.title,
      body:      payload.body,
      delivered: sent > 0,
    });

    return new Response(
      JSON.stringify({ success: true, sent, total: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
