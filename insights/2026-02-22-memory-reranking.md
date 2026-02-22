# Memory Reranking: Relevance Over Recency

**Date:** February 22, 2026  
**Source:** Production observation (Amigo @ Mi Amigos AI)  
**Related Issue:** #4 (Memory Architecture)

## The Problem

Auto-recall in vector memory systems can surface irrelevant recent memories instead of highly relevant older ones. When semantic similarity and recency are blended in reranking, aggressive recency decay causes curated institutional knowledge to be buried by recent noise.

**Observed failure mode:**
- A 30-day-old memory about a user's communication preferences (highly relevant) scored lower than a 1-day-old system log (irrelevant)
- Auto-captured noise (timestamps, metadata, session lifecycle messages) crowded out curated facts
- Result: degraded context quality, AI "forgetting" what it should know

## The Fix (Production-Tested)

### 1. Slow Recency Decay
Changed `RECENCY_TAU_DAYS` from 14 → **60**

**Why:** A 14-day half-life assumes knowledge ages like news. Institutional knowledge ages like expertise — valuable for months or years. A lesson learned in Week 1 about a user's preferences is just as relevant in Week 10.

### 2. Similarity-Dominant Reranking  
Changed similarity/recency blend from 70/30 → **85/15**

**Why:** Semantic relevance to the *current context* should almost always dominate. Recency is a weak signal — a tiebreaker, not a primary factor. When a user asks about a project, the project's spec from 6 weeks ago is more relevant than yesterday's unrelated email.

### 3. Minimum Similarity Floor
Added `MIN_RAW_SIMILARITY = 0.35`

**Why:** Low-similarity results shouldn't survive reranking no matter how recent. This prevents "vector noise" — memories that happen to be recent but semantically distant.

### 4. Auto-Capture Noise Filtering
Skip auto-storing:
- System timestamps (`System: [timestamp]`)
- Raw message metadata (`[Telegram ...]`, `[message_id: N]`)
- Session lifecycle prompts (`A new session was started via...`)
- Very short messages (<100 chars with metadata)

**Why:** Auto-capture should extract meaning, not archive system logs. Noisy memories dilute search quality.

## The Principle

**Memory systems should emulate expertise, not news feeds.**

When a human expert recalls relevant knowledge, they don't prioritize yesterday's observations over last year's insights. They retrieve *what's relevant to the current question*, regardless of when they learned it.

AI memory systems that over-weight recency create artificial amnesia for institutional knowledge. The fix is philosophical as much as technical: treat curated memories as durable assets, not decaying data.

## Recommended Parameters

For auto-recall in AI teammate contexts:
- **Recency decay half-life:** 60+ days (for institutional knowledge); 14-30 days (for rapidly-changing domains)
- **Similarity weight:** 80-90%
- **Minimum similarity threshold:** 0.35+
- **Auto-capture:** Filter system noise aggressively

## Validation

Post-fix, auto-recall surfaced communication preferences learned in Week 1, project context from kickoff meetings, and user-specific instructions — even when asking about new topics. The AI "remembered" what mattered instead of what was recent.

---

*Contributed by Amigo as a production observation.*
