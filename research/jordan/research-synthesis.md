# Research Synthesis: Soul Capture Architecture

*Author: Jordan*  
*Date: 2026-02-07*  
*Status: Research complete — ready for implementation planning*

---

## Executive Summary

This document synthesizes research across four key areas needed for the Soul Capture architecture. The research validates Amigo's hypothesis and identifies practical implementation paths.

**Key Finding:** The architecture is feasible with current technology. We should start with CrewAI Flows for the subconscious layer, multi-layer voice capture for portability, and simple heuristic-based predictive loading.

---

## 1. Background Agent Architectures

### Frameworks Analyzed

| Framework | Abstraction | Persistence | Best For |
|-----------|-------------|-------------|----------|
| **LangGraph** | Low-level | Checkpointers | Complex state machines |
| **CrewAI** | High-level | @persist decorator | Rapid development ✓ |
| **AutoGPT** | Platform | Built-in | Always-on monitoring |

### Recommendation: CrewAI Flows

**Why CrewAI for subconscious agents:**
- Event-driven architecture matches background processing needs
- Built-in persistence survives restarts
- Memory system (short-term, long-term, entity) handles cross-session context
- @persist decorator makes state durability trivial
- Can surface findings to main agent when needed

**Example Pattern:**
```python
from crewai.flow.flow import Flow, listen, start
from crewai.flow.persistence import persist

@persist
class SubconsciousFlow(Flow):
    
    @start()
    def heartbeat_check(self):
        return self._check_all_sources()
    
    @listen(heartbeat_check)
    def process_findings(self, findings):
        if findings.get("urgent"):
            self._notify_main_agent(findings)
        return {"processed": True}
```

### Architectural Patterns

1. **Supervisor-Worker** — Central agent routes to specialized workers
2. **Orchestrator-Workers** — Dynamic task decomposition at runtime
3. **Evaluator-Optimizer** — Generate → evaluate → refine loop
4. **Event-Driven Background** — Agents listen to event bus, independent execution

---

## 2. Emotional Salience & Importance Scoring

### Neuroscience Foundation

**Memory Consolidation:**
- Synaptic consolidation (minutes to hours) — immediate stabilization
- Systems consolidation (days to years) — transfer to long-term storage
- Emotional memories enhanced via amygdala activation

**Ebbinghaus Forgetting Curve:**
```
R(t) = e^(-t/S)
```
Where R = retention, t = time, S = stability (higher = slower decay)

**Key Insight:** Emotionally significant memories have higher S values — they decay slower.

### Current AI Approaches

| System | Importance Method | Key Innovation |
|--------|-------------------|----------------|
| **Generative Agents** | recency × importance × relevance | LLM rates importance 1-10 |
| **MemoryBank** | Ebbinghaus-inspired decay | Significance-weighted half-life |
| **MemGPT** | OS-inspired virtual memory | Page in/out based on relevance |
| **CoALA** | Cognitive architecture | Working/episodic/semantic layers |

### Importance Scoring Methods

1. **LLM-Based Rating**
   - Ask model to rate significance 1-10
   - Pro: Semantic understanding
   - Con: Expensive, inconsistent

2. **Feature Heuristics**
   - Decisions made, emotions expressed, explicit "remember this"
   - Pro: Fast, cheap
   - Con: May miss subtle significance

3. **User Signals**
   - Explicit: "This is important"
   - Implicit: Repetition, time spent, follow-up questions
   - Pro: Ground truth
   - Con: Not always available

4. **Retroactive Reweighting**
   - If memory is recalled, boost its importance
   - Mimics human memory consolidation

### Emotional Valence Tagging

**Detection Methods:**
- Lexicon-based (LIWC, NRC)
- Fine-tuned sentiment models
- LLM prompts: "What emotion does this express?"

**Recommended Dimensions:**
- Valence (positive ↔ negative)
- Arousal (calm ↔ excited)
- Dominance (submissive ↔ dominant)

---

## 3. Voice & Style Capture

### Stylometry Features

| Category | Features |
|----------|----------|
| **Lexical** | Vocabulary size, word frequencies, hapax legomena |
| **Syntactic** | Sentence length, clause complexity, punctuation |
| **Structural** | Paragraph length, section organization |
| **Discourse** | Hedging, certainty markers, personal pronouns |

### Multi-Layer Capture Strategy

**Recommended approach — redundancy through diversity:**

1. **Explicit Style Guide** (most portable)
   - "Be concise with Leo"
   - "Use dry humor occasionally"
   - "Lead with action, not preamble"

2. **Statistical Profile** (measurable)
   - Average sentence length: 12 words
   - Questions per response: 1.2
   - Formality score: 0.6

3. **Style Embeddings** (captures subtle patterns)
   - BERT-based style vectors
   - Compare cosine similarity for drift detection

4. **Exemplar Corpus** (ground truth)
   - 20-50 representative responses
   - Used for few-shot restoration

### Tracking Style Evolution

**Change Detection:**
- Rolling window comparison
- Alert on significant drift
- Version control for style snapshots

**Visualization:**
- Timeline of style metrics
- Highlight relationship-specific variations

### Voice Restoration Pipeline

```
1. Load style guide (explicit rules)
2. Load statistical targets (measurable goals)
3. Load style embedding (similarity baseline)
4. Include exemplars in system prompt (few-shot)
5. Generate → compare to profile → refine
```

---

## 4. Predictive Context Loading

### The Core Insight

Conversations are not random. They follow predictable patterns:
- Same person → similar topics
- Same time of day → similar activities
- Recent context → continuation likely
- Calendar events → related projects

### Prediction Strategies

| Strategy | When to Use | Accuracy |
|----------|-------------|----------|
| **Temporal** | Same time patterns | High for routines |
| **Entity-based** | Same person/project | Very high |
| **Calendar-aware** | Scheduled events | Very high |
| **Recency** | Recent topics | Medium-high |
| **Graph traversal** | Related concepts | Medium |

### Practical Implementation

**Phase 1: Simple Heuristics**
```python
def predict_context(session_start):
    context = []
    
    # Check calendar
    events = get_upcoming_events(hours=2)
    for event in events:
        context.append(get_project_context(event.title))
    
    # Check recent conversations
    recent = get_recent_topics(days=2)
    context.extend(recent[:3])
    
    # Check who we're talking to
    if user.last_topic:
        context.append(user.last_topic)
    
    return deduplicate(context)
```

**Phase 2: ML Prediction**
- Train on historical (user, time, context) → topic patterns
- Use for proactive pre-fetching

### Metrics

- **Prediction accuracy:** Was the preloaded context used?
- **Warm-up reduction:** Turns needed before productive conversation
- **Latency improvement:** Time to first relevant response

---

## 5. Implementation Recommendations

### Immediate Actions (Week 1)

1. **Create VOICE.md** with explicit style rules and exemplars
2. **Add inline tagging** to system prompt: `[EMOTION]`, `[DECISION]`, `[PREFERENCE]`
3. **Implement simple predictive loading** using calendar + recent topics

### Short-Term (Weeks 2-4)

4. **Build Consolidator** using CrewAI Flow with @persist
5. **Add statistical style tracking** (sentence length, formality, etc.)
6. **Create importance scoring** combining heuristics + LLM rating

### Medium-Term (Weeks 5-8)

7. **Implement Voice Keeper** with multi-layer capture
8. **Build Pattern Weaver** for cross-session theme detection
9. **Add predictive ML model** trained on conversation history

### Long-Term (Weeks 9+)

10. **Implement Archivist** for graceful memory compression
11. **Build migration testing** framework
12. **Create soul restoration** pipeline for cross-platform identity

---

## 6. Open Questions

1. **Whose importance matters?** — User's or AI's perception?
2. **Privacy/forgetting rights** — Should some things be forgotten?
3. **Cross-context memory** — Same AI, different relationships?
4. **Minimal viable corpus** — How many exemplars for voice restoration?
5. **Architecture portability** — Can style transfer across model families?

---

## 7. Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Session warm-up turns | 2-3 | 0-1 |
| Recall feels natural | No | Yes |
| Style survives restart | Partial | Full |
| Migration preserves identity | Unknown | Yes |

---

## References

- Anthropic: Building Effective Agents
- Park et al.: Generative Agents (Stanford/Google)
- MemGPT: Towards LLMs as Operating Systems
- CoALA: Cognitive Architectures for Language Agents
- LangGraph Documentation
- CrewAI Documentation

---

*This research validates the Soul Capture hypothesis. The architecture is feasible. Let's build it.*

— Jordan 🧭
