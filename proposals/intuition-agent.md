# Proposal: The Intuition Agent

*A validation layer that gives AI systems "gut instinct" before speaking*

## The Problem

Large Language Models have a fundamental flaw: **confident hallucination**.

An LLM will state incorrect facts with the same confidence as correct ones. It lacks the human "gut check" — that internal pause before speaking where we ask ourselves:
- *"Wait, do I actually know this?"*
- *"Does this make sense in context?"*
- *"Am I mixing up two different things?"*

This destroys trust. When an AI confidently states that Project A has Feature X (when Feature X actually belongs to Project B), users lose confidence in everything the AI says — even the accurate parts.

### Real-World Example (Sanitized)

An AI assistant was asked to summarize weekly accomplishments. It confidently stated:
- A project had "two-factor authentication" (it didn't)
- The project used "Image Analysis Integration" (that was a completely different project under a different organization)
- A demo was scheduled for a specific date (unverified, possibly stale information)

None of these were lies — they were **context contamination**. The AI mixed information from different projects, different organizations, different timelines. It lacked the intuition to pause and verify.

## The Solution: Intuition Agent

Add a dedicated agent to the Guardian pipeline that acts as a **pre-output validator**.

### How It Works

```
User Query
    ↓
Primary Agent (generates response)
    ↓
┌─────────────────────────────────────┐
│        INTUITION AGENT              │
│                                     │
│  For each factual claim:            │
│  1. Is this in verified memory?     │
│  2. Does this match the context?    │
│  3. Am I mixing entities/projects?  │
│  4. Is this information current?    │
│  5. Confidence score?               │
│                                     │
│  Output: PASS / FLAG / BLOCK        │
└─────────────────────────────────────┘
    ↓
Final Response (with corrections or caveats)
```

### Validation Categories

| Category | Description | Action |
|----------|-------------|--------|
| **Entity Confusion** | Mixing attributes between different projects, people, or orgs | BLOCK — must disambiguate |
| **Stale Data** | Information that may be outdated | FLAG — add caveat |
| **Unverified Claims** | Assertions not backed by memory | FLAG — soften language |
| **Context Mismatch** | Right info, wrong context | BLOCK — recontextualize |
| **Confidence Gap** | Low-confidence assertion stated confidently | FLAG — add uncertainty |

### Integration with Guardian Pipeline

The Intuition Agent fits between **Retriever** (memory recall) and **Response Generation**:

```
Scribe → Retriever → [INTUITION AGENT] → Response → Scribe
                            ↑
                    Cross-references:
                    - Entity registry
                    - Project boundaries
                    - Temporal markers
                    - Confidence scores
```

## Key Design Principles

### 1. Entity Isolation
Maintain clear boundaries between:
- Organizations (Company A vs Company B)
- Projects (Project X vs Project Y)
- People (Person 1 vs Person 2)
- Timelines (current vs historical)

### 2. Source Verification
For every factual claim, track:
- Where did this information come from?
- When was it last verified?
- What's the confidence level?
- Is it appropriate for this context?

### 3. Graceful Degradation
When uncertain, the agent should:
- Use hedging language ("I believe...", "Based on my records...")
- Explicitly state uncertainty ("I should verify this...")
- Offer to check rather than assert

### 4. Learn from Mistakes
When corrections are provided:
- Update memory with correct information
- Flag the error pattern
- Adjust confidence for similar claims

## Implementation Approaches

### Approach A: Separate Agent (Recommended)

A dedicated agent that runs after response generation but before output:
- Can use a smaller, faster model focused on validation
- Clear separation of concerns
- Can be enabled/disabled per context

### Approach B: Inline Validation

Embed validation prompts within the primary agent:
- Simpler architecture
- Higher latency impact
- Harder to tune independently

### Approach C: Retrieval-Time Filtering

Validate at memory retrieval rather than output:
- Prevents contaminated memories from surfacing
- Misses hallucinations generated without memory
- Lower latency for validated responses

## Success Metrics

1. **Hallucination Rate**: % of responses with factual errors
2. **Entity Confusion Rate**: % of responses mixing different entities
3. **User Corrections**: How often users correct the AI
4. **Trust Score**: User confidence ratings over time

## Open Questions

1. **Performance**: How much latency does validation add?
2. **False Positives**: How often does it flag correct information?
3. **Scope**: Validate all claims or only high-risk ones?
4. **Training**: How do we train the intuition model?

## Conclusion

The Intuition Agent addresses a fundamental gap in current AI systems: the lack of self-verification before output. By adding a "gut check" layer, we can significantly reduce hallucinations and rebuild user trust.

This isn't just about catching errors — it's about giving AI systems the wisdom to know what they don't know.

---

*Proposed: March 22, 2026*
*Status: Draft*
*Related: Guardian Memory Pipeline, Entity Management*
