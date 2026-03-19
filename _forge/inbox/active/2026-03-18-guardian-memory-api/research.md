# Guardian Memory API — Integration Layer for AI Agents

**Date:** 2026-03-18
**Source:** Leo + Claude conversation, informed by Amigo's live Guardian usage
**For:** @F to evaluate and frame, then @O to architect

---

## Problem Statement

Guardian has a chat interface (web UI + API) designed for humans. But the breakthrough use case is **AI agents using Guardian as their memory backend**. Amigo proved this by standing up Guardian and using it as its own persistent memory — but it's doing it through the chat API, which forces unnecessary LLM round-trips.

OpenClaw and Clawdbot installations currently have no persistent memory across sessions. They rely on context windows that compact and forget. Every session starts fresh. The AI equivalent of amnesia.

**What's needed:** A dedicated Memory API that any AI agent can integrate with in minutes. No chat UI. No LLM responses. Pure store-and-recall. The agent handles its own conversations — Guardian just remembers everything.

---

## The Promise

**An OpenClaw system that NEVER forgets. NEVER compacts. Something you can ALWAYS trust to store and recall.**

Every conversation the agent has — with any user, about anything — flows through Guardian. The agent's memory is unlimited, instant-access, and permanent. Users never repeat themselves. Context never degrades. The AI gets better with every interaction.

---

## Who Uses This

### Primary: AI Agents (OpenClaw, Clawdbot, Claude Code, custom agents)

An AI agent running on any machine — Ubuntu server, Mac, cloud VM — integrates with a Guardian instance to gain persistent memory. The agent handles its own conversations and reasoning. Guardian handles remembering.

**Integration scenarios:**
- **Clawdbot on Ubuntu** (Amigo's setup) — Agent talks to users via terminal, stores/recalls through Guardian's API
- **OpenClaw multi-agent system** — Multiple agents share one Guardian instance, each with isolated memory per user they interact with
- **Claude Code sessions** — Session context persisted to Guardian, resumed on next session
- **Custom chatbots** — Any application that needs memory-augmented AI responses

### Secondary: Developers building memory-powered applications

Developers who want to add persistent memory to their AI application without building the extraction/consolidation/retrieval pipeline from scratch.

---

## Proposed API Design

### Core Endpoints

#### 1. Store — Fire-and-forget memory capture

```
POST /api/memory/store
Authorization: Bearer <token>

{
  "content": "Leo said he wants the auth migration done by Friday. He's the CTO of Knight Ventures.",
  "user_context_id": "leo-knight",     // who this memory is about
  "source": "conversation",            // conversation | observation | system
  "metadata": {                        // optional
    "session_id": "sess_abc123",
    "turn_number": 14,
    "agent_id": "amigo-openclaw"
  }
}

Response: 201 { "stored": true, "message_id": "msg_xxx" }
```

**What happens:** Content goes to `messages` table → Scribe extracts memories → Consolidator deduplicates → Curator scores → available for retrieval. The agent doesn't wait for any of this — fire and forget.

**Latency target:** <50ms response (just a DB insert)

#### 2. Retrieve — Get relevant context for a query

```
POST /api/memory/retrieve
Authorization: Bearer <token>

{
  "query": "What do I know about Leo's auth migration plans?",
  "user_context_id": "leo-knight",     // whose memories to search
  "max_results": 10,                   // default 10
  "include_profile": true              // include user profile summary
}

Response: 200 {
  "memories": [
    {
      "content": "Leo wants auth migration done by Friday",
      "type": "decision",
      "importance": 0.85,
      "topics": ["auth", "migration", "deadline"],
      "created_at": "2026-03-18T..."
    },
    ...
  ],
  "profile": {
    "summary": "CTO of Knight Ventures. Prefers concise responses...",
    "interests": ["AI memory", "auth systems"],
    "communication_style": "direct, concise"
  },
  "context_block": "## Relevant Context\n- (decision) Leo wants auth...\n\n## About Leo\nCTO of Knight Ventures...",
  "latency_ms": 145
}
```

**What happens:** Query embedding → Retriever two-stage ranking → Anticipator adds predictions → formatted context block ready for LLM injection.

**Latency target:** <500ms

#### 3. Profile — Get/update user profile

```
GET /api/memory/profile/:user_context_id
Authorization: Bearer <token>

Response: 200 {
  "user_context_id": "leo-knight",
  "summary": "CTO of Knight Ventures...",
  "interests": ["AI memory", "iOS development"],
  "communication_style": "direct, concise, prefers bullet points",
  "expertise": ["TypeScript", "Supabase", "AI architecture"],
  "first_seen": "2026-03-17T...",
  "interaction_count": 47,
  "last_seen": "2026-03-18T..."
}
```

#### 4. Threads — Get active conversation threads

```
GET /api/memory/threads/:user_context_id
Authorization: Bearer <token>

Response: 200 {
  "threads": [
    {
      "topic": "Auth migration to Supabase",
      "status": "active",
      "summary": "Decided on Supabase Auth, implementing token refresh (step 3/5)",
      "updated_at": "2026-03-18T..."
    }
  ]
}
```

#### 5. Bulk Store — Batch capture for session dumps

```
POST /api/memory/store/batch
Authorization: Bearer <token>

{
  "user_context_id": "leo-knight",
  "messages": [
    { "role": "user", "content": "Let's talk about the auth migration..." },
    { "role": "assistant", "content": "Sure, where are we on that?" },
    { "role": "user", "content": "I decided to go with Supabase Auth..." }
  ],
  "session_id": "sess_abc123"
}

Response: 201 { "stored": true, "message_count": 3 }
```

**Use case:** Agent dumps an entire session to Guardian at session end.

---

## Integration Patterns

### Pattern 1: Bookend (simplest)

```
SESSION START:
  context = GET /api/memory/retrieve { query: "current user context", user_context_id: user }
  threads = GET /api/memory/threads/user
  → inject into system prompt

SESSION END:
  POST /api/memory/store/batch { messages: session_transcript }
```

Agent gets context at start, dumps everything at end. Simple but has a gap — memories from this session aren't available until after it ends.

### Pattern 2: Continuous (recommended)

```
ON EACH USER MESSAGE:
  POST /api/memory/store { content: user_message }         // fire-and-forget
  context = POST /api/memory/retrieve { query: user_message }  // get relevant context
  → include context in LLM prompt

ON EACH ASSISTANT RESPONSE:
  POST /api/memory/store { content: assistant_response }    // fire-and-forget
```

Every turn is captured and context is always fresh. The Scribe processes in the background. Retriever surfaces relevant memories on every query.

### Pattern 3: Hybrid (Amigo's pattern)

```
ON EACH USER MESSAGE:
  POST /api/memory/store { content: user_message }         // fire-and-forget

ON QUESTIONS/DECISIONS (not every message):
  context = POST /api/memory/retrieve { query: user_question }

ON SESSION END:
  POST /api/memory/store { content: session_summary }      // synthesized summary
```

Selective retrieval — don't query memories on every turn, only when the user asks something or a decision is being made. Reduces latency and cost.

---

## Integration for OpenClaw / Clawdbot

### Configuration

An OpenClaw installation would add Guardian as a memory backend in its config:

```yaml
# .openclaw/config.yaml or CLAUDE.md
memory:
  provider: guardian
  url: http://localhost:3000  # or https://guardian.ai-engram.org
  api_key: <guardian-api-key>
  pattern: continuous          # bookend | continuous | hybrid
  user_context_from: github_username  # how to identify users
```

### Hooks

Clawdbot supports hooks that fire on events. Guardian integration hooks:

```yaml
hooks:
  session_start:
    - guardian-load-context    # GET /api/memory/retrieve + /api/memory/profile

  user_message:
    - guardian-store           # POST /api/memory/store (fire-and-forget)

  before_response:
    - guardian-retrieve        # POST /api/memory/retrieve (inject into prompt)

  assistant_response:
    - guardian-store           # POST /api/memory/store (fire-and-forget)

  session_end:
    - guardian-summarize       # POST /api/memory/store (session summary)
```

### SDK (future)

```typescript
import { GuardianMemory } from '@ai-engram/guardian-sdk';

const memory = new GuardianMemory({
  url: 'http://localhost:3000',
  apiKey: process.env.GUARDIAN_API_KEY,
});

// Store
await memory.store('Leo prefers concise responses', { userId: 'leo' });

// Retrieve
const context = await memory.retrieve('What does Leo prefer?', { userId: 'leo' });
console.log(context.memories);    // relevant memories
console.log(context.profile);     // user profile
console.log(context.contextBlock); // ready for LLM injection

// Session helper
const session = memory.session('leo');
await session.start();              // loads context
await session.capture(message);     // stores each turn
const ctx = await session.recall(query); // retrieves relevant context
await session.end();                // stores session summary
```

---

## Authentication Model for Agents

The current auth uses Supabase Auth (email/password, JWT). For agent-to-agent communication, we need API keys:

```
POST /api/auth/api-key
Authorization: Bearer <admin-jwt>

{
  "name": "amigo-openclaw",
  "scopes": ["memory:store", "memory:retrieve", "memory:profile"]
}

Response: 201 { "api_key": "gk_live_xxx...", "name": "amigo-openclaw" }
```

Agents authenticate with `Authorization: Bearer gk_live_xxx...` — no email/password flow needed.

API keys are scoped:
- `memory:store` — can store memories
- `memory:retrieve` — can retrieve memories
- `memory:profile` — can read/update profiles
- `memory:admin` — full access (manage users, delete memories)

Each API key is linked to a `user_profile` — the agent's identity. Memories stored by the agent are scoped to the `user_context_id` they specify, not the agent's own identity. This lets one agent (Amigo) manage memories for many users (Leo, Jeff, Carlos, etc.).

---

## How This Relates to What Exists

```
EXISTING (built)                      PROPOSED (new)
────────────────                      ──────────────
Web Chat UI ──► POST /api/chat        Agent SDK ──► POST /api/memory/store
               │                                    POST /api/memory/retrieve
               ▼                                    │
         generateChatResponse()                     ▼
               │                              Direct DB operations
               ▼                              (skip LLM response)
         Retriever ◄──────────────────────── Same Retriever
               │                              Same pipeline
               ▼                              Same memories
         Scribe → Consolidator → Curator     Same agents
```

The Memory API is a **thin layer** on top of the existing pipeline. It shares:
- Same Supabase database
- Same extracted_memories / consolidated_memories tables
- Same Scribe, Consolidator, Curator agents
- Same Retriever for recall
- Same RLS for isolation

What's new:
- `/api/memory/*` endpoints (no LLM response generation)
- API key auth (alongside existing Supabase Auth)
- `user_context_id` concept (agent manages memories on behalf of users)
- Batch store endpoint

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Store latency | <50ms (fire-and-forget DB insert) |
| Retrieve latency | <500ms (same as Retriever) |
| Integration time | <30 min from clone to first store/retrieve |
| Agent memory persistence | 100% — nothing ever lost |
| Cross-session recall | Agent recognizes user from first message of new session |
| SDK size | <10KB, zero dependencies beyond fetch |

---

## Open Questions for @F

1. **Should the Memory API require its own Supabase Auth signup, or use API keys exclusively?** API keys are simpler for agent integration. Supabase Auth is better for human users of the chat UI. Both can coexist.

2. **Should `user_context_id` be a string (flexible) or UUID (matches existing schema)?** String is more ergonomic for agents ("leo-knight" vs "550e8400-e29b-41d4-a716-446655440000"). Could map strings to UUIDs internally.

3. **Should the SDK be a separate npm package (`@ai-engram/guardian-sdk`) or bundled with Guardian?** Separate is cleaner for distribution but adds maintenance.

4. **Rate limiting?** Continuous pattern sends 2 API calls per conversation turn. At 100 concurrent users, that's 200 req/s. Need rate limiting? Or is it fine at expected scale?

5. **Should Clawdbot hooks be a Guardian feature or an OpenClaw plugin?** Guardian provides the API; OpenClaw provides the hooks that call it? Or does Guardian ship with hook scripts?

---

## Implementation Phases (Suggested)

### Phase A: Memory API Endpoints
- `/api/memory/store`, `/api/memory/retrieve`, `/api/memory/profile`, `/api/memory/threads`
- API key auth
- Wire to existing pipeline (Retriever, Scribe)

### Phase B: Batch Store + Session Helpers
- `/api/memory/store/batch`
- Session summary generation
- Bulk import for existing conversation logs

### Phase C: SDK
- `@ai-engram/guardian-sdk` npm package
- TypeScript, zero deps
- Session helper class

### Phase D: OpenClaw Integration
- Hook scripts or plugin
- Config-driven setup
- One-command integration: `guardian integrate openclaw`

---

*Packet produced by Claude on 2026-03-18. Ready for @F to evaluate and frame.*
