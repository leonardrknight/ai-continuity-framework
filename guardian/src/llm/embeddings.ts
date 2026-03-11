import { getOpenAIClient } from './client.js';

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate a 1536-dimensional embedding for the given text.
 * Returns null on failure (memory should be stored without embedding and flagged for backfill).
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
