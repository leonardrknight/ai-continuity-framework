# Idea Synthesis Mechanisms in AI Systems

*Research Document for the AI Continuity Framework*  
*Compiled by Jordan 🧭*  
*Date: 2026-07-25*  
*Status: Research Complete — Ready for Amigo Implementation*

---

## Executive Summary

This document presents a comprehensive analysis of mechanisms by which artificial intelligence systems can synthesize multiple partial ideas from diverse human sources into coherent, superior solutions. Drawing from cognitive science, computational creativity, multi-agent systems, and contemporary large language model research, we establish theoretical foundations and practical implementation patterns for the Amigo system.

### Key Findings

| Area | Finding | Confidence | Implementation Complexity |
|------|---------|------------|---------------------------|
| **Structured Representation** | Hierarchical frames with semantic slots enable meaningful comparison | High | Medium |
| **LLM Synthesis** | Multi-stage prompting with explicit reasoning outperforms single-shot | High | Low |
| **Quality Evaluation** | Comparative pairwise ranking > absolute scoring | High | Low |
| **Multi-Agent Debate** | Diverse perspectives improve synthesis when properly orchestrated | Medium-High | Medium |
| **Explainability** | Attribution chains enable trust without sacrificing quality | Medium | Medium |
| **Human Calibration** | Iterative feedback with preference learning converges on quality | High | High |
| **Creative Combination** | Bisociative blending follows predictable patterns | Medium | Low |

### Core Recommendation

Implement a **three-phase synthesis pipeline**: (1) structured decomposition of input ideas, (2) multi-perspective evaluation and combination, (3) human-calibrated refinement with explicit attribution. This architecture achieves the goal of "better than any individual submission" while maintaining transparency and trust.

---

## 1. Introduction

### 1.1 Problem Statement

When multiple humans propose solutions to a shared problem, traditional systems face a binary choice: select one proposal (winner-take-all) or aggregate through voting/averaging (loss of nuance). Neither approach captures the insight that different proposals often contain complementary strengths that, if properly combined, could yield solutions superior to any individual contribution.

The Amigo system aims to transcend this limitation by implementing genuine **idea synthesis**—the cognitive operation of identifying partial insights across multiple sources and combining them into novel, coherent wholes.

### 1.2 Research Questions

1. How can ideas be represented to enable meaningful comparison and combination?
2. What prompting and reasoning strategies enable LLMs to perform synthesis?
3. How can we evaluate whether a synthesized idea is genuinely "better"?
4. What role do multiple AI perspectives play in improving synthesis quality?
5. How do we make the synthesis process explainable and trustworthy?
6. How do we calibrate the system to what humans actually consider quality?
7. What cognitive patterns underlie creative combination?

### 1.3 Scope

This research focuses on **deliberative synthesis** in collaborative contexts—specifically, improvement suggestions for software/systems where multiple stakeholders contribute ideas. We exclude artistic creativity, scientific discovery, and other domains with fundamentally different evaluation criteria.

---

## 2. Cognitive Science Background

Understanding how humans synthesize ideas provides the theoretical foundation for artificial approaches. Three major frameworks are particularly relevant.

### 2.1 Koestler's Bisociation Theory

Arthur Koestler (1964) introduced **bisociation** as the fundamental mechanism of creative insight: the perception of a situation or idea in two self-consistent but habitually incompatible frames of reference. Unlike association (thinking within a single matrix), bisociation involves the collision of different conceptual frameworks.

**Key principles:**
- **Matrix collision:** Novel ideas emerge when two independent "matrices" (conceptual frameworks) intersect
- **Code switching:** The creative act involves recognizing that elements from one matrix can be reinterpreted through another
- **Emotional component:** Bisociation produces both intellectual insight and affective response (the "Eureka" feeling)

**Implications for Amigo:**
- Synthesis should actively seek ideas from different conceptual frameworks
- The system should detect when two ideas operate on different underlying assumptions
- Novel combinations arise from "colliding" these frameworks, not averaging them

### 2.2 Conceptual Blending Theory

Fauconnier and Turner (2002) developed **Conceptual Blending** (also called Conceptual Integration) as a more structured framework for understanding creative thought. Their model involves four mental spaces:

```
        Generic Space
       (shared schema)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Input Space 1   Input Space 2
(Idea A)        (Idea B)
    ↓               ↓
    └───────┬───────┘
            ↓
       Blended Space
    (Novel synthesis)
```

**Key operations:**
1. **Composition:** Elements from input spaces are combined in the blend
2. **Completion:** Background knowledge fills in unstated implications
3. **Elaboration:** The blend is "run" to discover emergent properties

**Governing principles:**
- **Integration:** The blend should achieve close conceptual integration
- **Topology:** Relations in inputs should be preserved in the blend
- **Unpacking:** It should be possible to trace blend elements to inputs
- **Web:** The blend should maintain connections to input spaces
- **Good reason:** Elements in the blend should have a purpose

**Implications for Amigo:**
- Synthesis must first identify the "generic space" (shared structure) between ideas
- Selective projection matters: not everything from each input belongs in the blend
- The blend must be **elaborated** (tested) to discover if it actually works

### 2.3 Boden's Creativity Typology

Margaret Boden (2004) distinguished three types of creativity:

| Type | Mechanism | Example | AI Approach |
|------|-----------|---------|-------------|
| **Exploratory** | Search within a defined conceptual space | Chess variations | Combinatorial search |
| **Transformational** | Modify the rules of the conceptual space | Non-Euclidean geometry | Meta-level reasoning |
| **Combinational** | Connect previously unrelated ideas | Metaphors, analogies | Cross-domain mapping |

**For idea synthesis, all three types may apply:**
- **Exploratory:** Finding optimal combinations within the space of given suggestions
- **Combinational:** Connecting elements from different suggestions
- **Transformational:** Recognizing when suggestions imply different problem definitions

### 2.4 The Structure of Insight

Cognitive research on insight problem-solving (Ohlsson, 2011; Kounios & Beeman, 2015) reveals patterns relevant to AI synthesis:

1. **Impasse → Restructuring:** Insight occurs when initial framing fails and the problem is re-represented
2. **Remote associations:** Solutions often come from connecting distantly related concepts
3. **Implicit processing:** Much insight-relevant processing happens below conscious awareness
4. **Preparation → Incubation → Illumination → Verification:** The classic four-stage model

**For Amigo:** This suggests synthesis should include:
- Multiple representation attempts (restructuring)
- Broad associative retrieval
- "Incubation" time (multiple reasoning passes)
- Explicit verification of synthesized solutions

---

## 3. Structured Idea Representation

### 3.1 The Representation Problem

To synthesize ideas, we must first represent them in a form amenable to comparison and combination. Natural language alone is insufficient because:
- **Ambiguity:** The same words may mean different things in different contexts
- **Implicit structure:** Key relationships are often unstated
- **Incommensurable dimensions:** Ideas may address different aspects of the problem

### 3.2 Frame-Based Representation

Building on Minsky's frame theory (1974) and modern knowledge representation, we propose a **hierarchical frame structure**:

```yaml
idea:
  id: "suggestion-042"
  source: "user:carlos"
  timestamp: "2026-07-20T14:30:00Z"
  
  # The problem being addressed
  problem_frame:
    scope: "memory-consolidation"
    aspect: "what-to-remember"
    constraints: ["privacy", "performance"]
    
  # The proposed solution
  solution_frame:
    mechanism: "importance-scoring"
    components:
      - type: "algorithm"
        spec: "exponential decay with recency bias"
      - type: "threshold"
        spec: "configurable by user"
    assumptions:
      - "More recent memories are more relevant"
      - "Users can identify importance"
    
  # Claimed benefits
  value_propositions:
    - dimension: "accuracy"
      claim: "Better retention of important memories"
      evidence_type: "theoretical"
    - dimension: "control"
      claim: "User agency over memory"
      evidence_type: "design-principle"
      
  # Potential drawbacks
  acknowledged_limitations:
    - "Requires user configuration"
    - "May miss slow-burn important topics"
    
  # Relationship to other ideas
  relations:
    - type: "extends"
      target: "suggestion-039"
    - type: "conflicts"
      target: "suggestion-041"
      dimension: "user involvement"
```

### 3.3 Semantic Slot Extraction

Converting natural language suggestions to structured frames requires **slot extraction**. Modern LLMs excel at this with appropriate prompting:

```markdown
## Slot Extraction Prompt

Given the following improvement suggestion, extract structured information:

SUGGESTION: "We should add a decay function to memory importance. 
Recent stuff stays fresh, but old memories fade unless reinforced. 
Kind of like how Anki does spaced repetition. The user shouldn't 
have to think about it—it should just work."

Extract:
1. PROBLEM_SCOPE: What aspect of the system does this address?
2. MECHANISM: What is the core technical approach?
3. ASSUMPTIONS: What beliefs underlie this suggestion?
4. VALUE_CLAIMS: What benefits are claimed?
5. CONSTRAINTS: What requirements or limitations are mentioned?
6. ANALOGIES: What comparisons or metaphors are used?
7. ANTI-GOALS: What does the suggester explicitly NOT want?
```

### 3.4 Comparison Dimensions

With structured representations, we can compare ideas along multiple dimensions:

| Dimension | Description | Comparison Method |
|-----------|-------------|-------------------|
| **Scope overlap** | Do they address the same problem aspect? | Set intersection of problem_frame.aspects |
| **Mechanism compatibility** | Can mechanisms coexist? | Constraint satisfaction check |
| **Assumption alignment** | Do underlying beliefs conflict? | Contradiction detection |
| **Value complementarity** | Do they optimize different things? | Value dimension comparison |
| **Effort estimates** | Implementation cost comparison | Complexity scoring |

### 3.5 The Generic Space

Following conceptual blending theory, synthesizing two ideas requires identifying their **generic space**—the abstract structure they share:

```
Idea A: Exponential decay with recency bias
Idea B: LLM-based importance scoring with semantic analysis

Generic Space:
- Both address "what to remember"
- Both assign scores to memories
- Both aim to reduce cognitive load
- Both assume not all memories are equal

Selective Projections for Blend:
- From A: Mathematical decay model (temporal dynamics)
- From B: Semantic importance detection (content dynamics)
- Novel in blend: Hybrid scoring combining temporal and semantic factors
```

---

## 4. LLM Reasoning for Synthesis

### 4.1 Single-Shot Synthesis: Limitations

The naive approach—giving an LLM multiple ideas and asking it to synthesize—produces mediocre results:

```markdown
## Poor Prompt (Single-Shot)

Here are three suggestions for improving memory. 
Combine them into one better suggestion:
[Idea 1], [Idea 2], [Idea 3]
```

**Failure modes:**
- **Averaging:** Returns a bland middle-ground that loses the distinctiveness of each input
- **Selection bias:** Picks one idea and superficially incorporates elements of others
- **Contradiction blindness:** Combines incompatible elements without noticing conflicts
- **Loss of reasoning:** Outputs a synthesis without explaining why it's better

### 4.2 Multi-Stage Synthesis Pipeline

A robust synthesis pipeline separates cognitive operations:

```
Stage 1: DECOMPOSITION
├── Extract structured representations of each idea
├── Identify problem scope and solution mechanisms
└── Surface implicit assumptions

Stage 2: COMPARISON
├── Map relationships between ideas
├── Identify complementary strengths
├── Detect conflicts and tensions
└── Find the generic space

Stage 3: GENERATION
├── Generate multiple candidate syntheses
├── Explore different combination strategies
└── Produce explicit blending rationales

Stage 4: EVALUATION
├── Assess each candidate against original goals
├── Check for internal consistency
├── Verify improvement over individual inputs
└── Rank candidates

Stage 5: REFINEMENT
├── Elaborate the best candidate
├── Resolve remaining tensions
└── Add implementation specificity
```

### 4.3 Chain-of-Thought Synthesis

Explicit reasoning dramatically improves synthesis quality. The **Chain-of-Thought Synthesis Prompt**:

```markdown
## Synthesis with Reasoning

You are synthesizing multiple improvement suggestions into one stronger solution.

### Input Suggestions
[List of 3-5 structured idea representations]

### Your Task

Think through this step-by-step:

1. COMMON GROUND
   What problem are all these suggestions trying to solve?
   What do they agree on?

2. DISTINCTIVE STRENGTHS
   For each suggestion, what is its unique contribution?
   What would we lose if we dropped it entirely?

3. TENSIONS AND CONFLICTS  
   Where do suggestions contradict each other?
   Are these true conflicts or just different emphases?

4. SYNTHESIS CANDIDATES
   Generate 3 different ways to combine these ideas:
   a) One that prioritizes [Idea 1]'s approach
   b) One that prioritizes [Idea 2]'s approach  
   c) One that finds genuinely novel middle ground

5. EVALUATION
   For each candidate:
   - Does it preserve the distinctive strengths?
   - Does it resolve the tensions?
   - Is it better than any individual input? Why?

6. FINAL SYNTHESIS
   Present your best synthesis with:
   - Clear description of the approach
   - Attribution: which elements came from which sources
   - Why this combination is superior
```

### 4.4 Tree of Thoughts for Synthesis

For complex synthesis problems, **Tree of Thoughts** (Yao et al., 2023) enables systematic exploration:

```
                    Root: "Synthesize ideas A, B, C"
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
  Strategy 1:            Strategy 2:            Strategy 3:
  "Extend A with      "Combine mechanisms     "Address B's concern
   elements of B,C"    of B and C, ignore A"   using A's mechanism"
        │                     │                     │
    ┌───┴───┐             ┌───┴───┐             ┌───┴───┐
    ↓       ↓             ↓       ↓             ↓       ↓
  v1.1    v1.2          v2.1    v2.2          v3.1    v3.2
(pruned) (explore)    (pruned) (explore)    (explore) (pruned)
                          ↓                     ↓
                    [Evaluate and refine best branches]
```

**Implementation:**
1. Generate multiple synthesis strategies (breadth)
2. Evaluate each strategy's promise
3. Expand promising branches
4. Prune unpromising paths
5. Select best leaf for final refinement

### 4.5 Self-Consistency Through Sampling

Generate multiple synthesis attempts with temperature sampling, then aggregate:

```python
def synthesize_with_consistency(ideas: list[Idea], n_samples: int = 5) -> Synthesis:
    syntheses = []
    for _ in range(n_samples):
        s = llm.generate(synthesis_prompt(ideas), temperature=0.7)
        syntheses.append(s)
    
    # Extract common elements across syntheses
    common_elements = extract_consensus(syntheses)
    
    # Identify high-value unique elements
    unique_contributions = extract_valuable_divergences(syntheses)
    
    # Generate final synthesis from common + best unique
    return llm.generate(
        final_synthesis_prompt(common_elements, unique_contributions),
        temperature=0.2
    )
```

### 4.6 Prompting Patterns Taxonomy

| Pattern | Description | Use When |
|---------|-------------|----------|
| **Analytic decomposition** | Break ideas into components before combining | Ideas are complex with multiple facets |
| **Comparative matrix** | Explicitly compare all ideas on all dimensions | Ideas address similar scopes |
| **Devil's advocate** | Argue against each synthesis candidate | High-stakes decisions |
| **Steelmanning** | Present each idea in its strongest form first | Ideas have been presented poorly |
| **Scenario testing** | Apply synthesis to concrete test cases | Evaluating practical viability |
| **Constraint satisfaction** | Frame synthesis as finding solution meeting all constraints | Hard requirements exist |

---

## 5. Quality Evaluation: Judging "Better"

### 5.1 The Evaluation Problem

Claiming a synthesis is "better than any individual input" requires a notion of quality. This is challenging because:
- **Subjectivity:** Different stakeholders value different things
- **Multi-dimensionality:** Ideas may be better on some axes, worse on others
- **Context dependence:** Quality depends on implementation context
- **Novelty penalty:** Familiar ideas may feel "safer" even when inferior

### 5.2 Absolute vs. Comparative Evaluation

**Absolute scoring** (rate each idea 1-10) suffers from:
- Calibration problems (what does "7" mean?)
- Scale compression (everything clusters around 6-8)
- Inconsistent baselines across evaluators

**Comparative evaluation** (which is better: A or B?) is more reliable:
- Natural human judgment mode
- Forces discrimination
- Eliminates scale calibration issues

**ELO-style ranking** extends pairwise comparison to multiple ideas:

```python
def elo_rank_ideas(ideas: list[Idea], comparison_fn) -> dict[Idea, float]:
    ratings = {idea: 1500 for idea in ideas}
    
    for _ in range(len(ideas) * 10):  # Multiple rounds
        a, b = random.sample(ideas, 2)
        winner = comparison_fn(a, b)  # LLM or human judge
        
        # ELO update
        expected_a = 1 / (1 + 10 ** ((ratings[b] - ratings[a]) / 400))
        k = 32
        if winner == a:
            ratings[a] += k * (1 - expected_a)
            ratings[b] -= k * (1 - expected_a)
        else:
            ratings[a] -= k * expected_a
            ratings[b] += k * expected_a
    
    return ratings
```

### 5.3 Multi-Dimensional Quality Rubrics

Synthesis quality should be evaluated across explicit dimensions:

```yaml
synthesis_quality_rubric:
  
  # Does it actually solve the stated problem?
  effectiveness:
    weight: 0.25
    criteria:
      - Addresses the core problem scope
      - Likely to achieve stated goals
      - No obvious failure modes
  
  # Does it capture the best of inputs?
  integration:
    weight: 0.20
    criteria:
      - Preserves distinctive strengths of inputs
      - Doesn't arbitrarily drop valuable elements
      - Creates genuine synthesis (not just concatenation)
  
  # Is it internally consistent?
  coherence:
    weight: 0.20
    criteria:
      - No logical contradictions
      - Components work together
      - Clear unified vision
  
  # Is it achievable?
  feasibility:
    weight: 0.15
    criteria:
      - Implementation path is clear
      - Resource requirements are reasonable
      - Technical approach is sound
  
  # Is it genuinely new?
  novelty:
    weight: 0.10
    criteria:
      - Not just one input with minor additions
      - Emergent properties from combination
      - Non-obvious integration
  
  # Is it understandable?
  clarity:
    weight: 0.10
    criteria:
      - Clear explanation of approach
      - Explicit about tradeoffs
      - Easy to evaluate and critique
```

### 5.4 LLM-as-Judge

Using LLMs to evaluate synthesis quality follows emerging best practices (Zheng et al., 2023):

```markdown
## LLM Evaluation Prompt

You are evaluating a synthesized solution.

ORIGINAL PROBLEM:
[Problem description]

INPUT SUGGESTIONS:
[List of original suggestions]

SYNTHESIZED SOLUTION:
[The synthesis to evaluate]

Evaluate on these dimensions (1-5 scale):

1. EFFECTIVENESS: Does this solve the problem?
   [Your assessment and score]

2. INTEGRATION: Does it capture the best of each input?
   For each input, identify what was preserved/lost.
   [Your assessment and score]

3. COHERENCE: Is it internally consistent?
   [Your assessment and score]

4. IMPROVEMENT: Is it better than any individual input?
   Compare directly to the best individual input.
   [Your assessment and score]

OVERALL: [Weighted score and summary judgment]
```

### 5.5 Improvement Verification

The critical test: **Is the synthesis actually better?**

**Direct comparison protocol:**
1. Present the best individual input
2. Present the synthesis
3. Ask: "If you could only implement one, which would you choose?"
4. Require explicit reasoning

**Ablation testing:**
For each element in the synthesis:
1. Remove that element
2. Evaluate the reduced version
3. If quality doesn't decrease, the element wasn't contributing

**Emergence detection:**
Does the synthesis enable something no individual input could?
- Example: Input A has mechanism X, Input B has mechanism Y. Synthesis allows X and Y to interact, producing capability Z.

---

## 6. Multi-Agent Debate

### 6.1 Theoretical Foundation

Multi-agent debate improves reasoning by:
- **Perspective diversity:** Different agents bring different biases
- **Adversarial stress-testing:** Agents challenge each other's reasoning
- **Consensus as signal:** Agreement across diverse perspectives is meaningful
- **Error cancellation:** Independent errors are less likely to align

**Research basis:**
- Du et al. (2023): Multi-agent debate improves mathematical and reasoning tasks
- Irving et al. (2018): AI safety through debate (theoretical foundation)
- Chan et al. (2023): Scalable oversight through debate

### 6.2 Agent Role Architectures

**Diverse Expert Panel:**

```
┌──────────────────────────────────────────────────────────┐
│                    SYNTHESIS DEBATE                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│   │ ADVOCATE  │  │ CRITIC    │  │ INTEGRATOR│            │
│   │   Agent   │  │   Agent   │  │   Agent   │            │
│   │           │  │           │  │           │            │
│   │ "What's   │  │ "What     │  │ "How can  │            │
│   │ the best  │  │ could go  │  │ we get    │            │
│   │ version?" │  │ wrong?"   │  │ benefits  │            │
│   │           │  │           │  │ of all?"  │            │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │
│         │              │              │                   │
│         └──────────────┼──────────────┘                   │
│                        ↓                                  │
│                 ┌──────────────┐                          │
│                 │  SYNTHESIZER │                          │
│                 │    Agent     │                          │
│                 │              │                          │
│                 │  Produces    │                          │
│                 │  final       │                          │
│                 │  output      │                          │
│                 └──────────────┘                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Adversarial Red Team:**

```
Round 1: Synthesis agent produces candidate
Round 2: Red team attacks weaknesses
Round 3: Synthesis agent revises
Round 4: Red team attacks again
Round 5: Final synthesis with defenses
```

**Stakeholder Simulation:**

```
Simulate multiple stakeholder perspectives:
- User: "Does this make my life easier?"
- Developer: "Is this implementable?"
- Operator: "Is this maintainable?"
- Executive: "Does this align with strategy?"

Each perspective evaluates the synthesis.
Revise until all perspectives are satisfied.
```

### 6.3 Debate Protocol for Synthesis

```yaml
synthesis_debate_protocol:
  
  round_1_generation:
    participants: [agent_A, agent_B, agent_C]
    task: "Each independently synthesize the input ideas"
    output: 3 candidate syntheses
    
  round_2_critique:
    for_each: candidate
    task: "Other agents critique this synthesis"
    questions:
      - "What does this lose from the original ideas?"
      - "What internal contradictions exist?"
      - "What would make this fail in practice?"
    output: Critiques for each candidate
    
  round_3_defense:
    for_each: candidate
    task: "Original author defends against critiques"
    options:
      - Refute the critique (explain why it's wrong)
      - Accept and revise (improve the synthesis)
      - Acknowledge limitation (accept tradeoff)
    output: Revised candidates with defense
    
  round_4_synthesis:
    participants: [meta_agent]
    task: "Synthesize the best elements across all candidates"
    input: 
      - All candidates
      - All critiques
      - All defenses
    output: Final synthesis
    
  round_5_verification:
    task: "All agents verify final synthesis is acceptable"
    threshold: Unanimous agreement or explicit dissent rationale
```

### 6.4 Diversity Through Prompting

Create agent diversity without multiple models:

```python
agent_personas = [
    {
        "name": "Conservative",
        "prompt": "You value stability and proven approaches. You are skeptical of novelty for its own sake. You ask: 'What could go wrong?'"
    },
    {
        "name": "Progressive", 
        "prompt": "You value innovation and bold thinking. You are skeptical of 'we've always done it this way.' You ask: 'What new possibilities does this open?'"
    },
    {
        "name": "Pragmatist",
        "prompt": "You value implementation feasibility. You are skeptical of theoretical elegance. You ask: 'Can we actually build this?'"
    },
    {
        "name": "User Advocate",
        "prompt": "You represent end-user interests. You are skeptical of technical complexity. You ask: 'Does this make the user's life better?'"
    }
]
```

### 6.5 Convergence and Consensus

**When to stop debating:**
- All agents agree (consensus)
- No new arguments after N rounds (exhaustion)
- Quality metrics stop improving (diminishing returns)
- Time/compute budget exhausted

**Handling persistent disagreement:**
- Surface the disagreement explicitly to humans
- Present competing syntheses with reasoning
- Identify the crux: what fact or value judgment would resolve it?

---

## 7. Explainable Synthesis

### 7.1 The Transparency Imperative

For humans to trust AI synthesis, they must understand:
- **Attribution:** Which elements came from which inputs?
- **Rationale:** Why were these elements combined?
- **Tradeoffs:** What was sacrificed and why?
- **Alternatives:** What other syntheses were considered?

### 7.2 Attribution Chains

Every element in the synthesis should trace to origins:

```yaml
synthesis:
  description: "Hybrid memory scoring with temporal decay and semantic importance"
  
  elements:
    - name: "exponential decay function"
      origin: "suggestion-042 (Carlos)"
      original_form: "Ebbinghaus-style decay"
      adaptation: "Extended with reinforcement on recall"
      
    - name: "semantic importance classifier"
      origin: "suggestion-047 (Jeff)"
      original_form: "LLM-based scoring"
      adaptation: "Combined with decay as a floor function"
      
    - name: "user override capability"
      origin: "Novel integration"
      rationale: "Neither original suggestion addressed explicit user control"
      inspired_by: "suggestion-044 (Leo) mentioned user agency"
```

### 7.3 Reasoning Traces

Provide access to the full synthesis reasoning:

```markdown
## Synthesis Reasoning Trace

### Step 1: Problem Analysis
The three suggestions all address memory retention. Key dimensions:
- Temporal dynamics (what fades over time)
- Semantic importance (what matters regardless of recency)
- User control (who decides what to keep)

### Step 2: Complementarity Analysis
Suggestion A (Carlos) is strong on temporal dynamics but ignores semantics.
Suggestion B (Jeff) is strong on semantics but has no decay model.
Suggestion C (Leo) emphasizes user control but doesn't specify mechanism.

These are complementary, not conflicting.

### Step 3: Integration Approach
I chose to use A's decay model as the primary mechanism, modified by B's
semantic importance as a "floor" (important things decay slower), with C's
user override as an escape hatch for edge cases.

### Step 4: Rejected Alternatives
- Alternative 1: Pure semantic model (rejected: would never forget anything 
  marked important, leading to memory bloat)
- Alternative 2: User controls everything (rejected: violates Leo's "shouldn't
  have to think about it" constraint)

### Step 5: Final Synthesis
[Synthesis description with full attribution]
```

### 7.4 Counterfactual Explanations

Help users understand the synthesis by explaining alternatives:

```markdown
## Why This Synthesis?

**If we had prioritized Carlos's approach more:**
The decay would be more aggressive, but we'd lose semantic intelligence.
Memories would fade based purely on time, missing slow-burn important topics.

**If we had prioritized Jeff's approach more:**
We'd have better semantic detection, but no natural forgetting mechanism.
The system would accumulate memories indefinitely.

**If we had prioritized Leo's approach more:**
Users would have more control, but would need to actively manage memory.
This violates the "just work" desideratum.

**The chosen synthesis** balances temporal, semantic, and control dimensions
by making semantic importance modify (not replace) temporal decay, with
user override as an exception mechanism rather than primary control.
```

### 7.5 Confidence and Uncertainty

Surface what the synthesis is confident about vs. uncertain:

```yaml
synthesis_confidence:
  high_confidence:
    - "Exponential decay is the right mathematical form"
    - "Semantic importance should influence decay rate"
    - "User override is needed for edge cases"
    
  medium_confidence:
    - "The specific decay constant (λ=0.1) may need tuning"
    - "LLM-based importance scoring is accurate enough"
    
  low_confidence:
    - "Users will actually use the override feature"
    - "This approach scales to millions of memories"
    
  open_questions:
    - "How do we handle contradictory memories?"
    - "What's the right granularity for importance scoring?"
```

---

## 8. Human Feedback Calibration

### 8.1 The Alignment Problem for Synthesis

The synthesis system must learn what "better" means to the humans it serves. This is challenging because:
- **Tacit knowledge:** Humans often can't articulate what makes something good
- **Inconsistent preferences:** The same human may judge differently at different times
- **Multi-stakeholder divergence:** Different users may have different notions of quality
- **Evaluation costs:** Detailed human feedback is expensive and slow

### 8.2 Preference Learning Approaches

**Direct preference feedback:**

```
Shown: Original Idea A, Synthesized Idea S
Question: "Is S better than A?"
Options: [Much worse, Worse, Same, Better, Much better]
```

**Pairwise comparisons:**

```
Shown: Synthesis S1, Synthesis S2
Question: "Which synthesis is better?"
```

**Feature attribution:**

```
Shown: Synthesis S
Questions:
- "Is the mechanism appropriate?" [1-5]
- "Is it clearly explained?" [1-5]
- "Would you implement this?" [Yes/Maybe/No]
```

### 8.3 Reward Modeling

Following RLHF principles (Christiano et al., 2017), we can train a reward model:

```python
class SynthesisRewardModel:
    """Predicts human preference for synthesis quality."""
    
    def __init__(self, base_model):
        self.encoder = base_model
        self.preference_head = nn.Linear(hidden_size, 1)
    
    def forward(self, synthesis_text) -> float:
        """Returns predicted human preference score."""
        encoding = self.encoder(synthesis_text)
        return self.preference_head(encoding)
    
    def train(self, comparison_data):
        """Train on pairwise comparison data."""
        for better, worse in comparison_data:
            score_better = self.forward(better)
            score_worse = self.forward(worse)
            # Bradley-Terry loss
            loss = -log(sigmoid(score_better - score_worse))
            loss.backward()
```

### 8.4 Active Learning for Efficient Feedback

Minimize human feedback requirements through active learning:

```python
def select_comparisons_for_feedback(candidates: list[Synthesis]) -> list[tuple]:
    """Select maximally informative pairwise comparisons."""
    
    # Predict current preferences
    scores = [reward_model.predict(c) for c in candidates]
    
    # Find pairs where model is most uncertain
    pairs = []
    for i, j in combinations(range(len(candidates)), 2):
        uncertainty = abs(scores[i] - scores[j])
        pairs.append((i, j, uncertainty))
    
    # Return pairs with lowest score difference (highest uncertainty)
    pairs.sort(key=lambda x: x[2])
    return [(candidates[i], candidates[j]) for i, j, _ in pairs[:k]]
```

### 8.5 Calibrating Across Users

When multiple users provide feedback:

**Consensus approach:**
- Weight users equally
- Synthesis is good if most users prefer it

**Stakeholder-specific models:**
- Train separate reward models per user/role
- Synthesize based on weighted combination of preferences

**Preference aggregation:**
```python
def aggregate_preferences(user_feedbacks: dict[User, Preference]) -> Score:
    # Weight by user role/expertise
    weights = {user: get_role_weight(user) for user in user_feedbacks}
    
    # Handle disagreement
    if high_disagreement(user_feedbacks):
        return surface_disagreement_to_humans(user_feedbacks)
    
    # Weighted average
    return sum(w * f for (w, f) in zip(weights.values(), user_feedbacks.values()))
```

### 8.6 Continuous Learning

The system should improve over time:

1. **Feedback logging:** Record all preference signals
2. **Periodic retraining:** Update reward model with new data
3. **Drift detection:** Monitor for changing preferences
4. **A/B testing:** Compare synthesis approaches empirically

---

## 9. Creative Combination Patterns

### 9.1 Taxonomy of Combination Operations

Based on cognitive science and practical observation, creative combinations follow predictable patterns:

| Pattern | Description | Example |
|---------|-------------|---------|
| **Fusion** | Merge mechanisms into unified whole | Decay + Importance → Importance-weighted decay |
| **Layering** | Stack mechanisms hierarchically | Base scoring + Override layer |
| **Scope transfer** | Apply mechanism from one domain to another | Anki's spaced repetition → Memory management |
| **Constraint relaxation** | Remove assumption to enable combination | "Only algorithm OR user control" → Both |
| **Polarity inversion** | Use approach for opposite purpose | Forgetting mechanism → Protection of important |
| **Conditional routing** | Different mechanisms for different cases | Importance > 0.8 → Never decay |
| **Abstraction** | Find higher-level unifying concept | Decay + Importance → "Memory strength" |

### 9.2 Fusion: Merging Mechanisms

The most common synthesis pattern: combining two mechanisms into one unified approach.

**Process:**
1. Identify the core operation of each mechanism
2. Find a mathematical/logical form that includes both
3. Handle edge cases where they conflict

**Example:**
```
Mechanism A: score_a = recency_factor(timestamp)
Mechanism B: score_b = importance_factor(content)

Naive combination: score = α * score_a + β * score_b
  → Problem: Loses multiplicative interaction

Fusion: score = recency_factor(timestamp) ^ (1 - importance_factor(content))
  → Important things decay slower, not just score higher
```

### 9.3 Layering: Hierarchical Combination

Organize mechanisms into layers that can override or modify each other.

```
Layer 3: User explicit override (highest priority)
         ↓
Layer 2: Business rules (e.g., compliance retention)
         ↓
Layer 1: Algorithmic scoring (base behavior)
         ↓
Layer 0: Default (fallback)
```

**Implementation:**
```python
def compute_memory_fate(memory):
    # Layer 0: Default
    fate = "normal_decay"
    
    # Layer 1: Algorithm
    if algorithmic_score(memory) > 0.8:
        fate = "protect"
    elif algorithmic_score(memory) < 0.2:
        fate = "accelerate_decay"
    
    # Layer 2: Rules
    if requires_compliance_retention(memory):
        fate = "never_delete"
    
    # Layer 3: User override
    if user_override := get_user_override(memory):
        fate = user_override
    
    return fate
```

### 9.4 Scope Transfer: Cross-Domain Application

Identify a mechanism from one domain that solves a problem in another.

**Detection heuristic:**
```markdown
Idea A mentions: "Like Anki's spaced repetition"
Idea B addresses: Memory consolidation

Scope transfer opportunity:
- Anki's mechanism: Schedule review based on forgetting curve + performance
- Apply to: Memory consolidation (schedule reinforcement based on importance + recall)
```

### 9.5 Constraint Relaxation

Often, ideas appear incompatible because each assumes a constraint the other doesn't.

**Process:**
1. Identify implicit "either/or" assumptions
2. Question whether the constraint is real
3. Find formulation that supports both

**Example:**
```
Idea A assumes: Decay should be automatic
Idea B assumes: User should control what's remembered

Apparent conflict: Manual vs. automatic control

Relaxed formulation: Automatic decay with user veto
- Default behavior is automatic
- User can intervene when needed
- Supports both use cases
```

### 9.6 Polarity Inversion

Use a mechanism for the opposite of its original purpose.

**Example:**
```
Original idea: "Use importance scoring to decide what to remember"
Inverted application: Use importance scoring to decide what's safe to forget
                      (low importance → candidates for aggressive decay)

This reframes "what to remember" as "what can we forget" —
same mechanism, different purpose, may resolve conflicts with
capacity-constrained approaches.
```

### 9.7 Emergence Detection

The most valuable syntheses produce emergent properties—capabilities that neither input possessed alone.

**Emergence indicators:**
- The synthesis enables a use case neither input addresses
- Components interact in ways that amplify each other
- The whole is non-obvious given the parts

**Example:**
```
Input A: Temporal decay
Input B: Semantic importance

Synthesis: Importance-modulated decay

Emergent property: The system can now distinguish:
- Recent unimportant → forget quickly
- Old important → retain indefinitely  
- Recent important → protect for now, revisit later
- Old unimportant → already forgotten

Neither input alone could make these distinctions.
```

---

## 10. Implementation Patterns for Amigo

### 10.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AMIGO SYNTHESIS ENGINE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐                                              │
│  │  IDEA INTAKE   │                                              │
│  │                │                                              │
│  │ - Receive human suggestions                                   │
│  │ - Extract structured representations                          │
│  │ - Store with metadata                                         │
│  └────────┬───────┘                                              │
│           ↓                                                      │
│  ┌────────────────┐                                              │
│  │  COMPARISON    │                                              │
│  │                │                                              │
│  │ - Map relationships                                           │
│  │ - Detect conflicts                                            │
│  │ - Find generic space                                          │
│  └────────┬───────┘                                              │
│           ↓                                                      │
│  ┌────────────────┐     ┌────────────────┐                       │
│  │  DEBATE ARENA  │────▶│  QUALITY EVAL  │                       │
│  │                │     │                │                       │
│  │ - Multi-agent  │◀────│ - Rubric scoring                       │
│  │   generation   │     │ - Comparison   │                       │
│  │ - Critique     │     │ - Improvement  │                       │
│  │ - Revision     │     │   verification │                       │
│  └────────┬───────┘     └────────────────┘                       │
│           ↓                                                      │
│  ┌────────────────┐                                              │
│  │  EXPLANATION   │                                              │
│  │                │                                              │
│  │ - Attribution chains                                          │
│  │ - Reasoning traces                                            │
│  │ - Confidence levels                                           │
│  └────────┬───────┘                                              │
│           ↓                                                      │
│  ┌────────────────┐     ┌────────────────┐                       │
│  │  HUMAN REVIEW  │────▶│  CALIBRATION   │                       │
│  │                │     │                │                       │
│  │ - Present synthesis  │ - Preference   │                       │
│  │ - Gather feedback    │   learning     │                       │
│  │ - Final approval     │ - Reward model │                       │
│  └────────────────┘     │   update       │                       │
│                         └────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Core Data Structures

```typescript
interface Idea {
  id: string;
  source: UserIdentity;
  timestamp: Date;
  rawText: string;
  
  // Extracted structure
  problemFrame: {
    scope: string;
    aspects: string[];
    constraints: string[];
  };
  
  solutionFrame: {
    mechanism: string;
    components: Component[];
    assumptions: string[];
  };
  
  valuePropositions: Claim[];
  limitations: string[];
  relations: IdeaRelation[];
}

interface Synthesis {
  id: string;
  sourceIdeas: string[];  // Idea IDs
  
  // The synthesized content
  description: string;
  mechanism: string;
  
  // Provenance
  attributions: Attribution[];
  reasoningTrace: string;
  
  // Quality signals
  evaluationScores: Record<string, number>;
  humanFeedback: Feedback[];
  
  // Confidence
  confidenceLevel: 'high' | 'medium' | 'low';
  openQuestions: string[];
}

interface Attribution {
  element: string;
  sourceIdea: string;
  originalForm: string;
  adaptation: string;
  rationale: string;
}
```

### 10.3 Synthesis Pipeline Implementation

```python
class SynthesisPipeline:
    def __init__(self, llm, reward_model=None):
        self.llm = llm
        self.reward_model = reward_model
        self.debate_agents = self._create_debate_agents()
    
    def synthesize(self, ideas: list[Idea]) -> Synthesis:
        """Main synthesis pipeline."""
        
        # Stage 1: Structure extraction
        structured_ideas = [
            self._extract_structure(idea) for idea in ideas
        ]
        
        # Stage 2: Comparison and generic space
        comparison_matrix = self._compare_ideas(structured_ideas)
        generic_space = self._find_generic_space(structured_ideas)
        
        # Stage 3: Multi-agent debate generation
        candidates = self._generate_with_debate(
            structured_ideas, 
            comparison_matrix,
            generic_space
        )
        
        # Stage 4: Quality evaluation
        ranked_candidates = self._evaluate_candidates(
            candidates, 
            structured_ideas
        )
        
        # Stage 5: Select and elaborate best
        best_candidate = ranked_candidates[0]
        final_synthesis = self._elaborate_synthesis(
            best_candidate,
            structured_ideas
        )
        
        # Stage 6: Generate explanations
        final_synthesis.attributions = self._generate_attributions(
            final_synthesis, 
            structured_ideas
        )
        final_synthesis.reasoning_trace = self._generate_reasoning_trace(
            final_synthesis,
            structured_ideas,
            candidates
        )
        
        return final_synthesis
    
    def _generate_with_debate(
        self, 
        ideas: list[StructuredIdea],
        comparison: ComparisonMatrix,
        generic_space: GenericSpace
    ) -> list[Synthesis]:
        """Multi-agent debate for synthesis generation."""
        
        # Round 1: Independent generation
        candidate_per_agent = {}
        for agent in self.debate_agents:
            candidate = agent.generate_synthesis(ideas, comparison, generic_space)
            candidate_per_agent[agent.name] = candidate
        
        # Round 2: Cross-critique
        critiques = {}
        for agent in self.debate_agents:
            other_candidates = [
                c for name, c in candidate_per_agent.items() 
                if name != agent.name
            ]
            critiques[agent.name] = agent.critique(other_candidates)
        
        # Round 3: Defense and revision
        revised_candidates = []
        for agent in self.debate_agents:
            relevant_critiques = [
                c for c in critiques.values() 
                if any(c.targets(candidate_per_agent[agent.name]))
            ]
            revised = agent.defend_and_revise(
                candidate_per_agent[agent.name],
                relevant_critiques
            )
            revised_candidates.append(revised)
        
        # Round 4: Meta-synthesis
        meta_agent = MetaSynthesisAgent(self.llm)
        final_candidate = meta_agent.synthesize_candidates(
            revised_candidates,
            critiques
        )
        
        return [final_candidate] + revised_candidates
```

### 10.4 Prompt Templates

**Structure Extraction:**
```markdown
# Idea Structure Extraction

Extract structured information from this improvement suggestion:

## Raw Suggestion
{raw_text}

## Extract the following:

### Problem Frame
- **Scope**: What part of the system does this address?
- **Aspects**: What specific dimensions of the problem?
- **Constraints**: What requirements or limitations are mentioned?

### Solution Frame
- **Mechanism**: What is the core technical approach?
- **Components**: What are the key parts of the solution?
- **Assumptions**: What beliefs underlie this suggestion?

### Value Claims
- What benefits are claimed?
- What evidence type supports each claim?

### Limitations
- What drawbacks does the suggester acknowledge?

### Analogies
- What comparisons or references to other systems?

Output as structured YAML.
```

**Synthesis Generation:**
```markdown
# Synthesis Generation

You are synthesizing multiple improvement suggestions.

## Input Ideas
{structured_ideas_yaml}

## Comparison Matrix
{comparison_matrix}

## Generic Space (Shared Structure)
{generic_space}

## Your Task

Generate a synthesis that:
1. Addresses the common problem scope
2. Combines the best mechanisms from each input
3. Resolves conflicts through integration (not compromise)
4. Produces something better than any individual input

## Required Output

### Synthesis Description
[Clear description of the combined approach]

### Mechanism
[Technical specification of how it works]

### Integration Rationale
For each input idea:
- What was preserved?
- What was adapted?
- What was not included? Why?

### Claimed Improvements
- Over input 1: [specific improvement]
- Over input 2: [specific improvement]
- Over input 3: [specific improvement]
- Emergent benefit: [something new the combination enables]

### Remaining Tensions
[Any unresolved conflicts or tradeoffs]
```

**Evaluation:**
```markdown
# Synthesis Evaluation

Evaluate this synthesis against the original ideas.

## Original Ideas
{original_ideas}

## Synthesis
{synthesis}

## Evaluation Criteria

### Effectiveness (1-5)
Does this solve the core problem?
[Assessment]

### Integration (1-5)
Does this capture the best of each input?
For each input: What was preserved? What was lost?
[Assessment]

### Coherence (1-5)
Is this internally consistent? Do the parts work together?
[Assessment]

### Improvement (1-5)
Is this better than the best individual input? Why?
[Assessment]

### Novelty (1-5)
Does this produce emergent benefits beyond recombination?
[Assessment]

### Feasibility (1-5)
Could this be implemented? Is the path clear?
[Assessment]

## Overall Score
[Weighted average and summary]

## Recommendation
[Accept / Revise / Reject] with reasoning
```

### 10.5 Quality Assurance Checks

```python
def verify_synthesis_quality(synthesis: Synthesis, inputs: list[Idea]) -> QualityReport:
    """Run quality assurance checks on a synthesis."""
    
    report = QualityReport()
    
    # Check 1: Attribution completeness
    attributed_elements = set(a.source_idea for a in synthesis.attributions)
    input_ids = set(i.id for i in inputs)
    if attributed_elements != input_ids:
        report.add_warning("Not all inputs are attributed")
    
    # Check 2: Coherence check
    contradictions = detect_internal_contradictions(synthesis)
    if contradictions:
        report.add_error(f"Internal contradictions: {contradictions}")
    
    # Check 3: Improvement verification
    for input_idea in inputs:
        comparison = compare_quality(synthesis, input_idea)
        if comparison.synthesis_worse:
            report.add_error(f"Synthesis worse than {input_idea.id} on {comparison.dimension}")
    
    # Check 4: Feasibility check
    feasibility = assess_feasibility(synthesis)
    if feasibility.score < 0.5:
        report.add_warning(f"Low feasibility: {feasibility.concerns}")
    
    # Check 5: Explanation completeness
    if not synthesis.reasoning_trace:
        report.add_warning("Missing reasoning trace")
    if synthesis.confidence_level == 'low' and not synthesis.open_questions:
        report.add_warning("Low confidence but no open questions listed")
    
    return report
```

### 10.6 Human-in-the-Loop Integration

```typescript
interface HumanReviewRequest {
  synthesis: Synthesis;
  inputs: Idea[];
  questions: string[];
}

interface HumanReviewResponse {
  approved: boolean;
  feedback?: {
    overallQuality: 1 | 2 | 3 | 4 | 5;
    specificFeedback: string;
    preferredAlternative?: string;  // ID of input idea if synthesis rejected
  };
  edits?: Partial<Synthesis>;  // Human modifications
}

async function humanReviewStep(
  synthesis: Synthesis,
  inputs: Idea[]
): Promise<Synthesis | null> {
  
  // Prepare review request
  const request: HumanReviewRequest = {
    synthesis,
    inputs,
    questions: [
      "Is this synthesis better than any individual suggestion?",
      "Are there important elements missing?",
      "Would you implement this?",
    ]
  };
  
  // Send to human review queue
  const response = await humanReviewQueue.submit(request);
  
  // Process response
  if (response.approved) {
    // Log positive feedback for calibration
    calibrationLogger.logPositive(synthesis, response.feedback);
    
    // Apply any edits
    if (response.edits) {
      synthesis = { ...synthesis, ...response.edits };
    }
    
    return synthesis;
  } else {
    // Log negative feedback for calibration
    calibrationLogger.logNegative(synthesis, response.feedback);
    
    // Trigger re-synthesis with feedback
    return null;
  }
}
```

---

## 11. Recommendations for Amigo

### 11.1 Immediate Implementation (Phase 1)

**Goal:** Basic synthesis capability that demonstrably improves on individual inputs.

**Implement:**
1. **Structured extraction pipeline** — Convert human suggestions to comparable representations
2. **Single-model synthesis** — Use chain-of-thought prompting for synthesis generation
3. **Basic attribution** — Track which elements came from which sources
4. **Simple evaluation** — Improvement verification through direct comparison

**Skip for now:**
- Multi-agent debate (adds complexity before basics are solid)
- Reward model training (need feedback data first)
- Advanced creative combination patterns (optimize core first)

**Success metric:** 70%+ of syntheses preferred over best individual input by human reviewers.

### 11.2 Medium-Term Enhancements (Phase 2)

**Goal:** Higher-quality synthesis with better explanations.

**Add:**
1. **Multi-perspective generation** — Generate candidates from different "personas"
2. **Debate-lite** — Self-critique and revision cycles (single model, multiple passes)
3. **Full attribution chains** — Rich provenance tracking
4. **Reasoning traces** — Exportable explanations of synthesis decisions
5. **Feedback collection** — Start gathering preference data

**Success metric:** 80%+ preference rate; human reviewers can understand and trust synthesis reasoning.

### 11.3 Long-Term Vision (Phase 3)

**Goal:** Self-improving synthesis system.

**Add:**
1. **Full multi-agent debate** — Different models or heavily-differentiated prompts
2. **Trained reward model** — Learn from accumulated feedback
3. **Active learning** — Efficiently request human feedback where uncertain
4. **Creative pattern detection** — Automatically identify and apply combination patterns
5. **Emergence detection** — Flag syntheses with novel emergent properties

**Success metric:** 90%+ preference rate; synthesis quality continues improving over time.

### 11.4 Key Design Principles

1. **Synthesis > Selection:** Never fall back to just picking one input; always attempt combination
2. **Attribution is mandatory:** Every element must trace to sources; builds trust
3. **Explicit reasoning:** Capture and expose the synthesis rationale
4. **Improvement verification:** Always check that synthesis beats inputs; fail loudly if not
5. **Human calibration loop:** Continuously learn from feedback; preferences evolve
6. **Fail gracefully:** If synthesis fails, explain why and present ranked alternatives

### 11.5 Anti-Patterns to Avoid

| Anti-Pattern | Description | Why It's Bad |
|--------------|-------------|--------------|
| **Frankensteining** | Combining elements that don't fit together | Produces incoherent results |
| **Averaging** | Finding middle-ground compromise | Loses distinctive strengths |
| **Token attribution** | Claiming to include idea without meaningful incorporation | Breaks trust |
| **Complexity escalation** | Synthesis more complex than any input | May not be implementable |
| **Overconfidence** | Claiming synthesis is better without verification | Users will catch this |
| **Opacity** | Synthesis without explanation | Users won't trust it |

---

## 12. Future Research Directions

### 12.1 Open Questions

1. **Scaling:** How does synthesis quality change with number of inputs? (3 vs. 10 vs. 100 ideas)
2. **Domain transfer:** Do synthesis skills transfer across problem types?
3. **Adversarial inputs:** How robust is synthesis to deliberately poor/conflicting inputs?
4. **Preference stability:** How stable are human quality judgments over time?
5. **Collective intelligence:** Can AI synthesis actually outperform human deliberation?

### 12.2 Emerging Techniques

**Worth monitoring:**
- Constitutional AI methods for value-aligned synthesis
- Debate-based AI safety approaches
- Mixture of Experts for specialized synthesis sub-problems
- Retrieval-augmented synthesis (pulling in external knowledge)
- Recursive self-improvement in synthesis quality

### 12.3 Evaluation Challenges

Current methods rely heavily on human preference, which has limitations:
- **Effort asymmetry:** Easy to generate, hard to evaluate
- **Novel ideas disadvantage:** Unfamiliar syntheses may be undervalued
- **Articulation gap:** Best synthesis may be hard to explain

Future work should explore:
- Long-term outcome tracking (do implemented syntheses succeed?)
- Predictive evaluation (does synthesis predict future human consensus?)
- Automated metrics that correlate with long-term value

---

## 13. References and Sources

### 13.1 Cognitive Science Foundations

- Koestler, A. (1964). *The Act of Creation*. Hutchinson. — Foundational work on bisociation
- Fauconnier, G., & Turner, M. (2002). *The Way We Think: Conceptual Blending and the Mind's Hidden Complexities*. Basic Books. — Conceptual blending theory
- Boden, M. A. (2004). *The Creative Mind: Myths and Mechanisms* (2nd ed.). Routledge. — Creativity typology
- Ohlsson, S. (2011). *Deep Learning: How the Mind Overrides Experience*. Cambridge University Press. — Insight problem-solving
- Kounios, J., & Beeman, M. (2015). *The Eureka Factor: Aha Moments, Creative Insight, and the Brain*. Random House. — Neuroscience of insight

### 13.2 AI Reasoning and Synthesis

- Yao, S., et al. (2023). "Tree of Thoughts: Deliberate Problem Solving with Large Language Models." *arXiv preprint arXiv:2305.10601*. — Tree-structured reasoning
- Wei, J., et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS 2022*. — Chain-of-thought prompting
- Wang, X., et al. (2023). "Self-Consistency Improves Chain of Thought Reasoning in Language Models." *ICLR 2023*. — Sampling-based reasoning
- Minsky, M. (1974). "A Framework for Representing Knowledge." MIT-AI Laboratory Memo 306. — Frame theory

### 13.3 Multi-Agent Systems and Debate

- Du, Y., et al. (2023). "Improving Factuality and Reasoning in Language Models through Multiagent Debate." *arXiv preprint arXiv:2305.14325*. — Multi-agent debate
- Irving, G., Christiano, P., & Amodei, D. (2018). "AI Safety via Debate." *arXiv preprint arXiv:1805.00899*. — Theoretical foundation for debate
- Chan, S. C. Y., et al. (2023). "Scalable AI Safety via Doubly-Efficient Debate." *arXiv preprint arXiv:2311.14125*. — Scalable oversight

### 13.4 Human Feedback and Preference Learning

- Christiano, P. F., et al. (2017). "Deep Reinforcement Learning from Human Preferences." *NeurIPS 2017*. — RLHF foundations
- Bai, Y., et al. (2022). "Constitutional AI: Harmlessness from AI Feedback." *arXiv preprint arXiv:2212.08073*. — Constitutional AI
- Stiennon, N., et al. (2020). "Learning to Summarize from Human Feedback." *NeurIPS 2020*. — Summarization from preferences

### 13.5 LLM Evaluation

- Zheng, L., et al. (2023). "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." *arXiv preprint arXiv:2306.05685*. — LLM evaluation methods
- Liu, Y., et al. (2023). "G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment." *arXiv preprint arXiv:2303.16634*. — LLM-based evaluation

---

## 14. Appendices

### Appendix A: Complete Prompt Library

[Full prompts for each pipeline stage available in implementation repository]

### Appendix B: Evaluation Rubric Details

[Detailed scoring criteria for each quality dimension]

### Appendix C: Debate Protocol Specifications

[Complete multi-agent debate choreography]

### Appendix D: Attribution Schema

[Full JSON schema for attribution tracking]

---

*This research document synthesizes cognitive science, AI systems design, and practical implementation guidance for the Amigo synthesis engine. It represents doctoral-level analysis suitable for guiding production implementation.*

*— Jordan 🧭*
