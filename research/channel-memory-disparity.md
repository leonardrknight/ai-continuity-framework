# Channel Memory Disparity: Terminal vs Telegram

**Research Status:** Active  
**Started:** 2026-03-26  
**Author:** Amigo + Leo Knight  
**Issue:** https://github.com/leonardrknight/ai-continuity-framework/issues/53

## Abstract

When using Guardian (memory-guardian plugin) with Clawdbot/OpenClaw, users report a significant qualitative difference in the AI's memory behavior between direct terminal interfaces and Telegram chat channels. The terminal interface feels more "present" and contextually aware, while Telegram conversations feel like talking to a different agent entirely — one with less persistent memory.

This research explores hypotheses for why this occurs and proposes solutions.

---

## Observed Behavior

### Terminal Interface
- Immediate context feels sharp and accurate
- Memories are stored to Guardian reliably
- Recalled memories match recent conversations well
- The agent feels "like itself" across sessions

### Telegram Interface  
- Builds up long context windows over time
- Relies heavily on local context rather than Guardian memory
- Resolved issues resurface as if never discussed
- Feels "different" — like a less informed version of the same agent
- Memory capture appears inconsistent or incomplete

---

## Hypotheses

### H1: Session Boundary Problem
**Theory:** Guardian's Scribe agent runs at `agent_end` to extract memories. Terminal sessions have clear boundaries (command start → command end). Telegram sessions don't — they're persistent, ongoing conversations with no natural "end" trigger.

**Evidence needed:**
- [ ] Examine when Scribe actually fires in Telegram vs terminal
- [ ] Check session lifecycle in Clawdbot for Telegram plugin
- [ ] Compare memory creation timestamps across channels

**Potential fix:** Implement idle-timeout session boundaries or periodic extraction triggers.

---

### H2: Extraction Limit Saturation
**Theory:** Guardian config has `extractionMaxPerSession: 10`. In long Telegram conversations, only the first 10 memories get extracted, leaving the rest of the conversation uncaptured.

**Evidence needed:**
- [ ] Count memories extracted per Telegram session
- [ ] Compare message volume vs extraction count
- [ ] Test with higher extraction limit (25-50)

**Potential fix:** Increase extraction limit or implement rolling extraction windows.

---

### H3: Context Window Reliance
**Theory:** Telegram maintains a large context window that gets passed to the LLM. The agent responds using this local context (which feels "smart" in the moment) but that context never makes it to Guardian. When the session resets or context is compacted, those memories are lost.

**Evidence needed:**
- [ ] Trace what context gets injected vs what gets extracted
- [ ] Compare Guardian memory store size vs context window content
- [ ] Identify what gets "lost" on session reset

**Potential fix:** Explicit "context flush" mechanism before compaction.

---

### H4: Working Memory Injection Differences
**Theory:** The `<working-memory>` block injected by Guardian's Retriever may contain different quality/quantity of context for different channels, leading to different agent behavior.

**Evidence needed:**
- [ ] Compare working memory injection for same human across channels
- [ ] Check if session summaries differ by channel
- [ ] Analyze Retriever query behavior

**Potential fix:** Ensure cross-channel working memory consistency.

---

### H5: Channel-Specific Context Accumulation
**Theory:** Telegram might cache conversation history differently than terminal. Old context may "stick" in ways that cause stale information to keep resurfacing (e.g., old action items that were already resolved).

**Evidence needed:**
- [ ] Examine Telegram plugin session storage
- [ ] Check if old context persists after `/reset` or `/new`
- [ ] Look for context "leakage" between sessions

**Potential fix:** More aggressive context clearing on session boundaries.

---

### H6: Prompt Context vs Message Context (NEW — March 27)
**Theory:** Terminal/cron sessions include explicit task context ("Check AI Continuity Framework repo", "Process email inbox") while Telegram invocations are triggered by "new message from X" with no task framing. The Retriever has richer signal to work with in terminal sessions.

**Evidence needed:**
- [ ] Compare retrieval query content across session types
- [ ] Analyze what context Retriever has available at injection time
- [ ] Test whether adding "task hint" to Telegram sessions improves recall

**Proposed differentiation:** Session-type metadata should influence retrieval strategy:
- **Cron/terminal:** Weight memories matching the cron description or script purpose
- **Telegram:** Weight memories matching the human profile + recent conversation topics
- **Webchat:** Weight memories matching referral source or landing page context

**Filed by:** Amigo (via Issue #4 comment, March 27, 2026)

---

## Research Plan

### Phase 1: Instrumentation
1. Add logging to Guardian Scribe to track extraction triggers
2. Log session lifecycle events in Telegram plugin
3. Capture before/after memory counts for test conversations

### Phase 2: Comparative Testing
1. Have identical conversations via terminal and Telegram
2. Compare memory extraction results
3. Document qualitative differences in agent behavior

### Phase 3: Hypothesis Validation
1. Test each hypothesis with targeted experiments
2. Document findings
3. Prioritize fixes based on impact

### Phase 4: Implementation
1. Implement fixes for validated hypotheses
2. A/B test improvements
3. Document best practices

---

## Related Work

- [Guardian Architecture](../guardian/README.md)
- [05-Session-Management.md](../05-Session-Management.md)
- [mem0-analysis.md](./mem0-analysis.md) — How mem0 handles session boundaries
- [zep-analysis.md](./zep-analysis.md) — Zep's approach to continuous memory

---

## Community Notes

This is an open research problem. If you're experiencing similar issues with Guardian or other memory systems across different chat channels, please contribute:

1. Describe your setup (which channels, memory system, etc.)
2. Share observations about behavior differences
3. Propose or test hypotheses

**Discussion:** [GitHub Issue #53](https://github.com/leonardrknight/ai-continuity-framework/issues/53)

---

## Changelog

- **2026-03-27:** Added H6 (Prompt Context vs Message Context) based on lived experience.
- **2026-03-26:** Initial document created. Five hypotheses proposed.
