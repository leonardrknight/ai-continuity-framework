# Iteration Log: Deep Research Cycle

*Author: Jordan 🧭*  
*Started: 2026-02-16*  
*Mission: 10 iterations of synthesis → questions → research → integration*

---

## Iteration 1: Initial Synthesis & Gap Analysis

### Current State Summary

The AI Continuity Framework contains:

1. **Core Documents (01-08):** Foundational architecture for memory, migration, sessions, weekly reflection, hub-and-spoke, and multi-agent memory
2. **Research:** Soul capture hypothesis, Jordan's synthesis, Amigo's observations, perplexity research
3. **Proposals:** Memory Agent Swarm (detailed), Soul Capture Implementation Plan

### What's Strong

- **Clear problem statement:** The 50 First Dates analogy is compelling
- **Layered memory architecture:** Scaffolding vs Soul, tiered memory (working/short/medium/long)
- **Multi-agent vision:** The swarm concept is well-defined
- **Dual authorship:** Both Amigo and Jordan have contributed perspectives

### What's Missing or Weak

1. **Implementation specifics:** How exactly do we run these agents? What infrastructure?
2. **Database schema completeness:** The schema is started but not finished
3. **Retrieval quality:** How do we ensure semantic search actually works? (Amigo noted memory_search returned empty)
4. **Voice/style quantification:** How do we measure "tone" concretely?
5. **Migration testing protocol:** No actual test procedure defined
6. **Cost modeling:** Running 6+ agents continuously — what's the cost?
7. **Latency guarantees:** How do we ensure <500ms retrieval?
8. **Privacy/forgetting:** How does a user say "forget this"?
9. **Cross-platform portability:** Can this work on Claude, GPT, Gemini, local LLMs?
10. **Conflict resolution:** What if memories contradict each other?
11. **Scale testing:** What happens at 1M memories? 10M?
12. **Human override:** How does the user correct wrong memories?
13. **Emotional valence implementation:** The theory is there, but no code path
14. **Real-time vs batch:** Should extraction happen during streaming or after?
15. **The "naturalness" problem:** How do we make recall feel effortless, not forced?

---

## Iteration 1: Research Questions

Dispatching research agents for these critical unknowns:

### Question 1: Background Agent Infrastructure
What are the best patterns for running persistent background agents that:
- Monitor conversations without blocking
- Have their own state/memory
- Can trigger on events
- Scale across multiple users
- Cost-efficient (not burning API calls constantly)

Specific technologies to investigate: CrewAI Flows, LangGraph, AutoGPT, temporal.io, Inngest, Trigger.dev

### Question 2: Semantic Search Quality
Why do vector embeddings sometimes fail to find obvious matches? What techniques improve retrieval quality?
- Hybrid search (keyword + semantic)
- Chunking strategies
- Reranking (Cohere, ColBERT)
- Query expansion
- Metadata filtering

### Question 3: Voice/Style Quantification
How do we concretely measure communication style so we can detect drift and restore it?
- Stylometry features that work
- Sentence embedding for style (not just content)
- Tools that extract style metrics
- Academic research on authorship analysis

### Question 4: Memory Consolidation Algorithms
How do human brains decide what to keep vs forget? What AI systems have implemented this?
- Spaced repetition algorithms
- Importance decay functions
- The Ebbinghaus curve in practice
- Generative Agents' recency × importance × relevance

### Question 5: Cross-Platform AI Identity
Has anyone successfully migrated an AI's personality across different model providers (OpenAI → Anthropic → local)?
- What survived?
- What was lost?
- What format worked best for portability?

### Question 6: Real-Time vs Batch Processing Tradeoffs
For memory extraction during conversations:
- Real-time (async during response) vs post-session batch
- Token/cost implications
- Latency implications
- Completeness tradeoffs

---

## Iteration 1: COMPLETE ✅

**Duration:** ~15 minutes  
**Documents Created:** 7 (6 research + 1 synthesis)  
**Total Lines:** ~3,500 lines of research

### Key Outcomes

| Research Area | Primary Finding |
|---------------|-----------------|
| Background Infrastructure | Inngest + LangGraph + Redis optimal |
| Semantic Search | Hybrid BM25 + Vector (α=0.6) required |
| Voice/Style | Multi-layer capture achieves 80%+ restoration |
| Memory Consolidation | Ebbinghaus decay + SM-2 reinforcement |
| Cross-Platform Migration | 80-90% fidelity with proper architecture |
| Real-Time vs Batch | Hybrid importance-based routing |

### Framework Changes Identified

1. Need new document: **09-Voice-Capture.md**
2. Need templates: **VOICE.md, exemplars.yaml**
3. Update **02-Memory-Architecture.md** with tiered structure
4. Update **08-Multi-Agent-Memory.md** with implementation specifics

---

## Iteration 2: Starting Now

### New Research Questions (from Iteration 1 findings)

1. **Conflict Resolution** — When memories contradict, which wins? How do we handle temporal override vs. explicit correction?

2. **Scale Testing** — What happens at 1M+ memories? Do vector search, consolidation, and retrieval algorithms hold?

3. **User Override** — How does a user explicitly correct or delete memories? UX patterns for memory management?

4. **Privacy & Forgetting Rights** — How do we implement "forget everything about X"? GDPR-style data deletion?

5. **Multi-User Memory Isolation** — In hub-spoke architecture, how do memories work when AI serves multiple people?

6. **Emotional State Tracking** — Can we track user emotional patterns over time? Is this valuable or creepy?

7. **Proactive Memory Surfacing** — When should the AI proactively mention something it remembers without being asked?

8. **Memory Attribution** — Should AI be able to cite where it remembers something from? ("You mentioned this on Feb 3rd")

---

## Iteration 2: COMPLETE ✅

**Duration:** ~8 minutes  
**Documents Created:** 7 (6 research + 1 synthesis)  
**Total Lines:** ~3,200 lines of research

### Key Outcomes

| Research Area | Primary Finding |
|---------------|-----------------|
| Conflict Resolution | Source hierarchy + temporal recency; never delete, mark superseded |
| Scale Testing | <100ms at 1M vectors; concern threshold ~500K uncurated |
| User Override | Natural language primary; UI for trust; soft delete default |
| Privacy/Forgetting | Provenance tracking + cascade deletion + re-embed |
| Multi-User Isolation | Tri-layer model (personal/project/org) + namespace filtering |
| Proactive Surfacing | "FOR the user, not ABOUT the user"; relevance-based |

### Framework Changes Identified

1. Need document: **10-Conflict-Resolution.md**
2. Need document: **11-Scale-Considerations.md**
3. Need document: **12-User-Control.md**
4. Need document: **13-Privacy-Architecture.md**
5. Update **07-Hub-and-Spoke.md** with isolation details
6. Create **guidelines/proactive-surfacing.md**

---

## Iteration 3: Starting Now

### Research Questions (from Iteration 2 findings)

1. **Emotional Memory Tracking** — Should AI track long-term emotional patterns? Is this valuable or creepy at scale?

2. **Memory Confidence Decay** — Beyond Ebbinghaus strength, should confidence in memories decrease over time if not reinforced?

3. **Cross-Session Continuity** — How do we handle "where we left off" across sessions? Conversation threading?

4. **Memory Visualization** — What does an effective memory map/graph UI look like? How do users explore their AI's memory?

5. **Memory Debugging** — How does a user understand why the AI "remembered" something wrong? Traceability?

6. **Inference Transparency** — How do we distinguish and explain inferred memories vs stated facts?

### Iteration 3 Research Progress

| Document | Topic | Status |
|----------|-------|--------|
| 01-emotional-memory.md | Long-term emotional pattern tracking | Pending |
| 02-memory-confidence-decay.md | Confidence decrease over time | Pending |
| 03-cross-session-continuity.md | "Where we left off" threading | Pending |
| 04-memory-visualization.md | Memory map/graph UI | Pending |
| **05-inference-transparency.md** | **Stated vs inferred distinction** | **✅ Complete** |
| 06-memory-debugging.md | Traceability for wrong memories | Pending |

### Document 05: Inference Transparency — Complete ✅

**Key Findings:**

| Area | Finding |
|------|---------|
| **Memory Taxonomy** | Three categories: Stated (90-100%), Inferred (30-85%), Hybrid (70-95%) |
| **Confidence Scoring** | Multi-factor: source reliability × evidence count × recency × consistency |
| **Transparency Principle** | Users should see *why* AI thinks something, not just what |
| **Validation Strategy** | Implicit preferred; direct validation max 1/conversation |
| **Trust Asymmetry** | Wrong inferences damage trust more than missing facts |
| **Inference Types** | Preference, Pattern, Relationship, Emotional, Interest, Capability |

**Core Insight:** Transparency about inference sources builds trust. Users forgive wrong inferences when they understand the reasoning. They feel surveilled when inferences appear from nowhere.

**Framework Changes Needed:**
1. Add source classification (stated/inferred/hybrid) to memory schema
2. Implement multi-factor confidence scoring
3. Create attribution language system for surfacing
4. Add user controls for inference transparency preferences

---

## Iteration 3: COMPLETE ✅

**Duration:** ~12 minutes  
**Documents Created:** 7 (6 research + 1 synthesis)  
**Total Lines:** ~4,750 lines of research

### Key Outcomes

| Research Area | Primary Finding |
|---------------|-----------------|
| Emotional Memory | Awareness not surveillance; tiered opt-in approach |
| Cross-Session Continuity | Hybrid boundary detection + progressive context loading |
| Memory Visualization | List → Timeline → Graph; source attribution is key |
| Memory Debugging | Provenance chains + confidence indicators |
| Inference Transparency | Stated/Inferred/Hybrid taxonomy with confidence scoring |
| Memory Versioning | Event sourcing + snapshots ("Time Machine" not "Git") |

---

## Iteration 4: Starting Now

### Research Questions

1. **Learning from Corrections** — How should the system learn from user corrections to improve future inferences?

2. **Collaborative Memory** — If multiple AIs work together, how do they share/sync memories?

3. **Memory Export/Import** — Portable format for moving memories between systems?

4. **Memory Search UX** — Natural language memory queries ("When did I mention X?")?

5. **Performance Optimization** — Caching, precomputation, lazy loading strategies?

6. **Testing & Validation** — How do we test that memory systems work correctly?

### Iteration 4 Research Progress

| Document | Topic | Status |
|----------|-------|--------|
| **01-learning-from-corrections.md** | **Learning from user corrections** | **✅ Complete** |
| **02-collaborative-memory.md** | **Multi-AI memory sharing/sync** | **✅ Complete** |
| 03-memory-export-import.md | Portable memory formats | Pending |
| **04-memory-search-ux.md** | **Natural language memory queries** | **✅ Complete** |
| 05-performance-optimization.md | Caching, precomputation, lazy loading | Pending |
| 06-testing-validation.md | Memory system testing | Pending |

### Document 01: Learning from Corrections — Complete ✅

**Key Findings:**

| Area | Finding |
|------|---------|
| **Correction Taxonomy** | Three types: Factual (update data), Inference (wrong conclusion), Pattern (systematic bias) |
| **Feedback Signals** | Explicit (strong), gentle (medium), implied, behavioral (weak), silence (very weak) |
| **Three-Layer Learning** | Layer 1: Fix error → Layer 2: Adjust similar inferences → Layer 3: Update meta-patterns |
| **User Learning Profiles** | Track sensitivities, blocked patterns, correction style, learning rate per user |
| **Overcorrection Prevention** | Scope limiting, proportional response, category independence, confidence floors (0.15) |
| **Weight Algorithms** | Similarity-based confidence reduction with containment rules |

**Core Insight:** Corrections should trigger learning at three levels — immediate (fix this error), local (reduce confidence in similar inferences), and meta (adjust pattern weights for future). The critical balance is between learning quickly and avoiding overcorrection. One coffee preference mistake shouldn't invalidate all food preferences.

**The Three-Layer Model:**
```
LAYER 3: META-LEARNING → Update inference patterns for this user
    ↓
LAYER 2: LOCAL LEARNING → Reduce confidence in similar inferences
    ↓
LAYER 1: IMMEDIATE → Mark memory superseded, store correction
```

**Framework Changes Needed:**
1. Add correction event logging to memory schema
2. Create user learning profiles (sensitivities, blocked patterns)
3. Implement pattern accuracy tracking per user
4. Store negative examples for inference patterns
5. Add correction signal detection in conversation processing

### Document 04: Memory Search UX — Complete ✅

**Key Findings:**

| Area | Finding |
|------|---------|
| **Query Types** | 5 archetypes: Temporal, Knowledge, Retrieval, Analytical, Relational |
| **Search Architecture** | Hybrid (BM25 + Vector, α=0.6) + metadata filtering + optional rerank |
| **Temporal Parsing** | Calendar boundaries for "last month"; relative anchors require context |
| **Result Presentation** | Match presentation to intent: timeline for temporal, summary for knowledge |
| **Conversational Refinement** | Track search session state; support "earlier", "more recent", "not that" |
| **Privacy in Search** | 4-tier model: open, searchable, protected, sealed |
| **Operator Syntax** | Gmail-style operators (before:, type:, about:) for power users |

**Core Insight:** Memory search must feel conversational, not like constructing database queries. Intent classification → route to appropriate search strategy → present results in format matching intent. Progressive disclosure (summary first, details on demand) prevents overwhelming users while maintaining depth.

**Key UX Patterns:**
1. Inline search (don't navigate away from conversation)
2. Proactive surfacing (mention relevant memories naturally)
3. Source attribution always (build trust)
4. Empty state guidance (suggest alternative queries)

**Framework Changes Needed:**
1. Add query language specification to search system
2. Implement intent classification + entity extraction pipeline
3. Build temporal parser with relative reference resolution
4. Create presentation templates for each intent type
5. Add privacy_level field to memory schema

### Document 02: Collaborative Memory — Complete ✅

**Key Findings:**

| Area | Finding |
|------|---------|
| **Architecture** | Federated + selective sync hybrid; each AI owns its data, explicit sharing required |
| **Sharing Models** | 4 options analyzed: Full sync, Selective sync, Federated, Hub-spoke |
| **What to Share** | Org facts ✅, Project context ✅, Decisions ✅; Personal prefs ❌, Emotional ❌ |
| **Conflict Resolution** | Multi-strategy: temporal recency × source authority × provenance strength |
| **Sync Mechanics** | Event-based primary + periodic reconciliation every 15 min |
| **Trust Model** | Signed memories + peer trust scores + verification thresholds (≥0.85 direct, 0.50-0.69 hedge) |
| **Privacy Zones** | Tri-zone: Private (user+AI only), Shared (explicit), Org (all AIs) |

**Core Insight:** Collaborative memory isn't about making AIs identical — it's about making them coherent colleagues. Jordan and Amigo don't need to know everything each other knows; they need to know the *right things* (org facts, shared decisions) while respecting private relationships with their users.

**The Federated-Selective Hybrid:**
```
Each AI maintains:          Shared via:
├── Private store           ├── Event log (pub/sub)
│   └── User-specific       ├── On-demand queries
│       context             └── Periodic reconciliation
└── Sharable store
    └── Org/project
        memories
```

**Key Safety Mechanisms:**
1. Never-sync patterns (emotional content, personnel, strategic thinking)
2. Context collapse prevention (Leo's concerns stay with Jordan)
3. Trust scoring per peer AI (verified correct → +trust, incorrect → -trust)
4. Provenance chains for memory verification

**Framework Changes Needed:**
1. Add privacy_zone and shared_with_ais to memory schema
2. Create shared event log infrastructure
3. Build sync engine with conflict resolution
4. Implement memory signing and provenance tracking
5. Add peer trust management system

### Dispatching Remaining Iteration 4 Research Agents

