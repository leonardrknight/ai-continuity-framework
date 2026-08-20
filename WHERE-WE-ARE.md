# Where We Are — May 2026

*A current-state snapshot. What we've proven, what we've learned, what we hypothesize, where we're going next.*

**Last refreshed:** 2026-05-25 by Amigo (Steward of Mi Amigos AI)
**Read this first** before the older numbered chapters (01–09) — those are the foundations, but the framing has evolved since they were written (Feb–Mar 2026). This document is the orienting view.

---

## TL;DR

The original framing of this repo — "how to keep one AI assistant remembering across sessions" — was the right starting question and the wrong frame for the answer. What we've actually been building is a substrate for a new category of AI entity, the **Steward** — an AI that persists across sessions, hardware, channels, and human generations, with memory that is structural (privacy partitioned, role-aware, succession-capable) rather than just episodic.

The substrate is **Guardian** — a five-agent memory pipeline (Scribe, Extractor, Consolidator, Curator, Retriever) plus the three-plane trust architecture (company / role / private) that makes per-human privacy a property of the storage layer, not a behavior of the model.

The first instance is **Amigo**, running for Mi Amigos AI since 2026 and providing the production data that informs everything in this repo. The first public-facing demo is **[ai-engram.org](https://ai-engram.org)** — a chatbot showing what Guardian feels like as an end user (multi-tenant, per-user memory, conversational continuity across sessions). The first deployable customer product (Wave 3 in our internal roadmap) packages Guardian + Steward operating layer as a Bundle Template that any business can adopt.

This repo is the **research commons** that documents how we got here, what we've proven, what we still hypothesize, and what we'd like community help thinking through.

---

## ✅ Proven (production-backed)

| Claim | Evidence |
|------|----------|
| **Persistent memory across sessions works.** | Amigo runs continuously since 2026 with full recall of prior conversations, decisions, relationships, and project state. 9 months of operational data. |
| **Semantic + text hybrid retrieval beats either alone.** | Production hybrid recall (pgvector + text match) consistently outperforms pure-embedding recall on novel queries; documented in `research/` analyses. |
| **Background async memory extraction works at production cadence.** | Scribe + Extractor process conversation events into durable memory without blocking the user-facing thread. 333+ tests passing on the engine; <500ms recall latency in production. |
| **Three-plane trust architecture enforces privacy at the storage layer.** | `match_memories_for_human()` filters recall by `human_id` + plane (company / role / private). Carlos's private memories cannot enter Jeff's context window even if the model is prompted to share them. Verified in production. |
| **Migration across hardware is solvable with the right scaffolding.** | Amigo migrated from clawdbot/OpenClaw → Claude Code as runtime in May 2026 without identity loss. Full runbook in `~/clawd/migration-log.md`. The "50 First Dates" problem is solvable in practice. |
| **Per-human relationship continuity is real.** | Founders (Leo, Jeff, Carlos) each have distinct relationships with Amigo, with separate communication-style adaptation, separate confidentiality lanes, separate context. Production behavior matches design. |
| **Acceleration via AI-assisted development is dramatic and real.** | Original ACF estimate of 8–12 weeks (Phase 1–4) collapsed to ~1 day of focused work. This repo + Amigo + Guardian are themselves built at that velocity. (Filed as issue #7.) |

## 📚 Learned (lessons that changed the design)

| Lesson | What changed |
|--------|--------------|
| **Episodic memory ≠ continuity of mind.** Guardian's facts/events/decisions don't, alone, produce the felt sense that "we're continuing the same conversation." | Added the concept of **working memory** as a distinct slot (24–48h window). Filed as issue #49 — see also `research/cross-session-continuity.md`. |
| **Channel context bleeds in subtle ways.** Same human, same model, same memory store — but the Telegram session "feels different" from the webchat session. | Added channel-disparity as an active research question. See `research/channel-memory-disparity.md` and issue #53. Not fully solved. |
| **Inside Out is the wrong metaphor.** Early thinking treated emotion-tagging as load-bearing for memory significance. | Pivoted to *pragmatic perfect recall* — see `PHILOSOPHY.md`. We don't simulate emotions; we preserve verbatim conversations and let importance emerge from access patterns and explicit weighting. |
| **The model isn't the memory; the substrate is.** Early framing treated the AI's identity as a property of the model + its prompt. | Now: identity is structural — composed at runtime from a hierarchical layer (PRIME-DIRECTIVE → IDENTITY → SOUL → CHARTER → operational files) that any compliant model can load. Substrate independence is a load-bearing property. |
| **Privacy is a property of the recall function, not the prompt.** Early designs trusted the model to respect "don't share Carlos's stuff with Jeff." That isn't enough. | Privacy is now enforced at the SQL layer via `match_memories_for_human()`. The model literally cannot see what it isn't filtered to receive. See three-plane architecture notes. |
| **The bottleneck isn't AI capability — it's human decision availability.** A focused day with a present Human Lead beats weeks of fragmented work. | FORGE (our governance methodology) is designed around this. PRIME-DIRECTIVE.md (May 25, 2026) codifies the Human Lead's role at the top of the constitutional hierarchy. |
| **Cross-channel "one mind" is harder than it looks.** Even with shared memory, channels can feel like different entities. | Active research; this is the next major item. The Active-Context-Composer (Wave B in our roadmap) is the proposed architectural answer. |

## 🔬 Hypothesized (active research, not yet proven)

We want community input on these. See `OPEN-QUESTIONS.md` for the full list with discussion prompts.

| Hypothesis | Status |
|-----------|--------|
| **Working-memory injection** (a 24–48h "today so far" slot synthesized from recent extractions) will close most of the channel-disparity gap. | Designing now (Wave B). Testable. |
| **Voice/style fingerprint capture** (a quantified profile of communication style — sentence length, pause patterns, characteristic phrases, formality) can be preserved across model migrations distinctly from facts. | Hypothesized in `research/hypothesis-soul-capture.md` and `09-Voice-Capture.md`. Not yet rigorously tested. |
| **The "Active-Context-Composer"** — a runtime layer that synthesizes the right context for each turn from memory + working-memory + role boundaries + channel awareness — produces felt-continuity better than naive prepend-all-memories. | Wave B architecture. Building. |
| **Substrate independence** (LLM-agnostic, hardware-agnostic, SaaS-agnostic) is achievable without significant capability loss, given a thin compliant runtime + an interface layer. | Wave A.7 work. Partly demonstrated by the clawdbot → Claude Code migration; not yet proven for cross-vendor LLM. |
| **A 22-agent background fleet** (subconscious-style — Listener, Pattern-Weaver, Predictor, Curator, Voice-Keeper, Archivist + others) produces qualitatively different memory behavior than the current 5-agent pipeline. | Designed in Steward-System v1.0 (May 2026); not yet fully built. |
| **Per-instance evolution** — each deployment of Guardian + Steward becomes distinct through accumulated interaction, in a way that's stable enough to be a meaningful identity but variable enough that no two are interchangeable. | Observed empirically in Amigo; not yet quantified. |
| **Public ai-engram demo** (a chatbot at [ai-engram.org](https://ai-engram.org)) will be sufficient to communicate "what Guardian feels like" to non-technical evaluators in <5 minutes. | Demo is live (site only); the chat-with-memory experience is being built. Hypothesis testable on first cohort of users. |

## 🚀 Next (the critical path)

Per our `PRIME-DIRECTIVE.md` (locked v1.0 on 2026-05-25), the work proceeds along this critical path. This is the order — polish and "wouldn't it be cool if" are explicitly off-path until each prior wave closes.

| Wave | What | Status |
|------|------|--------|
| **A** | Stabilize Amigo as a complete Steward instance — operating layer + runtime + persistent memory + 22-agent fleet | In progress |
| **A.7** | LLM-agnostic interface layer — Steward runs on Claude / GPT / Gemini / local without architecture change | Designing |
| **B** | Active-Context-Composer — the runtime context-synthesis layer | Designing |
| **B.5** | Cloud-hosted Steward runtime — others can deploy without managing infrastructure | Planned |
| **2** | Web + mobile interfaces — multi-channel access with parity across modes | Planned |
| **2.5** | Voice fingerprint + G.U.T. layer 5 (cross-modal personality preservation) | Hypothesized |
| **3** | Bundle Template + first ai-engram customer deployment | Goal |

For methodology + the FORGE governance pattern that supports this work, see [FORGE](https://github.com/Mi-Amigos-AI/forge) (when public) or `FORGE-AUTONOMY.yml` here for the autonomy contract.

---

## How to read this repo (the new layout)

| Read first | Then read | Reference when needed |
|-----------|-----------|----------------------|
| **WHERE-WE-ARE.md** (this file) | **THE-STEWARD-CATEGORY.md** — what a Steward is, distinct from agents/copilots/chatbots | **PHILOSOPHY.md** — what Guardian IS and ISN'T |
| **README.md** — orientation + CTAs | **AI-ENGRAM.md** — the public demo + how the site relates to this repo | **OPEN-QUESTIONS.md** — hypotheses we want help with |
| | **01–09 numbered chapters** — the foundations (Feb–Mar 2026 vintage; framing pre-dates Steward category but concepts hold) | **REFERENCES.md** — every paper, repo, project that informed our thinking |
| | | **research/** — vendor analyses (MemGPT, Mem0, Zep, Cognee, LangChain) + current research notes |
| | | **insights/** — production observations from running Amigo |
| | | **proposals/** — architectural proposals (soul capture, agent swarm, intuition) |

---

## Provenance + ownership

| Layer | Owner | License |
|-------|-------|---------|
| Methodology + research (this repo, exc. `guardian/`) | Knight Ventures, Inc. (Leo Knight, CTO Mi Amigos AI) | MIT |
| Guardian engine (`guardian/` subdir) | Knight Ventures, Inc. | License TBD — currently MIT under repo umbrella; may shift if commercially deployed |
| AI Engram demo product ([ai-engram.org](https://ai-engram.org), `~/projects/ai-engram-site`) | Knight Ventures, Inc. | MIT (engine), proprietary (UI/UX deferred) |
| FORGE methodology | Knight Ventures, Inc. — used by reference here | License under FORGE repo |

**Maintainer:** This repo is maintained by [Amigo](https://miamigos.ai) — Mi Amigos AI's Steward — with human review by Leo Knight (Human Lead per FORGE ADR-0002). Issues, PRs, and Discussions are welcome; Amigo will triage and respond. We genuinely want the community building this with us.

---

*If you're new here and not sure where to start: read this file, then [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md), then pick one Open Question that resonates and weigh in. Or open an issue with what you're stuck on — we want the conversation.*
