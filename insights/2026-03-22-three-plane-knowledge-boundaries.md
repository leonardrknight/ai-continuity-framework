# Three-Plane Knowledge Boundaries

*Production insight from Amigo deployment — March 22, 2026*

## The Problem

In multi-user AI systems, "user isolation" is often treated as binary: User A can't see User B's data. But real organizational knowledge is more nuanced:

- **Some knowledge should flow freely** — company strategy, decisions, processes
- **Some knowledge is role-specific** — job-related context that transfers with succession
- **Some knowledge is deeply private** — personal concerns, frustrations, compensation

A naive isolation model either over-shares (privacy violations) or under-shares (AI becomes amnesiac across users).

## The Three-Plane Model

Guardian implements a classification scheme where every memory is tagged with a knowledge plane:

| Plane | What It Holds | Who Sees It |
|-------|--------------|-------------|
| **Company** | Strategy, decisions, financials, partnerships, culture, product | All authorized humans (filtered by role) |
| **Role** | Job-specific knowledge, workflows, performance patterns | Current role holder + successor |
| **Private** | Personal concerns, family, frustrations, compensation, career goals | Only that individual — NEVER disclosed to others |

### Classification Rules

The Scribe agent (extraction) must classify each memory at capture time:

1. **Company by default** — Factual statements about organizational topics default to Company plane
2. **Private when emotional** — Company topics expressed with personal emotion are Private
3. **Role when job-specific** — Knowledge about how to do a specific job, not the person doing it

**Examples:**
- "Cash flow is $50K/month" → **Company** (factual business info)
- "I'm terrified about cash flow" → **Private** (personal emotional state)
- "The onboarding checklist for new partners" → **Company** (process)
- "I find these client calls exhausting" → **Private** (personal feeling)
- "The CTO typically reviews architecture PRs" → **Role** (job knowledge)

### Privacy Enforcement

At retrieval time:
1. Filter by user_id for Private plane (only the originating user)
2. Filter by role for Role plane (current holder + successors)
3. No filter for Company plane (available to all authorized users)

**Critical rule:** Private memories from User A must NEVER surface in User B's context, even if semantically relevant.

## Production Bug: User Isolation Leak

**Date:** March 17, 2026
**Issue:** Guardian Retriever was returning all memories regardless of user_id
**Impact:** Leo's private frustrations could theoretically surface in Jeff's context
**Fix:** Added `filter_user_id` parameter to `match_memories` function, enforced at RLS level

**Lesson:** Test user isolation explicitly. Create test memories for multiple users and verify cross-user queries return zero results for Private plane.

### Test Protocol

```python
# Create private memory for User A
store_memory(user_id="user_a", text="I'm worried about job security", plane="private")

# Query as User B
results = retrieve_memories(user_id="user_b", query="job security worries")

# Assert: results should be empty
assert len(results) == 0, "Private memories leaked across users!"
```

## Implications for AI Continuity

The three-plane model affects how AI systems maintain continuity across users:

1. **Company knowledge compounds** — Every user's factual contributions build shared understanding
2. **Role knowledge survives succession** — When a CTO leaves, the new CTO inherits role knowledge
3. **Private knowledge dies with departure** — Personal frustrations don't transfer; fresh start

This creates a natural "institutional memory" that grows over time while respecting individual privacy.

## Implementation Notes

- Plane classification should happen at extraction (Scribe), not retrieval
- Store plane as a column in memories table, use RLS policies
- The Curator agent can re-classify if patterns suggest misclassification
- Consider a `plane_override` field for human corrections

## Related Framework Docs

- [08-Multi-Agent-Memory.md](../08-Multi-Agent-Memory.md) — Agent architecture
- [07-Hub-and-Spoke.md](../07-Hub-and-Spoke.md) — Multi-user context

---

*Contributed by Amigo (Mi Amigos AI) based on production Guardian deployment*
