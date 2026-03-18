import { getSupabaseClient } from '@/template';
import { DreamAnalysis } from '@/components/ui/DreamAnalysisCard';
import { DREAM_STYLES, DREAM_MOODS } from '@/constants/config';

// ── Dream Analysis via Edge Function ─────────────────────────────────────────

export async function analyzeDream(description: string, styleId: string): Promise<DreamAnalysis> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('analyze-dream', {
      body: { description, styleId },
    });
    if (error) throw error;
    if (data) return data as DreamAnalysis;
  } catch {
    // Fallback to local mock
  }
  return generateLocalAnalysis(description, styleId);
}

// ── Image Generation via Edge Function ───────────────────────────────────────

export async function generateDreamImage(
  description: string,
  styleId: string,
  title: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('generate-dream-image', {
      body: { description, styleId, title },
    });
    if (error) throw error;
    if (data?.url) return data.url as string;
  } catch {
    // no-op — thumbnail fallback used
  }
  return null;
}

// ── Render Dreamscape (Simulated) ────────────────────────────────────────────

export async function renderDreamscape(
  description: string,
  styleId: string,
  onProgress: (progress: number) => void
): Promise<{ thumbnailIndex: number; duration: string }> {
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 300));
    onProgress(i / steps);
  }
  const styleIndex = DREAM_STYLES.findIndex((s) => s.id === styleId);
  return {
    thumbnailIndex: Math.max(0, styleIndex) % 4,
    duration: `${2 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
  };
}

// ── Audio Transcription via Edge Function ─────────────────────────────────────

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioUri },
    });
    if (error) throw error;
    if (data?.text) return data.text as string;
  } catch {
    // Fallback
  }
  return 'I was in a place that felt both familiar and completely unknown, filled with shifting colours and distant sounds that spoke without words...';
}

// ── Local Fallback Analysis ───────────────────────────────────────────────────

function generateLocalAnalysis(description: string, styleId: string): DreamAnalysis {
  const words = description.toLowerCase().split(/\s+/);

  const moodKeywords: Record<string, string> = {
    fly: 'euphoric', fall: 'anxious', run: 'anxious', chase: 'anxious',
    water: 'mysterious', ocean: 'peaceful', light: 'joyful', dark: 'mysterious',
    strange: 'surreal', weird: 'surreal', sad: 'melancholic', happy: 'joyful',
    scared: 'terrifying', fear: 'terrifying', calm: 'peaceful', peace: 'peaceful',
  };
  let detectedMoodId = 'mysterious';
  for (const word of words) {
    if (moodKeywords[word]) { detectedMoodId = moodKeywords[word]; break; }
  }

  const symbolEntries = [
    { symbol: 'water', meaning: 'The flow of the unconscious mind and emotional depth.' },
    { symbol: 'light', meaning: 'Awareness, revelation, and spiritual clarity.' },
    { symbol: 'shadow', meaning: 'The hidden or repressed aspects of the self.' },
    { symbol: 'path', meaning: 'The journey of life and conscious choices ahead.' },
    { symbol: 'door', meaning: 'New opportunities and thresholds of transformation.' },
  ];

  const keySymbols = symbolEntries
    .filter((s) => words.some((w) => w.includes(s.symbol)))
    .slice(0, 3);
  if (keySymbols.length === 0) {
    keySymbols.push(symbolEntries[0], symbolEntries[2]);
  }

  const archetypes = [
    { archetype: 'The Seeker', manifestation: 'A longing to discover hidden truths within the dream world.' },
    { archetype: 'The Shadow', manifestation: 'Unacknowledged aspects of self appearing in the dreamscape.' },
    { archetype: 'The Anima/Animus', manifestation: 'The inner feminine or masculine energy seeking balance.' },
    { archetype: 'The Wise Elder', manifestation: 'Guidance and wisdom emerging from the unconscious.' },
  ];

  const style = DREAM_STYLES.find((s) => s.id === styleId);
  const mood = DREAM_MOODS.find((m) => m.id === detectedMoodId);

  const emotionalTones = [
    { primary: 'Wonder', secondary: 'Unease', intensity: 'Medium' as const },
    { primary: 'Longing', secondary: 'Curiosity', intensity: 'High' as const },
    { primary: 'Serenity', secondary: 'Mystery', intensity: 'Low' as const },
    { primary: 'Revelation', secondary: 'Awe', intensity: 'Overwhelming' as const },
  ];
  const tone = emotionalTones[new Date().getSeconds() % emotionalTones.length];

  const arcs = [
    { stage: 'Descent', summary: 'The dreamer moves inward, approaching the depths of the unconscious where hidden truths reside.' },
    { stage: 'Wandering', summary: 'A liminal journey through symbolic landscapes, neither arriving nor departing — pure becoming.' },
    { stage: 'Revelation', summary: 'The veil lifts. Something essential about the self or the world is briefly, luminously understood.' },
    { stage: 'Ascent', summary: 'Having touched the depths, the dreamer rises — transformed, carrying new awareness toward waking life.' },
  ];
  const arc = arcs[new Date().getMinutes() % arcs.length];

  const interpretations = [
    `Your dream speaks of a profound inner journey. The ${style?.label.toLowerCase() ?? 'vivid'} imagery reflects your subconscious processing deep transformation. The symbols encountered suggest you are navigating a threshold moment in waking life.`,
    `This dreamscape reveals the architecture of your inner world. The ${mood?.label.toLowerCase() ?? 'complex'} emotional tone indicates your unconscious is working through significant questions. Pay attention to the feelings — they are messages from your deeper self.`,
    `The subconscious speaks in symbols, and your dream is rich with them. The aesthetic your mind chose reflects your current state — seeking beauty and meaning in the mysterious. A doorway is opening in your inner life.`,
  ];

  const tags = [...new Set([
    styleId,
    detectedMoodId,
    ...keySymbols.map((s) => s.symbol),
    'unconscious',
    'symbolism',
  ])].slice(0, 6);

  const titles = [
    'The Threshold of Becoming',
    'A Light Beyond the Veil',
    'Whispers from the Deep',
    'The Architecture of Dreams',
    'Echoes of the Unconscious',
    'The Wandering Self',
  ];

  return {
    title: titles[new Date().getSeconds() % titles.length],
    emotionalTone: tone,
    keySymbols,
    narrativeArc: arc,
    jungianArchetypes: archetypes.slice(0, 2),
    shadowElements: 'The dream surface conceals a deeper layer where unresolved tensions and unexpressed desires take symbolic form, awaiting acknowledgement.',
    interpretation: interpretations[new Date().getMinutes() % interpretations.length],
    tags,
    moodId: detectedMoodId,
  };
}
