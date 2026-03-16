import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Google AI Studio — Gemini image generation
// Model: gemini-2.0-flash-preview-image-generation
// Docs: https://ai.google.dev/gemini-api/docs/image-generation
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const STYLE_PROMPTS: Record<string, string> = {
  surreal:
    'surrealist oil painting style, impossible dreamlike landscape, melting clocks, floating islands, vivid fever-dream colors, Salvador Dali inspired, hyper-detailed',
  cyberpunk:
    'cyberpunk neon-noir cityscape, rain-soaked chrome streets reflecting electric blue and magenta neon, dark futuristic atmosphere, cinematic, ultra-detailed',
  watercolor:
    'delicate watercolor painting, soft ink washes, translucent pastel hues, misty ethereal atmosphere, Japanese illustration style, gentle and luminous',
  noir:
    'black-and-white noir film still, dramatic chiaroscuro lighting, deep shadows, rain-slicked streets, moody cinematic composition, 1940s mystery aesthetic',
  cosmic:
    'cosmic deep-space dreamscape, swirling nebulae, golden stardust, luminous planets, vast infinite universe, ultra-detailed photorealistic space photography',
  gothic:
    'gothic dark fantasy illustration, moonlit ancient architecture, dramatic stormy sky, ravens, dramatic contrast, Pre-Raphaelite painting style',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey       = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description, styleId, title } = await req.json();

    if (!description || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Dream description is too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const styleGuide = STYLE_PROMPTS[styleId] ?? STYLE_PROMPTS['surreal'];
    const cleanTitle = (title ?? 'dream scene').replace(/[^a-zA-Z0-9 ]/g, '').trim();

    const imagePrompt =
      `Cinematic dreamscape: "${cleanTitle}". ${styleGuide}. ` +
      `Scene inspired by: ${description.slice(0, 200)}. ` +
      `Ultra high resolution, 4:3 aspect ratio, centered composition, ` +
      `breathtaking visual quality, no text, no people, no faces.`;

    // ── Call Gemini image generation ───────────────────────────────────────
    // Native Gemini format: responseModalities includes IMAGE
    // The response parts will contain an inlineData part with base64 PNG

    const aiResponse = await fetch(GEMINI_URL(GEMINI_IMAGE_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: imagePrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Gemini image generation error:', errText);
      return new Response(
        JSON.stringify({ error: `Gemini error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();

    // Find the inlineData image part in the response
    const parts = aiData.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData?.data) {
      console.error('No image part in Gemini response:', JSON.stringify(aiData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'No image returned by Gemini' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base64Data  = imagePart.inlineData.data;
    const contentType = imagePart.inlineData.mimeType ?? 'image/png';

    // ── Upload to Supabase Storage ─────────────────────────────────────────
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const ext = contentType.split('/')[1] ?? 'png';
    const fileName = `dreams/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('dream-thumbnails')
      .upload(fileName, bytes.buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Storage error: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('dream-thumbnails')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ thumbnailUrl: publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled generate-dream-image error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
