/**
 * Quick-ack pattern for conversational flow.
 * 
 * When users are sharing/dumping information, respond with quick acknowledgments
 * instead of waiting for full LLM response. This keeps the conversation flowing
 * while background agents process the content.
 */

/** Pool of quick acknowledgment responses for when user is sharing */
const SHARING_ACKS = [
  "I'm listening...",
  "Uh-huh, go on.",
  "Interesting, tell me more.",
  "Got it.",
  "I see.",
  "Okay.",
  "Right.",
  "Mm-hmm.",
  "That makes sense.",
  "I understand.",
  "Continue...",
  "Yes, and?",
  "Oh really?",
  "Noted.",
  "I'm following.",
];

/** Phrases that indicate user is asking a question/wants response */
const QUESTION_INDICATORS = [
  '?',
  'what do you think',
  'what\'s your',
  'what are your',
  'do you think',
  'can you',
  'could you',
  'would you',
  'should i',
  'should we',
  'how should',
  'what should',
  'any thoughts',
  'any ideas',
  'your opinion',
  'your thoughts',
  'tell me about',
  'explain',
  'summarize',
  'recap',
  'what did i',
  'what have i',
  'remind me',
];

/** Phrases that indicate user is sharing/dumping information */
const SHARING_INDICATORS = [
  'let me tell you',
  'i want to tell you',
  'so basically',
  'the thing is',
  'here\'s the deal',
  'so we',
  'we started',
  'we\'ve been',
  'i\'ve been',
  'the background is',
  'for context',
  'just so you know',
  'fyi',
  'heads up',
  'anyway',
  'so yeah',
  'and then',
  'after that',
  'the next thing',
  'also',
  'another thing',
  'oh and',
];

/**
 * Detect if a message is primarily "sharing" information vs "asking" a question.
 * 
 * @param message - The user's message
 * @returns 'sharing' | 'asking' | 'unclear'
 */
export function detectMessageIntent(message: string): 'sharing' | 'asking' | 'unclear' {
  const lower = message.toLowerCase().trim();
  
  // Check for question indicators first (they're more specific)
  for (const indicator of QUESTION_INDICATORS) {
    if (lower.includes(indicator)) {
      return 'asking';
    }
  }
  
  // Check for sharing indicators
  for (const indicator of SHARING_INDICATORS) {
    if (lower.includes(indicator)) {
      return 'sharing';
    }
  }
  
  // If message is long (>100 chars) and doesn't end with ?, likely sharing
  if (message.length > 100 && !lower.endsWith('?')) {
    return 'sharing';
  }
  
  // Short messages without clear intent - default to asking (give full response)
  if (message.length < 50) {
    return 'asking';
  }
  
  // Medium length, no clear signals - unclear, but lean toward sharing
  return 'sharing';
}

/**
 * Get a random quick acknowledgment response.
 * Tracks recent responses to avoid repetition.
 */
let recentAcks: string[] = [];
const MAX_RECENT = 5;

export function getQuickAck(): string {
  // Filter out recently used acks
  const available = SHARING_ACKS.filter(ack => !recentAcks.includes(ack));
  
  // If we've used them all, reset
  const pool = available.length > 0 ? available : SHARING_ACKS;
  
  // Pick random
  const ack = pool[Math.floor(Math.random() * pool.length)];
  
  // Track it
  recentAcks.push(ack);
  if (recentAcks.length > MAX_RECENT) {
    recentAcks.shift();
  }
  
  return ack;
}

/**
 * Check if we should use quick-ack mode for this message.
 */
export function shouldQuickAck(message: string): boolean {
  const intent = detectMessageIntent(message);
  return intent === 'sharing';
}
