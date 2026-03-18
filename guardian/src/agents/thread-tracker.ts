/**
 * Thread Tracker — conversation thread awareness for Guardian.
 *
 * Tracks conversational threads with step-by-step progress and cross-references,
 * so Guardian can resume interrupted threads without the user re-explaining.
 *
 * All detection is heuristic-based (no LLM calls) for speed.
 */

import { detectTopicShift, detectThreadResumption } from './anticipator-signals.js';

// -- Types --

/** A single step within a conversation thread. */
export interface ThreadStep {
  index: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  timestamp: string;
}

/** A tracked conversation thread. */
export interface ConversationThread {
  id: string;
  conversationId: string;
  userId: string;
  topic: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  steps: ThreadStep[];
  currentStepIndex: number;
  relatedThreadIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Result from thread detection — what action to take. */
export type ThreadAction =
  | { type: 'continue'; threadId: string }
  | { type: 'new'; topic: string }
  | { type: 'resume'; threadId: string; matchedPhrase: string }
  | { type: 'complete'; threadId: string }
  | { type: 'none' };

// -- Constants --

/** Maximum thread summary length for context injection. */
const MAX_SUMMARY_LENGTH = 100;

/** Minimum keyword overlap to consider a message on-topic with a thread. */
const TOPIC_OVERLAP_THRESHOLD = 0.25;

// -- Helpers --

/** Counter for generating thread IDs. */
let threadCounter = 0;

/** Generate a unique thread ID. */
function generateThreadId(): string {
  return `thread-${Date.now()}-${++threadCounter}`;
}

/** Extract significant lowercase words (4+ chars) from text. */
function extractWords(text: string): Set<string> {
  const STOP = new Set([
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

  const words = new Set<string>();
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 4);

  for (const token of tokens) {
    if (!STOP.has(token)) {
      words.add(token);
    }
  }
  return words;
}

/** Calculate keyword overlap ratio between two sets of words. */
function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const word of a) {
    if (b.has(word)) overlap++;
  }
  return overlap / Math.min(a.size, b.size);
}

// -- Completion/Abandonment Detection --

/** Patterns that signal a thread is being completed. */
const COMPLETION_PATTERNS: RegExp[] = [
  /\bthat'?s?\s+(?:done|finished|complete|resolved|sorted|it)\b/i,
  /\blet'?s?\s+move\s+on\b/i,
  /\bwe'?re?\s+(?:done|finished|good)\b/i,
  /\bproblem\s+solved\b/i,
  /\bthat\s+(?:works|worked|should\s+work)\b/i,
  /\ball\s+(?:set|good|done)\b/i,
  /\bwrap(?:ping)?\s+(?:up|this\s+up)\b/i,
  /\bclosing\s+(?:this|that)\b/i,
  /\bmoving\s+on\b/i,
  /\bokay,?\s+(?:next|done|great)\b/i,
];

/** Detect if a message signals completion of the current thread. */
function detectCompletion(message: string): boolean {
  return COMPLETION_PATTERNS.some((p) => p.test(message));
}

// -- Decision Detection (for marking steps completed) --

/** Patterns that signal a decision has been made. */
const DECISION_PATTERNS: RegExp[] = [
  /\blet'?s?\s+(?:go\s+with|use|pick|choose|do)\b/i,
  /\bdecided\s+(?:to|on)\b/i,
  /\bwe(?:'ll| will)\s+(?:go|use|do|implement|build)\b/i,
  /\bagreed\s+(?:to|on)\b/i,
  /\bgoing\s+(?:to|with)\b/i,
  /\bsounds?\s+(?:good|great|right|like\s+a\s+plan)\b/i,
  /\bi'?(?:ll| will)\s+(?:implement|build|create|write|add)\b/i,
];

/** Detect if a message contains a decision. */
function detectDecision(message: string): boolean {
  return DECISION_PATTERNS.some((p) => p.test(message));
}

// -- Core Thread Tracker --

/**
 * ThreadTracker — manages conversation threads for a single conversation.
 *
 * Keeps threads in memory during the conversation session and can be
 * persisted via getThreads() / constructor hydration.
 */
export class ThreadTracker {
  private threads: Map<string, ConversationThread> = new Map();
  private conversationId: string;
  private userId: string;

  constructor(conversationId: string, userId: string, existingThreads?: ConversationThread[]) {
    this.conversationId = conversationId;
    this.userId = userId;

    if (existingThreads) {
      for (const thread of existingThreads) {
        this.threads.set(thread.id, thread);
      }
    }
  }

  /**
   * Detect what thread action a message implies.
   *
   * Checks (in order):
   * 1. Completion signals → complete the active thread
   * 2. Resumption signals → resume a paused thread
   * 3. Topic shift → pause active and start new
   * 4. Topic continuity → continue active thread
   * 5. No active thread + substantive message → start new thread
   */
  detectThread(message: string, conversationHistory: string[] = []): ThreadAction {
    const activeThread = this.getActiveThread();

    // 1. Check for completion of current thread
    if (activeThread && detectCompletion(message)) {
      return { type: 'complete', threadId: activeThread.id };
    }

    // 2. Check for thread resumption ("back to...", "where were we")
    const resumptionSignals = detectThreadResumption(message);
    if (resumptionSignals.length > 0) {
      const pausedThreads = this.getThreadsByStatus('paused');
      if (pausedThreads.length > 0) {
        // Find the best matching paused thread
        const messageWords = extractWords(message);
        let bestMatch: ConversationThread | null = null;
        let bestOverlap = 0;

        for (const thread of pausedThreads) {
          const threadWords = extractWords(thread.topic);
          const ratio = overlapRatio(messageWords, threadWords);
          if (ratio > bestOverlap) {
            bestOverlap = ratio;
            bestMatch = thread;
          }
        }

        // If we found a matching paused thread, resume it
        if (bestMatch && bestOverlap > 0) {
          return {
            type: 'resume',
            threadId: bestMatch.id,
            matchedPhrase: resumptionSignals[0].value,
          };
        }

        // If no keyword match, resume the most recently paused thread
        const mostRecent = pausedThreads.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0];
        return {
          type: 'resume',
          threadId: mostRecent.id,
          matchedPhrase: resumptionSignals[0].value,
        };
      }
    }

    // 3. Check for topic shift (new thread)
    if (activeThread && conversationHistory.length > 0) {
      const topicShiftSignals = detectTopicShift(message, conversationHistory);
      if (topicShiftSignals.length > 0) {
        // Also verify the message doesn't overlap with the active thread's topic
        const messageWords = extractWords(message);
        const threadWords = extractWords(activeThread.topic);
        const ratio = overlapRatio(messageWords, threadWords);

        if (ratio < TOPIC_OVERLAP_THRESHOLD) {
          // Extract the new topic from the message
          const topic = extractTopicFromMessage(message);
          return { type: 'new', topic };
        }
      }
    }

    // 4. Continue active thread if it exists
    if (activeThread) {
      return { type: 'continue', threadId: activeThread.id };
    }

    // 5. Start new thread if message is substantive enough
    const words = extractWords(message);
    if (words.size >= 2) {
      const topic = extractTopicFromMessage(message);
      return { type: 'new', topic };
    }

    return { type: 'none' };
  }

  /**
   * Update a thread based on a new message.
   * Adds steps, marks decisions, and tracks topic evolution.
   */
  updateThread(threadId: string, message: string): ConversationThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const now = new Date().toISOString();

    // If a decision was made, mark the current step as completed
    if (detectDecision(message) && thread.steps.length > 0) {
      const currentStep = thread.steps[thread.currentStepIndex];
      if (currentStep && currentStep.status !== 'completed') {
        currentStep.status = 'completed';
        currentStep.timestamp = now;
      }
    }

    // Add a new step for this message
    const description = summarizeMessage(message);
    const newStep: ThreadStep = {
      index: thread.steps.length,
      description,
      status: 'in_progress',
      timestamp: now,
    };
    thread.steps.push(newStep);
    thread.currentStepIndex = newStep.index;
    thread.updatedAt = now;

    return { ...thread };
  }

  /**
   * Start a new thread with the given topic.
   * Pauses the currently active thread (if any).
   */
  startThread(topic: string): ConversationThread {
    // Pause any currently active thread
    const active = this.getActiveThread();
    if (active) {
      active.status = 'paused';
      active.updatedAt = new Date().toISOString();
    }

    const now = new Date().toISOString();
    const thread: ConversationThread = {
      id: generateThreadId(),
      conversationId: this.conversationId,
      userId: this.userId,
      topic,
      status: 'active',
      steps: [],
      currentStepIndex: 0,
      relatedThreadIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(thread.id, thread);
    return { ...thread };
  }

  /**
   * Resume a paused thread by its ID.
   * Pauses any currently active thread first.
   */
  resumeThread(threadId: string): ConversationThread | null {
    const thread = this.threads.get(threadId);
    if (!thread || thread.status !== 'paused') return null;

    // Pause the currently active thread
    const active = this.getActiveThread();
    if (active) {
      active.status = 'paused';
      active.updatedAt = new Date().toISOString();
    }

    thread.status = 'active';
    thread.updatedAt = new Date().toISOString();
    return { ...thread };
  }

  /**
   * Mark a thread as completed.
   */
  completeThread(threadId: string): ConversationThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    thread.status = 'completed';
    thread.updatedAt = new Date().toISOString();

    // Mark any in-progress steps as completed
    for (const step of thread.steps) {
      if (step.status === 'in_progress') {
        step.status = 'completed';
        step.timestamp = new Date().toISOString();
      }
    }

    return { ...thread };
  }

  /**
   * Get all active and paused threads for this conversation.
   */
  getActiveThreads(): ConversationThread[] {
    const results: ConversationThread[] = [];
    for (const thread of this.threads.values()) {
      if (thread.status === 'active' || thread.status === 'paused') {
        results.push({ ...thread });
      }
    }
    return results;
  }

  /**
   * Produce a concise one-line summary for a thread.
   * Format: "Topic: last step description (step N of M)"
   */
  summarizeThread(threadId: string): string {
    const thread = this.threads.get(threadId);
    if (!thread) return '';

    const stepCount = thread.steps.length;
    const completedSteps = thread.steps.filter((s) => s.status === 'completed').length;

    let summary = thread.topic;

    if (stepCount > 0) {
      const currentStep = thread.steps[thread.currentStepIndex];
      if (currentStep) {
        summary += `: ${currentStep.description}`;
      }
      summary += ` (step ${completedSteps + 1} of ${stepCount})`;
    }

    // Truncate if needed
    if (summary.length > MAX_SUMMARY_LENGTH) {
      summary = summary.slice(0, MAX_SUMMARY_LENGTH - 3) + '...';
    }

    return summary;
  }

  /**
   * Link two related threads with cross-references.
   */
  crossReference(threadId1: string, threadId2: string): boolean {
    const thread1 = this.threads.get(threadId1);
    const thread2 = this.threads.get(threadId2);
    if (!thread1 || !thread2) return false;

    if (!thread1.relatedThreadIds.includes(threadId2)) {
      thread1.relatedThreadIds.push(threadId2);
    }
    if (!thread2.relatedThreadIds.includes(threadId1)) {
      thread2.relatedThreadIds.push(threadId1);
    }

    return true;
  }

  /**
   * Get all threads (for persistence).
   */
  getThreads(): ConversationThread[] {
    return Array.from(this.threads.values()).map((t) => ({ ...t }));
  }

  /**
   * Build a context string for all active/paused threads (for system prompt injection).
   */
  buildThreadContext(): string {
    const activeThreads = this.getActiveThreads();
    if (activeThreads.length === 0) return '';

    const summaries = activeThreads.map((t) => {
      const statusTag = t.status === 'paused' ? ' [paused]' : '';
      return `- ${this.summarizeThread(t.id)}${statusTag}`;
    });

    return `Current threads:\n${summaries.join('\n')}`;
  }

  // -- Private helpers --

  /** Get the currently active thread (there should be at most one). */
  private getActiveThread(): ConversationThread | undefined {
    for (const thread of this.threads.values()) {
      if (thread.status === 'active') return thread;
    }
    return undefined;
  }

  /** Get threads by status. */
  private getThreadsByStatus(status: ConversationThread['status']): ConversationThread[] {
    const results: ConversationThread[] = [];
    for (const thread of this.threads.values()) {
      if (thread.status === status) results.push(thread);
    }
    return results;
  }
}

// -- Topic Extraction --

/**
 * Extract a short topic description from a message.
 * Uses the first significant clause, capped at ~60 chars.
 */
function extractTopicFromMessage(message: string): string {
  // Remove common prefixes/interjections
  const cleaned = message
    .replace(/^(okay|ok|so|well|hey|hi|alright|right|anyway|anyways),?\s*/i, '')
    .replace(/^(let'?s?\s+(?:talk|discuss|look)\s+(?:about|at|into))\s*/i, '')
    .replace(
      /^(I\s+(?:want|need|'d like)\s+to\s+(?:talk|discuss|look)\s+(?:about|at|into))\s*/i,
      '',
    )
    .replace(/^(can\s+(?:we|you)\s+(?:talk|discuss|look)\s+(?:about|at|into))\s*/i, '')
    .trim();

  // Take first sentence or clause
  const firstClause = cleaned.split(/[.!?\n,;]/)[0]?.trim() ?? cleaned;

  // Cap length
  if (firstClause.length <= 60) {
    return firstClause.toLowerCase();
  }

  return firstClause.slice(0, 57).toLowerCase() + '...';
}

/**
 * Summarize a message into a short step description.
 */
function summarizeMessage(message: string): string {
  // Take the first sentence, capped at 60 chars
  const first = message.split(/[.!?\n]/)[0]?.trim() ?? message.trim();
  if (first.length <= 60) return first.toLowerCase();
  return first.slice(0, 57).toLowerCase() + '...';
}
