// Symbol Encyclopedia — Jungian & archetypal dream symbol library

export interface SymbolEntry {
  id: string;
  symbol: string;
  emoji: string;
  category: SymbolCategory;
  shortMeaning: string;
  fullMeaning: string;
  jungianContext: string;
  relatedSymbols: string[];
  commonDreamContexts: string[];
  affirmation: string;
}

export type SymbolCategory =
  | 'nature'
  | 'architecture'
  | 'creatures'
  | 'celestial'
  | 'body'
  | 'objects'
  | 'figures'
  | 'elements';

export const SYMBOL_CATEGORIES: { id: SymbolCategory; label: string; emoji: string; color: string; bgColor: string }[] = [
  { id: 'nature', label: 'Nature', emoji: '🌿', color: '#6ECFB0', bgColor: 'rgba(110,207,176,0.15)' },
  { id: 'architecture', label: 'Architecture', emoji: '🏛️', color: '#C4A8FF', bgColor: 'rgba(196,168,255,0.15)' },
  { id: 'creatures', label: 'Creatures', emoji: '🦋', color: '#FFB5C8', bgColor: 'rgba(255,181,200,0.15)' },
  { id: 'celestial', label: 'Celestial', emoji: '✨', color: '#FFD28C', bgColor: 'rgba(255,210,140,0.15)' },
  { id: 'body', label: 'Body', emoji: '🫀', color: '#FF9A5C', bgColor: 'rgba(255,154,92,0.15)' },
  { id: 'objects', label: 'Objects', emoji: '🗝️', color: '#00D4FF', bgColor: 'rgba(0,212,255,0.15)' },
  { id: 'figures', label: 'Figures', emoji: '👤', color: '#9B7EC7', bgColor: 'rgba(155,126,199,0.15)' },
  { id: 'elements', label: 'Elements', emoji: '🔥', color: '#CC4466', bgColor: 'rgba(204,68,102,0.15)' },
];

export const SYMBOL_LIBRARY: SymbolEntry[] = [
  // Nature
  {
    id: 'forest',
    symbol: 'Forest',
    emoji: '🌲',
    category: 'nature',
    shortMeaning: 'The unconscious mind; the unknown self',
    fullMeaning: 'The forest represents the vast, unmapped territory of the unconscious. To enter a forest in a dream is to venture inward — away from the structured world of the ego and into the primordial, instinctive depths of the psyche.',
    jungianContext: 'Jung saw the forest as an archetypal symbol of the unconscious, where the instincts dwell. It is the domain of the Shadow — the parts of ourselves we have yet to integrate. Getting lost in a forest often signals that the dreamer is losing touch with their conscious identity and being pulled into deeper layers of the self.',
    relatedSymbols: ['trees', 'path', 'darkness', 'animals'],
    commonDreamContexts: ['Wandering lost among ancient trees', 'A clearing appearing suddenly', 'Being followed through dark woods', 'Finding a hidden cabin'],
    affirmation: 'The unknown within you holds gifts, not only dangers.',
  },
  {
    id: 'ocean',
    symbol: 'Ocean',
    emoji: '🌊',
    category: 'nature',
    shortMeaning: 'The collective unconscious; emotional depth',
    fullMeaning: 'The ocean is one of the most powerful dream symbols, representing the collective unconscious — the vast reservoir of shared human experience and archetypal energy. Its depth reflects the unfathomable dimensions of the psyche.',
    jungianContext: 'For Jung, water in all forms symbolizes the unconscious. The ocean is its grandest expression — infinite, powerful, and full of hidden life. Calm seas suggest emotional equilibrium; stormy seas, psychic turbulence. Diving into the ocean often signals a willingness to confront what lies beneath the surface of conscious awareness.',
    relatedSymbols: ['water', 'waves', 'depth', 'fish', 'shore'],
    commonDreamContexts: ['Standing at the shoreline unable to enter', 'Being submerged and breathing freely', 'A vast calm sea at night', 'A wave approaching on the horizon'],
    affirmation: 'Your emotional depths are not something to fear — they are your source.',
  },
  {
    id: 'garden',
    symbol: 'Garden',
    emoji: '🌹',
    category: 'nature',
    shortMeaning: 'Cultivated self; growth and tended potential',
    fullMeaning: 'The garden represents the self as something cultivated and tended — the aspects of personality that have been consciously developed and nurtured over time. It speaks of growth, beauty, and the care one applies to their inner life.',
    jungianContext: 'A walled garden often appears as a symbol of the enclosed, protected self — the temenos, or sacred precinct. What blooms in the garden reflects what you have nurtured in yourself. Overgrown or neglected gardens suggest areas of the psyche that have been abandoned.',
    relatedSymbols: ['flowers', 'walls', 'fountain', 'seasons'],
    commonDreamContexts: ['A secret garden behind a locked gate', 'Flowers growing in impossible colors', 'Tending plants that grow rapidly', 'A garden changing with the seasons'],
    affirmation: 'Everything you have planted within yourself is still growing.',
  },
  {
    id: 'mountain',
    symbol: 'Mountain',
    emoji: '⛰️',
    category: 'nature',
    shortMeaning: 'Aspiration; the path of individuation',
    fullMeaning: 'Mountains represent the great challenges and aspirations of the psyche — the arduous, necessary journey toward higher consciousness and wholeness. The summit is rarely the point; the climb is the transformation.',
    jungianContext: 'In Jungian terms, climbing a mountain often represents the process of individuation — the lifelong journey of becoming who one truly is. The mountain stands between you and a higher version of yourself, demanding courage, endurance, and surrender to the process.',
    relatedSymbols: ['peak', 'path', 'clouds', 'snow', 'valley'],
    commonDreamContexts: ['An impossible summit that keeps receding', 'Climbing effortlessly with great joy', 'Looking down from a peak at the world', 'A mountain appearing where none existed'],
    affirmation: 'The climb itself is transforming you.',
  },

  // Architecture
  {
    id: 'house',
    symbol: 'House',
    emoji: '🏠',
    category: 'architecture',
    shortMeaning: 'The self; the structure of the psyche',
    fullMeaning: 'The house is one of the most universal symbols of the self in dreams. Each room represents a different aspect of the psyche — attics hold memories and higher thought, basements the unconscious and shadow material, kitchens transformation, bedrooms intimacy.',
    jungianContext: 'Jung described the house as the most common symbol for the psyche as a whole. Exploring an unknown room in your house signals the discovery of previously unconscious aspects of yourself. A house in disrepair reflects the neglect of some aspect of the inner world.',
    relatedSymbols: ['rooms', 'doors', 'basement', 'attic', 'windows'],
    commonDreamContexts: ['Discovering a hidden room', 'Childhood home appearing transformed', 'A house that is larger inside than outside', 'Navigating dark hallways'],
    affirmation: 'Every room inside you is yours to explore.',
  },
  {
    id: 'door',
    symbol: 'Door',
    emoji: '🚪',
    category: 'architecture',
    shortMeaning: 'Threshold; transition and opportunity',
    fullMeaning: 'A door represents transition — the passage between one state of being and another. It is both an invitation and a challenge: what lies beyond requires the willingness to cross the threshold.',
    jungianContext: 'In Jungian symbolism, doors mark psychic boundaries. An open door signals readiness for change or revelation. A locked door suggests a part of the self that is not yet accessible — perhaps a trauma, a repressed desire, or a potential not yet awakened.',
    relatedSymbols: ['key', 'hallway', 'light', 'threshold', 'lock'],
    commonDreamContexts: ['A door at the end of a long corridor', 'Unable to open a door despite trying', 'A door appearing in a wall with no door', 'Light streaming through a keyhole'],
    affirmation: 'The doors that won\'t open are protecting you until you are ready.',
  },
  {
    id: 'tower',
    symbol: 'Tower',
    emoji: '🗼',
    category: 'architecture',
    shortMeaning: 'Isolation; elevated perspective or ego',
    fullMeaning: 'The tower symbolizes both lofty aspiration and isolation. It can represent the intellect elevated above the emotional life, or a refuge from the world — a place of solitary contemplation and remove from ordinary experience.',
    jungianContext: 'Jung himself built a stone tower at Bollingen as a symbol of his inner self. For the dreamer, a tower may represent the persona — the mask of achievement and status — or the isolated ego cut off from the warmth of human connection and the unconscious.',
    relatedSymbols: ['height', 'spiral staircase', 'window', 'stone', 'isolation'],
    commonDreamContexts: ['Looking out from a tower over a vast landscape', 'Trapped in a tower unable to descend', 'A spiral staircase that never ends', 'Building a tower stone by stone'],
    affirmation: 'True elevation comes from depth, not height.',
  },
  {
    id: 'bridge',
    symbol: 'Bridge',
    emoji: '🌉',
    category: 'architecture',
    shortMeaning: 'Connection; crossing between two states',
    fullMeaning: 'The bridge is a symbol of passage — the act of moving from one psychological state to another across a divide. It suggests that what seemed separate can be connected, and that the gap between two aspects of the self or two chapters of life can be traversed.',
    jungianContext: 'Bridges in dreams often appear at moments of major life transition — crossing from one identity to another, integrating opposing aspects of the psyche, or moving through grief into renewal. The condition of the bridge reflects the ease or difficulty of the transition.',
    relatedSymbols: ['water', 'crossing', 'two sides', 'abyss'],
    commonDreamContexts: ['A rickety bridge over a chasm', 'Crossing a beautiful bridge at night', 'A bridge that disappears behind you', 'Standing at the midpoint between two worlds'],
    affirmation: 'You already have everything needed to cross.',
  },

  // Creatures
  {
    id: 'snake',
    symbol: 'Snake',
    emoji: '🐍',
    category: 'creatures',
    shortMeaning: 'Transformation; hidden wisdom or primal energy',
    fullMeaning: 'The snake is one of the oldest and most complex dream symbols, appearing across virtually every human culture. It embodies paradox: it is both healing and venom, wisdom and danger, the shedding of old skin and the danger of the primal.',
    jungianContext: 'Jung saw the snake as representing the autonomous psyche — the part of the unconscious that operates beyond ego control. It often appears when a profound transformation is underway. The Kundalini serpent of Hindu tradition, which Jung studied closely, maps closely to this symbol of awakening energy rising through the psyche.',
    relatedSymbols: ['shedding', 'coil', 'eyes', 'poison', 'healing'],
    commonDreamContexts: ['A snake shedding its skin in slow motion', 'Being bitten but feeling no fear', 'A snake guarding something precious', 'Holding a snake that becomes calm'],
    affirmation: 'Transformation requires you to shed what no longer fits.',
  },
  {
    id: 'bird',
    symbol: 'Bird',
    emoji: '🕊️',
    category: 'creatures',
    shortMeaning: 'Freedom; spirit; transcendence',
    fullMeaning: 'Birds represent the liberated spirit — the aspect of consciousness that transcends the material and soars beyond the earthbound. They carry messages between worlds and embody the possibility of a perspective above ordinary life.',
    jungianContext: 'In Jungian psychology, birds are often associated with spiritual aspiration and the anima or animus — the inner feminine or masculine that mediates between the ego and the deeper self. A flock of birds may represent the plurality of the unconscious.',
    relatedSymbols: ['sky', 'wings', 'nest', 'flight', 'song'],
    commonDreamContexts: ['Flying alongside birds effortlessly', 'A single bird delivering a message', 'A wounded bird that needs care', 'Birds speaking in a language you understand'],
    affirmation: 'You were made to rise above what holds you down.',
  },
  {
    id: 'wolf',
    symbol: 'Wolf',
    emoji: '🐺',
    category: 'creatures',
    shortMeaning: 'Instinct; the wild self; pack and solitude',
    fullMeaning: 'The wolf embodies raw instinct, feral intelligence, and the tension between solitude and belonging. In dreams, it calls you back to something primal and authentic — the part of you unconditioned by society\'s demands.',
    jungianContext: 'The wolf often represents shadow material — the repressed, instinctive, "uncivilized" aspects of the self that have been banished from the persona. Its appearance in dreams is frequently an invitation to reclaim vital energy that has been denied expression.',
    relatedSymbols: ['pack', 'moon', 'howl', 'forest', 'chase'],
    commonDreamContexts: ['Running with a pack through dark woods', 'A lone wolf watching from a distance', 'Being chased but unafraid', 'A wolf that becomes a guide'],
    affirmation: 'Your wildness is not your weakness — it is your power.',
  },

  // Celestial
  {
    id: 'moon',
    symbol: 'Moon',
    emoji: '🌙',
    category: 'celestial',
    shortMeaning: 'The unconscious; cycles; the feminine principle',
    fullMeaning: 'The moon governs the night realm — the domain of dream itself. It symbolizes the rhythmic, cyclical nature of the psyche, the pull of the unconscious, and the mysterious, luminous aspect of the inner world that can only be seen in darkness.',
    jungianContext: 'The moon is strongly associated with the anima — the feminine soul-image in the male psyche — and with the instinctive, cyclical wisdom of the unconscious. A full moon often signals psychic fullness or intensity; a new moon, beginnings and unseen potential.',
    relatedSymbols: ['water', 'tides', 'night', 'reflection', 'silver'],
    commonDreamContexts: ['A moon impossibly large on the horizon', 'Two moons in the sky', 'Bathing in moonlight', 'The moon speaking or descending'],
    affirmation: 'Even in darkness, you are giving off light.',
  },
  {
    id: 'sun',
    symbol: 'Sun',
    emoji: '☀️',
    category: 'celestial',
    shortMeaning: 'Consciousness; vitality; the self in fullness',
    fullMeaning: 'The sun represents the principle of consciousness itself — clarity, life-force, and the radiant wholeness of the fully realized self. It is the light that illuminates what was hidden and gives form to what was formless.',
    jungianContext: 'In alchemy, which Jung studied extensively, the sun is the Sol — the masculine principle of consciousness, clarity, and spirit. Its appearance in dreams often signals a period of illumination, confidence, and the strengthening of identity.',
    relatedSymbols: ['light', 'warmth', 'golden', 'sky', 'dawn'],
    commonDreamContexts: ['The sun rising after a long darkness', 'Standing at the center of a solar landscape', 'A black sun or eclipse', 'The sun and moon together in the sky'],
    affirmation: 'Your light is not borrowed — it is your own.',
  },
  {
    id: 'stars',
    symbol: 'Stars',
    emoji: '⭐',
    category: 'celestial',
    shortMeaning: 'Guidance; destiny; points of connection in the vast',
    fullMeaning: 'Stars in dreams represent fixed points of meaning in the vast unknown — guiding lights that orient the dreamer across the dark expanse of the unconscious. They speak of destiny, of the self\'s place within a larger order.',
    jungianContext: 'Stars are often associated with the Self in its most transpersonal dimension — the organizing center that transcends the individual ego. To navigate by stars is to trust a wisdom larger than the conscious mind.',
    relatedSymbols: ['sky', 'navigation', 'night', 'infinity', 'constellation'],
    commonDreamContexts: ['Stars falling or moving', 'A new star appearing just for you', 'Traveling between stars', 'Reading a map written in constellations'],
    affirmation: 'You are not lost — you are navigating.',
  },

  // Elements
  {
    id: 'fire',
    symbol: 'Fire',
    emoji: '🔥',
    category: 'elements',
    shortMeaning: 'Transformation; passion; purification',
    fullMeaning: 'Fire is the great transformer — it destroys to create, consumes to purify, and illuminates the darkness. In dreams, fire rarely means simple destruction; more often it signals that something is being alchemically transformed.',
    jungianContext: 'In alchemical terms, fire is the agent of transformation — the calcinatio that reduces the prima materia to ash before something new can arise. Emotionally, fire represents passion, creative energy, and libido in the broadest sense of vital force.',
    relatedSymbols: ['ash', 'light', 'warmth', 'destruction', 'rebirth'],
    commonDreamContexts: ['A controlled flame in the palm of your hand', 'A fire that spreads but doesn\'t consume', 'Standing in fire without being burned', 'Fire burning away what is old and heavy'],
    affirmation: 'What is burning away is making room for what you are becoming.',
  },
  {
    id: 'water',
    symbol: 'Water',
    emoji: '💧',
    category: 'elements',
    shortMeaning: 'The unconscious; emotion; flow and change',
    fullMeaning: 'Water is perhaps the most universal symbol of the unconscious in all its forms — from the still reflecting pool to the raging flood, from healing spring to drowning sea. It represents the emotional life, the capacity for feeling, and the fluid, shapeless realm below conscious awareness.',
    jungianContext: 'For Jung, water is the most frequent symbol of the unconscious. Clear water suggests clarity and insight; murky water, confusion or unexamined material. Still water reflects — it shows you something. Moving water carries you somewhere. All water invites surrender to what cannot be controlled.',
    relatedSymbols: ['river', 'rain', 'flood', 'reflection', 'thirst'],
    commonDreamContexts: ['Water rising slowly around you', 'A river you must cross', 'Rain that feels like healing', 'A mirror-smooth lake that shows another world'],
    affirmation: 'Let the waters of feeling move through you without fear.',
  },
  {
    id: 'wind',
    symbol: 'Wind',
    emoji: '💨',
    category: 'elements',
    shortMeaning: 'Spirit; invisible forces; change in motion',
    fullMeaning: 'Wind is the breath of the world — invisible, powerful, and impossible to grasp. In dreams it represents the spirit in motion, the invisible forces that shape our lives, and the inevitability of change.',
    jungianContext: 'In Greek, pneuma means both wind and spirit. Wind in dreams often symbolizes the activity of the unconscious — forces at work that cannot be seen but only felt in their effects. A gentle wind may be the spirit moving; a gale, forces of transformation that cannot be resisted.',
    relatedSymbols: ['breath', 'spirit', 'invisible', 'direction', 'change'],
    commonDreamContexts: ['Wind carrying a voice or message', 'Becoming wind itself', 'Being lifted by wind without fear', 'Wind that stops all sound'],
    affirmation: 'You cannot see what is moving you, but you can trust the direction.',
  },

  // Objects
  {
    id: 'key',
    symbol: 'Key',
    emoji: '🗝️',
    category: 'objects',
    shortMeaning: 'Access; solution; hidden knowledge unlocked',
    fullMeaning: 'A key represents the means of access to something previously closed — a door, a chest, a truth, an aspect of the self. Finding a key in a dream signals that the means to unlock something important has arrived.',
    jungianContext: 'Keys appear in dreams when the dreamer is on the verge of accessing unconscious material that has been locked away. The key itself may represent insight, readiness, or a relationship that opens new dimensions of the self.',
    relatedSymbols: ['lock', 'door', 'chest', 'secret', 'gold'],
    commonDreamContexts: ['A key that fits no lock you can find', 'Many keys and one right lock', 'A golden key given by a stranger', 'Losing the key just before opening something'],
    affirmation: 'You already carry the key — you are learning which door it opens.',
  },
  {
    id: 'mirror',
    symbol: 'Mirror',
    emoji: '🪞',
    category: 'objects',
    shortMeaning: 'Self-reflection; the shadow; alternate selves',
    fullMeaning: 'The mirror presents the self back to the self — but in dreams, it rarely shows only what is expected. Mirrors reveal the shadow, alternate possibilities of identity, the distortions of self-perception, and the strange beauty of being seen.',
    jungianContext: 'The mirror is a powerful symbol of the shadow encounter — the meeting with the unrecognized or denied aspects of the self. When a mirror shows something unexpected, the unconscious is revealing what the ego has refused to see.',
    relatedSymbols: ['reflection', 'shadow', 'face', 'glass', 'twin'],
    commonDreamContexts: ['Your reflection moves independently', 'A mirror showing a different version of you', 'Unable to see yourself in the mirror', 'A mirror that shows only darkness'],
    affirmation: 'What the mirror shows is part of you — and it is asking to be known.',
  },

  // Body
  {
    id: 'hands',
    symbol: 'Hands',
    emoji: '🤲',
    category: 'body',
    shortMeaning: 'Agency; creation; connection and giving',
    fullMeaning: 'Hands in dreams represent the capacity to act, create, reach out, and make. They symbolize agency — the ability to shape the world and to connect with others through touch, craft, and care.',
    jungianContext: 'Hands in Jungian psychology often relate to the opus — the great work of self-creation and transformation. When hands appear in dreams doing something significant, pay close attention to the nature of the work: it often mirrors the psychic work currently underway.',
    relatedSymbols: ['fingers', 'touch', 'work', 'offering', 'grasp'],
    commonDreamContexts: ['Hands producing light or healing', 'Hands reaching through a threshold', 'Examining your own hands in wonder', 'An unknown pair of hands guiding you'],
    affirmation: 'Your hands are capable of things you have not yet imagined.',
  },
  {
    id: 'eyes',
    symbol: 'Eyes',
    emoji: '👁️',
    category: 'body',
    shortMeaning: 'Perception; inner sight; being seen',
    fullMeaning: 'Eyes in dreams represent perception, consciousness, and the capacity to truly see — both outward and inward. A single eye often represents the unified perception of the self; many eyes, an expanded or overwhelming awareness.',
    jungianContext: 'The eye is the organ of insight — in dreams it often signals a new capacity for perception arising in the psyche. To see clearly in a dream is to achieve a moment of consciousness; to be blinded, to have lost touch with truth.',
    relatedSymbols: ['sight', 'light', 'third eye', 'watching', 'tears'],
    commonDreamContexts: ['An eye opening in an unexpected place', 'Eyes in the darkness watching without threat', 'Your own eyes a different color', 'Seeing with absolute clarity for the first time'],
    affirmation: 'You are beginning to see what was always there.',
  },

  // Figures
  {
    id: 'shadow-figure',
    symbol: 'Shadow Figure',
    emoji: '👤',
    category: 'figures',
    shortMeaning: 'The shadow; the unintegrated self',
    fullMeaning: 'A shadowy, faceless, or darkened human figure in dreams is one of the most direct manifestations of the Jungian Shadow — the sum of the personal and collective unconscious that the ego has not yet claimed.',
    jungianContext: 'Jung considered the encounter with the Shadow to be the first great task of individuation. The shadow figure carries qualities we have disowned — not only darkness, but also unlived light, repressed gifts, and unexpressed vitality. Pursuing or confronting the shadow figure is a sign of psychic courage.',
    relatedSymbols: ['darkness', 'pursuit', 'unknown', 'mirror', 'mask'],
    commonDreamContexts: ['Being followed by a shadowy figure', 'A silhouette that won\'t show its face', 'The shadow figure becoming still and offering something', 'Merging with the shadow figure'],
    affirmation: 'The figure that follows you is the part of you asking to come home.',
  },
  {
    id: 'wise-elder',
    symbol: 'Wise Elder',
    emoji: '🧙',
    category: 'figures',
    shortMeaning: 'Inner wisdom; the Self; guidance from depth',
    fullMeaning: 'An elder, sage, teacher, or mysterious old figure represents the wisdom of the deep unconscious — the accumulated knowing that transcends personal history and speaks from the timeless center of the psyche.',
    jungianContext: 'Jung identified the Wise Old Man as one of the primary archetypes of the collective unconscious. This figure embodies the Logos — the ordering principle of meaning. When it appears in dreams, it typically arrives at a moment of confusion or crossroads as an inner authority.',
    relatedSymbols: ['staff', 'lantern', 'book', 'cave', 'robes'],
    commonDreamContexts: ['An elder appearing at a crossroads', 'Receiving a gift or message from a sage', 'A figure who answers questions with questions', 'Being led somewhere by an ancient being'],
    affirmation: 'The wisdom you seek is already inside you.',
  },
];
