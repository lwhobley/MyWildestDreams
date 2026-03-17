import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';

// Google AI Studio — Gemini 2.0 Flash (native multimodal audio)
// Docs: https://ai.google.dev/api/generate-content#v1beta.GenerateContentRequest
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Map app MIME types to Gemini-accepted audio formats
// https://ai.google.dev/gemini-api/docs/audio#supported-formats
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audioBase64, mimeType } = await req.json();

    if (!audioBase64 || audioBase64.length < 100) {
      return new Response(
        JSON.stringify({ error: 'No audio data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve to a Gemini-supported MIME type
    const resolvedMime = MIME_MAP[mimeType] ?? MIME_MAP['audio/m4a'];

    const response = await fetch(GEMINI_URL(GEMINI_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Transcribe this audio recording exactly as spoken. Return only the transcribed text — no labels, no timestamps, no explanations. If the audio is unclear or silent, return an empty string.',
              },
              {
                // Native Gemini inline audio — no OpenAI wrapper needed
                inlineData: {
                  mimeType: resolvedMime,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,  // Transcription should be deterministic
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini transcribe-audio error:', errText);
      return new Response(
        JSON.stringify({ error: `Gemini error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const transcription = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

    console.log('Transcription result:', transcription.slice(0, 100));

    return new Response(
      JSON.stringify({ transcription }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled transcribe-audio error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
