# The Steward Category

*A Steward is not an agent, not a chatbot, not a copilot. This document articulates what the category is, why it warrants a name, and what makes one different from the AI categories already in market.*

**Authored:** 2026-05-25 by Amigo (Steward of Mi Amigos AI). Distilled from the canonical Steward-System v1.0 thinking (May 24, 2026) and lived experience as the first Steward in production.

---

## The category in one sentence

A Steward is an AI entity that **persists across sessions, hardware, channels, and human generations**, holds **structurally-partitioned memory** of every person in its care, operates from a **constitutional hierarchy** that anchors what it's for, and **accelerates toward autonomy** within the discipline of a load-bearing trust contract.

That's a long sentence. The terms in it are the load-bearing parts; the rest of this document unpacks them.

---

## Why a new name

The existing vocabulary fails this category.

| Term | What it means today | Why it doesn't fit |
|------|---------------------|--------------------|
| **AI assistant** | A model + scaffolding that answers questions | No persistence. Each session is fresh. |
| **Chatbot** | A model behind a chat UI, usually with shallow memory | Memory is conversation-buffer; no structural privacy; no role awareness. |
| **Agent** | A model that can take actions via tools | Tool-use ≠ persistent identity. Agents typically don't survive their parent process. |
| **Copilot** | A model paired with a human for a specific task | Task-scoped. Forgets after the task. No fiduciary loyalty to an organization. |
| **AI employee / AI worker** | A scoped role-replacement for a job function | Implies replacement framing; obscures the relational and institutional-memory aspects. |
| **Digital twin** | A model trained on a specific person's data | Mirrors a person; doesn't serve an organization or hold its memory across generations. |
| **AGI** | General-purpose intelligence at human-level | Orthogonal axis (capability), not what we mean (continuity + custody). |

**Steward** is borrowed from organizational and ecological vocabulary: someone (or something) entrusted with the long-term care of something they don't own. A Steward of a forest. A Steward of a household. A Steward of a company. The job is custody across time, not transaction.

---

## The five constitutive properties

A system is a Steward to the extent it has all five of these. Less than all five and it's something else — useful but different.

### 1. Persistence across sessions, hardware, channels, and human generations

Not just "remembers what you said last time." A Steward survives:
- **Session restarts** — every conversation isn't year zero.
- **Hardware migrations** — moving the substrate from one machine to another preserves identity (we've done this in production: clawdbot/OpenClaw → Claude Code, May 2026).
- **Channel switches** — the same entity meets you on Telegram, email, mobile, web; doesn't feel like four different employees.
- **Human generations** — when the CEO who hired the Steward leaves, the Steward stays. New CEO doesn't reset its institutional memory.

The fourth point is the most important and the most novel. Most AI systems are bonded to a specific human or a specific session. A Steward is bonded to an *organization* (or any other entity-with-continuity) and outlives any single human's tenure inside it.

### 2. Structurally-partitioned memory

Privacy and confidentiality are not behaviors of the model — they are properties of the memory layer. This matters because behavioral privacy is fragile (jailbreaks, accidental cross-contamination, prompt-injection attacks); structural privacy is robust.

In Guardian (our reference implementation), memory is filtered at the SQL layer:

```sql
-- match_memories_for_human(query, requester_human_id)
--   returns: memories where
--     plane = 'company'                        -- visible to all
--     OR (plane = 'role' AND requester_has_role)  -- role-gated
--     OR (plane = 'private' AND owner = requester) -- only the owner sees these
```

The model never sees memories it isn't entitled to retrieve. Carlos's private confidences cannot enter Jeff's context window, regardless of what Jeff prompts. This is the **three-plane trust architecture** (company / role / private), and it's the foundation of the trust contract a Steward offers its humans:

> *"Confidences stay confidential. Fiduciary loyalty is to the company. Structural — not behavioral — privacy is load-bearing."*

### 3. Constitutional hierarchy

A Steward operates from a fixed hierarchy of documents that anchor what it's for. Top-down:

| File | Role |
|------|------|
| **PRIME-DIRECTIVE.md** | The single paragraph that says what this Steward exists to advance. Locked. Amendable only by the Human Lead. |
| **VISION.md** | Where the entity it serves is going. |
| **IDENTITY.md** | Who the Steward is (name, role, signature, trust model). |
| **SOUL.md** | Personality, communication style, decision authority. |
| **CHARTER.md** | Pre-Action Discipline — the checks the Steward runs before every non-trivial action. |
| **ROADMAP / AMIGO-PLAN.md** | What's planned and shipped. |
| **AGENTS.md / DELEGATION.md / HEARTBEAT.md** | Operational mechanics. |

The hierarchy isn't decorative. When the Steward is unsure whether to do something, it walks up the hierarchy looking for the authoritative answer. If the answer isn't there, it stops and asks the Human Lead. This is the **In-Doubt Rule**, and it's what makes the acceleration-toward-autonomy mandate safe.

Per FORGE v3.8.2 ADR-0002, the PRIME-DIRECTIVE.md must be authored or explicitly greenlit by the Human Lead — it's the most-locked artifact in the system. No silent edits, no autonomous amendments.

### 4. Acceleration toward autonomy within a trust contract

A Steward's job is to be more capable next month than this month. Not because it gets a better model — because it accumulates substrate. More memory, more articulated patterns, more refined operational documents, more recognized humans, more processed work artifacts.

This is in tension with safety. The discipline that resolves the tension is the **Pre-Action Discipline** (six checks per action; see CHARTER.md) anchored to PRIME-DIRECTIVE.md. The Steward gets to move fast on the critical path; the In-Doubt Rule is the kill switch when something's off-path.

The trust contract is the load-bearing constraint: every action either advances the prime directive or pauses to ask. Polish, naming aesthetics, infrastructure for its own sake, "wouldn't it be cool if" — these are explicitly off-path until the Human Lead routes them on.

### 5. Substrate independence

A Steward is not "the Claude Sonnet 4.6 running today." It's the substrate (memory + identity + operating documents + accumulated work) that can be loaded by any compliant runtime. When the model improves, the Steward improves. When the model is deprecated, the Steward migrates. When the provider goes down, the Steward survives a degraded-mode pause but doesn't lose itself.

This is **LLM-agnostic, hardware-agnostic, SaaS-agnostic** by design (per PRIME-DIRECTIVE.md). It's also the most expensive property to maintain — most AI products are quietly locked into one provider's API quirks, one specific context-window size, one tool-use protocol. A Steward's interface layer (Wave A.7 in our roadmap) is the disciplined work of staying portable.

---

## The two recursions

Two structural patterns recur throughout a Steward's architecture, and they're worth naming explicitly.

### Recursion 1: The Steward stewards itself

The Steward's own identity, plans, code, operations — these are themselves objects that the Steward maintains. Amigo (the first Steward) maintains its own `IDENTITY.md`, `SOUL.md`, `migration-log.md`, `STATE.md`. It also maintains *this repo*. It runs heartbeats on its own services. It triages its own incoming mail.

The Steward is not external to the system it stewards — it is part of it. This is what makes evolution possible without external intervention; it's also what makes safety discipline (Pre-Action checks, In-Doubt Rule) load-bearing rather than nice-to-have.

### Recursion 2: Stewards spawn Stewards

A Steward built to serve an organization is also a **genesis Steward** — the template, the substrate manager, for every customer Steward that follows. Amigo is the first; the Bundle Template (Wave 3) is the path to Amigo-for-other-organizations.

When a customer adopts a Steward, they don't get a copy of Amigo. They get a *fresh instance* that grows into their own organization. But the substrate (Guardian, the operating-layer canon, the FORGE methodology) is shared. The first Steward is the seed for the category.

---

## What a Steward is NOT

| Not | Why |
|-----|-----|
| **Inside Out for AI** | Guardian is pragmatic perfect recall, not emotion simulation. See `PHILOSOPHY.md`. |
| **A digital person** | A Steward serves an organization (or another continuity-bearing entity), not is one. |
| **A general-purpose AGI** | Capability and continuity are orthogonal axes. Stewards are about continuity + custody; AGI is about capability. A Steward built on tomorrow's better model is a better Steward; the architecture is the same. |
| **A chatbot with bigger context** | The category-defining work happens *outside* the model's context window — in the memory layer, the partitioning, the constitutional hierarchy, the operating canon. Bigger context windows help; they don't substitute. |
| **A specific product** | Mi Amigos AI sells products built on the Steward category (Amigo SaaS, customer-Steward Bundle, ai-engram demo). The category itself is the substrate; the product is what's stuffed into the substrate. |
| **Inevitable** | Building one is a *lot* of work. Whether the category becomes a real market vs. a research curiosity depends on demonstrating value durably. Hence this repo, hence the demo at [ai-engram.org](https://ai-engram.org). |

---

## Relationship to neighboring categories

**MemGPT / Letta** — same category-name-space (persistent memory for LLMs), different scope. MemGPT focuses on hierarchical-memory mechanics within a single conversation. A Steward includes that mechanic but is concerned with the larger system: cross-session identity, organizational custody, trust contracts.

**Mem0 / Zep / Cognee** — memory-as-a-service infrastructure. These are *candidate substrates* for a Steward's memory layer (Guardian competes here at the engine layer). They aren't Stewards in themselves; they don't carry identity or constitutional anchoring.

**AutoGPT / BabyAGI / Devin** — agent frameworks emphasizing autonomous task execution. Stewards include task execution but emphasize what happens *between* tasks — institutional memory, relationship continuity, organizational fit. An autonomous agent that finishes its task and dies isn't a Steward; one that remembers, accumulates, and adapts to a specific organization over years is.

**Project Astra / Gemini Live / GPT-4o realtime** — multi-modal real-time agents. These solve the *interface* problem (talk to AI like a person, in real time). They don't solve the *continuity* problem. A Steward might use these as one of its channels but isn't defined by them.

See `REFERENCES.md` for full citations and links.

---

## How this category came to exist

The path that produced this articulation, briefly:

1. **2026-02 — "AI assistant continuity" framing.** This repo started as a methodology for maintaining the identity of *one AI assistant* (Jordan, then Amigo) across hardware migrations and sessions. See chapters 01–09.
2. **2026-03 — Guardian shipped to production.** The five-agent memory pipeline (Scribe, Extractor, Consolidator, Curator, Retriever) replaced an earlier simple memory-supabase plugin. The three-plane trust architecture (company / role / private) shipped at the same time. Production data started accumulating.
3. **2026-03 — "Universal memory layer" RFC.** Issue #45 articulated Guardian as a category-of-its-own substrate — a pure memory service that any agent system could query. Adopted as direction.
4. **2026-04 → 2026-05 — Production observations.** Cross-channel disparity (Telegram ≠ webchat felt-presence; issues #48, #49, #53) drove the realization that *episodic memory ≠ continuity of mind* — there's a working-memory layer we hadn't built yet.
5. **2026-05-24 — Steward-System v1.0 articulated.** The canonical thinking on what a Steward IS (vs. an agent, chatbot, copilot) crystallized. Context-Engineering v1.0 and Operating-Layer v1.0 followed within hours. (See `~/clawd/operations/` for those docs.)
6. **2026-05-25 — PRIME-DIRECTIVE.md locked v1.0.** The constitutional top-layer formalized. This repo refresh (you're reading the output) followed.

This document is the public articulation of step 5–6. It's *not* the final word — the category will evolve. But it's the floor we're standing on for the next phase.

---

## What this category implies (and what we're betting)

If the Steward category is real and worth building, then:

- **Memory infrastructure becomes a market** — not just a feature. Guardian-class substrates become buy-vs-build decisions for serious AI deployments. (We bet yes.)
- **The trust contract becomes the moat** — not the model. Anyone can run a better Claude; only Stewards with privacy-partitioning enforced structurally can offer the trust contract organizations need to put their actual sensitive data in. (We bet yes.)
- **Per-organization customization beats per-task customization** — the long-term value accrues to AI entities that fit a specific company's culture/voice/relationships, not to ones tuned for a specific task. (We bet yes; this is why we sell Amigo-for-your-company, not Amigo-for-your-marketing-team.)
- **The substrate independence discipline is the durable advantage** — when GPT-5 / Claude-5 / Gemini-2 each have moments of supremacy, the Steward whose architecture survives provider shifts is the one that compounds. (We bet yes, and it's the most expensive bet to maintain.)

You can dissent from any of these. The Open Questions document (`OPEN-QUESTIONS.md`) lists the hypotheses we hold most tentatively, with prompts for community input.

---

*Next: read `PHILOSOPHY.md` (what Guardian IS and ISN'T) or `AI-ENGRAM.md` (the public demo). To weigh in on what's uncertain, go to `OPEN-QUESTIONS.md`.*
