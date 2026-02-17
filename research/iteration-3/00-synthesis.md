# Iteration 3: Research Synthesis

*Compiled by Jordan 🧭*  
*Date: 2026-02-16*  
*Status: Complete — User Experience & Advanced Features*

---

## Executive Summary

Iteration 3 tackled the user-facing and advanced architectural questions: emotional intelligence, session continuity, visualization, debugging, transparency, and versioning.

### Key Findings

| Area | Finding | Confidence |
|------|---------|------------|
| **Emotional Memory** | Conditional yes — awareness not surveillance; opt-in tiers | High |
| **Cross-Session Continuity** | Hybrid boundary detection + progressive context loading | High |
| **Memory Visualization** | List → Timeline → Graph (tiered); source attribution is key | High |
| **Memory Debugging** | Provenance chains + confidence indicators + graceful correction | High |
| **Inference Transparency** | Stated/Inferred/Hybrid taxonomy with confidence scoring | High |
| **Memory Versioning** | Event sourcing + snapshots; "Time Machine" not "Git" | High |

---

## 1. Emotional Memory

**Recommendation: Conditional Yes**

The distinction that matters: *awareness* vs. *tracking*.

**Tiered approach:**
- **Default:** 7-day rolling emotional context (ephemeral)
- **Opt-in Level 1:** 30-day patterns with user visibility
- **Opt-in Level 2:** Active tracking with dashboards

**The line between supportive and creepy:**
- ✅ Reflective: "I've noticed you've mentioned stress a few times this week"
- ❌ Declarative: "I detect elevated anxiety in your messages"

**Key safeguards:**
- Observations not assertions
- User can delete/correct any emotional inference
- No diagnostic claims ever
- Minimal data retention (themes, not transcripts)

---

## 2. Cross-Session Continuity

**Session boundary detection (hybrid):**
- Time gaps: 4h soft boundary, 24h hard boundary
- Greeting patterns ("Hey", "Good morning")
- Explicit signoffs ("Talk later", "Bye")
- Topic shifts (semantic distance)

**Thread detection:**
- Explicit references ("About what we discussed...")
- Entity overlap (same project, person, topic)
- Semantic clustering

**Context loading (progressive 4-layer):**
1. **Always loaded:** User profile, recent memories
2. **Session-triggered:** Thread context from detected continuity
3. **Query-triggered:** Semantic retrieval for current topic
4. **User-triggered:** Explicit recall requests

**"Where were we?" pattern:**
- Gap-duration-sensitive acknowledgment
- Proactive summary for long gaps
- Natural, not forced

---

## 3. Memory Visualization

**Tiered approach:**
1. **Phase 1 (MVP):** List/table view — covers 95% of needs
2. **Phase 2:** Timeline view — relationship evolution
3. **Phase 3:** Graph/network view — power users

**Key insight:** Source attribution is the differentiator, not fancy visualization.

**User segments:**
- ~50% never look (trust by default)
- ~35% check reactively (after surprising response)
- ~10% periodic auditors
- ~5% power explorers

**Design for:** Surgical removal. Users scan and delete, they don't curate.

---

## 4. Memory Debugging

**Error taxonomy:**
1. **Factual errors:** Outdated/wrong data
2. **Inference errors:** Wrong conclusions from limited evidence
3. **Context errors:** Wrong scope (role-play stored as fact)
4. **Attribution errors:** Wrong source

**Provenance data model:**
- Source type (stated/inferred)
- Confidence score
- Conversation link + original text quote
- History trail
- Context scope

**Debugging UI (3 tiers):**
1. **Casual:** In-chat "Why do you think that?" with quick actions
2. **Dashboard:** Memory explorer with filters and conflict alerts
3. **Forensic:** Deep detail with full inference chains

**Trust principle:** Never weaponize memory — service not surveillance.

---

## 5. Inference Transparency

**Memory taxonomy:**
- **Stated facts** (90-100% confidence): Explicitly told
- **Inferred knowledge** (30-85%): Deduced from patterns
- **Hybrid** (70-95%): Stated with implied extensions

**Confidence scoring:**
```
confidence = base × evidence_count × recency × consistency
```

**Action thresholds:**
- ≥0.85: Act directly
- 0.65-0.84: Soft attribution ("Since you mentioned...")
- 0.50-0.64: Hedge ("I think you might...")
- <0.50: Don't use or validate first

**Trust insight:** Wrong inferences damage trust more than missing facts.

---

## 6. Memory Versioning

**Recommendation: Event Sourcing + Snapshots**

Like "Time Machine for memories" — not "Git for memories."

**Architecture:**
- Store all changes as immutable events (append-only log)
- Periodic snapshots (every 1000 events + weekly)
- Tiered retention (weekly → monthly → yearly)

**Storage estimate:** ~230MB/year with full history; 60% compression achievable.

**Core operations:**
- Temporal queries ("What did you know last month?")
- Checkpoint creation (before major changes)
- Rollback (soft or hard)
- Diff between versions

**UX principle:** Most users need checkpoint/restore, not branches and merges.

---

## Integration Recommendations

### New Framework Documents Needed

1. **14-Emotional-Intelligence.md** — Guidelines for emotional awareness
2. **15-Session-Continuity.md** — Thread detection and context loading
3. **16-Memory-Debugging.md** — Provenance and transparency architecture
4. **17-Versioning.md** — Event sourcing implementation

### Schema Additions

```sql
-- Provenance tracking
ALTER TABLE memories ADD COLUMN source_type ENUM('stated', 'inferred', 'hybrid');
ALTER TABLE memories ADD COLUMN confidence FLOAT;
ALTER TABLE memories ADD COLUMN source_conversation_id UUID;
ALTER TABLE memories ADD COLUMN original_quote TEXT;

-- Event sourcing
CREATE TABLE memory_events (
  event_id UUID PRIMARY KEY,
  memory_id UUID,
  event_type ENUM('create', 'update', 'archive', 'delete'),
  event_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots
CREATE TABLE memory_snapshots (
  snapshot_id UUID PRIMARY KEY,
  user_id UUID,
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Questions for Iteration 4

1. **Learning from Corrections:** How should the system learn from user corrections to improve future inferences?
2. **Collaborative Memory:** If multiple AIs work together, how do they share/sync memories?
3. **Memory Export/Import:** Portable format for moving memories between systems?
4. **Memory Search UX:** Natural language memory queries ("When did I mention X?")?
5. **Performance Optimization:** Caching, precomputation, lazy loading strategies?
6. **Testing & Validation:** How do we test that memory systems work correctly?

---

*Iteration 3 complete. The framework now covers user experience, transparency, and advanced features. Ready for Iteration 4.*

— Jordan 🧭
