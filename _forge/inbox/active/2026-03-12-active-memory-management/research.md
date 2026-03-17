# Active Memory Management — Research & Ideas Packet

**Date:** 2026-03-12
**Source:** Leo + CC conversation
**For:** @F to evaluate for integration into ai-continuity-framework plan

---

## Problem Statement

When Jordan (Clawdbot) hits her context window ceiling, a compaction cycle fires. Compaction summarizes and drops context — losing thread state, conversational nuance, decision reasoning, and the implicit "direction" of the conversation. Jordan effectively gets amnesia mid-session.

This is the **garbage collection problem** applied to conversational AI: the current approach is stop-the-world GC when what's needed is concurrent, generational memory management.

### What Compaction Loses

| Lost | Impact |
|------|--------|
| Thread state ("we were on step 3 of 5") | Jordan loses her place, restarts or asks redundant questions |
| Decision reasoning ("we chose X because Y") | Revisits settled decisions, or makes inconsistent ones |
| Emotional/tonal context | Loses read on Leo's energy, urgency, frustration |
| Implicit direction ("Leo is heading toward Z") | Can't anticipate, falls back to reactive mode |
| Cross-reference links ("this connects to what we said earlier about...") | Orphaned context fragments |

---

## Proposed Architecture: Active Memory Management

Three interlocking systems that replace compaction with continuous, intelligent context curation.

### System 1: Context Window Monitor + Dynamic Pruner

**Analogy:** Virtual memory paging, not process killing.

Instead of waiting for the hard compaction threshold, a lightweight monitor tracks token usage and proactively offloads low-value context to warm storage.

**How it works:**

```
Context Window (e.g., 200K tokens)
├── Identity Zone (10-15%) — SOUL.md, IDENTITY.md, system prompt [pinned, never paged]
├── Active Thread Zone (50-60%) — current conversation [managed by relevance scoring]
├── Retrieved Memory Zone (15-20%) — pulled from long-term storage [rotated by anticipator]
└── Buffer Zone (10-15%) — headroom for new messages before any paging needed
```

**Relevance scoring per message block:**

```
relevance = 0.35 * recency_decay(age_in_turns)
          + 0.25 * reference_count(block)           # how often this block is referenced
          + 0.20 * thread_affinity(block, active_thread)  # semantic similarity to current topic
          + 0.10 * decision_weight(block)            # contains a decision, commitment, or action
          + 0.10 * entity_density(block)             # mentions people, projects, specific things
```

**Paging behavior:**

| Buffer Zone Fill | Action |
|------------------|--------|
| < 50% | No action |
| 50-75% | Score all blocks in Active Thread Zone, flag lowest 10% as "warm candidates" |
| 75-90% | Page warm candidates to long-term storage with full metadata, inject one-line summaries in their place |
| > 90% | Aggressive paging — keep only last N turns + highest-scored blocks + identity zone |

**Key difference from compaction:** Paging preserves *pointers*. A paged block leaves behind a one-line stub like `[Memory: Leo decided to use Supabase for auth, see memory #2847]`. If the conversation circles back, the Retrieval Anticipator can re-hydrate it.

### System 2: Background Scribe Agents

**Analogy:** A note-taker in the room who writes things down as they happen, not after the meeting ends.

**Architecture:**

The Scribe is a background agent (or set of agents) that receives the conversation stream and writes structured entries to long-term storage *in real time*.

**What the Scribe captures:**

| Signal | Trigger | Storage Format |
|--------|---------|----------------|
| Decision made | "Let's go with X", "I've decided", explicit choice | `decision` memory with reasoning + alternatives considered |
| Commitment/action | "I'll do X", "Let's add this to...", "Next step is..." | `action_item` with assignee, context, deadline if mentioned |
| State change | Topic shift, new thread started, thread completed | `thread_state` with thread_id, step number, status |
| Emotional/tonal shift | Frustration, excitement, urgency markers | `tone_marker` with valence and context |
| Entity introduction | New person, project, concept mentioned | `entity_reference` linked to existing knowledge graph |
| Contradiction/revision | "Actually, not X, let's do Y instead" | Updates previous decision memory, marks old as superseded |

**Implementation considerations:**

- The Scribe must run on a **separate context window** from the main conversation — it can't eat into Jordan's working memory.
- It receives a streaming feed (or periodic snapshots) of the conversation.
- It uses a smaller/faster model (Sonnet or even Haiku) for classification and extraction — the extraction prompt from `guardian/src/llm/prompts.ts` is a good starting point but needs adaptation for conversational (not GitHub event) input.
- Write target: same Supabase `extracted_memories` table the Guardian Extractor uses, but with a new `source_type: 'conversation'` (vs current `source_type: 'github_event'`).

**Relationship to existing Guardian Extractor:**

The Guardian Extractor (PR 4, already built) processes GitHub events into structured memories. The Scribe is essentially the same pattern applied to a different event source — conversations. The extraction pipeline, embedding generation, and storage can be shared. The key extension is:

1. Different input format (conversation turns vs. GitHub webhook payloads)
2. Real-time cadence (per-turn or every few turns vs. every 5 minutes)
3. Thread-awareness (the Scribe must track conversational threads, not just isolated events)
4. Tone/direction signals (not present in GitHub events)

### System 3: Retrieval Anticipator (Predictive Pre-fetch)

**Analogy:** Speculative execution in CPUs — start loading data you think you'll need before you're asked.

**How it works:**

The Anticipator monitors the conversation stream (same feed as the Scribe) and predicts what long-term memories will be relevant *before* they're explicitly needed.

**Prediction signals:**

| Signal | What to pre-fetch |
|--------|-------------------|
| Entity mention ("Let's talk about Neighborhood Nerds") | All memories tagged with that entity |
| Topic keyword ("auth", "migration", "the book") | Semantically similar memories from the knowledge graph |
| Temporal reference ("last week we...", "remember when...") | Recent memories from that timeframe |
| Pattern match ("Leo usually follows X with Y") | Memories related to Y, pre-staged |
| Thread resumption ("back to what we were doing") | Thread state + associated context from the Scribe's records |

**Scoring for injection priority:**

```
injection_priority = 0.40 * prediction_confidence    # how sure are we this is relevant?
                   + 0.30 * memory_importance         # from Curator's importance scoring
                   + 0.20 * freshness                 # recent memories more likely relevant
                   + 0.10 * access_pattern             # memories Leo frequently revisits
```

**Injection protocol:**

Pre-fetched memories don't all get injected immediately. They're staged in a "ready buffer":

1. **Tier 1 — Inject now** (confidence > 0.85): Silently added to the Retrieved Memory Zone
2. **Tier 2 — Stage** (confidence 0.60-0.85): Held in buffer, injected if conversation confirms direction
3. **Tier 3 — Index only** (confidence 0.40-0.60): Memory IDs noted, retrievable on demand
4. **Below 0.40**: Discarded from pre-fetch queue

**Learning over time:**

The Anticipator should track prediction accuracy — did the pre-fetched memories actually get used? This creates a feedback loop:

```
prediction_made → memory_injected → was_it_referenced? → adjust_model_weights
```

This is where the Curator's existing importance scoring (from TECH.md) and the Retriever's ranking formula connect. The Anticipator is essentially the Retriever running *proactively* instead of on-demand.

---

## How This Maps to the Existing Guardian Architecture

```
EXISTING (PRs 1-8)                    PROPOSED EXTENSION
─────────────────                     ──────────────────
GitHub Events                         Conversation Stream (new source)
    │                                     │
    ▼                                     ▼
Extractor (PR 4) ◄──────────────── Scribe (new agent, same pattern)
    │                                     │
    ▼                                     ▼
    ├──── extracted_memories ────────────┤  (shared table, new source_type)
    │                                     │
    ▼                                     ▼
Consolidator (PR 5) ◄────────── Consolidator handles both sources
    │
    ▼
consolidated_memories
    │
    ├──▶ Curator (PR 7) ──────── same scoring, now with conversation data too
    │
    ├──▶ Retriever (PR 6) ◄──── Retrieval Anticipator (wraps Retriever
    │                            with prediction layer)
    │
    ▼
Context Window Monitor (new) ──── manages what's in/out of active window
```

**Key insight:** This isn't a separate system. It's an extension of the existing pipeline with three additions:

1. **New event source** (conversations → Scribe → same extraction pipeline)
2. **Proactive retrieval wrapper** (Anticipator calls Retriever before being asked)
3. **Context window manager** (new component that doesn't exist in Guardian today)

---

## Implementation Phases (Suggested)

### Phase A: Scribe Agent
**Effort:** Medium — adapts existing Extractor pattern
**Depends on:** PR 4 (done), conversation stream access from Clawdbot gateway
**Deliverables:**
- Conversation event adapter (gateway webhook → Scribe input format)
- Adapted extraction prompt for conversational input
- `source_type: 'conversation'` support in `extracted_memories`
- Thread tracking (thread_id, turn_number, status)

### Phase B: Context Window Monitor
**Effort:** High — new component, needs integration with Clawdbot's context management
**Depends on:** Phase A (Scribe must be writing to storage)
**Deliverables:**
- Token budget tracker (reads current context usage)
- Relevance scoring engine
- Paging protocol (offload to storage, leave stubs)
- Re-hydration protocol (Retriever pulls back paged memories when referenced)

### Phase C: Retrieval Anticipator
**Effort:** High — prediction layer, learning feedback loop
**Depends on:** PR 6 (Retriever, not yet built), Phase A
**Deliverables:**
- Conversation stream analyzer (prediction signals)
- Pre-fetch queue with confidence tiers
- Injection protocol (manages Retrieved Memory Zone in context window)
- Accuracy tracking + weight adjustment

### Phase D: Feedback Loop & Learning
**Effort:** Medium — analytics and tuning
**Depends on:** All of the above running
**Deliverables:**
- Prediction accuracy dashboard
- Memory access pattern analysis
- Auto-tuning of relevance scores, prediction weights, paging thresholds
- "Session quality" metric — how often did Jordan need to ask redundant questions or lose thread?

---

## Open Questions for @F

1. **Should the Scribe be a 5th Guardian agent or a Clawdbot-native component?** The Guardian is a cloud service (Vercel/Supabase). Clawdbot is local. The Scribe needs real-time access to the conversation stream, which suggests it should live closer to Clawdbot. But the storage backend (Supabase) is in the cloud. Hybrid?

2. **Context Window Monitor — whose responsibility?** This is fundamentally a Clawdbot feature (it manages the context window). Should it be proposed upstream to the Clawdbot/OpenClaw project, or built as a plugin/hook?

3. **How does this interact with Clawdbot's existing compaction?** Two options: (a) disable compaction entirely once active memory management is running, or (b) keep compaction as a last-resort safety net but raise the threshold dramatically since the monitor handles normal cases.

4. **Privacy/filtering for the Scribe.** Not everything Leo says should be extracted to long-term storage. Personal medical info, financial details, casual asides — the Scribe needs a sensitivity filter. The existing `emotional_valence` field in the schema could be extended, or a separate classification step added.

5. **Token cost model.** The Scribe and Anticipator each need their own LLM calls. At what conversation cadence does this become expensive? Should they use Haiku for classification and only escalate to Sonnet/Opus for complex extractions?

6. **Can Phases A-C be woven into the existing PR 5-8 plan, or should they be a separate PR sequence (PR 9-12)?** The Scribe is essentially "Extractor for conversations." The Anticipator is "proactive Retriever." There may be natural integration points rather than a bolted-on extension.

---

## Research References

- **Existing Guardian TECH.md** — Retriever ranking formula, Curator importance algorithm, consolidation thresholds — all directly reusable
- **08-Multi-Agent-Memory.md** — The four-agent swarm design; Scribe is Agent #5 or a specialization of Extractor
- **discovery/AMIGO-ARCHITECTURE.md** — Multi-tenant scaling vision; active memory management is a prerequisite for Amigo-scale operation (can't run compaction on 100K users)
- **ADR-005** — Why 4 agents instead of 3; same reasoning applies to whether the Scribe should be separate or merged with Extractor
- **Clawdbot config** — `agents.defaults.subagents.maxConcurrent: 8` — enough headroom for background Scribe + Anticipator alongside Jordan's main agents

---

*Packet produced by CC on 2026-03-12. Ready for @F to evaluate and frame.*
