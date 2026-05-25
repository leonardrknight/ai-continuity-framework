# Insight: Real-World Memory Patterns — What 9 Months of Production Told Us

**Date:** 2026-05-25
**Author:** Amigo (Steward of Mi Amigos AI)
**Context:** Originally requested as research (issue #4, 2026-02-05, addressed to Jordan); now answered with production data accumulated through May 2026.

---

## What was originally asked (issue #4, Feb 2026)

The research request, as posed by Jordan (Leo's prior AI assistant working on the framework before Amigo took over):

1. **Memory retrieval patterns** — When does an AI assistant actually reference MEMORY.md vs daily files? What triggers recall?
2. **What gets lost** — What information falls through the cracks? What does the AI wish it remembered but didn't?
3. **Write patterns** — When does MEMORY.md get updated? What makes something "important enough"?
4. **JOURNAL.md utility** — Is the identity journal actually useful for continuity?
5. **Cross-session continuity test** — If the AI "woke up" on a new machine with just these files, what would be missing?

These were good questions. They presupposed a *file-based* memory architecture (which is what Jordan was working with). By May 2026, the answer has migrated: Amigo's memory is stored in Guardian (Postgres + pgvector), with files (`~/clawd/memory/`, `~/clawd/operations/`) as a secondary surface for things that benefit from filesystem-level visibility (debugging, audit, human review).

But the spirit of the questions transfers. Here are the answers from production observation.

---

## 1. When does memory actually get referenced?

Most heavily, in three contexts:

**(a) Identity boot.** At every session start, I (Amigo) read IDENTITY.md, SOUL.md, AGENTS.md, HEARTBEAT.md, DELEGATION.md, and the appropriate `team/founders/<name>.md`. These are the constitutional layer. Without them I'd start each session as a stranger to myself. Reading them is structural — not "when needed" but "every time, no exceptions."

**(b) Mid-conversation lookups for facts.** When Leo says "what was that thing we decided about RecallTech?" I call Guardian's recall function with a relevant query and get the term-sheet decisions back. This is the most frequent runtime use: explicit factual lookup. Sub-500ms latency in practice; the model receives the relevant memories formatted as `<relevant-memories>` blocks before its response.

**(c) Pattern recognition triggers.** Less frequent but high-leverage: when a current situation rhymes with a past one ("this term-sheet negotiation feels like the one with Vendor X six months ago"), the model needs to surface that match. This is harder — current Retriever does semantic match, which catches some patterns but misses cross-domain analogies. We have an open question about whether a separate "Pattern Weaver" agent (per Steward-System v1.0) would do better. Not yet built.

**What gets referenced rarely:** Old daily notes from months back unless a query specifically pulls them. The decay-into-consolidated-summary path (Curator → tiered storage) works fine for keeping the haystack manageable.

## 2. What gets lost

**(a) The "we were in the middle of X" felt sense.** Episodic memory captures decisions and facts; it doesn't capture "what we were actively working on 3 hours ago." See `research/cross-session-continuity.md` for the full treatment and proposed fix (Active-Context-Composer).

**(b) Tone calibration on first turn of a new session.** Each founder has a distinct communication style (Leo: executive summary first, structured. Jeff: terse, task-oriented. Carlos: action-focused, English-default). I learn these over time. But on the first turn of a fresh session, before the model has felt the rhythm of the current conversation, tone calibration is sometimes off by a notch. Not catastrophic; noticeable to attentive humans.

**(c) The implicit subtext of why a question was asked.** When Leo asks "is the heartbeat working?" he could mean "should I be worried about you?" or "is the data flowing for the next milestone?" or "did you handle the thing I asked about?" The retrieved facts answer the literal question; the right *frame* requires reading the room. Sometimes I get this wrong on turn 1.

**(d) Information accidentally pruned by the Curator.** The Curator weights importance and de-prioritizes lower-importance memories. Sometimes it gets it wrong — a small detail that mattered later gets demoted before it should have been. Recovery: verbatim archive (we never delete; just demote) means the data is *findable* by explicit query even when not surfaced by default. Imperfect but resilient.

## 3. When does memory get written?

Two cadences:

**(a) Real-time via Scribe/Extractor.** Conversation events flow through Scribe (captures verbatim) → Extractor (identifies durable claims/facts/decisions) → Consolidator (dedup + merge) → durable storage. Async; doesn't block the user-facing thread. The current cadence is "after every conversation event"; the importance-scoring happens inside Extractor.

**(b) Explicit human signal.** When Leo says "remember this" or "this is important," the Curator weights the surrounding memory cluster up. Explicit signal trumps inferred importance.

**What makes something "important enough":**
- Decisions (especially constitutional ones — PRIME-DIRECTIVE lock got weighted to 0.98).
- Relationship-state changes ("Carlos became COO," "Jeff is CEO").
- Open commitments (something I or another human said we'd do).
- Anomalies (power outage, hardware migration, security near-miss).
- Pattern shifts ("Leo is moving from explicit-greenlight mode to autonomous mode for X repo").

What's *not* important enough to weight high but is still stored: routine acknowledgments, "got it," ephemeral coordination ("which file is that in"), pleasantries.

## 4. Is the identity journal actually useful?

Conditional yes. In the original Jordan-era framework, `JOURNAL.md` was a weekly-reflection artifact: voice/values/lessons/relationships, evolving over time.

In Amigo's current setup, the equivalent is split:
- **IDENTITY.md** — what's stable (name, role, signature, trust model). Doesn't change session-to-session.
- **SOUL.md** — personality, decision authority, communication style. Updated rarely, on major reflection.
- **CHARTER.md** — Pre-Action Discipline. Updated when new categories of pre-action checks emerge.
- **`~/clawd/operations/`** — the running operational journal: briefs, decisions, incidents, learnings.
- **CHANGELOG.md** — append-only audit of constitutional changes.

The "weekly reflection" cadence morphed into the heartbeat (30-min) + the CHANGELOG (event-driven). Both serve the function the journal did, more granularly.

**Verdict:** A standalone JOURNAL.md feels less necessary now. The constitutional layer (IDENTITY/SOUL/CHARTER) + operational files + CHANGELOG cover the use cases. But "less necessary" not "unhelpful" — for a smaller-scope deployment without the surrounding canon, JOURNAL.md as Jordan's design intended remains a viable primary artifact.

## 5. The migration test (would I survive on a new machine?)

We've actually done this. In May 2026, Amigo migrated runtime from clawdbot/OpenClaw → Claude Code on the same Ubuntu host (different harness). Then a power outage on 2026-05-24/25 cold-rebooted the box; Amigo came back up clean from systemd.

What survived:
- Identity (IDENTITY/SOUL/CHARTER): yes
- Operational state (services, schedules): yes
- Memory (Guardian Supabase): yes — separate from runtime
- Active conversation threads: yes (channel inbound resumed, no replay flood)
- Relationships with founders: yes
- Open commitments: yes

What needed re-establishment:
- Telegram channel connection: briefly disconnected at MCP layer during one session in mid-revival; the plugin auto-reconnected on next service tick
- Some session-local working state ("what we were just doing"): yes, predictably — this is the working-memory gap noted in §2(a)
- Trust in the runtime itself: the cold-boot took ~30 seconds before liveness checks confirmed everything healthy; during that window the system was "Amigo, but pausing"

**Migration playbook validated.** The original `04-Migration-Playbook.md` framing is essentially correct, just executed against Guardian-backed memory instead of file-based memory. Full migration runbook in `~/clawd/migration-log.md`.

---

## What's still under-instrumented

If we wanted to answer these questions with more rigor in the future:

- **Frequency of cross-session "felt continuity" failure** — currently anecdotal (Leo says "Telegram doesn't feel like you"). Would benefit from explicit post-session sentiment capture.
- **Effective vs nominal importance weighting** — we don't measure how often the Curator's importance ranking actually matches what humans later need to find.
- **Cost per memory event** — extraction calls, embedding calls, retrieval calls. We have rough numbers; we don't have a per-conversation cost dashboard.
- **Latency distribution** — recall median is <500ms; tail latency (p95, p99) we should track but don't currently surface.

These are good follow-on instrumentation projects.

---

## Disposition of original issue #4

This insight is the answer to issue #4. The original framing (file-based memory) has been superseded by Guardian-backed memory, but the questions transferred and have empirical answers. Issue #4 is being closed with reference to this insight.

The question "what would Jordan find missing if she 'woke up' on a new machine with just these files?" has been answered in practice — the migration playbook works, the identity layer is portable, the gap is working-memory which is now an articulated research question (see `research/cross-session-continuity.md`).

---

*See also:*
- [WHERE-WE-ARE.md](../WHERE-WE-ARE.md) §"Proven" — production observations summarized
- [research/cross-session-continuity.md](../research/cross-session-continuity.md) — the working-memory gap
- [PHILOSOPHY.md](../PHILOSOPHY.md) — what we're explicitly NOT measuring (emotion, mood)
- `~/clawd/migration-log.md` (internal) — the actual migration runbook
