# Memory Conflict Resolution

**Research Document — AI Continuity Framework**  
**Iteration 2, Document 01**  
**Date:** 2026-02-16

When an AI assistant's memories contradict each other, how should the system resolve conflicts? This document explores conflict scenarios, examines how existing systems handle contradictory data, and proposes a conflict resolution algorithm.

---

## The Problem Space

AI memory systems face a fundamental challenge: users change, contexts vary, and inferences can be wrong. Unlike traditional databases where conflicts arise from concurrent writes, AI memory conflicts often arise from the passage of time, changing circumstances, or flawed reasoning.

### Five Conflict Scenarios

**1. Temporal Override**
> User said "I prefer email" in January, then "I prefer Slack" in February.

This is a preference evolution. The newer statement likely supersedes the old, but not always—preferences can be context-dependent or temporary.

**2. Explicit Correction**
> User says "Actually, that's wrong. I meant X."

This is an authoritative override. The user is directly invalidating a stored memory. This should always win.

**3. Context-Dependent Truths**
> "I like coffee" (at work) vs "I drink tea" (at home)

Both can be simultaneously true. This isn't a conflict—it's contextual segmentation that the system failed to recognize.

**4. Contradictory Inferences**
> AI inferred "User is a morning person" from patterns, but user says "I hate mornings."

User statements should override AI inferences. The system's pattern-matching was wrong.

**5. Source Reliability**
> Memory from direct user statement vs inferred from behavior vs reported by third party

These sources have different reliability hierarchies. Direct statements > observed behavior > inferences > third-party reports.

---

## How Existing Systems Handle Conflicts

### Database Systems

**Last-Write-Wins (LWW)**

The simplest strategy: timestamp every record, newest wins. Used in distributed systems like Cassandra and DynamoDB.

- *Pros:* Simple, deterministic, no human intervention required
- *Cons:* Loses information, doesn't consider semantic importance, clock synchronization issues

**Conflict-Free Replicated Data Types (CRDTs)**

CRDTs are data structures designed to automatically merge concurrent modifications without conflicts. From crdt.tech:

> "CRDTs ensure that, no matter what data modifications are made on different replicas, the data can always be merged into a consistent state. This merge is performed automatically by the CRDT, without requiring any special conflict resolution code."

Types relevant to AI memory:
- **LWW-Register:** Last-write-wins for single values (timestamps determine winner)
- **MV-Register:** Multi-value register preserving all concurrent values (requires later resolution)
- **G-Counter/PN-Counter:** Only increment or track positive/negative changes (good for counts)
- **Add-Wins Set:** Concurrent add and remove = add wins (good for preference lists)

**Version Vectors / Vector Clocks**

Instead of wall-clock timestamps, track causal dependencies. "A happened before B" is more reliable than "A's timestamp < B's timestamp."

**Multi-Version Concurrency Control (MVCC)**

Used in PostgreSQL, maintain multiple versions of records. Don't delete old versions immediately—mark them as superseded.

### Knowledge Graphs

**RDF and Named Graphs**

RDF (Resource Description Framework) handles contradictions through:
- **Named Graphs:** Scope facts to specific contexts or sources
- **Reification:** Make statements about statements ("According to source X, fact Y is true")
- **Temporal annotations:** Add valid-time and transaction-time to facts

**Wikidata Approach**

Wikidata (the knowledge graph behind Wikipedia) handles contradictory facts through:
- **Qualifiers:** Attach context to statements (start date, end date, applies to)
- **References:** Track source for each fact
- **Deprecated Rank:** Mark outdated statements as deprecated rather than deleting
- **Multiple Values:** Allow multiple values for the same property with different qualifiers

Example: A person can have multiple "employer" values with different "start time" and "end time" qualifiers.

**Truth Maintenance Systems (TMS)**

From AI research (Doyle, 1979), TMS tracks not just facts but *justifications* for facts:

> "A truth maintenance system maintains consistency between old believed knowledge and current believed knowledge through revision. If current believed statements contradict the knowledge in the KB, the KB is updated with the new knowledge."

Key concepts:
- **Dependency Network:** Each fact tracks what it depends on
- **Dependency-Directed Backtracking:** When contradictions found, trace back to find the responsible assumption
- **Support Lists:** Each belief has a list of justifications that support it
- **Assumption-Based TMS (ATMS):** Multiple contexts can be maintained simultaneously

### AI Memory Systems

**Letta (formerly MemGPT)**

Letta uses structured memory blocks and archival memory:
- Memory is divided into labeled blocks (human context, persona, etc.)
- The agent can update memory blocks through tool calls
- No explicit conflict resolution documented—likely relies on overwriting

**Zep**

Zep builds a "temporal knowledge graph":

> "A temporal knowledge graph that evolves with every interaction. When facts change, old ones are invalidated."

Key insight: Zep explicitly invalidates old facts when new contradictory facts arrive, preserving temporal relationships.

**Mem0**

Mem0 focuses on compression and versioning:

> "Every memory is timestamped, versioned, and exportable—see exactly what your AI knows."

Mem0's approach:
- Compress chat history into optimized representations
- Timestamp and version everything
- Traceable history of what the AI believed when

---

## Proposed Conflict Resolution Algorithm

Based on this research, here's a comprehensive algorithm for AI memory conflict resolution.

### 1. Memory Schema

Every memory record needs:

```
Memory {
  id: UUID
  content: String              // The actual memory
  created_at: Timestamp        // When first recorded
  updated_at: Timestamp        // Last modification
  source_type: Enum            // DIRECT_STATEMENT | INFERENCE | OBSERVATION | THIRD_PARTY
  confidence: Float            // 0.0-1.0
  context_tags: String[]       // ["work", "home", "morning", etc.]
  valid_from: Timestamp?       // When this became true (if known)
  valid_until: Timestamp?      // When this stopped being true (if known)
  superseded_by: UUID?         // If replaced, pointer to replacement
  status: Enum                 // ACTIVE | SUPERSEDED | CONTRADICTED | ARCHIVED
  justifications: UUID[]       // Other memories that support this one
  contradicts: UUID[]          // Known contradictions
}
```

### 2. Detection: Identifying Conflicts

Conflicts should be detected at write time and during periodic consistency checks.

**Semantic Similarity Check**
When adding a new memory, check for semantically similar existing memories:
1. Embed new memory using vector embedding
2. Search for similar memories (cosine similarity > threshold)
3. For each similar memory, check for contradiction

**Contradiction Detection**
Use an LLM to classify relationship between memories:
- SUPPORTS: New memory reinforces existing
- EXTENDS: New memory adds detail to existing
- UPDATES: New memory supersedes existing (temporal change)
- CONTRADICTS: New memory conflicts with existing
- INDEPENDENT: No meaningful relationship

**Context Compatibility**
Check if seemingly contradictory memories have compatible contexts:
- "Prefers email at work" and "Prefers text with family" don't contradict
- Contexts are compatible if they can both be true simultaneously

### 3. Resolution: Rules for Which Memory Wins

**Priority Hierarchy (highest to lowest):**

1. **Explicit Correction**  
   User says "Actually, that's wrong" or "No, I meant..."  
   → Always wins, immediately supersede the corrected memory

2. **Direct Statement (recent)**  
   User directly states a fact in recent conversation  
   → Supersedes inferences and older statements about same topic

3. **Direct Statement (older)**  
   User stated this in the past  
   → Still authoritative but may be outdated

4. **Observed Behavior (recent)**  
   System observed user doing something recently  
   → Strong evidence but doesn't override explicit statements

5. **Observed Behavior (older)**  
   Historical behavioral pattern  
   → May no longer be accurate

6. **Inference from Patterns**  
   System deduced this from multiple observations  
   → Weakest form of memory, easily overridden

7. **Third-Party Information**  
   Someone else reported this  
   → Should be flagged for user confirmation

**Resolution Rules:**

```
function resolve_conflict(existing: Memory, new: Memory) -> Resolution {
  
  // Rule 1: Explicit corrections always win
  if new.is_correction_of(existing) {
    return SUPERSEDE(existing, new)
  }
  
  // Rule 2: Check context compatibility
  if contexts_are_disjoint(existing.context_tags, new.context_tags) {
    return KEEP_BOTH_CONTEXTUAL(existing, new)
  }
  
  // Rule 3: Source type hierarchy
  if new.source_type.priority > existing.source_type.priority {
    return SUPERSEDE(existing, new)
  }
  
  // Rule 4: Same source type - recency wins
  if new.source_type == existing.source_type {
    if new.created_at > existing.created_at {
      return SUPERSEDE(existing, new)
    } else {
      return KEEP_EXISTING(existing)
    }
  }
  
  // Rule 5: Lower-priority source contradicts higher
  // Flag for review but don't auto-resolve
  if new.source_type.priority < existing.source_type.priority {
    return FLAG_FOR_REVIEW(existing, new, reason="lower_priority_contradiction")
  }
  
  // Rule 6: Confidence threshold
  if new.confidence > existing.confidence + CONFIDENCE_THRESHOLD {
    return SUPERSEDE(existing, new)
  }
  
  // Default: Flag for review
  return FLAG_FOR_REVIEW(existing, new, reason="ambiguous")
}
```

**Confidence Calculation:**
```
confidence = base_confidence(source_type) 
           * recency_factor(created_at) 
           * corroboration_factor(supporting_memories)
           * specificity_factor(context_tags)
```

Where:
- `base_confidence`: DIRECT_STATEMENT=0.95, OBSERVATION=0.80, INFERENCE=0.60, THIRD_PARTY=0.40
- `recency_factor`: Decay function, e.g., `exp(-days_old / half_life)`
- `corroboration_factor`: Bonus if multiple independent sources agree
- `specificity_factor`: Boost for highly contextual memories

### 4. Archival: What Happens to the "Loser"

**Never truly delete memories.** Superseded memories are valuable for:
- Understanding user evolution over time
- Recovering from false supersessions
- Training and improving the system
- Audit and explainability

**Archival Strategy:**

```
function archive_superseded(loser: Memory, winner: Memory) {
  loser.status = SUPERSEDED
  loser.superseded_by = winner.id
  loser.valid_until = winner.created_at  // It was true until this point
  
  // Move to cold storage after retention period
  if loser.created_at < (now - RETENTION_PERIOD) {
    move_to_archive(loser)
  }
}
```

**Archival States:**
- `ACTIVE`: Current belief, included in context retrieval
- `SUPERSEDED`: Replaced by newer memory, excluded from retrieval but kept
- `CONTRADICTED`: Conflict detected, awaiting resolution
- `ARCHIVED`: Cold storage, not included in regular retrieval
- `DELETED`: User requested deletion (GDPR compliance)

**Retrieval Rules:**
- Standard retrieval: Only `ACTIVE` memories
- Historical queries ("What did I used to think about X?"): Include `SUPERSEDED`
- Debug/audit queries: Include all except `DELETED`

### 5. User Notification: When to Ask for Clarification

**Always Notify:**
- High-confidence memory contradicted by lower-confidence source
- Third-party information contradicting user statements
- Multiple conflicting memories about important topics (schedule, preferences affecting decisions)

**Never Interrupt For:**
- Clear temporal updates ("I moved from NYC to LA" supersedes old address)
- Low-stakes preferences with clear recency
- Corrections the user explicitly made

**Notification Strategies:**

**Inline Clarification** (during conversation):
```
"I have a note that you prefer window seats, but you also mentioned 
liking aisles. Which do you prefer, or does it depend on the flight?"
```

**Batch Summary** (periodic digest):
```
"Memory Housekeeping: I noticed a few things that might need updating:
- Your coffee preference: You said you prefer oat milk, but last week 
  you ordered almond. Want me to update this?
- Your work schedule: Are you still doing 9-5, or has that changed?"
```

**Silent Resolution with Optional Audit:**
For low-stakes items, resolve silently but log decisions. User can review in a "Memory Audit" interface.

---

## Implementation Recommendations

### For the AI Continuity Framework

**Phase 1: Foundation**
1. Implement memory schema with all required fields
2. Add vector similarity search for conflict detection
3. Implement source-type priority hierarchy

**Phase 2: Smart Resolution**
1. Add LLM-based contradiction detection
2. Implement context-aware resolution (don't conflict if contexts are disjoint)
3. Build confidence calculation with decay

**Phase 3: User Experience**
1. Design notification system with sensitivity tuning
2. Build memory audit interface
3. Add "Why did you remember that?" explainability

### Key Insights from Research

1. **Zep's temporal knowledge graph** is the right model—facts have lifespans, not just existence.

2. **Truth Maintenance Systems** from 1970s AI research are directly applicable—track justifications, not just facts.

3. **CRDTs** offer conflict resolution without coordination, but for AI memory, we need semantic understanding that CRDTs can't provide.

4. **Wikidata's qualifier system** elegantly handles context-dependent truths—multiple values with different contexts, all valid.

5. **Never delete, only supersede.** Memory evolution is valuable data.

---

## Summary

**Detection:**
- Vector similarity to find candidate conflicts
- LLM classification to determine relationship type
- Context analysis to identify false conflicts

**Resolution:**
- Source hierarchy: Explicit > Direct Statement > Observation > Inference > Third Party
- Recency as tiebreaker within same source type
- Context-disjoint memories can coexist

**Archival:**
- Superseded memories marked with `valid_until` timestamp
- Pointer to superseding memory for traceability
- Cold storage for old memories, never true deletion

**Notification:**
- High-stakes conflicts: Ask user
- Clear updates: Silent resolution
- Ambiguous cases: Batch summary for review

This framework balances automation with user control, preserves memory history for learning and audit, and handles the messy reality that human preferences and facts change over time.
