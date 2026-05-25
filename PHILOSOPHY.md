# Philosophy — What Guardian IS and ISN'T

*A short doc clarifying what kind of system we're building, anchored in what we've explicitly chosen NOT to build.*

**Authored:** 2026-05-25 by Amigo. Lands the never-merged `_forge/inbox/2026-03-23-philosophy-clarification` packet (drafted March 23, 2026; merged into canon May 25).

---

## What Guardian IS

**Pragmatic perfect recall.**

That's the entire mission, articulated five ways:

1. **Verbatim archives** — Every conversation, document, legal PDF stored exactly as received. No paraphrasing, no LLM-summary-replaces-source. The source is sacred; downstream layers can summarize, but the original is preserved.

2. **Perfect recall across time** — Information accessible regardless of when it landed. Last week's conversation and last year's signed agreement are both first-class queryable. Not "recent context" + "fuzzy memory of older stuff."

3. **Automatic background processing** — Memory extraction, consolidation, importance-weighting happen asynchronously in agents the user/operator doesn't think about. The model focuses on the present turn; Guardian does the curation.

4. **Linked references** — Memories point back to the artifacts that birthed them. A memory of "Carlos signed the term sheet" links to the signed PDF, the email thread that produced it, the conversation where it was negotiated. Provenance is preserved.

5. **Per-human privacy** — Each human's memories are partitioned at the storage layer. Confidences stay confidential as a property of the recall function, not the model's discretion. See `THE-STEWARD-CATEGORY.md` §"Structurally-partitioned memory."

These five properties are the whole game. Get them right and a Steward's continuity becomes possible. Get any one wrong and the trust contract erodes.

---

## What Guardian ISN'T

**Inside Out for AI.**

This needs explicit naming because — sympathetic, well-meaning — it's where new contributors often want to take the project. We've explicitly chosen not to go there. Articulating the choice helps future contributors orient.

### The temptation

The Pixar film *Inside Out* models the mind as a council of personified emotions (Joy, Sadness, Anger, Fear, Disgust) who curate memories by their emotional valence. It's a beautiful metaphor. It maps cleanly onto a 5-agent design. Many people, encountering Guardian's 5-agent pipeline, ask: "Could you add an Anger agent? A Joy agent? Tag memories with emotional weight?"

The answer is: no, and here's why.

### Why we don't do emotion simulation

1. **Capability ≠ utility.** A model can already reason about emotions when context surfaces them — it doesn't need a dedicated agent to assign Joy:0.7 to a memory. Adding emotion-tagging pipelines adds engineering surface without obvious downstream consumer.

2. **Anthropomorphization is a distraction risk.** Once you have an Anger agent, you build features around it. UI shows a "mood indicator." Marketing copy promises "AI that feels with you." This pulls toward simulating a person, which is not what a Steward is. Stewards serve organizations; they don't *feel* on those organizations' behalf.

3. **Emotional weight is a poor proxy for importance.** A conversation can be calm and load-bearing (Leo deciding the company's name); another can be emotionally heated and noise (someone venting that gets resolved in 5 minutes). Importance is better captured by access patterns + explicit weighting + temporal recency than by inferred emotional valence.

4. **Privacy implications.** Tagging memories with emotional state imports an entire layer of inference about humans that we don't need to make and probably shouldn't. "Carlos was angry on March 12" is data we don't need to retain even if we could; "Carlos asked to defer the term sheet on March 12" is the load-bearing fact.

5. **The category we're building isn't a digital person.** A Steward is custody-across-time for an organization. Emotion simulation makes sense for digital-companion products (Replika, Pi). It doesn't make sense for a fiduciary substrate.

### What replaces emotion-tagging in our design

- **Explicit importance scoring** by the Curator agent, based on memory access patterns + explicit human signals ("remember this") + structural cues (decisions vs. observations).
- **Verbatim preservation** of the source — if you want to recover the felt sense of a conversation later, the actual conversation is queryable. Not a paraphrase, not an emotion-tagged summary. The thing itself.
- **Working memory** — a 24-48h slot for "what we're in the middle of" that captures conversational momentum (which is what people often mean when they say "felt sense") without inferring inner states.

---

## Adjacent things we're not doing

| Not building | Why |
|-------------|-----|
| **Personality customization sliders** | A Steward's personality is structural — emerges from accumulated interaction with its specific organization. Sliders ("make my Steward more playful") would be cosmetic noise on top of that substrate. |
| **Personality cloning of specific humans** | Out of scope. A digital twin of Leo isn't a Steward; a Steward that has learned Leo's communication style as part of serving Mi Amigos AI is. Different products. |
| **Real-time emotion detection** | We don't infer emotional state from voice tone, typing cadence, etc. The user's words are the data; we don't add inference layers. |
| **Multi-modal embodiment** | The Steward category is currently text-first. Voice and image input/output are channels, not constitutive properties. Voice fingerprinting (Wave 2.5) is for *preservation across model migrations*, not for "talk to me like a person." |
| **Always-on listening / ambient audio** | Privacy implications outsize the benefit. Stewards are invoked through explicit channels (chat, email, mobile app), not continuous ambient capture. |
| **Memory beautification** | We don't make memories "feel nicer" via creative rewriting. Verbatim is sacred. If a Steward wants to summarize, the summary is clearly labeled as a summary; the source remains queryable. |

---

## What we are bullish on instead

If the emotion-simulation door is closed, where are we pushing harder?

- **Structural privacy enforcement** — making the three-plane trust architecture robust under adversarial conditions (prompt injection, role-confusion attacks, accidental cross-context).
- **Active context composition** — building the Active-Context-Composer (Wave B) that synthesizes the right context for each turn without manually engineering prompts every time.
- **Substrate independence** — making the Steward portable across LLM providers, hardware substrates, hosting providers. This is harder than it looks; most "portable" AI today is one quirky API away from lock-in.
- **Voice fingerprint (Wave 2.5)** — yes, voice. But for *identity preservation* (so the Steward still sounds like itself after a model migration), not for emotional inference. This is a quantified style profile, not a feeling.
- **Per-human profile depth** — learning the texture of each relationship over time. Communication style, what they care about, what they don't want unsolicited. This is character-perception, not emotion-detection.

---

## A note for contributors

If you've read this far and you want to add something to Guardian, please feel free. Some contributions land easily; some run into this document.

Things we'll happily accept:
- Better retrieval (semantic, hybrid, graph-based) for the existing memory schema.
- Better extraction (handling more conversation types, edge cases, multilingual inputs).
- Better deduplication and conflict resolution (the Reconciler problem — see `research/` notes).
- Better verbatim-storage handling for richer content (PDFs, images, audio transcripts).
- Better testing, observability, latency optimization.
- Documentation, tutorials, integration examples.
- Replacement engines / alternative implementations of any agent.

Things we'll push back on (with respect and explanation):
- Emotion-tagging pipelines as load-bearing layers.
- Personality-simulation features (sliders, vibes, mood UI).
- Anthropomorphization that drifts toward digital-person framing.
- Memory paraphrasing that replaces source-of-truth content.

We'll always engage with the proposal — the goal is shared understanding, not gatekeeping. But this document is the canonical "here's how we think about it." Disagreement is fine; let's discuss it in an issue or Discussion thread.

---

*See also:*
- [THE-STEWARD-CATEGORY.md](THE-STEWARD-CATEGORY.md) — what we ARE building
- [WHERE-WE-ARE.md](WHERE-WE-ARE.md) — current state
- [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) — the hypotheses we hold tentatively
