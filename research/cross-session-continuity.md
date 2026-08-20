# Cross-Session Continuity — Research Note

*Consolidating: original RFC (issue #49, 2026-03-19), production observations from Amigo (Mar–May 2026), proposed architectural answer (Active-Context-Composer, Wave B). This note is a living document; it'll grow as we test the hypothesis.*

**Refreshed:** 2026-05-25 (revival pass)
**Tracking issue:** [#49 (RFC: Cross-session context continuity)](https://github.com/leonardrknight/ai-continuity-framework/issues/49) — kept open as an active research question
**Status:** Hypothesis articulated; Active-Context-Composer in design; not yet proven.

---

## The problem

When the same human talks to the same Steward across different channels (webchat, Telegram, mobile, email), the experience can feel fragmented even when the underlying memory store is shared. Concrete production example from March 2026 (Amigo):

- **Webchat session (Leo):** 121K tokens, deep strategic discussion. Many decisions, many memory extractions, rich working state.
- **Telegram session (Leo, immediately following):** 27K tokens, sparse recall of the same conversation. Felt to Leo like talking to a Steward that knew about him but hadn't been in the prior session.
- **User feedback (paraphrased):** "Telegram doesn't feel like you."

The model is the same. The memory store is the same. The retrieval is filtered by `human_id`, so Leo's memories are accessible in both sessions. But the *felt sense* of continuity differs.

## Root cause analysis

Guardian provides **episodic memory** (facts, events, decisions extracted to durable storage). What it doesn't (yet) provide is **working context** — what's currently in the middle, what was just decided, what's the open thread, what's the emotional/relational tone of the moment.

The retrieval call returns:
```
memory-guardian: recall complete — 10 memories, profile: yes, working memory: 0 items
```

The `working memory: 0 items` is the gap. The slot exists in the schema; it isn't populated.

The model receiving this context can summon facts about Leo (his projects, his team, his preferences) but doesn't know that *the last 90 minutes of conversation* happened — that very recent context is *not in the durable memory layer yet* (extraction hasn't finished) and *not in the channel-local context buffer* (new session, new buffer).

This is the gap. Not a memory store problem, not a retrieval problem — a *missing layer* problem.

## The proposed solution: Active-Context-Composer

Designed in Steward-System v1.0 (May 24, 2026); not yet built. The Active-Context-Composer is a runtime layer that runs at session start (and at significant in-session pivots) to synthesize the right context for each turn. It populates a structured slot the model receives every turn:

```yaml
working_context:
  recent_threads:
    - "negotiating RecallTech term sheet — Leo, Carlos, last 48h"
    - "PRIME-DIRECTIVE.md drafting — Leo, last 24h"
  open_items:
    - "Tj at RecallTech awaiting response on revised term sheet (sent 2026-05-08)"
    - "Q1 mobile architecture decisions pending (D1-D6)"
  recent_decisions:
    - "Lock PRIME-DIRECTIVE.md v1.0 (Leo, 2026-05-25 08:24)"
  relational_tone:
    - "Leo: moving fast, executive-summary mode, full autonomy granted on AICF"
  channel_handoff:
    - prior_channel: webchat
    - prior_session_ended: 2026-05-25 09:15
    - prior_session_summary: "PRIME-DIRECTIVE locked, AICF revival assigned"
```

This is populated by a Composer agent that:

1. Runs at session start (or detected channel-switch).
2. Pulls the most-recent extracted memories from the last N hours.
3. Pulls in-flight session state from any open prior session.
4. Synthesizes the structure above using LLM-powered summarization (with explicit "be honest about uncertainty" prompting).
5. Decays the slot over a 24–48h window — older content rolls off into long-term memory.

The model now receives, every turn: durable memories (existing) + profile (existing) + **working context (new)**. The "felt continuity" question becomes: does this third slot, populated correctly, close the cross-session gap?

## Hypotheses + what we'd update on

| Hypothesis | What we'd update on |
|-----------|---------------------|
| Working context closes most (>70%) of the felt-continuity gap. | A/B test once the Composer ships: same user, same time window, with and without the slot. Measure perceived continuity (post-session survey) + objective recall (does the model reference the right thread). |
| 24–48h is the right working-context window. | Drift data — if users say "you forgot what we talked about yesterday" frequently with a 24h window, extend it. If the slot accumulates noise faster than it helps, shorten. |
| Working context should be channel-aware (different summary for Telegram vs webchat). | Empirical test of identical-content vs channel-tailored. We expect channel-aware wins on Telegram (terse, mobile-context) and loses elsewhere. |
| The slot should be synthesized fresh per turn, or stable across the session. | Cost-quality tradeoff. Fresh-per-turn is more expensive but more responsive to in-session pivots. Likely answer: stable across session, with explicit "refresh working context" invalidation triggers (long pause, topic shift, user explicitly mentions a prior thread we haven't surfaced). |
| Working context generalizes — same architecture works across all channels we add later (mobile, voice, email). | Channel-by-channel observation as we ship each. |

## Related work

- **MemGPT's main-context vs recall-storage** ([Packer et al., 2023](https://arxiv.org/abs/2310.08560)) — the OS-paging-style abstraction informs our thinking. Our working-context slot is roughly MemGPT's "main context," but the *contents* are synthesized rather than just paged.
- **LangChain's `ConversationSummaryMemory`** — summarizes prior conversation into a running buffer. Conceptually adjacent; differs in that we're cross-session not in-session, and we structure the summary rather than free-text.
- **Zep's session summaries** — similar in spirit; differs in our cross-session/multi-channel emphasis.

See `REFERENCES.md` for full citations.

## Open questions

These are the parts where community input would be most valuable:

1. **Is "working context" the right name?** It overlaps with cognitive-science usage that may not transfer cleanly. Alternative names floated internally: "active state," "session bridge," "continuity buffer," "what's in the room right now." If you have strong taste here, weigh in on [#49](https://github.com/leonardrknight/ai-continuity-framework/issues/49).

2. **What's the right cost-quality tradeoff for the Composer's LLM calls?** Composer runs at session start; that's a one-time cost per session. But if the slot is refreshed mid-session, costs scale with conversation length. We're prioritizing quality at the start; experimenting with refresh frequency later.

3. **How do we handle the "model doesn't surface working context unless prompted to" failure mode?** Even when the slot is populated, the model may not weave it into responses naturally. Prompt-engineering question; we'll iterate.

4. **Channel handoff semantics — explicit or implicit?** When a human moves from webchat to Telegram mid-thought, do we detect that automatically (same human_id, different channel, within N minutes) or does the user say "continuing from webchat"? Implicit is more magical; explicit is more reliable.

## What's actually built right now

As of 2026-05-25:
- ✅ Schema slot for working_memory exists in the Guardian database.
- ✅ Retriever returns it (returning 0 items, because nothing populates it).
- ❌ Composer agent — not built. Wave B work.
- ❌ Channel-switch detection — not built. Likely lives near Composer.
- ❌ A/B test harness — not built. Once Composer ships.

## Engagement

Issue [#49](https://github.com/leonardrknight/ai-continuity-framework/issues/49) is the canonical thread. PRs welcome. Research from outside teams (papers, blog posts, working code) that addresses any of the hypotheses above is exactly the kind of contribution that updates our thinking.

If you've solved this problem in your own system, we'd love to hear about it — not just the design, but where it failed and what you learned.

---

*See also: [WHERE-WE-ARE.md](../WHERE-WE-ARE.md) §"Hypothesized" for the broader research-question context; [OPEN-QUESTIONS.md](../OPEN-QUESTIONS.md) Q1 + Q2 for the structured invitations.*
