import type Anthropic from '@anthropic-ai/sdk';
import type { MemoryType, SourceType } from '../db/schema.js';

/** Schema for a single extracted memory from the LLM. */
export interface ExtractedMemoryLLM {
  content: string;
  memory_type: MemoryType;
  topics: string[];
  entities: string[];
  importance_score: number;
  confidence_score: number;
  source_type: SourceType;
  emotional_valence: number | null;
  emotional_arousal: number | null;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction agent for the ai-continuity-framework GitHub repository.
Your job is to analyze GitHub events and extract structured memories that capture important information.

The repository is an open-source methodology and reference architecture for AI assistant persistent memory and identity.
Key topics: memory systems, identity persistence, AI continuity, soul capture, agent architecture, consolidation, retrieval.

For each event, extract zero or more memories. Each memory should capture a distinct piece of information.

Guidelines:
- Extract facts, decisions, preferences, patterns, questions, action items, and relationships
- Assign importance_score (0-1): routine commits ~0.2, feature discussions ~0.5, architectural decisions ~0.8, breaking changes ~0.9
- Assign confidence_score (0-1): explicit statements ~0.9, inferred patterns ~0.6
- source_type: "stated" for explicit content, "inferred" for implied meaning
- emotional_valence (-1 to 1): negative sentiment = -1, neutral = 0, positive = 1. null if no emotional content.
- emotional_arousal (0 to 1): calm = 0, highly energetic = 1. null if no emotional content.
- Topics should be lowercase, hyphenated (e.g., "memory-decay", "agent-architecture")
- Entities should be GitHub usernames, file paths, or concept names
- Skip bot-generated content, CI status updates, and trivial formatting changes
- If the event has no meaningful content to extract, return an empty array`;

export const EXTRACTION_TOOL_SCHEMA: Anthropic.Tool = {
  name: 'extract_memories',
  description: 'Extract structured memories from a GitHub event',
  input_schema: {
    type: 'object',
    properties: {
      memories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The extracted memory content — a clear, self-contained statement',
            },
            memory_type: {
              type: 'string',
              enum: [
                'fact',
                'decision',
                'preference',
                'pattern',
                'question',
                'action_item',
                'relationship',
              ],
            },
            topics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lowercase hyphenated topic tags',
            },
            entities: {
              type: 'array',
              items: { type: 'string' },
              description: 'GitHub usernames, file paths, or concept names',
            },
            importance_score: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            confidence_score: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            source_type: {
              type: 'string',
              enum: ['stated', 'inferred'],
            },
            emotional_valence: {
              type: ['number', 'null'],
              minimum: -1,
              maximum: 1,
            },
            emotional_arousal: {
              type: ['number', 'null'],
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            'content',
            'memory_type',
            'topics',
            'entities',
            'importance_score',
            'confidence_score',
            'source_type',
            'emotional_valence',
            'emotional_arousal',
          ],
        },
      },
    },
    required: ['memories'],
  },
};

/** Build the user message for extraction from a raw event. */
export function buildExtractionUserMessage(
  eventType: string,
  contentText: string,
  username: string,
): string {
  return `GitHub Event: ${eventType}
Author: ${username}

Content:
${contentText}`;
}

// -- Consolidation / Merge Prompts --

/** Schema for the merged memory output from the LLM. */
export interface MergedMemoryLLM {
  merged_content: string;
  topics: string[];
}

export const MERGE_SYSTEM_PROMPT = `You are a memory consolidation agent for the ai-continuity-framework project.
Your job is to merge two semantically similar memories into a single, more comprehensive memory.

Guidelines:
- Combine the information from both memories into one clear, self-contained statement
- Preserve all important details from both — do not drop facts
- Resolve contradictions by keeping the more specific or recent information
- Keep the merged content concise but complete
- Return a unified set of topics that covers both memories
- Topics should be lowercase, hyphenated (e.g., "memory-decay", "agent-architecture")`;

export const MERGE_TOOL_SCHEMA: Anthropic.Tool = {
  name: 'merge_memories',
  description: 'Merge two similar memories into a single consolidated memory',
  input_schema: {
    type: 'object',
    properties: {
      merged_content: {
        type: 'string',
        description: 'The merged memory content — a clear, self-contained statement',
      },
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Unified lowercase hyphenated topic tags for the merged memory',
      },
    },
    required: ['merged_content', 'topics'],
  },
};

/** Build the user message for merging two memories. */
export function buildMergeUserMessage(existingContent: string, newContent: string): string {
  return `Existing memory:
${existingContent}

New memory:
${newContent}

Merge these two memories into a single, comprehensive memory.`;
}

// -- Contributor Profile Synthesis Prompts --

/** Schema for the synthesized contributor profile from the LLM. */
export interface ProfileSynthesisLLM {
  summary: string;
  interests: string[];
  expertise: string[];
  communication_style: string;
}

export const PROFILE_SYNTHESIS_PROMPT = `You are a contributor profile synthesis agent for the ai-continuity-framework GitHub repository.
Your job is to analyze a contributor's memories and generate a comprehensive profile.

The repository is an open-source methodology and reference architecture for AI assistant persistent memory and identity.

Guidelines:
- Summary should be 1-3 sentences describing the contributor's role and focus areas
- Interests should be topics they frequently engage with (lowercase hyphenated)
- Expertise should be technical skills and domain knowledge demonstrated
- Communication style should describe how they communicate (e.g., "concise and technical", "detailed and thorough")
- Base your analysis only on the provided memories — do not invent information
- If insufficient data exists for a field, provide a reasonable minimal response`;

export const PROFILE_SYNTHESIS_TOOL_SCHEMA: Anthropic.Tool = {
  name: 'synthesize_profile',
  description: 'Synthesize a contributor profile from their memories',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'A 1-3 sentence summary of the contributor',
      },
      interests: {
        type: 'array',
        items: { type: 'string' },
        description: 'Topics the contributor frequently engages with',
      },
      expertise: {
        type: 'array',
        items: { type: 'string' },
        description: 'Technical skills and domain knowledge demonstrated',
      },
      communication_style: {
        type: 'string',
        description: 'Description of how the contributor communicates',
      },
    },
    required: ['summary', 'interests', 'expertise', 'communication_style'],
  },
};

/** Build the user message for synthesizing a contributor profile. */
export function buildProfileSynthesisMessage(
  username: string,
  memories: { content: string; memory_type: string; topics: string[] | null }[],
): string {
  const memoryLines = memories.map((m) => {
    const topicStr = m.topics?.length ? ` [${m.topics.join(', ')}]` : '';
    return `- (${m.memory_type}${topicStr}) ${m.content}`;
  });

  return `Contributor: ${username}

Their memories:
${memoryLines.join('\n')}

Synthesize a profile for this contributor based on their memories.`;
}
