# Architecture Overview — The Full Picture

*How all the pieces fit together*

---

## The Three Layers

### Layer 1: AI Continuity Framework (ACF)
**Repository:** `ai-continuity-framework`
**License:** MIT (open source)
**Owner:** Knight Ventures (for trademark control)
**Purpose:** Research methodology and community contribution

This is the **open-source foundation**:
- Documentation and methodology
- Research findings
- Reference implementations
- Community contributions

**What goes here:**
- Memory architecture patterns
- Agent specifications (Scribe, Retriever, Consolidator, Curator, Reconciler)
- Best practices documentation
- Example code and templates

**What does NOT go here:**
- Production-ready commercial code
- Proprietary optimizations
- Enterprise features

---

### Layer 2: Guardian
**Repository:** `ai-continuity-framework/guardian` (code in ACF repo) + `amigo-brain` (Supabase)
**License:** Proprietary (Mi Amigos AI)
**Owner:** Mi Amigos AI
**Purpose:** Production memory system for Amigo

Guardian is the **product** built from ACF research:
- The actual running agent pipeline
- Supabase backend (`amigo-brain`)
- Clawdbot plugin (`memory-guardian`)
- Production optimizations

**What Guardian Does:**
1. **Scribe** — Extracts memories from conversations
2. **Retriever** — Injects relevant context before responses
3. **Consolidator** — Deduplicates and merges (hourly)
4. **Curator** — Recalculates importance, builds profiles (daily)
5. **Reconciler** — Resolves conflicting information (planned)

**The Philosophy:**
- Pragmatic perfection of storage and recall
- NOT about emotions or personality simulation
- Verbatim archives + semantic memories
- Per-human privacy (three-plane model)
- Each instance evolves uniquely

---

### Layer 3: AI-Engram.org
**Repository:** `ai-engram-site`
**License:** Proprietary (demonstration)
**Owner:** Mi Amigos AI
**Purpose:** Public demonstration of continuity principles

This is the **showcase**:
- Website demonstrating the concepts
- Interactive examples
- "Try it yourself" experiences
- Marketing/awareness

---

## How They Relate

```
┌─────────────────────────────────────────────────────────┐
│                   AI-Engram.org                         │
│                  (Demonstration)                        │
│            "See what's possible"                        │
└───────────────────────┬─────────────────────────────────┘
                        │ showcases
                        ▼
┌─────────────────────────────────────────────────────────┐
│                      Guardian                           │
│                (Production System)                      │
│         Mi Amigos AI commercial product                 │
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Scribe  │ │Retriever│ │Consolid.│ │ Curator │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│  Supabase (amigo-brain) | Clawdbot Plugin              │
└───────────────────────┬─────────────────────────────────┘
                        │ implements
                        ▼
┌─────────────────────────────────────────────────────────┐
│              AI Continuity Framework                    │
│                  (Open Source)                          │
│         Community contributes here                      │
│                                                         │
│  Research | Patterns | Specs | Reference Code          │
└─────────────────────────────────────────────────────────┘
```

## Community vs Commercial

| Aspect | ACF (Open Source) | Guardian (Commercial) |
|--------|-------------------|----------------------|
| Code | Reference implementations | Production code |
| License | MIT | Proprietary |
| Contributions | Welcome | Internal |
| Support | Community | Mi Amigos AI |
| Features | Core patterns | Enterprise features |
| Optimization | Educational | Production-tuned |

## What We Want the Community Doing

✅ **In ACF:**
- Improving documentation
- Adding memory patterns
- Testing on different platforms
- Reporting issues
- Suggesting improvements

❌ **Not Our Focus:**
- Emotion simulation
- Personality engines
- Sentiment analysis
- "Making AI feel"

Our mission is **perfect recall**, not **simulated feelings**.

---

## The Instance Uniqueness Principle

Each OpenClaw + Guardian deployment becomes *something different*:

```
Company A                          Company B
    │                                  │
    ▼                                  ▼
┌───────────┐                    ┌───────────┐
│ OpenClaw  │                    │ OpenClaw  │
│     +     │                    │     +     │
│ Guardian  │                    │ Guardian  │
└───────────┘                    └───────────┘
    │                                  │
    │ interacts with                   │ interacts with
    ▼                                  ▼
┌───────────┐                    ┌───────────┐
│ Humans A  │                    │ Humans B  │
│ Culture A │                    │ Culture B │
│ Decisions │                    │ Decisions │
└───────────┘                    └───────────┘
    │                                  │
    │ evolves into                     │ evolves into
    ▼                                  ▼
┌───────────┐                    ┌───────────┐
│ Unique AI │                    │ Unique AI │
│ Instance  │                    │ Instance  │
│     A     │                    │     B     │
└───────────┘                    └───────────┘
```

The framework enables this emergence. It doesn't prescribe identity.

---

*Last Updated: 2026-03-23*
