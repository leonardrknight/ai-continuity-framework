# Guardian as Universal Backend — Architecture Vision

**Created:** 2026-03-23
**Priority:** High
**Requested By:** Leo Knight
**Context:** Guardian should serve as the backend for ANY chatbot/frontend, not just OpenClaw agents.

---

## The Vision

Guardian isn't just for AI agents — it's a **universal memory and cognition backend** for any conversational interface.

### Current Model (Too Heavy)
```
User → [Heavy Frontend Model (Claude)] → Processes everything → Response
                    ↓
              All computation happens here
              (context management, memory, decisions)
```

### Proposed Model (Thin Frontend + Guardian Backend)
```
User → [Light Frontend] ←→ [Guardian Backend]
           │                      │
           │ Fast, bouncy         │ Heavy lifting:
           │ Small context        │ - Verbatim storage
           │ Just conversation    │ - Memory agents (Scribe, etc.)
           │                      │ - Background processing
           │                      │ - Context injection
           ↓                      ↓
       Quick response        Async intelligence
```

## Key Principles

### 1. Frontend is Light
- Small context window
- Could be Groq, GPT-4o-mini, or any decent conversational model
- Primary job: Pull information out of the user
- Fast, responsive, "bouncy" feel

### 2. Guardian Does the Heavy Lifting
- Receives verbatim transcripts (user + assistant)
- Memory agents process asynchronously
- Provides context injection to frontend when needed
- Background orchestration of domain-specific agents

### 3. Domain-Specific Agents Poll Guardian
- Not part of Guardian itself
- External agents that query Guardian for content
- Example (BookOS): Interview agent, Editorial agent, Drafting agent
- Guardian provides "what we've learned" — agents do domain work

## BookOS Example (Leo's Real-World Case)

**What it does:** Helps humans write books by pulling ideas out of them

**Current problem:** Too much computation on frontend Claude

**Better architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                          BookOS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐         ┌─────────────────────────────────┐  │
│  │ Light Chatbot │◄───────►│         Guardian                │  │
│  │ (Groq/mini)   │         │                                 │  │
│  │               │         │  • Verbatim user messages       │  │
│  │ "Tell me      │         │  • Verbatim assistant messages  │  │
│  │  about your   │         │  • Memory agents processing     │  │
│  │  character"   │         │  • Voice/style capture          │  │
│  └───────────────┘         │  • Context for next message     │  │
│                            └────────────────┬────────────────┘  │
│                                             │                    │
│                            ┌────────────────┼────────────────┐  │
│                            │                │                │  │
│                            ▼                ▼                ▼  │
│                   ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│                   │ Interview   │  │ Editorial   │  │ Drafting│ │
│                   │ Agent       │  │ Agent       │  │ Agent   │ │
│                   │             │  │             │  │         │ │
│                   │ Polls       │  │ Polls       │  │ Polls   │ │
│                   │ Guardian    │  │ Guardian    │  │ Guardian│ │
│                   │ for content │  │ for content │  │ for     │ │
│                   │             │  │             │  │ content │ │
│                   └─────────────┘  └─────────────┘  └─────────┘ │
│                            │                │                │  │
│                            ▼                ▼                ▼  │
│                   ┌─────────────────────────────────────────────┐│
│                   │              Book Outputs                   ││
│                   │  • Codex (characters, lore, world)          ││
│                   │  • Outline (chapters, beats)                ││
│                   │  • Drafts (expanded prose)                  ││
│                   └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Guardian API Requirements

For this to work, Guardian needs:

### 1. Verbatim Transcript Storage
- Every user message, exact text
- Every assistant message, exact text
- Timestamps, session IDs, human IDs

### 2. Context Injection Endpoint
```
GET /context?human_id=X&topic=current_conversation
→ Returns relevant memories for frontend context
```

### 3. Async Processing Status
- Frontend knows Guardian is processing
- Can show "thinking..." indicators

### 4. Query Interface for External Agents
```
GET /query?human_id=X&purpose=outline_generation
→ Returns synthesized content for the requesting agent
```

## What This Means for Architecture

| Component | Role | Model |
|-----------|------|-------|
| Guardian | Universal backend | Various (agents) |
| Light Frontend | Conversation | Groq, GPT-4o-mini, etc. |
| Domain Agents | Specialized work | Claude, domain-tuned |
| Orchestrator | Coordinates agents | System/code |

## Success Criteria

- [ ] Guardian accepts transcripts from any frontend
- [ ] Context injection API exists
- [ ] External agents can query Guardian
- [ ] BookOS (or similar) can run on this architecture
- [ ] Frontend model is interchangeable

---

## Implementation Path

1. **Define Guardian API** — REST/WebSocket endpoints
2. **Build transcript storage** — Verbatim + processed
3. **Create context injection** — Fast retrieval for frontends
4. **Agent query interface** — For external domain agents
5. **Demo with BookOS** — Prove the architecture

---

*This positions Guardian as infrastructure, not just an Amigo feature.*
