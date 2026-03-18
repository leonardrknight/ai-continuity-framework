/**
 * Signal detection for the Retrieval Anticipator.
 *
 * All detection is lightweight — regex, keyword matching, and simple heuristics.
 * NO LLM calls. Must complete in <100ms total for all detectors.
 */

// -- Signal Types --

/** Types of anticipation signals the detectors can emit. */
export type SignalType =
  | 'entity_mention'
  | 'topic_keyword'
  | 'temporal_reference'
  | 'thread_resumption'
  | 'question_about_past';

/** A detected signal with its type and extracted payload. */
export interface AnticipationSignal {
  type: SignalType;
  /** The matched text or entity that triggered the signal. */
  value: string;
  /** Suggested query to send to the Retriever. */
  suggestedQuery: string;
  /** Base confidence for this signal (0-1). */
  confidence: number;
}

// -- Entity Detection --

/** Common stop words to exclude from entity detection. */
const STOP_WORDS = new Set([
  'the',
  'this',
  'that',
  'these',
  'those',
  'what',
  'which',
  'where',
  'when',
  'how',
  'who',
  'why',
  'about',
  'with',
  'from',
  'into',
  'have',
  'been',
  'would',
  'could',
  'should',
  'will',
  'shall',
  'might',
  'must',
  'also',
  'just',
  'some',
  'more',
  'very',
  'much',
  'here',
  'there',
  'then',
  'than',
  'well',
  'good',
  'like',
  'make',
  'made',
  'know',
  'think',
  'want',
  'need',
  'sure',
  'still',
  'even',
  'back',
  'only',
  'really',
  'already',
  'remember',
  'let',
  'talk',
  'tell',
  'said',
  'says',
  'doing',
  'done',
  'going',
  'being',
  'does',
  'didn',
  'don',
  'can',
  'yes',
  'not',
]);

/**
 * Extract entity names from a message — people, projects, concepts.
 * Uses capitalized word sequences and quoted terms.
 */
export function detectEntities(message: string): AnticipationSignal[] {
  const signals: AnticipationSignal[] = [];
  const seen = new Set<string>();

  // 1. Match capitalized multi-word phrases (e.g., "Auth System", "React Router")
  const capitalizedPhraseRegex = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g;
  let match: RegExpExecArray | null;
  while ((match = capitalizedPhraseRegex.exec(message)) !== null) {
    const entity = match[1];
    const lower = entity.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      signals.push({
        type: 'entity_mention',
        value: entity,
        suggestedQuery: entity,
        confidence: 0.8,
      });
    }
  }

  // 2. Match single capitalized words (not at sentence start, not stop words)
  const words = message.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const cleaned = words[i].replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleaned.length < 3) continue;
    if (!/^[A-Z]/.test(cleaned)) continue;

    // Skip if it's at the start of a sentence
    if (i === 0) continue;
    const prevChar = message.charAt(message.indexOf(words[i]) - 2);
    if (prevChar === '.' || prevChar === '!' || prevChar === '?') continue;

    const lower = cleaned.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    if (seen.has(lower)) continue;

    seen.add(lower);
    signals.push({
      type: 'entity_mention',
      value: cleaned,
      suggestedQuery: cleaned,
      confidence: 0.6,
    });
  }

  // 3. Match quoted terms (e.g., "the auth system", 'migration pipeline')
  const quotedRegex = /["']([^"']{3,50})["']/g;
  while ((match = quotedRegex.exec(message)) !== null) {
    const term = match[1].trim();
    const lower = term.toLowerCase();
    if (!seen.has(lower) && term.split(/\s+/).length <= 5) {
      seen.add(lower);
      signals.push({
        type: 'entity_mention',
        value: term,
        suggestedQuery: term,
        confidence: 0.75,
      });
    }
  }

  return signals;
}

// -- Topic Shift Detection --

/**
 * Detect when the conversation topic changes by comparing word overlap
 * between the current message and recent history.
 */
export function detectTopicShift(
  message: string,
  previousMessages: string[],
): AnticipationSignal[] {
  if (previousMessages.length === 0) return [];

  const currentWords = extractSignificantWords(message);
  if (currentWords.size === 0) return [];

  // Get words from recent messages (last 3)
  const recentMessages = previousMessages.slice(-3);
  const recentWords = new Set<string>();
  for (const msg of recentMessages) {
    for (const word of extractSignificantWords(msg)) {
      recentWords.add(word);
    }
  }

  if (recentWords.size === 0) return [];

  // Calculate overlap ratio
  let overlap = 0;
  for (const word of currentWords) {
    if (recentWords.has(word)) overlap++;
  }

  const overlapRatio = overlap / currentWords.size;

  // Low overlap = topic shift
  if (overlapRatio < 0.2) {
    // Extract the new topic keywords (words NOT in recent context)
    const newTopicWords: string[] = [];
    for (const word of currentWords) {
      if (!recentWords.has(word)) {
        newTopicWords.push(word);
      }
    }

    const topicQuery = newTopicWords.slice(0, 5).join(' ');
    if (topicQuery.length > 0) {
      return [
        {
          type: 'topic_keyword',
          value: topicQuery,
          suggestedQuery: topicQuery,
          confidence: 0.7,
        },
      ];
    }
  }

  return [];
}

// -- Temporal Reference Detection --

/** Patterns for temporal references. */
const TEMPORAL_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /\blast\s+(?:week|month|time|session|conversation)\b/i, confidence: 0.85 },
  { pattern: /\bremember\s+when\b/i, confidence: 0.9 },
  { pattern: /\byesterday\b/i, confidence: 0.8 },
  { pattern: /\bpreviously\b/i, confidence: 0.7 },
  { pattern: /\bearlier\s+(?:today|this\s+week|we)\b/i, confidence: 0.8 },
  { pattern: /\ba\s+(?:few|couple)\s+(?:days|weeks|months)\s+ago\b/i, confidence: 0.8 },
  { pattern: /\bthe\s+other\s+day\b/i, confidence: 0.75 },
  { pattern: /\brecently\b/i, confidence: 0.6 },
  { pattern: /\bbefore\s+(?:that|this|we)\b/i, confidence: 0.65 },
  { pattern: /\bwe\s+(?:talked|discussed|mentioned|covered|went\s+over)\b/i, confidence: 0.8 },
];

/**
 * Detect temporal references — "last week", "remember when", etc.
 */
export function detectTemporalReference(message: string): AnticipationSignal[] {
  const signals: AnticipationSignal[] = [];

  for (const { pattern, confidence } of TEMPORAL_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      // Use surrounding context as the query (grab a window around the match)
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(message.length, match.index + match[0].length + 40);
      const context = message.slice(contextStart, contextEnd).trim();

      signals.push({
        type: 'temporal_reference',
        value: match[0],
        suggestedQuery: context,
        confidence,
      });
      // Only take the strongest temporal match
      break;
    }
  }

  return signals;
}

// -- Thread Resumption Detection --

/** Patterns for thread resumption. */
const RESUMPTION_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /\bback\s+to\s+(?:what|where|the)\b/i, confidence: 0.9 },
  { pattern: /\bwhere\s+were\s+we\b/i, confidence: 0.9 },
  { pattern: /\bas\s+I\s+was\s+saying\b/i, confidence: 0.85 },
  { pattern: /\bcontinuing\s+(?:with|from|on)\b/i, confidence: 0.8 },
  { pattern: /\bpicking\s+(?:up|back\s+up)\b/i, confidence: 0.8 },
  { pattern: /\blet'?s?\s+(?:get\s+back|go\s+back|return)\s+to\b/i, confidence: 0.85 },
  { pattern: /\banyway(?:s)?,?\s/i, confidence: 0.6 },
  { pattern: /\bso\s+about\b/i, confidence: 0.7 },
];

/**
 * Detect thread resumption — "back to", "where were we", etc.
 */
export function detectThreadResumption(message: string): AnticipationSignal[] {
  const signals: AnticipationSignal[] = [];

  for (const { pattern, confidence } of RESUMPTION_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      // Get the rest of the message after the resumption phrase for context
      const afterMatch = message.slice(match.index + match[0].length).trim();
      const query = afterMatch.length > 0 ? afterMatch.slice(0, 80) : message;

      signals.push({
        type: 'thread_resumption',
        value: match[0],
        suggestedQuery: query,
        confidence,
      });
      break;
    }
  }

  return signals;
}

// -- Question About Past Detection --

/** Patterns for questions about past conversations. */
const PAST_QUESTION_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /\bwhat\s+did\s+(?:I|we)\s+(?:say|decide|discuss|talk)\s+about\b/i, confidence: 0.9 },
  { pattern: /\bwhen\s+did\s+(?:I|we)\s+(?:discuss|talk|decide|agree)\b/i, confidence: 0.85 },
  { pattern: /\bdo\s+you\s+remember\b/i, confidence: 0.8 },
  { pattern: /\bwhat\s+was\s+(?:the|our)\s+(?:decision|conclusion|plan)\b/i, confidence: 0.85 },
  {
    pattern: /\bhave\s+(?:I|we)\s+(?:ever|already)\s+(?:discussed|talked|covered)\b/i,
    confidence: 0.8,
  },
  { pattern: /\bwhat\s+(?:do|did)\s+(?:I|we)\s+know\s+about\b/i, confidence: 0.85 },
];

/**
 * Detect questions about past discussions — "what did I say about", "when did we discuss".
 */
export function detectQuestionAboutPast(message: string): AnticipationSignal[] {
  const signals: AnticipationSignal[] = [];

  for (const { pattern, confidence } of PAST_QUESTION_PATTERNS) {
    const match = pattern.exec(message);
    if (match) {
      // Use the rest of the sentence as the query topic
      const afterMatch = message.slice(match.index + match[0].length).trim();
      const query =
        afterMatch.length > 0 ? afterMatch.replace(/[?.!]+$/, '').slice(0, 80) : message;

      signals.push({
        type: 'question_about_past',
        value: match[0],
        suggestedQuery: query,
        confidence,
      });
      break;
    }
  }

  return signals;
}

// -- Aggregate Signal Detection --

/**
 * Run all signal detectors on a message and return all detected signals.
 * Designed to run in <100ms.
 */
export function detectAllSignals(
  message: string,
  previousMessages: string[] = [],
): AnticipationSignal[] {
  const signals: AnticipationSignal[] = [];

  signals.push(...detectEntities(message));
  signals.push(...detectTopicShift(message, previousMessages));
  signals.push(...detectTemporalReference(message));
  signals.push(...detectThreadResumption(message));
  signals.push(...detectQuestionAboutPast(message));

  return signals;
}

// -- Helpers --

/** Extract significant words (4+ chars, not stop words) from text. */
function extractSignificantWords(text: string): Set<string> {
  const words = new Set<string>();
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 4);

  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) {
      words.add(token);
    }
  }

  return words;
}
