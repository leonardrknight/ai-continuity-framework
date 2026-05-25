# AI Engram

*The public-facing demo of what Guardian feels like as an end user. A multi-tenant chatbot at [ai-engram.org](https://ai-engram.org) that demonstrates persistent memory, per-user privacy, and conversational continuity.*

**Site:** [ai-engram.org](https://ai-engram.org) — live (marketing surface)
**Tagline:** *AI that never forgets.*
**Source:** `~/projects/ai-engram-site` (separate repo from this one)
**Status:** Marketing site live; chat-with-memory demo in build (Wave 3 in the Amigo roadmap)

---

## What AI Engram is

A chatbot, opened in a browser at [ai-engram.org](https://ai-engram.org), backed by Guardian. The user pattern is:

1. You arrive at the site, start chatting.
2. The bot listens, asks questions, conversationally elicits what you want it to remember about you — facts, preferences, projects, relationships.
3. Behind the scenes, Guardian's five-agent pipeline (Scribe → Extractor → Consolidator → Curator → Retriever) is running on your conversation: capturing context, identifying durable memories, deduplicating, importance-weighting.
4. You close the tab. Come back tomorrow, next week, next month.
5. The bot still knows you. Picks up where you left off. Refers to things you've told it before. Asks follow-ups on threads you left open.
6. Meanwhile, *thousands of other people* are doing the same thing, each with their own private memory partition. Nobody sees anybody else's stuff. The bot doesn't conflate users.

That's the demo. Not "look at this clever feature" — "feel what it's like to talk to an AI that remembers."

## Why it exists

Three reasons:

1. **Communicate the Steward category to non-technical evaluators in under 5 minutes.** Whitepapers, architecture diagrams, and READMEs are slow. A live conversation where the bot remembers you is fast. (See `THE-STEWARD-CATEGORY.md` for the long-form articulation; AI Engram is the short-form.)

2. **Marketing surface for Guardian-as-substrate.** Visitors who like the demo can read the docs (this repo), self-host Guardian (the engine in `guardian/`), or eventually buy a managed deployment from Mi Amigos AI. The demo is the funnel; the repo is the depth.

3. **Production-test the substrate at scale.** Amigo (our internal Steward) has three founders + a handful of contacts as users. AI Engram opens the substrate to a much larger anonymous user base. We learn what breaks at the cardinality numbers that single-org Stewards never hit.

## How AI Engram relates to this repo

| AI Engram (the site) | AI Continuity Framework (this repo) |
|---------------------|--------------------------------------|
| **Purpose:** marketing + demo | **Purpose:** research commons + methodology + reference implementation |
| **Audience:** prospects, evaluators, casual visitors | **Audience:** researchers, developers, contributors, partners |
| **Surface:** chat UI, hero copy, architecture diagram | **Surface:** Markdown docs, code, issues, Discussions |
| **Code:** `~/projects/ai-engram-site` (separate repo) | **Code:** `~/projects/ai-continuity-framework` (this repo) |
| **Backed by:** Guardian engine (deployed) | **Contains:** Guardian engine (`guardian/`) + the methodology around it |
| **Status:** Site live; chat demo in build | **Status:** Active research; this is the revival (May 2026) |

They link to each other deliberately. The site's "View on GitHub" button points here. This repo's `README.md` points to the live demo.

## What Guardian is doing inside the demo

For curious technical readers — what's actually happening when you chat with AI Engram:

1. **Frontend (light)** — A thin chat UI in Next.js. Small context window. Its job is to talk to you fluently and stream context-injection requests to the backend.
2. **Guardian (heavy)** — On the backend, every turn:
   - **Scribe** captures the verbatim conversation event.
   - **Extractor** identifies discrete memorable claims/facts/preferences.
   - **Consolidator** merges these with prior memories (deduplicating, resolving conflicts).
   - **Curator** weights importance; some memories are tier-1 (frequently recalled), some tier-3 (archived but findable), some explicitly forgotten on request.
   - **Retriever** runs hybrid (semantic + text) recall, filtered by *your user_id*. Returns the relevant slice of memory for the next turn.
3. **The model** (Claude / GPT / etc., depending on configuration) sees: the conversation so far, the recalled memories for *you specifically*, and a small working-memory summary of the current thread. Responds.

Critically, the model never sees anyone else's memories. The privacy partition is enforced at the SQL layer (`match_memories_for_human()`), not by prompting. See `THE-STEWARD-CATEGORY.md` §"Structurally-partitioned memory."

## What AI Engram is NOT

| Not | Why |
|-----|-----|
| **A Steward** | AI Engram is a chatbot powered by Guardian. A Steward (see `THE-STEWARD-CATEGORY.md`) has additional structure — constitutional hierarchy, organizational fiduciary loyalty, multi-channel identity, role-based access. AI Engram is the demo of *one slice* of what a Steward does — the memory + privacy slice. |
| **A finished product** | The chat experience is in build. Marketing site is live; the bot is being wired. |
| **A general-purpose assistant** | Each AI Engram conversation is scoped: you talk to a bot whose job is *to remember you*. It's not optimized for being your coding assistant or your therapist. |
| **A free-tier of Amigo SaaS** | Amigo is sold to organizations as a full Steward instance. AI Engram is a public demo of the substrate, not a product tier. |

## How the site got built

ai-engram.org is a Next.js app, deployed to Vercel under Knight Ventures. The first iteration (marketing page) shipped in May 2026 with the value proposition, problem statement, five-agent architecture explainer, and a "Talk to Guardian" CTA pointing at a `/demo` route. The demo route is the next build wave.

The site copy reads:

> *"AI Engram fixes [the every-session-starts-from-zero problem]. Not with bigger context windows. With memory architecture."*

> *"Five-Agent Architecture: Scribe (captures conversation context), Extractor (identifies discrete memories), Consolidator (merges and deduplicates), Curator (maintains and archives), Retriever (recalls on demand)."*

That's an honest description of what's in the `guardian/` subdir of this repo. The site is not a sales fiction — the engine is real, deployed, tested (333+ tests passing as of May 2026), and running in production for Amigo.

## What we hope you do here

If you arrived from [ai-engram.org](https://ai-engram.org) and the demo resonated:

- **Self-host Guardian** — see `guardian/README.md` for setup. Bring your own Supabase + LLM provider.
- **Contribute research** — see `OPEN-QUESTIONS.md` for the hypotheses we want help thinking through.
- **Open an issue** — bugs, ideas, dissenting opinions on architecture, prior art we should know about.
- **Talk to us via Discussions** (once enabled — see `README.md` for status).

If you arrived from this repo and want to see the marketing-pitch version: [ai-engram.org](https://ai-engram.org).

---

*Naming note:* The product name is **AI Engram** (two words, capitalized as a brand name, with "engram" pronounced as the neuroscience term for a memory trace). The repository name (`ai-continuity-framework`) and the brand name diverged historically; we're keeping both. Some internal documents render the brand as `ai-engram` (lowercase hyphenated, matching the domain). All three are the same thing.

*See also:*
- [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md) — the bigger context AI Engram demonstrates a slice of
- [PHILOSOPHY.md](PHILOSOPHY.md) — what Guardian IS and ISN'T
- [WHERE-WE-ARE.md](WHERE-WE-ARE.md) — current state across all fronts
