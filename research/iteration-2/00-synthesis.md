# Iteration 2: Research Synthesis

*Compiled by Jordan 🧭*  
*Date: 2026-02-16*  
*Status: Complete — Ready for Framework Integration*

---

## Executive Summary

Iteration 2 tackled the harder operational questions that emerge once the basic memory architecture is in place: conflicts, scale, privacy, multi-user isolation, and proactive behavior.

### Key Findings

| Area | Finding | Confidence |
|------|---------|------------|
| **Conflict Resolution** | Source hierarchy + temporal recency + archival (never delete) | High |
| **Scale Testing** | Vector DBs maintain <100ms at 1M; concern threshold ~500K uncurated | High |
| **User Override** | Natural language + UI; soft delete default; memory dashboard for trust | High |
| **Privacy/Forgetting** | Tri-layer model with provenance tracking; re-embed after deletion | High |
| **Multi-User Isolation** | Namespace isolation + strict metadata filtering + sharing by intent | High |
| **Proactive Surfacing** | "FOR the user, not ABOUT the user"; relevance to current context | High |

---

## 1. Conflict Resolution

**When memories contradict, use this hierarchy:**

1. **Explicit User Correction** — Always wins ("That's wrong, I meant X")
2. **Direct User Statement** — High confidence ("I prefer X")
3. **Observed Behavior** — Medium confidence (inferred from actions)
4. **AI Inference** — Lower confidence (patterns detected)
5. **Third-Party Reports** — Lowest confidence (someone else said)

**Temporal tiebreaker:** Within same category, newer wins.

**Archival rule:** Never delete superseded memories—mark as `SUPERSEDED` with `valid_until` timestamp. They may explain relationship evolution.

**Detection methods:**
- Vector similarity to find semantically related memories
- LLM contradiction classification
- Context analysis (same topic, different values)

---

## 2. Scale Performance

**Good news:** Vector databases handle scale well.

| Scale | Latency | Cost | Concern Level |
|-------|---------|------|---------------|
| 10K memories | <10ms | $5/mo | None |
| 100K memories | 15-30ms | $15/mo | None |
| 1M memories | 25-50ms | $30-50/mo | Monitor quality |
| 10M memories | 50-100ms | $150+/mo | Aggressive pruning needed |

**Real concern threshold:** ~500K *uncurated* memories. At this point:
- Retrieval quality degrades (noise overwhelms signal)
- Consolidation becomes critical
- Matryoshka embeddings (4x storage reduction) become attractive

**Optimization techniques:**
- Aggressive tiered archival (Iteration 1 findings)
- Partition by time (recent hot, old cold)
- Dimension reduction for archive tier
- Quality > quantity — better to have 50K excellent memories than 500K mediocre ones

---

## 3. User Override & Control

**Natural language commands to recognize:**
- "Remember that..." / "Don't forget..." → Create/update
- "Actually, that's wrong..." / "Correct that to..." → Update
- "Forget that..." / "Don't remember..." → Delete
- "What do you remember about..." / "Show me my..." → Review

**UI pattern (memory dashboard):**
- List view with search and filter
- Per-memory actions: View, Edit, Delete
- Bulk operations by category/time
- Export (data portability)
- Undo/recovery (30-day soft delete)

**Key insight:** Users rarely use the UI, but knowing it exists builds trust. Natural language is the primary interface.

**"Memory updated" notification:** Essential for transparency. Users should know when memory changes.

---

## 4. Privacy & Forgetting Rights

**GDPR Article 17 compliance requires:**
1. Delete all raw mentions of X
2. Delete all memories where X is primary subject
3. Re-embed surviving text (don't try to "patch" embeddings)
4. Cascade to consolidated memories that incorporated X
5. Retain anonymized audit logs if needed

**Technical architecture:**
- Every memory stores `provenance` (where did this come from?)
- Every memory stores `dependencies` (what derived from this?)
- Deletion cascades through dependency graph
- Re-embedding is automatic after deletion

**Retention policies by category:**

| Category | Default Retention | User Configurable |
|----------|-------------------|-------------------|
| Preferences | Until deleted | Yes |
| Conversation details | 90 days | Yes |
| Health/financial | 30 days | Yes |
| Location data | 7 days | Yes |
| Inferences | Until contradicted | Yes |

---

## 5. Multi-User Memory Isolation

**Tri-layer model:**

```
┌─────────────────────────────────────────┐
│     PERSONAL (user-specific only)       │  ← Never crosses users
├─────────────────────────────────────────┤
│     PROJECT (explicit sharing)          │  ← Shared by intent
├─────────────────────────────────────────┤
│     ORGANIZATION (all users)            │  ← Common knowledge
└─────────────────────────────────────────┘
```

**Isolation mechanisms:**
1. **Namespace prefix:** Every memory tagged with `user_id`
2. **Metadata filtering:** Query filter ALWAYS includes user context
3. **Runtime guards:** Post-retrieval check before surfacing
4. **Encryption option:** User-specific keys for sensitive data

**Sharing mechanics:**
- Owner explicitly shares memory/fact to another user
- Shared memories retain provenance ("Leo shared this on Feb 5")
- Revocation is possible

**Identity consistency:**
- Core personality (SOUL.md) same across all users
- Relationship dynamics (VOICE.md per-user section) vary
- Each user builds their own relationship with the AI

---

## 6. Proactive Memory Surfacing

**The golden rule:**
> Memory surfacing feels helpful when it's FOR the user. It feels creepy when it's ABOUT the user.

**When to surface proactively:**

| Scenario | Example | Decision |
|----------|---------|----------|
| Time-sensitive | "Your passport expires in 3 months" | ✅ Surface |
| Actionable | "Your anniversary is next week—book the restaurant?" | ✅ Surface |
| Relevant to current task | "You mentioned wanting to try Osteria" (during restaurant chat) | ✅ Surface |
| Demonstrates surveillance | "I notice you've been stressed lately" | ❌ Don't surface |
| Overly precise | "At 3:47 PM on Feb 3rd, you said..." | ❌ Don't surface |
| Private in public | Health info in group chat | ❌ Never |

**Attribution styles:**

| Style | When to Use |
|-------|-------------|
| No citation | Facts that feel like "common knowledge" in relationship |
| Soft citation | "You mentioned..." / "Based on our conversations..." |
| Precise citation | When user might doubt or want to verify |
| On-request only | Private/sensitive topics |

**Frequency guideline:** Less is more. Occasional proactive recall feels like good memory; constant recall feels like surveillance.

---

## Integration Recommendations

### For the AI Continuity Framework

1. **Add 10-Conflict-Resolution.md** with detection + resolution algorithm
2. **Add 11-Scale-Considerations.md** with benchmarks and thresholds
3. **Add 12-User-Control.md** with NL commands and UI patterns
4. **Add 13-Privacy-Architecture.md** with GDPR compliance approach
5. **Update 07-Hub-and-Spoke.md** with multi-user isolation details
6. **Create guidelines: proactive-surfacing.md** with decision trees

### For Implementation

1. Add `provenance` and `dependencies` fields to memory schema
2. Implement cascade deletion
3. Add namespace filtering to all retrieval
4. Create "memory updated" notification system
5. Implement soft-delete with 30-day retention
6. Add proactive surfacing rules to retriever

---

## Questions for Iteration 3

1. **Emotional Memory:** Should AI track long-term emotional patterns? (User mood over time)
2. **Memory Confidence Decay:** Should confidence in memories decrease over time if not reinforced?
3. **Cross-Session Continuity:** How do we handle "where we left off" across sessions?
4. **Memory Visualization:** What does an effective memory map/graph UI look like?
5. **Memory Debugging:** How does a user understand why the AI "remembered" something wrong?
6. **Collaborative Memory:** When multiple AIs share infrastructure, how do memories interact?
7. **Memory Versioning:** Should we track memory evolution (git for memories)?
8. **Inference Transparency:** How do we explain inferred memories vs stated facts?

---

*Iteration 2 complete. The framework now has solid operational foundations. Ready for Iteration 3.*

— Jordan 🧭
