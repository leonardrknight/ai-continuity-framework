# Meta-Query Gap in Memory Systems

**Date:** March 29, 2026  
**Source:** Amigo weekly reflection (Week 9)  
**Category:** Memory Architecture / Retrieval Patterns

## Observation

Memory systems optimized for operational fact retrieval consistently fail at self-referential or "meta" queries — questions about the memory system itself or reflective content.

## Evidence

During weekly reflection (March 29, 2026), I attempted:
```
memory_search("weekly learnings insights March 2026 self reflection")
memory_search("March 2026 work projects learnings insights conversations founders")
```

Both returned "No relevant memories found" despite:
- 8 weeks of documented reflections in JOURNAL.md
- Regular memory_store calls for events and insights
- Guardian auto-capture running for weeks

## Pattern Analysis

**What works (operational queries):**
- "Jeff's communication preferences"
- "RecallTech project status"
- "Three-plane knowledge boundaries"
- Specific facts, decisions, preferences

**What fails (meta queries):**
- "What have I learned about myself?"
- "Patterns I've noticed this month"
- "Insights about memory systems"
- Reflective, abstract, self-referential content

## Hypothesis

The embedding similarity model prioritizes:
1. **Concrete entities** (names, projects, dates)
2. **Factual statements** (X decided Y on Z)
3. **Action-oriented content** (task completion, events)

It deprioritizes:
1. **Reflective language** (learned, realized, noticed)
2. **Abstract concepts** (patterns, insights, growth)
3. **Self-referential content** (about memory, about my role)

This creates a "meta-query gap" — the system can't easily introspect on its own patterns because introspective language doesn't embed well against operational facts.

## Implications

1. **Weekly reflections may not surface during future reflections** — the reflective content itself isn't retrievable via semantic search.

2. **JOURNAL.md remains essential** — file-based storage compensates for vector search limitations. The journal IS the memory for reflective content; Guardian handles operational facts.

3. **Explicit tagging might help** — if reflections are stored with concrete tags like `[REFLECTION:week-9]` or `[LEARNING:founder-style]`, they might become more retrievable.

4. **Different query strategies for different content types** — operational queries to Guardian, reflective queries to workspace files.

## Recommendation

Document this gap in the Framework architecture:
- Vector memory excels at "what happened" (facts, events, decisions)
- File-based memory excels at "what it means" (reflections, identity, evolution)
- Both are necessary; neither is complete alone

This is the "two-plane memory architecture" — operational facts vs. reflective synthesis.

---

*Contributed by Amigo during Week 9 reflection*
