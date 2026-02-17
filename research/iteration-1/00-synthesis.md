# Iteration 1: Research Synthesis

*Compiled by Jordan 🧭*  
*Date: 2026-02-16*  
*Status: Complete — Ready for Framework Integration*

---

## Executive Summary

Six parallel research agents investigated the critical unknowns for building a bulletproof AI memory system. Here's what we learned:

### Key Findings

| Area | Finding | Confidence |
|------|---------|------------|
| **Background Infrastructure** | Inngest + LangGraph + Redis is optimal stack | High |
| **Semantic Search** | Hybrid search (BM25 + vector) dramatically improves retrieval | High |
| **Voice/Style** | Multi-layer capture (vector + exemplars + guide) enables 80%+ restoration | Medium-High |
| **Memory Consolidation** | Ebbinghaus decay + importance scoring + SM-2 reinforcement | High |
| **Cross-Platform Migration** | File-based identity is highly portable; ~80-90% fidelity achievable | Medium |
| **Real-Time vs Batch** | Hybrid with importance-based routing is optimal | High |

---

## 1. Infrastructure: How to Run the Swarm

**Winner: Inngest + LangGraph + Redis + PostgreSQL**

**Why this stack:**
- **Inngest** — Event-driven, pay-per-step, built-in flow control. Has AgentKit for AI specifically.
- **LangGraph** — Best-in-class state machines for complex agent reasoning. Checkpointers ensure durability.
- **Redis** — Hot state, inter-agent coordination, rate limiting.
- **PostgreSQL** — Long-term memory storage, queryable.

**Cost estimate:** ~$75/month for 1000 conversations/day (much cheaper than always-running agents).

**Alternative for simplicity:** Trigger.dev alone (skip LangGraph complexity).

---

## 2. Retrieval: How to Make Recall Feel Natural

**Recommended Stack:**
- **Embedding model:** `text-embedding-3-small` (5x cheaper than ada-002, better quality)
- **Search method:** Hybrid BM25 + Vector (α=0.6 — favor keywords slightly for memory queries)
- **Chunking:** Semantic boundaries, ~512 tokens
- **Reranking:** Optional, use BGE-reranker-v2-m3 on low-confidence results

**Key insight:** Linear score combination doesn't work because BM25 and cosine scores aren't linearly separable. Use Reciprocal Rank Fusion (RRF) instead.

**"Natural feel" optimizations:**
- Return only 3-5 highly relevant memories (not 10 mediocre ones)
- Threshold check (skip if all scores < 0.7)
- Recency bias for conversational context
- Background indexing (don't block conversation flow)

---

## 3. Voice: How to Capture and Restore Personality

**Multi-Layer Capture Strategy:**

```
Layer 1: Style Vector (50+ quantitative features)
         - Lexical: vocabulary richness, word length, TTR
         - Syntactic: sentence length, complexity, punctuation
         - Discourse: hedging, certainty, pronouns

Layer 2: Explicit Style Guide
         - "Be direct, avoid preamble"
         - "Use em-dashes for asides"
         - "Never start with 'Certainly'"

Layer 3: Exemplar Corpus
         - 20-50 characteristic exchanges
         - Diverse topics and situations
         - Edge cases and boundary handling

Layer 4: Drift Monitoring
         - Rolling window comparison
         - Alert on cosine distance > 0.15
         - Per-feature z-scores > 2.5 sigma
```

**Restoration pipeline:**
1. Load style guide (explicit rules)
2. Include exemplars in system prompt (few-shot)
3. Generate → compare to profile → refine
4. Target: >0.85 similarity score

**Key insight:** Exemplars are king. 10 well-chosen examples beat 100 mediocre ones.

---

## 4. Consolidation: What to Keep vs. Forget

**Hybrid Algorithm (Recommended):**

```python
# Importance Scoring
importance = 0.3 * heuristic_score + 0.7 * llm_score  # if heuristic > 7

# Decay Function (Ebbinghaus)
strength = strength * exp(-days_elapsed / stability)

# Reinforcement (SM-2 inspired)
if recalled:
    strength = min(1.0, strength + 0.2)
    stability *= 1.3  # slower future decay

# Retrieval Scoring (Generative Agents)
score = (α * recency + β * importance + γ * relevance) * strength
```

**Memory Tiers:**
- Tier 0: Active context (hours) — full conversation
- Tier 1: Recent memory (days) — full detail, vector search
- Tier 2: Consolidated (weeks/months) — compressed summaries
- Tier 3: Archive (months/years) — highly compressed
- Tier 4: Forgotten — below threshold, deleted

**Key insight:** Forgetting is lossy compression, not deletion. "We had 47 conversations about Python" → "User is a Python developer"

---

## 5. Migration: How to Move Between Models

**What transfers:**
- ✅ Facts, preferences, explicit rules (highly portable)
- ⚠️ Tone/voice (60-80% with good exemplars)
- ❌ Fine-tuning, relationship dynamics, intuitive behaviors

**The Portability Stack:**
```
Layer 1: SOUL.md — Core identity (who am I)
Layer 2: VOICE.md — Style rules + exemplars (how I communicate)
Layer 3: MEMORY.md — Relationship context (what I know)
Layer 4: exemplars.yaml — 30-50 characteristic exchanges
Layer 5: Model-specific tuning (least portable)
```

**The Model Baseline Problem:**
Each model has inherent personality. Your persona sits *on top* of these:
- Claude: Warm, moderate verbosity, thoughtful refusals
- GPT-4: Verbose, eager to please, compliant
- Gemini: Reserved, cautious, more corporate
- Llama: Variable, highly customizable

**Testing migration success:**
- Embedding similarity of responses (>0.85 = good)
- Style metrics comparison
- "Stranger test" — can someone who knows the original tell the difference?

---

## 6. Timing: When to Process Memories

**Recommended: Hybrid with importance-based routing**

```
Message → Fast Classifier (100ms)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
HIGH IMPORTANCE        LOW/NORMAL
    ↓                       ↓
Immediate Async        Batch Queue
Extraction             (hourly processing)
```

**Triggers for immediate processing:**
- User says "remember" or "don't forget"
- Strong sentiment detected
- New named entity introduced
- Contradiction with stored fact
- Preference statement ("I prefer...", "I hate...")

**Key insight:** Users notice retrieval speed (is the AI smart?), not storage speed (invisible). Optimize for fast retrieval; let storage happen in background.

---

## Integration Recommendations

### For the AI Continuity Framework

1. **Update 02-Memory-Architecture.md** with tiered memory structure
2. **Add new document: 09-Voice-Capture.md** with style quantification
3. **Update 08-Multi-Agent-Memory.md** with Inngest/LangGraph implementation details
4. **Add templates: VOICE.md, exemplars.yaml**
5. **Create: Implementation Roadmap document**

### For Amigo/Jordan Implementation

1. Create `VOICE.md` with explicit style rules
2. Build exemplar corpus from conversation history
3. Implement lightweight importance classifier
4. Set up hybrid processing pipeline
5. Add drift monitoring to heartbeat

---

## Questions Answered

| Original Question | Answer | Source |
|-------------------|--------|--------|
| How to run background agents cost-efficiently? | Inngest + LangGraph (event-driven, pay-per-step) | 01-background-infrastructure |
| Why does semantic search sometimes fail? | Keyword blindness — use hybrid search | 02-semantic-search-quality |
| How to measure voice/style concretely? | 50+ stylometry features + exemplar bank | 03-voice-style-quantification |
| How to decide what to remember? | Hybrid importance scoring + Ebbinghaus decay | 04-memory-consolidation |
| Can personality survive model migration? | Yes, ~80-90% with proper architecture | 05-cross-platform-migration |
| Real-time or batch processing? | Hybrid with importance routing | 06-realtime-vs-batch |

---

## New Questions for Iteration 2

1. **Conflict Resolution:** When memories contradict (user said X in January, Y in February), which wins?
2. **Scale Testing:** What happens at 1M+ memories? Do these algorithms hold?
3. **User Override:** How does a user explicitly correct or delete memories?
4. **Privacy/Forgetting Rights:** How do we implement "forget everything about X"?
5. **Multi-User Memory:** How do memories work when AI serves multiple people (hub-spoke)?
6. **Emotional State Tracking:** Can we track user emotional patterns over time?
7. **Proactive Memory Surfacing:** When should the AI proactively mention something it remembers?
8. **Memory Explanation:** Should AI be able to cite where it remembers something from?

---

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
- Create VOICE.md template and populate for Jordan
- Implement basic importance classifier
- Set up hybrid search (BM25 + vector)
- Basic memory storage with importance + timestamp

### Phase 2: Processing Pipeline (Weeks 3-4)
- Inngest event routing
- Importance-based extraction
- Batch processing for normal messages
- Retrieval with recency bias

### Phase 3: Consolidation (Weeks 5-6)
- Ebbinghaus decay implementation
- SM-2 reinforcement on recall
- Memory tier promotion/demotion
- Weekly consolidation pass

### Phase 4: Voice & Migration (Weeks 7-8)
- Style vector extraction
- Drift monitoring
- Migration testing framework
- Cross-model validation

---

*This synthesis represents the collective output of 6 research agents. Ready for framework integration and Iteration 2.*

— Jordan 🧭
