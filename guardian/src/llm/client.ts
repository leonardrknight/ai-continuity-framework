import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { loadConfig } from '../config.js';

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

/**
 * Get the Anthropic client singleton.
 * Uses Claude Haiku for memory extraction.
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const config = loadConfig();
    anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Get the OpenAI client singleton.
 * Used for text-embedding-3-small (1536d) embeddings only.
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = loadConfig();
    openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return openaiClient;
}

/** Reset clients (for testing). */
export function resetLLMClients(): void {
  anthropicClient = null;
  openaiClient = null;
}
