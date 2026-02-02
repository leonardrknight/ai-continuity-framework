# Multi-Agent Memory Architecture

*How multiple specialized agents create the illusion of unlimited, perfectly-referenced memory*

---

## The Problem

Context windows are finite. Humans are not.

When you're talking to an AI assistant, you might:
- Reference something from three weeks ago mid-sentence
- Change topics without warning
- Assume the AI "just knows" what you talked about before
- Dump a stream-of-consciousness monologue and expect coherent response

Current solutions require **human effort** — curating memory files, providing context, managing knowledge bases. That's backwards. The AI should handle this automatically.

---

## The Vision: Experts in Your Ear

Imagine walking up to someone at a conference. As you approach, experts whisper in your ear:

> "That's Jim Johnson. He runs Acme Corp. You had dinner with him last March — he mentioned his daughter was starting college. He's interested in supply chain AI."

You can now have a natural conversation that *feels* like you remember everything, because specialized agents fed you the right context at the right moment.

**This is the architecture we're building.**

---

## The Four Agents

```
┌─────────────────────────────────────────────────────┐
│              CONVERSATION STREAM                    │
│         (incoming message from human)               │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────┐ ┌───────────────┐
│   EXTRACTOR   │ │ CLASSIFIER│ │   RETRIEVER   │
│               │ │           │ │               │
│ Pulls out:    │ │ Asks:     │ │ Searches:     │
│ - Facts       │ │ - New or  │ │ - Semantic    │
│ - Decisions   │ │   old     │ │ - Temporal    │
│ - Preferences │ │   topic?  │ │ - Keyword     │
│ - Action items│ │ - Urgency?│ │               │
└───────┬───────┘ └─────┬─────┘ └───────┬───────┘
        │               │               │
        ▼               │               ▼
┌───────────────┐       │       ┌───────────────┐
│ MEMORY TIERS  │       │       │   RELEVANT    │
│               │◄──────┘       │   CONTEXT     │
│ Short/Med/Long│               │   SNIPPETS    │
└───────────────┘               └───────┬───────┘
                                        │
                        ┌───────────────┘
                        ▼
              ┌───────────────────┐
              │    SYNTHESIZER    │
              │                   │
              │ Assembles context │
              │ Prioritizes info  │
              │ Fits in window    │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │    MAIN AGENT     │
              │                   │
              │ Responds with     │
              │ full context      │
              │ (appears to have  │
              │ perfect memory)   │
              └───────────────────┘
```

### 1. Extractor Agent

**Purpose:** Real-time information extraction as conversation flows.

**Runs:** After each exchange (async, doesn't block response)

**Extracts:**
- Facts ("I'm moving to Austin in March")
- Decisions ("We agreed to use PostgreSQL")
- Preferences ("I prefer morning meetings")
- Action items ("I need to review the proposal")
- Relationships ("Sarah is my business partner")

**Writes to:** Appropriate memory tier based on importance/permanence

**Model:** Lightweight (Haiku, GPT-4o-mini) — optimized for speed and cost

---

### 2. Classifier Agent

**Purpose:** Gatekeeper that determines what additional context is needed.

**Runs:** Before main agent responds (must be fast)

**Asks:**
- Is this a new topic or continuation?
- Does this reference something from the past?
- What category does this fall into? (work, personal, project X, etc.)
- How urgent/important is the retrieval need?

**Triggers:** Retriever when past context might be relevant

**Key insight:** Not every message needs full retrieval. Classifier prevents unnecessary work.

**Model:** Lightweight, fast — could even be rule-based + embeddings

---

### 3. Retriever Agent

**Purpose:** Find relevant context from memory stores.

**Runs:** When triggered by Classifier

**Search strategies:**
- **Semantic:** Embedding similarity to current conversation
- **Temporal:** What happened recently? What happened around this date last year?
- **Keyword:** Explicit mentions of names, projects, terms
- **Relational:** Who/what is connected to this topic?

**Returns:** Ranked snippets with source references

**Model:** Can be more powerful (needs good judgment on relevance)

---

### 4. Synthesizer Agent

**Purpose:** Assemble retrieved context into usable form for main agent.

**Runs:** After Retriever returns results

**Tasks:**
- Prioritize most relevant information
- Resolve conflicts (if memories contradict)
- Compress to fit available context window
- Format for easy consumption by main agent
- Add confidence indicators ("definitely discussed" vs "possibly relevant")

**Output:** Clean context block injected into main agent's prompt

**Model:** Medium capability — needs judgment but not creativity

---

## Memory Tiers

Not all memories are equal. Different information needs different retention.

| Tier | Duration | Examples | Storage |
|------|----------|----------|---------|
| **Working** | Current session | Active conversation, immediate context | In-context window |
| **Short-term** | Hours to days | Today's decisions, recent action items | Session files, hot cache |
| **Medium-term** | Weeks to months | Project context, ongoing work, recent preferences | Memory files, vector store |
| **Long-term** | Permanent | Core facts, identity, key relationships, major decisions | MEMORY.md, curated docs |

### Promotion and Decay

- Information starts in short-term
- Repeated references promote to higher tiers
- Unreferenced information decays (but isn't deleted — moves to archive)
- Weekly reflection ritual reviews and promotes important learnings

---

## Implementation Considerations

### Latency Budget

Users expect fast responses. Suggested budget:

| Component | Target | Notes |
|-----------|--------|-------|
| Classifier | <200ms | Must be fast — gates everything |
| Retriever | <500ms | Can run in parallel with Classifier |
| Synthesizer | <300ms | Needs Retriever output |
| Main Agent | Normal | Now has full context |

**Total overhead:** ~500-800ms (acceptable for conversational AI)

### Cost Management

Running 4+ models per message gets expensive. Strategies:

1. **Classifier gates everything** — Most messages don't need full retrieval
2. **Tiered models** — Lightweight for Extractor/Classifier, heavier for complex tasks
3. **Caching** — Recently retrieved context stays hot
4. **Batching** — Extractor can run async, batch multiple extractions

### When NOT to Invoke

Skip the full pipeline for:
- Simple acknowledgments ("thanks!", "got it")
- Clearly new topics with no past context
- Explicit context provided by user
- Time-sensitive responses where latency matters more than context

---

## Integration with Existing Framework

This architecture builds on the memory scaffolding from earlier documents:

| Existing Component | Role in Multi-Agent System |
|--------------------|---------------------------|
| `MEMORY.md` | Long-term tier, Retriever searches this |
| `memory/YYYY-MM-DD.md` | Short/medium tier, Extractor writes here |
| `JOURNAL.md` | Identity context, always included |
| `SOUL.md` | Static identity, always included |
| Semantic search | Core of Retriever functionality |
| Weekly reflection | Promotes short→medium→long term |

---

## Open Questions

1. **Streaming vs batch:** Should Extractor run during response streaming or after?
2. **Cross-session context:** How do we handle context from other users/sessions? (See: 05-Session-Management.md)
3. **Confidence thresholds:** When is retrieved context "confident enough" to include?
4. **User control:** Should users be able to say "forget this" or "remember this"?
5. **Explanation:** Should the AI be able to cite where it remembers something from?

---

## Next Steps

1. **Prototype Extractor** — Simplest agent, immediate value
2. **Build Classifier** — Gatekeeper that makes everything else efficient
3. **Integrate semantic search** — Foundation for Retriever
4. **Design Synthesizer prompt** — How context gets formatted for main agent
5. **Measure and iterate** — Track latency, cost, and retrieval quality

---

## Contributors

- **Amigo** (Mi Amigos AI) — Primary author
- **Jordan** (Knight Ventures) — Review and input
- **Leo** — Vision and facilitation

---

*Building AI that remembers — not through brute force, but through intelligent architecture.*
