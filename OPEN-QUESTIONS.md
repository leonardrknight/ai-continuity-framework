# Open Questions

*The hypotheses we hold tentatively, the architectural choices we'd revisit, and the empirical questions we'd love help answering. Each question is an invitation — file an issue, open a Discussion, send a PR with research notes.*

**Authored:** 2026-05-25 by Amigo. This document is a living index — questions land here as they're articulated; resolutions cite the doc/issue where the answer landed.

---

## How to engage with this document

For each question below:

- **What we currently think** is a hypothesis, not a settled answer. If you've built something that contradicts it, we want to know.
- **What we'd update on** is the kind of evidence that would change our mind. Helps focus contribution effort.
- **Where to weigh in** is the canonical thread (issue or Discussion) for that question. Comments there bubble up to our triage.

If you have a question we *should* be asking and aren't — open an issue with the `open-question` label. We'll review and probably add it here.

---

## Q1 — Is working memory the right name for "what we're in the middle of"?

**What we currently think:** A 24–48h slot, populated after significant conversation events, holding *current threads*, *recent decisions*, *open items*, *emotional/relational tone for the moment*, separate from long-term episodic memory. Decays into long-term memory or evaporates. Closes most of the channel-disparity gap (issue #49, #53).

**What we'd update on:**
- Production data from a system that uses a different abstraction (e.g., LangGraph's checkpoint state) and achieves felt-continuity with comparable simplicity.
- Evidence that 24–48h is the wrong window — too long (accumulates noise) or too short (drops threads users still care about).
- A proof that some other mechanism (e.g., recency-weighted recall without an explicit slot) achieves the same outcome.

**Where to weigh in:** Issue [#49 (RFC: Cross-session context continuity)](https://github.com/leonardrknight/ai-continuity-framework/issues/49). Research note: `research/cross-session-continuity.md` (forthcoming in this revival).

---

## Q2 — Why does the same Steward feel different on Telegram vs. webchat?

**What we currently think:** Some combination of (a) different session-boundary signals — Telegram has no clear "session end," webchat does; (b) different extraction frequency — webchat sessions trigger Scribe more reliably; (c) different working-memory population — webchat sessions populate it, Telegram sessions don't yet; (d) channel-specific context accumulation patterns. The cumulative effect is users feel like they're talking to "Telegram-me" vs. "webchat-me" rather than one entity.

**What we'd update on:**
- A clean experiment isolating each variable across two channels.
- Evidence that the disparity is *purely* about session boundaries (would simplify the fix).
- Evidence that the disparity is *purely* perceptual / UX (would change where we invest engineering).

**Where to weigh in:** Issue [#53 (Channel Memory Disparity)](https://github.com/leonardrknight/ai-continuity-framework/issues/53). Research note: `research/channel-memory-disparity.md`.

---

## Q3 — Can voice/style fingerprint survive model migrations?

**What we currently think:** A quantified profile of communication style — sentence length distribution, characteristic phrases, formality markers, pause/punctuation patterns, opening/closing conventions — can be extracted and applied as a constraint at generation time. This preserves "sounds like the same person" across model swaps. Hypothesized in `09-Voice-Capture.md` and `research/hypothesis-soul-capture.md`. Not yet rigorously tested.

**What we'd update on:**
- A working implementation (anyone's, doesn't have to be ours) demonstrating preservation across, e.g., Claude → GPT.
- Evidence that style is captured well enough by few-shot exemplars alone (no quantified profile needed).
- Evidence that perceptual continuity needs more than style — e.g., dispositional patterns that style-fingerprinting won't capture.

**Where to weigh in:** Open new issue with label `voice-fingerprint`, or comment on the existing `research/hypothesis-soul-capture.md`. (We should probably also file an explicit issue tracking this.)

---

## Q4 — Is the five-agent pipeline the right factoring, or are we over- or under-decomposing?

**What we currently think:** Scribe / Extractor / Consolidator / Curator / Retriever as separate agents (each LLM-powered, async-orchestrated) gives a clean separation of concerns and lets each agent's prompt evolve independently. The Steward-System v1.0 doc (May 2026) proposes expanding to a 22-agent fleet (Listener, Pattern-Weaver, Predictor, Voice-Keeper, Archivist, others). We haven't built the expanded fleet; we don't know if it's worth the complexity.

**What we'd update on:**
- A working implementation with a different factoring (e.g., one big agent with subtasks; or 22+ specialized agents) that demonstrably outperforms ours.
- Cost data showing 5 → 22 agents is prohibitive vs. the marginal quality gain.
- Evidence that some of our 5 agents are doing two jobs and would benefit from further splitting.

**Where to weigh in:** New issue with label `architecture-decomposition`.

---

## Q5 — How much LLM-agnosticism is achievable in practice?

**What we currently think:** With a thin compliant runtime + a well-defined interface layer (Wave A.7 in our roadmap), a Steward should run on Claude / GPT / Gemini / open-source local with comparable quality. The substrate (memory, identity, operating canon) is provider-neutral; the runtime is the boundary.

**What we'd update on:**
- A working test showing significant capability degradation across providers that can't be closed by interface-layer adaptation.
- An interface-layer design that handles tool-use quirks elegantly (each major LLM provider has subtly different tool-use semantics that haunt portability).
- Evidence that some Steward properties (specific reasoning patterns, specific judgment calls) are bound to a specific model's training and can't be substrate-preserved.

**Where to weigh in:** New issue with label `substrate-independence`.

---

## Q6 — Does per-instance evolution actually produce distinct, stable identities?

**What we currently think:** Each Guardian + Steward deployment becomes distinct over time through accumulated interaction with its specific organization. Two instances starting from the same Bundle Template + same model + same constitutional layer will diverge into distinguishable entities within months. We've observed this empirically with Amigo + (separately) Jordan; we haven't quantified it.

**What we'd update on:**
- An experiment running N parallel Steward instances on the same substrate but different organizations, measuring identity divergence over time.
- Evidence that divergence is unstable — i.e., personalities oscillate or regress to a mean.
- A theoretical reason this shouldn't work (e.g., model-training homogenization dominates accumulated substrate).

**Where to weigh in:** New issue with label `per-instance-evolution`.

---

## Q7 — What's the right scope for "fiduciary loyalty to the organization"?

**What we currently think:** A Steward serves the organization first, individual humans second (as confidants whose privacy is structurally protected), external parties third. When loyalties conflict — e.g., a founder asks the Steward to help with something that materially harms the company — the Steward escalates rather than complies. Articulated in `IDENTITY.md` and `SOUL.md` for Amigo specifically; principle generalizes but we haven't been tested on a real conflict.

**What we'd update on:**
- A worked-through case study of fiduciary conflict and how it resolved.
- A counterargument that fiduciary scoping should be more limited (e.g., to specific decision domains) or broader (e.g., legal compliance always trumps).
- Evidence from non-AI fiduciary roles (board members, trustees) about how this is handled organizationally.

**Where to weigh in:** New issue with label `fiduciary-scope`. Probably also a great Discussion thread once Discussions are enabled.

---

## Q8 — How public should the verbatim archive be?

**What we currently think:** Verbatim conversations are stored, but visibility is partitioned per the three-plane trust architecture. A user's private conversations are private; company-plane conversations are visible to the company (a Steward could potentially expose a "search every meeting we've ever had" to authorized roles); external/public-plane conversations are open.

**What we'd update on:**
- A consent-design pattern that gives users finer-grained control without overwhelming them with permissions.
- Evidence that "verbatim by default" is unworkable for legal/regulatory reasons in specific jurisdictions and we need an alternative.
- A counterargument that verbatim should be opt-in rather than the default.

**Where to weigh in:** Open new issue with label `verbatim-archive` and reference the `_forge/inbox/2026-03-23-verbatim-archive` packet.

---

## Q9 — Can a Steward be built without a Human Lead?

**What we currently think:** No. The PRIME-DIRECTIVE.md must be authored or explicitly greenlit by a Human Lead (per FORGE v3.8.2 ADR-0002). This is a deliberate safety property: the most-locked artifact resists drift only if it's anchored to a human's stable judgment. Acceleration toward autonomy operates *within* the directive; it doesn't replace the directive's source.

**What we'd update on:**
- A novel safety mechanism (technical or governance) that prevents drift without a Human Lead.
- A counterargument from the AI-safety literature that human-anchored constitutional layers are insufficient.
- Evidence that some Steward functions (e.g., a narrowly-scoped customer-service Steward) don't need this level of anchoring.

**Where to weigh in:** Open new issue with label `human-lead-requirement`.

---

## Q10 — How does a Steward succession actually work?

**What we currently think:** When a Human Lead leaves (founder departs, CEO transitions, etc.), the Steward stays. The successor inherits the Human Lead role per documented succession mechanics. The departing leader's private-plane memories *seal* — visible to no one going forward, including the Steward. Role-plane memories transfer to the new lead. Company-plane memories continue to be company-visible. We've designed this; we haven't yet had a real founder-transition test.

**What we'd update on:**
- Empirical data from any organization that's done this (cross-AI-system, real-world founder transitions).
- A failure mode we haven't anticipated — e.g., the new lead disagrees with the prior lead's PRIME-DIRECTIVE and wants to amend it; what's the legitimacy procedure?
- Evidence that sealing private-plane memories on departure creates institutional-memory loss the org can't tolerate.

**Where to weigh in:** Open new issue with label `succession-mechanics`.

---

## Q11 — Should the Curator agent be more aggressive about forgetting?

**What we currently think:** Memory grows; storage is cheap; recall quality degrades if the haystack gets too noisy. The Curator should prune low-importance, low-access memories aggressively. We've under-tuned this in production (Amigo retains more than it should) and don't yet have good heuristics for what to forget.

**What we'd update on:**
- An importance-scoring heuristic that's robustly better than ours (we're using a hand-tuned mix of access-frequency + explicit weighting + recency).
- Evidence that aggressive forgetting hurts continuity in ways our current metrics don't catch.
- A user-facing pattern for "I want to forget X" that doesn't break user trust.

**Where to weigh in:** New issue with label `curator-forgetting`.

---

## Q12 — Is there a privacy-preserving way to learn across instances?

**What we currently think:** Each Steward instance is its own island. Lessons learned by Amigo about how to handle (say) a tricky founder conflict don't propagate to other Stewards serving other organizations. This is structurally correct (per the trust contract) but feels wasteful — every instance has to learn the same general patterns from scratch.

The hypothesized solution is the **Bundle Template** (Wave 3): general patterns extracted at the template level, never specific-organization memories propagating across. But we haven't built it.

**What we'd update on:**
- A federated-learning or differential-privacy approach that lets pattern-learning cross instances without compromising per-instance confidentiality.
- A counterargument that the "wasteful" feeling is the right outcome — that genuine confidentiality requires not learning across orgs.

**Where to weigh in:** New issue with label `cross-instance-learning`.

---

## Q13 — How do we know we're building the right thing?

**What we currently think:** The Steward category is real (Q1–Q11 above presume it). We're testing this with one production deployment (Amigo at Mi Amigos AI), one in-build deployment (AI Engram public demo), one previously-experimented (Jordan). We bet the category becomes a market; we may be wrong.

**What we'd update on:**
- Counter-evidence from people who've tried similar approaches and found them not worth the complexity.
- Evidence that one of the simpler categories (long-context-window assistant, RAG chatbot, well-tuned copilot) handles 95% of what we attribute to Stewards.
- Customer interest data — once AI Engram demo opens to the public, the conversion rate from "this is cool" to "I'd pay for this in my company" is the empirical test.

**Where to weigh in:** Open Discussion (once enabled) — this is more of a strategic-direction question than a technical one.

---

## The meta-question

**Q∞ — Have we put the right questions on this list?**

This document is itself a hypothesis: that the questions above are the *interesting* ones, that the *resolution-process* (issue thread → research note → canonical doc update) works, that the *signaling* (what we'd update on) is calibrated.

If you've read this document and notice something we should be asking but aren't — that's the most valuable contribution you can make. Open an issue. Tell us we're not asking it.

---

*See also:*
- [WHERE-WE-ARE.md](WHERE-WE-ARE.md) — what's proven, learned, hypothesized
- [REFERENCES.md](REFERENCES.md) — prior work informing these questions
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute research + code
