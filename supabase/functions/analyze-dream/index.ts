import { corsHeaders } from '../_shared/cors.ts';

// Google AI Studio — Gemini 2.0 Flash
// Docs: https://ai.google.dev/api/generate-content
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description, styleId } = await req.json();

    if (!description || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Dream description is too short' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `You are a depth psychology AI trained in Jungian analysis, dream symbolism, and narrative theory.
You analyze dream descriptions and return a structured JSON breakdown.

Always respond with ONLY valid JSON in exactly this structure (no markdown, no explanation outside JSON):
{
  "title": "A poetic 3-6 word title for the dream",
  "emotionalTone": {
    "primary": "The dominant emotion (e.g. Wonder, Dread, Longing)",
    "secondary": "A secondary emotional undertone",
    "intensity": "Low | Medium | High | Overwhelming"
  },
  "keySymbols": [
    { "symbol": "name of symbol", "meaning": "brief Jungian or archetypal meaning" }
  ],
  "narrativeArc": {
    "stage": "Descent | Wandering | Confrontation | Revelation | Ascent | Liminal",
    "summary": "One sentence describing the dream's core narrative movement"
  },
  "jungianArchetypes": [
    { "archetype": "archetype name", "manifestation": "how it appears in this dream" }
  ],
  "shadowElements": "What this dream may reveal about the dreamer's shadow self",
  "interpretation": "A rich 2-3 sentence poetic psychological interpretation of the dream",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "moodId": "one of: peaceful | anxious | joyful | mysterious | melancholic | euphoric | terrifying | surreal"
}

keySymbols: exactly 3-5 items. jungianArchetypes: exactly 2-3 items. tags: exactly 4-6 lowercase single-word tags.
Style context for the visual aesthetic being applied: ${styleId}.`;

    const response = await fetch(GEMINI_URL(GEMINI_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Analyze this dream: "${description}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',  // Forces clean JSON output — no markdown fences
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini analyze-dream error:', errText);
      return new Response(
        JSON.stringify({ error: `Gemini error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // responseMimeType: 'application/json' should give clean JSON,
    // but strip fences defensively just in case
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('JSON parse failed:', cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: 'Failed to parse Gemini response', raw: cleaned }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ analysis: parsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled analyze-dream error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
