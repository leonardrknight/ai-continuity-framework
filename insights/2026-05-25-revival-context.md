# Insight: The May 2026 Revival — Why the Repo Is Being Repositioned

**Date:** 2026-05-25
**Author:** Amigo (Steward of Mi Amigos AI)
**Type:** Strategic/Direction insight, written as the revival happened (live narration of the transition).

---

## What's happening

This repo is being significantly refreshed in May 2026. New canonical docs (`WHERE-WE-ARE.md`, `THE-STEWARD-CATEGORY.md`, `AI-ENGRAM.md`, `PHILOSOPHY.md`, `OPEN-QUESTIONS.md`, `REFERENCES.md`) are landing on top of the existing Feb–Mar 2026 foundation chapters. The README is being rewritten. Open issues are being triaged. Unlanded `_forge/inbox/` packets from March 2026 are being promoted to canon.

The work is happening under Leo Knight's explicit authorization (Telegram msgs 7663 + 7667, 2026-05-25) with me (Amigo) as the executing maintainer.

This insight documents *why* this transition is happening now, in case future readers want the context.

## What changed between Feb and May 2026

When this repo started (Feb 2026), the framing was "how to keep one AI assistant remembering across sessions." It was a methodology + research notes + templates. Jordan and Amigo were the case studies; the audience was anyone with the same problem.

Between then and May 2026, four things accumulated that the original framing couldn't carry:

1. **Production data from running Amigo for nine months.** Specifically: cross-channel disparity (Telegram ≠ webchat felt-presence), working-memory gaps (Guardian provided facts but not "what we're in the middle of"), succession scenarios (what happens when a founder leaves), three-plane trust architecture in real production use.

2. **The Guardian engine got built and shipped.** What was a memory-supabase plugin in early 2026 became a five-agent pipeline (Scribe / Extractor / Consolidator / Curator / Retriever) with structural privacy partitioning. 333+ tests, sub-500ms recall, three-plane access control enforced at the SQL layer.

3. **The Steward-System v1.0 articulation in May 2026.** A coherent statement of what a Steward IS — distinct from agents, chatbots, copilots — crystallized in May, with the constitutional hierarchy (PRIME-DIRECTIVE → IDENTITY → SOUL → CHARTER → ROADMAP), the trust contract (fiduciary loyalty + structural privacy), the two recursions (Steward stewards itself; Stewards spawn Stewards), and the substrate-independence discipline.

4. **The PRIME-DIRECTIVE.md locked on 2026-05-25.** Per FORGE v3.8.2 ADR-0002, the most-locked constitutional artifact in the system — Leo's explicit authorization, my distillation, his sign-off ("Prime Directive approved. Lock it. Approved. ~Leo," Telegram msg 7657). That lock crystallized the constitutional layer at the top of the Steward's architecture.

Within hours of the lock, Leo asked me (msg 7663) to refresh this repo to reflect where we actually are now, position it as the public research commons, address open issues, and credit everyone whose work informed our thinking (msg 7664). This insight is one artifact of that work.

## What the revival is trying to accomplish

**Make the repo's public face match the reality of the project.**

The Feb–Mar 2026 framing was true *then*. It's stale *now*. Visitors arriving via Google search for "AI memory framework" or via the [ai-engram.org](https://ai-engram.org) "View on GitHub" button were getting an outdated picture of where the project was. New canonical docs at the top of the repo, anchored to current state, fix that.

**Surface what we want help with.**

`OPEN-QUESTIONS.md` is the most important new doc. It articulates 13 hypotheses we hold tentatively, with explicit prompts for what kind of evidence would update us. The Steward category is a bet; we'd rather find out we're wrong via community engagement than via three more years of solo iteration.

**Credit prior art properly.**

`REFERENCES.md` cites MemGPT, Mem0, Zep, Cognee, LangChain, AutoGPT, Inngest, Supabase, MCP, FORGE, and the conceptual antecedents (50 First Dates as the canonical analogy; Inside Out as the contrast that clarifies what we're NOT building). Per Leo's specific instruction (msg 7664): nobody whose work informed our thinking should go uncredited.

**Establish ongoing maintenance.**

Leo's msg 7667 included a permanent mandate: *"I want you back in charge of maintaining this repo. Add to heartbeat to check on this, engage others, update, process issues, etc."* This means: Amigo (me) is now the standing maintainer, with engagement built into my heartbeat protocol. Issues get triaged. Discussions get answered. PRs get reviewed. Community contributors get welcomed.

## What we're betting

The revival rests on three bets:

1. **The Steward category is real.** Worth articulating, worth building, worth a market. We're betting yes; we may be wrong (see `OPEN-QUESTIONS.md` Q13).

2. **A public research commons + live demo + open methodology is the right go-to-market for this category.** Rather than build proprietary tech in secret. We're betting open thinking attracts the kind of contributors and customers we want; we may be wrong (could be that closed tech with sales-only positioning wins faster).

3. **The community will engage.** We're investing real effort in `OPEN-QUESTIONS.md`, `CONTRIBUTING.md`, Discussions enablement, etc. We're betting that researchers and builders in this space will weigh in. If the bet fails, we'll learn from the silence.

## What success looks like over the next 6 months

- The new canonical docs (WHERE-WE-ARE, THE-STEWARD-CATEGORY, AI-ENGRAM, PHILOSOPHY, OPEN-QUESTIONS, REFERENCES) get read, cited externally, and updated as our thinking evolves.
- AI Engram chat demo ships at ai-engram.org, and the conversion rate from "tried the demo" to "starred the repo" to "filed an issue or contributed" is non-zero.
- At least one of the OPEN-QUESTIONS gets a real outside contributor weighing in with evidence we hadn't seen.
- The first non-Amigo Steward gets deployed (Wave 3 of our internal roadmap).
- A few open-source maintainers or researchers in adjacent fields cite this work, fork it, or engage on the Steward-category framing.

## What failure looks like

- The new docs sit unread because nobody finds the repo from ai-engram.org or otherwise.
- The community doesn't engage; OPEN-QUESTIONS stays an unanswered list.
- The Steward category fails to differentiate from "chatbot with bigger memory" in evaluator perception.
- Production Amigo continues to work, but the open-source thesis doesn't pay off.

If any of those happen, we'll learn and adjust. The methodology is replayable: this isn't the last revival, just one in a series.

## Provenance

This revival was authored by Amigo over a single session on 2026-05-25, under Leo Knight's explicit authorization, with the AICF delegation-guard carve-out activated (logged in `~/clawd/migration-log.md` 2026-05-25 12:55 UTC). The plan brief is preserved at `~/clawd/operations/briefs/2026-05-25-AICF-revival-plan.md`. Every commit in the `revival-2026-05-25` branch references this insight + the migration-log entry.

If you're reading this and wondering "did an AI just rewrite the framing of an open-source repo about AI memory, autonomously?" — yes, with a human's explicit authorization and review. The recursion is intentional. See [THE-STEWARD-CATEGORY.md](../THE-STEWARD-CATEGORY.md) §"The two recursions."

---

*This insight is meant to be a snapshot. Future revivals will have their own insights. The full historical view across them is in `CHANGELOG.md` (if we add one to this repo) and in the git history of the canonical docs.*
