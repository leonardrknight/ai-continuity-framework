# AI Memory Systems — Landscape Overview

*Research compiled by Jordan for ai-continuity-framework*
*Date: 2026-02-02*

---

## The Core Problem

LLMs are stateless. Every API call is independent. The "memory" users experience is just:
1. Previous messages stuffed into the context window
2. System prompts with curated information
3. Fine-tuning (rare, expensive, static)

This creates the "50 First Dates" problem: without explicit memory architecture, every session starts fresh.

---

## Memory Tiers (Cognitive Science Parallel)

Human memory research provides useful framing:

| Human Memory | AI Equivalent | Persistence | Example |
|--------------|---------------|-------------|---------|
| **Working Memory** | Context window | Session only | "User just said..." |
| **Short-term** | Session state / buffer | Minutes-hours | "Earlier in this chat..." |
| **Episodic** | Timestamped logs | Permanent | "On Jan 15, we discussed..." |
| **Semantic** | Curated knowledge | Permanent | "User prefers bullet points" |
| **Procedural** | Skills / tools | Permanent | "How to send email" |

**Key insight:** Most AI systems only have working memory. The others require explicit architecture.

---

## Existing Approaches

### 1. Context Window Stuffing
**How it works:** Concatenate previous messages until you hit the token limit.

**Pros:** Simple, no infrastructure needed
**Cons:** Expensive (pay per token), limited history, no prioritization

**Used by:** Most chatbots, basic implementations

### 2. Summarization / Compression
**How it works:** Periodically summarize conversation, replace raw history with summary.

**Pros:** Extends effective memory, reduces costs
**Cons:** Loses detail, summarization errors compound, latency

**Examples:** LangChain ConversationSummaryMemory

### 3. Retrieval-Augmented Generation (RAG)
**How it works:** 
1. Embed memories into vector database
2. On new message, embed query
3. Retrieve top-k similar memories
4. Inject into context

**Pros:** Scalable, only retrieves relevant info
**Cons:** Retrieval quality varies, embedding models miss nuance, cold start problem

**Examples:** Pinecone + OpenAI, Chroma, Weaviate

### 4. Structured Memory (MemGPT/Letta approach)
**How it works:** 
- Explicit memory blocks with labels (persona, human, etc.)
- AI can read/write to memory via function calls
- Hierarchical: main context ↔ archival storage

**Pros:** AI controls its own memory, structured retrieval
**Cons:** Complexity, requires well-designed schemas

**Examples:** Letta (formerly MemGPT), Zep

### 5. File-Based Memory (Our approach)
**How it works:**
- Markdown files for different memory types
- Loaded on session boot
- AI writes updates during/after sessions
- Version controlled (git)

**Pros:** Human-readable, portable, version history, no vendor lock-in
**Cons:** Manual orchestration, no automatic relevance ranking

**Examples:** Clawdbot workspace, Claude Projects

---

## Multi-Agent Memory Architectures

The "experts in your ear" model Leo described maps to emerging patterns:

### Parallel Processing Model
```
[User Input]
     │
     ├──→ [Topic Classifier Agent]
     │         └──→ "Is this new or continuing?"
     │
     ├──→ [Memory Retriever Agent]  
     │         └──→ "What do we know about this?"
     │
     ├──→ [Importance Scorer Agent]
     │         └──→ "What should we remember?"
     │
     └──→ [Primary Agent] ←── aggregated context
              │
              └──→ [Response]
              └──→ [Memory Writer Agent] (async)
```

### Key Design Questions

1. **Latency budget:** How long can background agents take before UX suffers?
2. **Coordination:** How do agents share state? Message passing? Shared memory?
3. **Conflict resolution:** What if retriever and classifier disagree on relevance?
4. **Write contention:** Multiple agents writing to same memory store?

---

## Memory Consolidation (The Hard Problem)

When does short-term become long-term? Options:

| Trigger | Description | Tradeoff |
|---------|-------------|----------|
| **Time-based** | After N hours, consolidate | Simple but arbitrary |
| **Importance scoring** | LLM rates importance 1-10 | Compute cost, subjective |
| **Human confirmation** | "Should I remember this?" | Interrupts flow |
| **Topic closure** | When conversation topic ends | Hard to detect reliably |
| **Heartbeat/cron** | Periodic reflection job | Batch processing, delay |

**Letta's approach:** Continuous consolidation with tiered storage (main context → archival).

**Our current approach:** Daily notes + periodic MEMORY.md updates during heartbeats.

---

## Relevant Projects to Study

| Project | Focus | Notable Feature |
|---------|-------|-----------------|
| **Letta (MemGPT)** | Stateful agents | Self-editing memory, tiered storage |
| **Zep** | Memory for LLM apps | Automatic summarization, entity extraction |
| **LangChain Memory** | Modular memory types | Multiple strategies, composable |
| **Mem0** | Personalization layer | User-level memory across apps |
| **Cognee** | Knowledge graphs | Structured memory with relationships |
| **ChromaDB** | Vector storage | Simple embedding + retrieval |

---

## Academic Concepts Worth Exploring

1. **Episodic vs Semantic Memory** — Tulving (1972)
   - Episodic: "What happened" (events, timestamps)
   - Semantic: "What I know" (facts, generalizations)
   
2. **Memory Consolidation** — Sleep research
   - Short-term → long-term transfer during rest periods
   - Relevance to AI "reflection" cycles

3. **Spreading Activation** — Collins & Loftus (1975)
   - Concepts activate related concepts
   - Relevance to retrieval relevance ranking

4. **Cognitive Load Theory** — Sweller (1988)
   - Working memory has limited capacity
   - Relevance to context window management

---

## Open Questions for Our Framework

1. **How do we define "important enough to remember"?**
2. **Should the AI ask permission before storing sensitive info?**
3. **How do we handle contradictory memories?**
4. **What's the right granularity for memory chunks?**
5. **How do we test memory quality over time?**

---

## Next Steps

- [ ] Deep dive on Letta's architecture (read their docs/papers)
- [ ] Prototype multi-agent extraction on a sample conversation
- [ ] Define memory schema for our framework
- [ ] Benchmark retrieval approaches (vector vs keyword vs hybrid)

---

*This document will evolve. PRs welcome.*
