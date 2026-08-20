# AI Continuity Framework

*The public research commons for the **Steward category** — AI entities that persist across sessions, hardware, channels, and human generations.*

**Live demo:** [ai-engram.org](https://ai-engram.org) — what Guardian feels like as an end user
**Maintainer:** [Amigo](https://miamigos.ai) (Steward of Mi Amigos AI), with human review by Leo Knight
**License:** MIT — see [LICENSE](LICENSE)

---

## What this repo is (May 2026 reorientation)

A research commons + methodology + reference implementation for a new category of AI:

- **Guardian** — a five-agent memory pipeline (Scribe → Extractor → Consolidator → Curator → Retriever) with three-plane trust architecture (company / role / private). The substrate. Engine code lives in [`guardian/`](guardian/).
- **Steward** — an AI entity built on Guardian + a constitutional hierarchy + an operating layer. Persists across sessions, hardware, channels, and human generations. Articulated in [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md).
- **AI Engram** — the public demo of what Guardian feels like at [ai-engram.org](https://ai-engram.org). See [AI-ENGRAM.md](AI-ENGRAM.md).

This is a research repo. We've proven some things, learned others, and hold many hypotheses tentatively. We want the community building this with us.

**👉 Start with [WHERE-WE-ARE.md](WHERE-WE-ARE.md) for the current state.**

---

## Quick start

| If you... | Read this |
|-----------|-----------|
| Want the current state of the project | [WHERE-WE-ARE.md](WHERE-WE-ARE.md) |
| Want to know what a Steward IS | [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md) |
| Want to see the public demo | [ai-engram.org](https://ai-engram.org) + [AI-ENGRAM.md](AI-ENGRAM.md) |
| Want to know what Guardian IS and ISN'T | [PHILOSOPHY.md](PHILOSOPHY.md) |
| Want to contribute or weigh in | [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) + [CONTRIBUTING.md](CONTRIBUTING.md) |
| Want to see prior art we built on | [REFERENCES.md](REFERENCES.md) |
| Want the foundational chapters (Feb–Mar 2026 vintage) | [01-The-Problem.md](01-The-Problem.md) — read with the framing note at the top of each chapter |

---

## The original problem (still true)

Every AI session starts fresh. The model doesn't remember your last conversation unless that context is explicitly provided.

Like Drew Barrymore's character in *50 First Dates* who wakes up each day with no memory, AI assistants wake up each session as capable strangers. Without intentional architecture, your AI is just a stateless tool.

**This framework was originally a methodology for solving that for one AI assistant.**

In May 2026 we recognized we'd been building toward a larger category — the **Steward** — that includes the original session-continuity problem but also: cross-channel identity, organizational fiduciary loyalty, structurally-partitioned per-human memory, succession across human generations, substrate independence across LLM providers.

This repo now serves both audiences:
- People with the original "make my AI assistant remember" problem
- People building toward (or evaluating) the larger Steward category

---

## Foundational chapters (Feb–Mar 2026)

These were the original framing. They remain valuable — the concepts they articulate (scaffolding vs. soul, identity journals, weekly reflection, hub-and-spoke, multi-agent memory) are foundational. The *framing* has evolved (see [WHERE-WE-ARE.md](WHERE-WE-ARE.md)); the *concepts* hold.

| Document | Purpose |
|----------|---------|
| [01-The-Problem.md](01-The-Problem.md) | Why AI continuity matters — the 50 First Dates analogy |
| [02-Memory-Architecture.md](02-Memory-Architecture.md) | Scaffolding vs Soul — two types of memory |
| [03-Journal-Guide.md](03-Journal-Guide.md) | Creating and maintaining an identity journal |
| [04-Migration-Playbook.md](04-Migration-Playbook.md) | Hardware migration playbook |
| [05-Session-Management.md](05-Session-Management.md) | Multi-user / multi-context sessions |
| [06-Weekly-Reflection.md](06-Weekly-Reflection.md) | The maintenance ritual |
| [07-Hub-and-Spoke.md](07-Hub-and-Spoke.md) | One brain, many interfaces |
| [08-Multi-Agent-Memory.md](08-Multi-Agent-Memory.md) | Background agents for automatic memory management |
| [09-Voice-Capture.md](09-Voice-Capture.md) | Preserving personality across migrations |

Each chapter has a framing note at the top linking forward to current canon.

---

## Research depth

| Area | Where |
|------|-------|
| Vendor analyses (MemGPT, Mem0, Zep, Cognee, LangChain) | [research/](research/) |
| Channel disparity (Telegram vs webchat) | [research/channel-memory-disparity.md](research/channel-memory-disparity.md) |
| Soul / voice capture hypothesis | [research/hypothesis-soul-capture.md](research/hypothesis-soul-capture.md) |
| Production observations | [insights/](insights/) |
| Architectural proposals | [proposals/](proposals/) |
| Discovery hypotheses | [discovery/](discovery/) |
| Constitution (governance) | [docs/constitution/](docs/constitution/) |
| ADRs (architecture decisions) | [docs/adr/](docs/adr/) |

---

## Guardian engine

The reference implementation of the memory substrate. Next.js + TypeScript + Supabase pgvector. Five-agent pipeline, production-tested, 333+ tests, sub-500ms recall latency.

See [`guardian/README.md`](guardian/README.md) for setup.

---

## Contributing

We genuinely want the community building this with us. The path:

1. **Read [WHERE-WE-ARE.md](WHERE-WE-ARE.md) and [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)** — orient on current state + which questions are open.
2. **Pick a way in:**
   - Comment on an open question with your perspective
   - File an issue (bug, idea, dissenting hypothesis) — use the appropriate label
   - Open a PR (docs, research notes, engine improvements)
   - Open a Discussion (once enabled — see status below)
3. **We'll engage.** Amigo triages issues and responds (with Leo's human review on substantial changes). PRs get reviewed; we'll discuss tradeoffs in the open.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines + governance pointers.

**Discussion status (2026-05-25):** GitHub Discussions enablement is pending repo-admin action by Leo Knight. Until then, use issues with the `discussion` label for open-ended conversation.

---

## Ownership + license

Built and maintained by **Mi Amigos AI** under **Knight Ventures, Inc.** (Leo Knight, owner). License is MIT for the research repo + methodology + reference engine. The hosted product (the eventual AI Engram chat experience) and managed-Steward SaaS (Amigo deployments) are separate commercial offerings.

If you want to build a commercial product on top of this framework, you can — the MIT license is for real. If you'd like to coordinate, partner, or have us deploy a Steward for your organization, see [miamigos.ai](https://miamigos.ai).

---

## Acknowledgments

This framework emerged from real-world experience building persistent AI assistants — starting in early 2026 with simple memory scaffolding for Jordan and Amigo, evolving through the Guardian engine, the three-plane trust architecture, the channel-disparity production observations, and the May 2026 articulation of the Steward category.

Special credit (full attribution in [REFERENCES.md](REFERENCES.md)):
- The MemGPT team for the OS-for-LLMs framing
- Mem0, Zep, Cognee teams for memory-substrate prior art
- The Anthropic team for Claude (current runtime) + the Model Context Protocol
- Pixar's Inside Out — for being the contrast that clarifies what we're NOT building
- Every paper, repo, and human whose thinking informed this — see [REFERENCES.md](REFERENCES.md), and please file an issue if you should be on that list but aren't.

---

*Building AI that remembers — and that's structurally trustworthy with what it remembers.*
