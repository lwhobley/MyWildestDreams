import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL   = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const MIME_MAP: Record<string, string> = {
  'audio/m4a':  'audio/mp4',
  'audio/mp4':  'audio/mp4',
  'audio/mpeg': 'audio/mpeg',
  'audio/mp3':  'audio/mpeg',
  'audio/wav':  'audio/wav',
  'audio/webm': 'audio/webm',
  'audio/ogg':  'audio/ogg',
  'audio/aac':  'audio/aac',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    let audioBase64: string;
    let resolvedMime: string;

    if (body.storagePath) {
      // ── Primary: fetch from Supabase Storage (no size limit issue) ──────
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data, error } = await supabase.storage
        .from('dream-audio')
        .download(body.storagePath);

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: `Storage fetch failed: ${error?.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const arrayBuffer = await data.arrayBuffer();
      const bytes       = new Uint8Array(arrayBuffer);
      audioBase64       = btoa(String.fromCharCode(...bytes));
      const ext         = body.storagePath.split('.').pop() ?? 'm4a';
      resolvedMime      = MIME_MAP[`audio/${ext}`] ?? 'audio/mp4';
    } else if (body.audioBase64) {
      // ── Fallback: base64 in body (short recordings only) ─────────────────
      audioBase64  = body.audioBase64;
      resolvedMime = MIME_MAP[body.mimeType] ?? 'audio/mp4';
    } else {
      return new Response(
        JSON.stringify({ error: 'Provide storagePath or audioBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (audioBase64.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Audio data too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const response = await fetch(GEMINI_URL(GEMINI_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcribe this audio recording exactly as spoken. Return only the transcribed text — no labels, no timestamps, no explanations. If the audio is unclear or silent, return an empty string.' },
            { inlineData: { mimeType: resolvedMime, data: audioBase64 } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini transcribe-audio error:', errText);
      return new Response(
        JSON.stringify({ error: `Gemini error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data       = await response.json();
    const transcription = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    return new Response(
      JSON.stringify({ transcription }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unhandled transcribe-audio error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
