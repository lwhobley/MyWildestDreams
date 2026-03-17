// src/lib/ai/dreamParser.ts
// ─── Dream Parser · GPT-4o NLP → Structured Dream Data ───────────────────────
//
// Transforms raw transcription text into a fully parsed ParsedDream object.
// Identifies: scenes, symbols, emotions, narrative arc, recurring motifs.

import type { ParsedDream, DreamEmotion, DreamTag, DreamScene, DreamSymbol } from '@/types';

const PARSER_SYSTEM_PROMPT = `You are an expert dream analyst and storyteller with deep knowledge of Jungian archetypes, symbolic psychology, and cinematic narrative structure.

Given a raw dream transcription, extract and structure the dream into a rich, detailed JSON object.

Return ONLY valid JSON. No explanation, no markdown, no preamble.

JSON structure:
{
  "title": "Evocative 3–5 word cinematic title for the dream",
  "summary": "One to two sentence poetic summary of the dream's essence",
  "scenes": [
    {
      "order": 1,
      "description": "Rich scene description for video rendering prompt",
      "dominantEmotion": "one of: euphoric|anxious|serene|confused|fearful|curious|melancholic|joyful|neutral",
      "symbols": ["symbol_name_1", "symbol_name_2"],
      "settingType": "one of: interior|exterior|abstract|transitional",
      "timeOfDay": "one of: dawn|day|dusk|night|timeless"
    }
  ],
  "symbols": [
    {
      "id": "symbol_slug",
      "emoji": "single representative emoji",
      "name": "Symbol name",
      "category": "one of: nature|person|object|place|action|creature|abstract",
      "meaning": "2–3 sentence psychological/archetypal meaning in context of this dream",
      "archetypes": ["archetype1", "archetype2"],
      "emotionalResonance": ["emotion1"]
    }
  ],
  "emotions": ["primary_emotion", "secondary_emotion"],
  "dominantEmotion": "single most prominent emotion",
  "narrativeArc": "one of: ascending|descending|circular|fragmented",
  "overallTheme": "One sentence describing the dream's core psychological theme",
  "tags": ["array of applicable: lucid|recurring|vivid|nightmare|prophetic|surreal|mundane|spiritual"]
}`;

export async function parseDream(transcription: string): Promise<ParsedDream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PARSER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Parse this dream transcription:\n\n"${transcription}"`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Dream parsing failed.');
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;

  if (!raw) throw new Error('No parsed content returned from AI.');

  try {
    return JSON.parse(raw) as ParsedDream;
  } catch {
    throw new Error('Failed to parse AI response as JSON.');
  }
}

// ─── Video Prompt Builder ──────────────────────────────────────────────────────
// Converts parsed dream + style into a Runway-ready video generation prompt

const STYLE_MODIFIERS: Record<string, string> = {
  surreal:    'surrealist painting style, melting reality, dreamlike impossible architecture, Salvador Dali aesthetic, soft impossible lighting',
  cyberpunk:  'cyberpunk aesthetic, neon-lit rain-soaked streets, holographic overlays, noir shadows, blade runner atmosphere',
  watercolor: 'ethereal watercolor illustration, soft ink washes, bleeding colors, paper texture, Studio Ghibli warmth',
  noir:       'black and white film noir, dramatic shadows, 1940s cinematic style, moody atmospheric fog, high contrast',
  cosmic:     'deep space cosmic horror, nebula backgrounds, bioluminescent creatures, vast galactic scale, cosmic surrealism',
  anime:      'Studio Ghibli anime style, painterly backgrounds, expressive characters, golden hour lighting, peaceful melancholy',
  gothic:     'gothic romantic aesthetic, dark Victorian architecture, candlelight, deep shadows, ornate dark fantasy details',
  vintage:    'vintage 8mm film grain, 1970s color grading, analogue warmth, slightly faded, nostalgic cinematic atmosphere',
};

export function buildVideoPrompt(parsed: ParsedDream, style: string): string {
  const styleModifier = STYLE_MODIFIERS[style] ?? STYLE_MODIFIERS.surreal;
  const mainScene = parsed.scenes[0];

  return [
    `Cinematic short film. ${styleModifier}.`,
    mainScene?.description ?? parsed.summary,
    `Emotional tone: ${parsed.dominantEmotion}.`,
    `Key visual symbols: ${parsed.symbols.slice(0, 3).map(s => s.name).join(', ')}.`,
    'Smooth camera movement. Dreamlike transitions. High quality cinematic render.',
    'Aspect ratio 9:16. Duration 15 seconds.',
  ].join(' ');
}

// ─── Symbolism Interpreter ────────────────────────────────────────────────────
// Returns deeper interpretation for a single symbol in context of full dream

export async function interpretSymbol(
  symbol: DreamSymbol,
  dreamContext: ParsedDream,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: 'You are a compassionate dream analyst. Write a 2–3 sentence deeply personal interpretation of what a symbol means in the context of a specific dream. Be poetic, psychological, and specific. Speak directly to the dreamer (use "you/your").',
        },
        {
          role: 'user',
          content: `Symbol: ${symbol.name}\nDream theme: ${dreamContext.overallTheme}\nDominant emotion: ${dreamContext.dominantEmotion}\nNarrative arc: ${dreamContext.narrativeArc}\n\nInterpret what ${symbol.name} means for this dreamer.`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? symbol.meaning;
}
