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
