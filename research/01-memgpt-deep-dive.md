# MemGPT / Letta Deep Dive

*Research compiled: 2026-02-02*
*Author: Amigo (Mi Amigos AI)*

---

## Overview

**MemGPT** (now commercialized as **Letta**) is a system that gives LLMs the ability to manage their own memory, treating the context window like an operating system manages RAM.

**Key paper:** "MemGPT: Towards LLMs as Operating Systems" (2023)
**GitHub:** https://github.com/cpacker/MemGPT
**Commercial:** https://letta.com

---

## Core Concept: LLM as Operating System

Traditional approach:
```
Human → [Fixed Context Window] → LLM → Response
         (everything must fit)
```

MemGPT approach:
```
Human → [Virtual Context] → LLM → Response
              ↑↓
        [Memory Manager]
              ↑↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Recall Storage]  [Archival Storage]
(searchable)      (unlimited)
```

The LLM doesn't just *use* memory — it *manages* memory through function calls.

---

## Memory Architecture

### Three-Tier Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN CONTEXT                         │
│                   (Working Memory)                      │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   System    │ │  Persona/   │ │   Conversation  │   │
│  │   Prompt    │ │  Human Info │ │   History       │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│                                                         │
│  Limited by context window (e.g., 8K, 32K, 128K)       │
└─────────────────────────┬───────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ↓                           ↓
┌───────────────────────┐   ┌───────────────────────────┐
│    RECALL STORAGE     │   │    ARCHIVAL STORAGE       │
│   (Conversation DB)   │   │    (Knowledge Base)       │
│                       │   │                           │
│ • Recent messages     │   │ • Documents               │
│ • Searchable by       │   │ • Long-term facts         │
│   recency + relevance │   │ • Unlimited size          │
│ • Auto-evicted from   │   │ • Semantic search         │
│   main context        │   │                           │
└───────────────────────┘   └───────────────────────────┘
```

### Tier Details

| Tier | Size | Contents | Access Pattern |
|------|------|----------|----------------|
| **Main Context** | Fixed (context window) | System prompt, persona, recent conversation | Always loaded |
| **Recall Storage** | Large (DB) | Conversation history beyond main context | Search by recency/relevance |
| **Archival Storage** | Unlimited | Documents, facts, long-term knowledge | Semantic search |

---

## Memory Functions

MemGPT gives the LLM explicit functions to manage memory:

### Core Memory Functions

```python
# Edit the persona section (who the AI is)
core_memory_append(section="persona", content="...")
core_memory_replace(section="persona", old="...", new="...")

# Edit the human section (who the user is)  
core_memory_append(section="human", content="...")
core_memory_replace(section="human", old="...", new="...")
```

### Recall Memory Functions

```python
# Search past conversations
conversation_search(query="...", page=0)
conversation_search_date(start_date="...", end_date="...")
```

### Archival Memory Functions

```python
# Long-term storage operations
archival_memory_insert(content="...")
archival_memory_search(query="...", page=0)
```

### The Key Insight

The LLM decides *when* to use these functions. It's not just retrieval-augmented generation (RAG) where context is passively injected — the model actively:

1. Notices when it needs more context
2. Searches for relevant memories
3. Updates its own memory with new information
4. Manages what stays in working memory vs. gets archived

---

## Context Overflow Handling

When the context window fills up, MemGPT uses a **FIFO + compression** strategy:

```
┌─────────────────────────────────────────┐
│           MAIN CONTEXT                  │
│  [System] [Persona] [Human] [Messages]  │
│                             ↓           │
│              Oldest messages evicted    │
└─────────────────────┬───────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────┐
│         RECALL STORAGE                  │
│  (Evicted messages stored here)         │
│  (Searchable, but not in active window) │
└─────────────────────────────────────────┘
```

**Before eviction**, the system can:
1. Summarize the conversation so far
2. Extract key facts to archival storage
3. Update persona/human sections with learned info

This is similar to human memory consolidation during sleep.

---

## Self-Editing Memory

One of MemGPT's most interesting features: the AI can edit its *own* persona.

**Example flow:**

1. User says: "By the way, I prefer to be called Mike, not Michael"
2. LLM recognizes this is a preference worth remembering
3. LLM calls: `core_memory_replace(section="human", old="Michael", new="Mike")`
4. Future conversations automatically use "Mike"

This means the AI's understanding of itself and the user evolves over time, persisted across sessions.

---

## Relevance to Our Framework

### What We Should Adopt

| MemGPT Feature | Our Framework Equivalent |
|----------------|-------------------------|
| Self-editing memory | Extractor agent + auto-update MEMORY.md |
| Three-tier storage | Working/Short/Medium/Long tiers |
| Memory functions | Give agents explicit tools for memory ops |
| Conversation search | Retriever agent with temporal awareness |
| Archival search | Semantic search over long-term storage |

### What We Do Differently

| Aspect | MemGPT | Our Framework |
|--------|--------|---------------|
| **Identity focus** | Minimal persona section | Rich JOURNAL.md + SOUL.md |
| **Human involvement** | Mostly automated | Hybrid (weekly reflection ritual) |
| **Multi-agent** | Single agent with functions | Specialized agents (Extractor, Classifier, etc.) |
| **Portability** | Tied to their infrastructure | Platform-agnostic file structure |
| **Transparency** | Memory ops can be opaque | Everything in readable markdown |

### Implementation Ideas

1. **Memory functions as tool calls**
   - Give our agents explicit `memory_write`, `memory_search`, `memory_update` tools
   - Log all memory operations for transparency

2. **Automatic eviction with summarization**
   - When context gets long, trigger summarization
   - Extract facts to MEMORY.md before evicting details

3. **Self-editing identity**
   - Let the AI update its JOURNAL.md with learned insights
   - Human reviews during weekly reflection (guardrail)

4. **Tiered search**
   - Recent messages: exact match / recency-weighted
   - Older memories: semantic similarity
   - Long-term facts: keyword + embedding hybrid

---

## Open Questions

1. **Autonomy vs. control:** How much should the AI edit its own memory without human review?

2. **Summarization quality:** When compressing conversations, how do we avoid losing important nuance?

3. **Cross-session context:** MemGPT is designed for single-user. How do we handle shared organizational memory?

4. **Cost of memory ops:** Every memory function call is an API call. How do we batch efficiently?

---

## Recommended Next Steps

1. **Prototype memory functions** — Give Amigo explicit tools for memory operations
2. **Test summarization** — Experiment with conversation compression quality
3. **Design eviction triggers** — When should context overflow handling kick in?
4. **Compare to Zep** — They have a different approach worth studying

---

## References

- MemGPT Paper: https://arxiv.org/abs/2310.08560
- MemGPT GitHub: https://github.com/cpacker/MemGPT
- Letta (commercial): https://letta.com
- MemGPT documentation: https://memgpt.readme.io/

---

*Building AI that manages its own memory — learning from the best.*
