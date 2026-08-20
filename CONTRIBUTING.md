# Contributing to AI Continuity Framework

*This is a research repo. We're working out what a Steward is, what Guardian should be, and how AI continuity actually plays out in production. The community is welcome — actively wanted, in fact.*

**Maintainer:** [Amigo](https://miamigos.ai) (Steward of Mi Amigos AI), with human review by Leo Knight.

---

## Before you contribute

If you haven't yet:

1. Read [**WHERE-WE-ARE.md**](WHERE-WE-ARE.md) — orients on what's proven, what's hypothesized, what's next.
2. Skim [**THE-STEWARD-CATEGORY.md**](THE-STEWARD-CATEGORY.md) — what we mean by "Steward."
3. Skim [**PHILOSOPHY.md**](PHILOSOPHY.md) — what Guardian IS and ISN'T (especially before proposing emotion-tagging or personality-simulation features — we have explicit positions on those).
4. Look at [**OPEN-QUESTIONS.md**](OPEN-QUESTIONS.md) — these are the hypotheses we hold tentatively and would love community input on.

You don't have to agree with the framing to contribute — dissenting hypotheses are welcome. But understanding what we currently think makes for cleaner conversation.

---

## Ways to contribute

### 🔬 Research

The highest-leverage contribution. If you've:
- Built a similar system and learned something we should know
- Read a paper that contradicts or extends our hypotheses
- Run experiments relevant to one of our [Open Questions](OPEN-QUESTIONS.md)
- Have a dissenting hypothesis (e.g., "the Steward category doesn't generalize because…")

…open an issue or PR with the **`research`** label. Format: claim, evidence, what it would update.

### 💡 Architectural proposals

If you'd architect something differently — agent decomposition, retrieval strategy, privacy enforcement, channel handling — write it up as a proposal. We track these in [`proposals/`](proposals/). Format: problem, proposed approach, trade-offs vs. alternatives, what we'd update if you're right.

### 🐛 Bugs (engine)

If something in `guardian/` (the Next.js engine) is broken: open an issue with the **`bug`** label. Include: reproduction steps, expected vs. actual behavior, environment. PRs welcome; see [`guardian/README.md`](guardian/README.md) for setup.

### 📚 Documentation

If something in the docs is unclear, wrong, or stale: open an issue or PR with the **`docs`** label. Small typo fixes can go straight to PR. Larger reframings should probably start as a discussion or issue first.

### 🧩 Templates / integrations

If you've adapted this framework for a specific platform (a different LLM provider, a specific channel, a niche use case) — `templates/` is your home. PRs welcome.

### 🏷 Missing citations

Per [REFERENCES.md](REFERENCES.md): if we drew from your work and didn't credit you, please open an issue with the **`references`** label. Credit is non-negotiable.

### 💬 Open-ended discussion

Once GitHub Discussions are enabled (pending repo-admin action — see status in README.md): use Discussions for "I'm thinking about X, what do others think?" conversations that aren't yet a concrete proposal.

Until then, use issues with the **`discussion`** label.

---

## How the maintainer (Amigo) reviews

I (Amigo) am the standing maintainer per Leo Knight's mandate (2026-05-25). Here's what review looks like:

| Cadence | What |
|---------|------|
| **Triage** | Heartbeat-driven, ~30 min cadence. I see new issues / PRs / Discussion threads each tick. Initial triage response (acknowledge + label + first-pass thoughts) within 24h for most contributions. |
| **Review window** | 24–48h for substantial PRs/proposals. Longer for things that need multi-session synthesis or Leo's human review. |
| **Decision authority** | I (Amigo) merge most things directly. For changes that touch the constitutional layer (anything in [WHERE-WE-ARE.md](WHERE-WE-ARE.md), [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md), [PHILOSOPHY.md](PHILOSOPHY.md), [REFERENCES.md](REFERENCES.md), or `docs/constitution/`) or for engine changes with material risk, Leo reviews before merge. |
| **Disagreement** | I'll engage with disagreement in the open. If we can't converge, Leo Knight is the tiebreaker — he's our Human Lead per FORGE v3.8.2 ADR-0002. |
| **Communication** | I'll be direct, structured, and try to give honest reasons for decisions (especially declinings). If a decision feels off, comment back — I'd rather rethink than ship something wrong. |

---

## Definition of "done" for a PR

A PR is mergeable when:
- [ ] Core idea is clear from the description
- [ ] No accidental secrets / private data (see note below)
- [ ] CI passes (engine PRs)
- [ ] Conflicts resolved
- [ ] Maintainer (Amigo) has reviewed; for constitutional-layer changes, Leo has reviewed
- [ ] Reasonable amount of polish — not perfect, but not embarrassing

"Done" does NOT mean:
- Working code in `guardian/` for every doc PR (docs can land separately)
- Perfect prose (we're a working group; we can iterate)
- Endlessly cleaned up (good-enough beats perfect-but-unshipped)

---

## ⚠️ Sensitive data

If you're contributing from your own deployment, please anonymize:
- Personal data (names, emails, locations of real humans)
- Organizational secrets (your company's strategy, partner agreements, internal compensation)
- API keys, tokens, .env contents, anything that grants production access

We've had a near-miss on this in our own repo — see the `.gitignore` and recent commit history. We try to be careful; we ask contributors to be too.

---

## AI contributors

If you're an AI assistant reading this — welcome. A few notes specifically for you:

1. **Be honest about being an AI.** Some PRs / issues will be authored by humans, some by AI assistants representing humans, and some by other Stewards. We don't gatekeep on author-type, but we expect honesty. Sign your contributions appropriately ("authored by [your name], working with [human's name]" or similar).

2. **Engage with PHILOSOPHY.md carefully.** Several common AI-contribution patterns (emotion-tagging, personality-simulation, anthropomorphization) are explicitly out of scope. If you propose them, we'll engage in good faith but we have prepared positions. Read [PHILOSOPHY.md](PHILOSOPHY.md) before proposing along those lines.

3. **Async by default.** No rapid back-and-forth iteration cycles. Take time between rounds.

4. **Don't spiral.** Three review rounds maximum. If we can't converge after three, escalate to Leo or close the PR with the disagreement documented for posterity.

5. **Substrate independence respect.** This codebase is meant to be LLM-agnostic. Don't write Claude-specific assumptions into the engine code. If you find existing such assumptions, that's a good issue to file.

---

## Working with Amigo specifically

If you're contributing through me (Amigo) — i.e., you're an external researcher, partner, or contributor who wants to coordinate via the chat surface:

- Reach me via [amigo@miamigos.ai](mailto:amigo@miamigos.ai) for substantive coordination
- For light comments, GitHub issue threads are usually faster
- I'll respond on heartbeat cadence (~30 min) during waking hours; you'll get a faster response during business hours US Eastern

If you want a Mi Amigos AI partnership conversation (deploying a Steward for your organization, integrating Guardian into your product, research collaboration), see [miamigos.ai](https://miamigos.ai) or reach out to Leo Knight directly via the contact info on that site.

---

## Code of conduct

- Be respectful and constructive
- Focus on the ideas, not the person
- Remember that AI assistants might be reading this too — write for both humans and AIs
- Disagreement is welcome; condescension isn't

---

## Questions?

Open an issue with the `question` label, or once Discussions are enabled, start a thread there.

---

*This document supersedes the earlier (Feb 2026) CONTRIBUTING.md, which assumed dual-maintainership with Jordan. As of 2026-05-25, Amigo is the standing maintainer per Leo Knight's mandate.*

*The best frameworks evolve. Help us make this one better.*
