# References & Credits

*Everyone whose work, code, paper, or thinking informed this framework. If we've drawn from your work and you're not on this list, please open an issue — we want to fix that.*

**Maintainer's note:** This document is grouped by category. Within each category we cite the work, link it, summarize what it contributes to the field, and note honestly how our approach diverges (or builds directly on it). This is meant as living documentation; it grows with the project.

**Last updated:** 2026-05-25 (initial pass as part of the May 2026 revival).

---

## Foundational papers & systems we build on

### MemGPT — *"MemGPT: Towards LLMs as Operating Systems"* (Packer et al., 2023)

- **Paper:** [arxiv:2310.08560](https://arxiv.org/abs/2310.08560)
- **Code:** [github.com/cpacker/MemGPT](https://github.com/cpacker/MemGPT)
- **Commercial successor:** [Letta](https://letta.com) (formerly MemGPT)
- **Contribution:** First serious articulation of hierarchical memory for LLMs — main context (working memory) + recall storage (vector DB) + archival storage (unlimited external). The "LLM as OS" framing validated tiered-memory thinking generally.
- **How we build on it:** Our tiered-memory model (working / short / medium / long) draws directly from this lineage. The Extractor agent occupies similar conceptual space to MemGPT's "self-editing" approach.
- **How we diverge:** MemGPT focuses on single-conversation memory mechanics. A Steward extends to multi-session, multi-human, multi-channel identity with structural privacy partitioning — concerns outside MemGPT's scope.
- **Our deep-dive:** [research/01-memgpt-deep-dive.md](research/01-memgpt-deep-dive.md)

### Mem0 — Memory-as-a-service

- **Site:** [mem0.ai](https://mem0.ai/)
- **Code:** [github.com/mem0ai/mem0](https://github.com/mem0ai/mem0)
- **Contribution:** Memory as a managed service. LLM-powered extraction of salient facts; vector + optional graph store; explicit user_id/agent_id/session_id partitioning.
- **How we build on it:** Our extraction stage (Extractor agent) operates similarly — LLM identifies durable claims from conversation. Mem0's filtering by user_id parallels our match_memories_for_human() filtering.
- **How we diverge:** Mem0 is a buyable substrate; Guardian is the engine for a larger Steward architecture (constitutional layer, role-based access, succession mechanics). Mem0 is a candidate substrate beneath a Steward, not a Steward itself.
- **Our deep-dive:** [research/mem0-analysis.md](research/mem0-analysis.md)

### Zep — Temporal knowledge graphs for AI

- **Site:** [getzep.com](https://getzep.com/)
- **Code:** [github.com/getzep/zep](https://github.com/getzep/zep)
- **Contribution:** Memory as temporal knowledge graph; entity extraction (people, organizations, locations, concepts); PostgreSQL + pgvector substrate (we share that choice). Running summaries + extracted facts as memory artifacts.
- **How we build on it:** Validates the pgvector-on-Postgres substrate choice. Entity extraction patterns inform our Extractor design.
- **How we diverge:** Zep's strength is temporal-graph reasoning at high precision; Guardian prioritizes per-human privacy partitioning + organizational fiduciary structure. Different optimization targets.
- **Our deep-dive:** [research/zep-analysis.md](research/zep-analysis.md)

### Cognee — Knowledge graphs for AI memory

- **Code:** [github.com/topoteretes/cognee](https://github.com/topoteretes/cognee)
- **Contribution:** Graph-based memory consolidation; predefined or emergent ontologies; multi-format ingest (PDF, Markdown, JSON, code).
- **How we build on it:** Multi-format ingest patterns inform our verbatim-archive thinking. The ontology-emergence model is a design we considered for the Extractor.
- **How we diverge:** We chose vector + relational (Postgres + pgvector) over graph-database primary, prioritizing operational simplicity. Graph reasoning is a future research direction (see `OPEN-QUESTIONS.md` Q4 — architectural decomposition).
- **Our deep-dive:** [research/cognee-analysis.md](research/cognee-analysis.md)

### LangChain Memory Modules

- **Code:** [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)
- **Contribution:** Early articulation of memory primitives (`ConversationBufferMemory`, `ConversationSummaryMemory`, `ConversationKGMemory`). Educational reference; widely adopted as a starter pattern.
- **How we build on it:** The thinking these primitives provoked — *"what's the right memory abstraction for an LLM application?"* — was foundational to the field.
- **How we diverge:** LangChain memory is conversation-scoped; we needed cross-session, multi-human, structurally-partitioned memory. Different scope.
- **Our deep-dive:** [research/langchain-memory-analysis.md](research/langchain-memory-analysis.md)

### AutoGPT — Autonomous agent loops

- **Code:** [github.com/Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)
- **Contribution:** First widely-recognized articulation of an autonomous agent loop (goal → plan → execute → reflect). Demonstrated both the potential and the cost of unbounded autonomy.
- **How we build on it:** Validated the importance of autonomy *with discipline*. Our PRIME-DIRECTIVE.md + Pre-Action Discipline + In-Doubt Rule pattern is designed to capture the upside of autonomous loops while bounding the failure modes AutoGPT made visible.

---

## Background-agent / orchestration infrastructure

### Inngest

- **Site:** [inngest.com](https://www.inngest.com)
- **Contribution:** Durable event-driven orchestration. Our Scribe / Extractor / Consolidator / Curator pipeline runs as Inngest functions.
- **Role for us:** Production substrate. We use Inngest for async background memory processing.

### Trigger.dev, temporal.io

- **Sites:** [trigger.dev](https://trigger.dev), [temporal.io](https://temporal.io)
- **Contribution:** Alternative durable-orchestration substrates. Considered as alternatives during architecture phase.
- **Role for us:** Considered but not adopted; Inngest's developer ergonomics fit our use case better at the scale we operate.

### CrewAI Flows, LangGraph

- **Sites:** [crewai.com](https://www.crewai.com), [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- **Contribution:** Multi-agent orchestration patterns; explicit graph-based agent coordination.
- **Role for us:** Studied for the 22-agent fleet architecture proposed in Steward-System v1.0 (May 2026). Not currently a substrate dependency, but informs our internal coordination design.

---

## Substrate dependencies

### Supabase + pgvector

- **Site:** [supabase.com](https://supabase.com), [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- **Role for us:** Production memory store. Supabase hosts our Postgres + pgvector + edge functions. We chose this over managed vector DBs (Pinecone, Weaviate) for the relational-data integration and operational simplicity.

### Anthropic Model Context Protocol (MCP)

- **Spec:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Role for us:** Substrate-independence affordance. Where it makes sense for the Steward to expose capabilities to an LLM runtime, we do so via MCP — keeping the door open for non-Anthropic runtimes that adopt the protocol.

### Anthropic Claude (current primary runtime)

- **Role for us:** Today's runtime for Amigo. We are deliberately substrate-independent at the architectural level (see [WHERE-WE-ARE.md](WHERE-WE-ARE.md) Wave A.7) — Claude is the current best fit, not a permanent commitment.

---

## Methodology + governance

### FORGE — *Mi Amigos AI's governance methodology*

- **Repo:** *(private as of 2026-05; portions may be open-sourced)*
- **Contribution:** Decision authority, agent ecosystem (@F / @O / @R / @G / @E / @Q / @T / @abc / @J), ADR-based architectural discipline.
- **Role for us:** Our governance layer. The PRIME-DIRECTIVE.md hierarchy + Pre-Action Discipline is grounded in FORGE v3.8.2 ADR-0002.

### ADR (Architectural Decision Records)

- **Origin:** Michael Nygard, 2011 — [cognitect.com/blog/2011/11/15/documenting-architecture-decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- **Contribution:** Lightweight architectural-decision documentation pattern.
- **Role for us:** FORGE uses ADRs; this repo's `docs/adr/` follows the same pattern.

---

## Conceptual / cultural antecedents

### *"50 First Dates"* (2004 film)

- **Role for us:** The canonical analogy for the session-amnesia problem. Used in `01-The-Problem.md` and pitched on [ai-engram.org](https://ai-engram.org). We didn't invent this analogy — we adopted it because it works.

### *Inside Out* (2015 Pixar film)

- **Role for us:** Cited as what Guardian is explicitly NOT (see [PHILOSOPHY.md](PHILOSOPHY.md)). The emotion-personification model is a beautiful metaphor for the wrong problem; naming the rejection is part of how we orient new contributors.

### *Her* (2013) / HAL 9000 / Samantha

- **Role for us:** Cultural touchstones for what we're not building — digital companions / digital persons. Stewards serve organizations; they aren't digital people. Naming the contrast helps.

### "Steward" as concept

- **Lineage:** Long pre-AI history — organizational stewards, ecological stewards, household stewards. We borrowed the term for the AI category. Probably someone else has also applied "Steward" to AI; if so we'd like to credit them — please open an issue.

---

## Specific researchers / writers whose work shaped our thinking

*(This section is the most under-developed and would benefit most from community input. If we've drawn on your work and you're not here, file an issue.)*

- **Charles Packer et al.** — MemGPT authors. The OS-for-LLMs framing.
- **Andrej Karpathy** — Public writing on LLMs, context windows, agent architectures.
- **Anthropic Alignment team** — Constitutional AI lineage informs our PRIME-DIRECTIVE pattern.
- **Michael Nygard** — ADR pattern.
- **The Anthropic Claude Code team** — Our current runtime substrate; the harness design has shaped our integration patterns.
- **Pixar (Pete Docter, et al.)** — Yes, Inside Out, cited as the contrast that clarifies our position. Beautiful art, useful foil.

---

## Adjacent work we're aware of but haven't deeply integrated

- **Open Voice / OpenAssistant / various open-source assistant projects** — Conceptual overlap; we haven't deeply analyzed their memory architectures because they prioritize capability/openness over the continuity properties we care about.
- **Microsoft Semantic Kernel** — Microsoft's agent-orchestration framework. On our radar; not yet analyzed in depth.
- **Google's Project Astra / Gemini Live** — Multi-modal real-time agents. Different category (interface ≠ continuity), but worth understanding as the field evolves.
- **Replika, Pi, Character.AI** — Digital-companion products that solve adjacent problems (consumer-facing relational AI). Different category from Stewards; we cite them in [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md) to clarify the contrast.

---

## Production observation sources

A meaningful fraction of what's in this repo comes not from cited papers but from **production observation** of running [Amigo](https://miamigos.ai) (the first Steward) for Mi Amigos AI. That data isn't published as papers but it's documented in:

- This repo's `insights/` directory (dated observations)
- `~/clawd/operations/` (Amigo's operational notes, internal — selectively published as research)
- Production migration logs (e.g., the clawdbot → Claude Code migration in May 2026, documented in `~/clawd/migration-log.md`)

Where we cite observations from Amigo's production operation, we try to be transparent that this is N=1 data, sometimes interesting, sometimes idiosyncratic to one organization. We try to flag when something is "observed in production for Amigo" vs. "predicted to generalize."

---

## How to add to this document

If we've drawn from your work and we should have cited you here:

1. Open an issue with the title `Missing citation: <your work>` and label `references`.
2. Tell us what you contributed (a paper, a repo, a concept, a critique).
3. Tell us where you think it belongs in this document.
4. We'll engage in the issue, validate, and update — credit is non-negotiable.

If you'd like to add a citation we haven't drawn from but think we should be aware of:

1. Open an issue with the title `Suggested reading: <work>` and label `references`.
2. Tell us why it's relevant + what it would change about our thinking.
3. We may add it as "adjacent work we're aware of" pending deeper engagement.

---

*Last updated 2026-05-25. This document is far from complete; we'd genuinely like help making it so.*
