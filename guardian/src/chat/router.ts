import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../auth/supabase-auth.js';
import { ensureUserProfile } from '../auth/identity.js';
import { getSupabaseClient } from '../db/client.js';
import {
  insertConversation,
  getConversationsByUser,
  getConversationById,
  insertMessage,
  getMessagesByConversation,
  updateConversationMessageCount,
} from '../db/queries.js';
import { generateChatResponse, generateAutoTitle } from './response.js';
import { shouldQuickAck, getQuickAck } from './quick-ack.js';

export const chatRouter = new Hono();
export const conversationsRouter = new Hono();

// Apply auth to all chat and conversation routes
chatRouter.use('*', authMiddleware());
conversationsRouter.use('*', authMiddleware());

/**
 * POST /api/chat — Send a message and get a memory-augmented response.
 *
 * Body: { conversation_id?: string, message: string }
 * Returns: { conversation_id, message_id, response, memories_used }
 */
chatRouter.post('/', async (c) => {
  const authUser = getAuthUser(c);
  const body = await c.req.json<{ conversation_id?: string; message: string }>();

  if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
    return c.json({ error: 'Message is required' }, 400);
  }

  const client = getSupabaseClient();

  // Ensure user profile exists
  const userProfile = await ensureUserProfile(client, authUser.id, authUser.email);

  let conversationId = body.conversation_id;

  // If no conversation_id, create a new conversation with auto-title
  if (!conversationId) {
    const title = generateAutoTitle(body.message);
    const conversation = await insertConversation(client, {
      user_id: userProfile.id,
      title,
    });
    conversationId = conversation.id;
  } else {
    // Verify user owns this conversation
    const conversation = await getConversationById(client, conversationId);
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    if (conversation.user_id !== userProfile.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
  }

  // Store user message (always do this immediately - verbatim capture)
  const userMsg = await insertMessage(client, {
    conversation_id: conversationId,
    user_id: userProfile.id,
    role: 'user',
    content: body.message.trim(),
  });

  // Check if we should use quick-ack mode (user is sharing, not asking)
  const useQuickAck = shouldQuickAck(body.message.trim());

  let text: string;
  let memoriesUsed: number;

  if (useQuickAck) {
    // Quick-ack mode: return fast acknowledgment, let background agents process
    text = getQuickAck();
    memoriesUsed = 0;
  } else {
    // Full response mode: user is asking a question, do full retrieval + LLM
    const response = await generateChatResponse(
      client,
      body.message.trim(),
      conversationId,
      userProfile.id,
    );
    text = response.text;
    memoriesUsed = response.memoriesUsed;
  }

  // Store assistant response
  const assistantMsg = await insertMessage(client, {
    conversation_id: conversationId,
    user_id: userProfile.id,
    role: 'assistant',
    content: text,
  });

  // Update conversation message count (fire-and-forget)
  updateConversationMessageCount(client, conversationId).catch((err) => {
    console.error('Failed to update message count:', err instanceof Error ? err.message : err);
  });

  return c.json({
    conversation_id: conversationId,
    user_message_id: userMsg.id,
    assistant_message_id: assistantMsg.id,
    response: text,
    memories_used: memoriesUsed,
    quick_ack: useQuickAck, // Let client know which mode was used
  });
});

/**
 * GET /api/conversations — List user's conversations.
 */
conversationsRouter.get('/', async (c) => {
  const authUser = getAuthUser(c);
  const client = getSupabaseClient();

  const userProfile = await ensureUserProfile(client, authUser.id, authUser.email);
  const conversations = await getConversationsByUser(client, userProfile.id);

  return c.json({ conversations });
});

/**
 * POST /api/conversations — Create a new conversation.
 *
 * Body: { title?: string }
 */
conversationsRouter.post('/', async (c) => {
  const authUser = getAuthUser(c);
  const body = await c.req.json<{ title?: string }>();

  const client = getSupabaseClient();
  const userProfile = await ensureUserProfile(client, authUser.id, authUser.email);

  const conversation = await insertConversation(client, {
    user_id: userProfile.id,
    title: body.title ?? null,
  });

  return c.json({ conversation }, 201);
});

/**
 * GET /api/conversations/:id — Get a conversation with message history.
 */
conversationsRouter.get('/:id', async (c) => {
  const authUser = getAuthUser(c);
  const conversationId = c.req.param('id');
  const client = getSupabaseClient();

  const userProfile = await ensureUserProfile(client, authUser.id, authUser.email);

  const conversation = await getConversationById(client, conversationId);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  if (conversation.user_id !== userProfile.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const messages = await getMessagesByConversation(client, conversationId);

  return c.json({ conversation, messages });
});
