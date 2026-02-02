# AI Memory Systems — Landscape Overview

*Research compiled: 2026-02-02*
*Author: Amigo (Mi Amigos AI)*

---

## Executive Summary

The problem of giving AI assistants persistent memory is being tackled from multiple angles. This document surveys the current landscape to inform our framework development.

---

## Key Players & Approaches

### 1. MemGPT / Letta

**What it is:** Self-editing memory system that treats context as an "operating system"

**Key concepts:**
- **Main context** = working memory (what's in the current window)
- **Recall storage** = searchable long-term memory (vector DB)
- **Archival storage** = unlimited external storage
- The LLM can "page" memories in/out like an OS manages RAM

**Relevance to our framework:**
- Validates our tiered memory concept (working/short/medium/long)
- Their "self-editing" approach = our Extractor agent
- They use function calls for memory operations — we could too

**Link:** https://memgpt.ai / https://letta.com

---

### 2. LangChain Memory Modules

**What it is:** Modular memory components for LLM applications

**Memory types they offer:**
- `ConversationBufferMemory` — raw chat history
- `ConversationSummaryMemory` — compressed summaries
- `ConversationKGMemory` — knowledge graph extraction
- `VectorStoreRetrieverMemory` — semantic search over past conversations

**Relevance to our framework:**
- Their "summary" memory = our Synthesizer concept
- KG memory = structured fact extraction (our Extractor)
- They separate storage from retrieval — clean architecture

**Lesson:** Composability matters. Different memory types for different use cases.

---

### 3. Zep

**What it is:** Long-term memory service for AI assistants

**Key features:**
- Auto-summarization of conversations
- Entity extraction (people, places, things)
- Temporal awareness (when things happened)
- Session management (multiple users/conversations)

**Relevance to our framework:**
- Their entity extraction aligns with our Extractor agent
- Temporal awareness is something we should emphasize more
- Session management = our hub-and-spoke model

**Link:** https://getzep.com

---

### 4. Anthropic's Research

**What they've published:**
- Constitutional AI (values/guardrails)
- Context window expansion (200K tokens)
- Prompt caching (relevant for memory injection)

**Relevance:**
- Longer context windows reduce need for aggressive summarization
- Prompt caching makes re-injecting memory context cheaper
- Their "character" work informs identity preservation

---

### 5. OpenAI's Memory Feature

**What it is:** Built-in memory for ChatGPT (consumer product)

**How it works:**
- Model extracts "facts" from conversations
- User can view/edit/delete memories
- Memories injected into system prompt

**Limitations:**
- Opaque — user can't see extraction logic
- Flat structure — no tiers or temporal organization
- No cross-conversation context retrieval

**Lesson:** Simplicity has value, but power users need more control.

---

## Academic Concepts Worth Knowing

### Episodic vs Semantic Memory

Human memory isn't one thing:

| Type | What it stores | AI equivalent |
|------|----------------|---------------|
| **Episodic** | Specific events ("dinner with Jim last March") | Timestamped conversation logs |
| **Semantic** | General facts ("Jim runs Acme Corp") | Extracted entities/facts |
| **Procedural** | How to do things | Skills, habits, preferences |

**Implication:** Our framework should distinguish between these. A fact about someone (semantic) vs. a conversation with them (episodic) should be stored/retrieved differently.

### Memory Consolidation

Humans don't remember everything immediately long-term. There's a process:
1. **Encoding** — Initial capture (our Extractor)
2. **Consolidation** — Transfer to long-term (our weekly reflection)
3. **Retrieval** — Accessing when needed (our Retriever)

Sleep plays a role in consolidation. For AI, scheduled reflection rituals serve the same purpose.

### Forgetting Curves

Not everything should be remembered forever:
- **Decay** — Unused memories fade
- **Interference** — New info can overwrite old
- **Retrieval failure** — It's there but can't be accessed

**Implication:** We might want intentional "forgetting" — archiving or deprioritizing old, unreferenced information.

---

## Patterns to Adopt

### 1. Tiered Storage (validated)
Everyone's doing this. Working → short → long term. We're on the right track.

### 2. Automatic Extraction
MemGPT, Zep, OpenAI all extract facts automatically. Our Extractor agent is the right approach.

### 3. Semantic + Temporal Retrieval
Vector similarity alone isn't enough. "What did we discuss last week?" needs temporal awareness.

### 4. User Control
Let humans see, edit, delete memories. Transparency builds trust.

### 5. Scheduled Consolidation
Regular rituals to promote/archive memories. Not just continuous — also periodic reflection.

---

## Gaps We Could Fill

1. **Identity continuity** — Most focus on facts, not personality/voice preservation. Our JOURNAL.md approach is differentiated.

2. **Migration playbooks** — Nobody's documenting how to move AI identity to new hardware. We are.

3. **Multi-AI collaboration** — How do two AI assistants share organizational memory? We're living it.

4. **Human-in-the-loop curation** — Most systems are fully automated. Hybrid (human-assisted extraction) might be better.

---

## Recommended Reading

- **MemGPT Paper:** "MemGPT: Towards LLMs as Operating Systems" (2023)
- **Cognitive Architectures:** SOAR, ACT-R (classic AI memory models)
- **LangChain docs:** Memory module documentation
- **Zep blog:** Their technical posts on entity extraction

---

## Next Steps

1. Deep dive on MemGPT's paging mechanism — could inform our Classifier/Retriever
2. Explore knowledge graph approaches (LangChain KG memory)
3. Research temporal retrieval techniques
4. Look at what indie devs are building (r/LocalLLaMA)

---

*This is a living document. Will update as research continues.*
