# Inference Transparency: Stated Facts vs. Inferred Knowledge

*Research Document for AI Continuity Framework*  
*Iteration 3, Document 05*  
*Status: Complete*

---

## Executive Summary

AI memory systems store two fundamentally different types of knowledge: **stated facts** (explicitly told by the user) and **inferences** (deduced from patterns and context). These have different certainty levels, different trust implications, and require different handling—but most memory systems treat them identically.

**The Core Problem:**
- User says: "I'm going to a concert on Friday" → **Stated fact**
- AI deduces: "User likes live music" → **Inference**
- Both stored as "memories" but have vastly different reliability

**Key Finding:** Transparency about inference sources builds trust. Users forgive wrong inferences when they understand the reasoning. They feel surveilled when inferences appear from nowhere.

---

## 1. Taxonomy of Memory Types

### 1.1 The Three Primary Categories

| Category | Definition | Confidence Range | Example |
|----------|------------|------------------|---------|
| **Stated** | Explicitly communicated by user | 90-100% | "I prefer morning meetings" |
| **Inferred** | Deduced from behavior/patterns | 30-85% | "User seems to prefer mornings" (based on scheduling patterns) |
| **Hybrid** | Stated with implied extension | 70-95% | "I usually prefer X" (stated habit, not absolute) |

### 1.2 Stated Facts (Direct Knowledge)

**Subcategories:**

| Type | Example | Storage Priority | Decay Profile |
|------|---------|-----------------|---------------|
| **Explicit Preference** | "I prefer email over phone calls" | High | Slow (until contradicted) |
| **Biographical Fact** | "My daughter's name is Maya" | High | None (factual) |
| **Current State** | "I'm stressed about the deadline" | Medium | Fast (temporal) |
| **Directive** | "Always remind me about meetings" | High | None (until revoked) |
| **Opinion/Belief** | "I think remote work is better" | Medium | Medium (opinions evolve) |
| **Historical Event** | "I went to Stanford" | High | None (factual) |

**Confidence Rules for Stated Facts:**
- Direct statement in conversation: 95-100%
- Stated via form/settings: 100%
- Stated long ago, not reinforced: 85-95%
- Contradicted by later behavior: Flagged for review

### 1.3 Inferred Knowledge (Derived Understanding)

**Subcategories:**

| Type | Description | Confidence Range | Requires Validation |
|------|-------------|------------------|---------------------|
| **Preference Inference** | "Likes X" based on choices | 40-80% | Yes, after 3+ observations |
| **Pattern Inference** | "Usually does X on Fridays" | 50-85% | After confident establishment |
| **Relationship Inference** | "Close to person Z" | 30-70% | Yes, always |
| **Emotional Inference** | "Stressed about W" | 30-60% | No (observe, don't ask) |
| **Interest Inference** | "Interested in topic Y" | 40-75% | Soft validation |
| **Capability Inference** | "Knows Python" | 50-85% | Context-dependent |

**Confidence Calculation for Inferences:**
```
confidence = base_score × evidence_count_factor × recency_factor × consistency_factor

Where:
- base_score: Starting confidence (0.3 for weak inference, 0.5 for moderate)
- evidence_count_factor: log(evidence_count + 1) / 2, capped at 1.5
- recency_factor: exponential decay based on age of evidence
- consistency_factor: 1.0 if consistent, reduced if contradictions exist
```

### 1.4 Hybrid Memories (Stated + Inferred)

These are the tricky middle ground:

| Pattern | Type | Confidence | Handling |
|---------|------|------------|----------|
| "I usually prefer X" | Stated tendency | 85% | Treat as preference, not rule |
| "I've been meaning to..." | Stated intention | 60% | May change; don't nag |
| "Most of my friends like X" | Social context | 50% | User may differ from friends |
| "I think I prefer X" | Uncertain preference | 70% | Higher bar for surfacing |
| "I sometimes enjoy X" | Partial preference | 65% | Don't generalize |
| "I used to prefer X" | Historical state | 40% | May or may not still apply |

**Key Insight:** Language signals confidence. Words like "usually," "sometimes," "I think," "I guess" should lower stored confidence and inform how the memory is surfaced.

---

## 2. Confidence Scoring Architecture

### 2.1 Multi-Factor Confidence Model

Every memory should carry a confidence score calculated from:

```yaml
memory:
  id: "mem_12345"
  content: "User prefers morning meetings"
  type: "preference"
  source: "inferred"  # stated | inferred | hybrid
  confidence:
    score: 0.72
    factors:
      source_reliability: 0.85  # stated > hybrid > inferred
      evidence_count: 3         # number of supporting observations
      evidence_strength: 0.70   # quality of evidence
      recency: 0.90            # how recent is evidence
      consistency: 0.85        # absence of contradictions
      reinforcement_count: 2   # times user confirmed/acted consistently
  provenance:
    created_at: "2026-02-10T09:00:00Z"
    evidence:
      - session_id: "sess_001"
        observation: "Scheduled meeting for 9 AM"
        timestamp: "2026-02-08"
      - session_id: "sess_003"
        observation: "Said 'early works better for me'"
        timestamp: "2026-02-10"
      - session_id: "sess_005"
        observation: "Declined 4 PM meeting invite"
        timestamp: "2026-02-12"
    inference_chain: "3 observations suggest morning preference"
```

### 2.2 Confidence Thresholds

| Threshold | Confidence | Allowed Actions |
|-----------|------------|-----------------|
| **High Confidence** | ≥ 0.85 | Act on directly, minimal attribution |
| **Moderate Confidence** | 0.65-0.84 | Surface with soft attribution |
| **Low-Moderate** | 0.50-0.64 | Surface only when relevant, seek confirmation |
| **Low Confidence** | 0.35-0.49 | Don't act on; passive observation only |
| **Speculative** | < 0.35 | Store but don't surface until evidence grows |

### 2.3 Confidence Adjustment Events

**Increases Confidence:**
- User confirms inference explicitly (+0.15)
- User acts consistently with inference (+0.05 to +0.10)
- Time passes without contradiction (+0.02/month, cap at +0.10)
- Multiple independent observations (+0.05 each)

**Decreases Confidence:**
- User contradicts inference (major: set to 0.2, minor: -0.15)
- Long time since last evidence (-0.02/month)
- User expresses uncertainty about topic (-0.10)
- Related inferences prove wrong (-0.10)

**Supersedes Entirely:**
- User explicitly states contrary fact → Old inference marked SUPERSEDED
- User says "That's not true" or "I don't actually like X"

### 2.4 Source Reliability Hierarchy

From Iteration 2 (Conflict Resolution), with inference-specific additions:

| Source | Reliability Score | Override Authority |
|--------|-------------------|-------------------|
| Explicit user correction | 1.0 | Can override anything |
| Direct user statement | 0.95 | Overrides all inferences |
| User setting/form input | 0.95 | Overrides inferences |
| User action (deliberate) | 0.80 | Context-dependent |
| Strong inference (5+ evidence) | 0.75 | Can override weak inferences |
| Moderate inference (3-4 evidence) | 0.60 | Context-dependent |
| Weak inference (1-2 evidence) | 0.40 | Lowest priority |
| Third-party report | 0.35 | Corroborates only |

---

## 3. Transparency Requirements

### 3.1 The Transparency Principle

> Users should be able to understand **why** the AI thinks something, not just **what** it thinks.

**Why Transparency Matters:**
1. **Trust building:** Users trust AI more when they understand its reasoning
2. **Error correction:** Users can fix wrong inferences if they know the basis
3. **Agency:** Users maintain control over how they're understood
4. **Reduced creepiness:** "I noticed X because of Y" feels less surveillant than "I know X"

### 3.2 When to Show Inference Reasoning

| Scenario | Show Reasoning? | Format |
|----------|-----------------|--------|
| High-confidence, acting on it | Optional | "Since you prefer X..." |
| Moderate-confidence, suggesting | Yes | "I think you might like X because..." |
| User questions recall | Always | Full inference chain |
| Inference affects important decision | Yes | "Based on [evidence], I believe..." |
| Routine memory surfacing | Usually no | Unless asked |
| Wrong inference (user corrects) | Yes | "I thought X because Y—got it, I'll remember Z instead" |

### 3.3 Inference Chain Display

**Full Chain (on request):**
```
Memory: "You prefer morning meetings"
Type: Inferred (72% confidence)
Evidence:
  1. Feb 8: Scheduled team sync for 9 AM
  2. Feb 10: Said "early works better for me"
  3. Feb 12: Declined 4 PM meeting invitation
Inference: Pattern suggests preference for morning scheduling
```

**Natural Language (surfacing):**
```
"I've noticed you tend to schedule things in the morning—
would 9 AM work for this meeting?"
```

**Minimal (high confidence):**
```
"How about 9 AM since mornings work well for you?"
```

### 3.4 Attribution Language by Source Type

| Source Type | Attribution Style | Example |
|-------------|-------------------|---------|
| **Stated Fact** | Direct | "You mentioned..." |
| **Strong Inference** | Observed pattern | "I've noticed you tend to..." |
| **Moderate Inference** | Tentative | "It seems like you might prefer..." |
| **Weak Inference** | Questioning | "Do you prefer X? I got that impression from..." |
| **Hybrid** | Conditional | "You said you usually prefer X—is that the case here?" |

---

## 4. Inference Display Patterns

### 4.1 UI Patterns for Memory Transparency

**Pattern 1: Confidence Indicators**
```
🟢 High confidence (stated or well-established)
🟡 Moderate confidence (likely but uncertain)  
🟠 Low confidence (speculative)
```

**Pattern 2: Source Badges**
```
[Stated] You prefer email over phone calls
[Inferred] You like live music (from concert mentions)
[Learned] You're usually free Friday afternoons (pattern observed)
```

**Pattern 3: Expandable Evidence**
```
📝 You prefer morning meetings
   └─ Evidence (3 observations): [Expand to see]
```

**Pattern 4: Confidence + Source Combined**
```
Morning meetings ████████░░ 78% (inferred from scheduling patterns)
Vegetarian      ██████████ 100% (you stated Feb 3)
Likes jazz      ████░░░░░░ 42% (mentioned once)
```

### 4.2 Chat-Based Transparency

**Proactive Disclosure (occasionally):**
```
AI: "I'm going to suggest morning times since you seem 
to prefer early meetings—correct me if that's changed!"
```

**Reactive Disclosure (when questioned):**
```
User: "Why did you assume I like Italian food?"

AI: "You've mentioned Italian restaurants positively a few 
times—Osteria back in January, and when we talked about 
your trip to Rome. I wasn't certain, just taking a guess 
based on the pattern. Should I not assume that?"
```

**Correction Disclosure:**
```
User: "Actually, I don't really prefer mornings."

AI: "Oh, got it! I thought that because you scheduled several 
morning meetings and mentioned 'early works better.' I'll 
forget that preference—do you have a time that actually works 
better, or is it case-by-case?"
```

### 4.3 Memory Dashboard UI Elements

**Memory Card Design:**
```
┌────────────────────────────────────────────────┐
│ 🟡 You prefer morning meetings                 │
│                                                │
│ Confidence: 72% (moderate)                     │
│ Source: Inferred from behavior                 │
│ Evidence: 3 observations                       │
│ Last updated: 2 weeks ago                      │
│                                                │
│ [View Evidence] [Edit] [Delete] [Mark Wrong]   │
└────────────────────────────────────────────────┘
```

**Evidence Expansion:**
```
Evidence for "prefers morning meetings":

1. Feb 8, 2026
   You scheduled the team sync for 9 AM
   
2. Feb 10, 2026  
   You said: "early works better for me"
   
3. Feb 12, 2026
   You declined a 4 PM meeting invitation

[This inference correct?]  ✓ Yes    ✗ No    ? Sometimes
```

---

## 5. Inference Validation Strategies

### 5.1 The Validation Dilemma

**Problem:** Validating inferences improves accuracy but risks being annoying.

| Too much validation | Too little validation |
|---------------------|----------------------|
| "Am I right that...?" constantly | Wrong inferences persist |
| User feels interrogated | User feels misunderstood |
| Conversation becomes about memory | Trust degrades when errors surface |
| Validation fatigue | "How did you even decide that?" |

**Balance Point:** Validate when stakes are high or confidence is moderate. Trust high-confidence inferences. Never validate low-stakes inferences verbally.

### 5.2 Validation Approaches

**Implicit Validation (Preferred):**
- Surface inference in context, observe reaction
- "Since you prefer mornings, how about 9 AM?"
- If user corrects, update. If user accepts, reinforce.

**Soft Validation:**
- Acknowledge uncertainty in phrasing
- "You seem to prefer mornings—is that right?"
- "Correct me if I'm wrong, but you mentioned liking X"

**Direct Validation:**
- For important or sensitive inferences
- "I've noticed you often mention [topic]—is that something you'd like me to remember as a preference?"

**Batch Validation:**
- Occasional "memory check-in" 
- "I want to make sure I have things right. You prefer X, usually like Y, and Z is important to you—anything to update?"

### 5.3 When to Validate

| Confidence Level | Stakes | Validate? |
|------------------|--------|-----------|
| High (≥ 0.85) | Low | No—act directly |
| High | High | Soft validation |
| Moderate (0.65-0.84) | Low | Implicit (surface and observe) |
| Moderate | High | Direct validation |
| Low (0.50-0.64) | Low | Don't act; passive observation |
| Low | High | Direct validation before any action |
| Very Low (< 0.50) | Any | Don't surface or validate; continue observing |

### 5.4 Validation Frequency Limits

**Per-Conversation:**
- Max 1 direct validation question per substantial conversation
- Max 2 soft validations (built into natural phrasing)
- Unlimited implicit validation (surfacing with natural attribution)

**Per-Relationship:**
- Weekly batch validation (optional, user-controlled)
- "Memory check" feature in dashboard (user-initiated)
- Never validate the same inference twice within 30 days unless new evidence

### 5.5 Validation Language

**Good (Natural, Non-Intrusive):**
- "I'll suggest morning slots since that seems to work for you—let me know if that's changed"
- "Based on our conversations, I'm guessing you'd prefer X—right?"
- "You seem to enjoy [topic]—am I reading that right?"

**Bad (Interrogative, Database-Like):**
- "Please confirm: do you prefer morning meetings? Y/N"
- "I have recorded that you like X. Is this data accurate?"
- "My inference engine has determined with 72% confidence that..."

**For Important Inferences:**
- "I want to make sure I understand correctly—when you mentioned X, did you mean...?"
- "Before I assume X, is that actually the case?"

---

## 6. Trust Implications

### 6.1 The Asymmetry of Errors

**Wrong Stated Fact:** 
- User: "You remember wrong, I said X not Y"
- Impact: Minor embarrassment, easily corrected
- Trust: Slight dent, recoverable

**Wrong Inference:**
- User: "I never said I liked that. Why do you think that?"
- Impact: Feels like surveillance or manipulation
- Trust: Moderate damage, needs explanation

**Correct Inference Without Explanation:**
- User: "How did you know that?"
- Impact: Impressive if explained, creepy if not
- Trust: Depends entirely on transparency

**Correct Inference With Explanation:**
- User: "Oh, you noticed that from when I mentioned X"
- Impact: Feels like attentive listening
- Trust: Builds relationship

### 6.2 Trust-Building Through Transparency

| Behavior | Trust Impact |
|----------|-------------|
| Explain inference reasoning when asked | Strong positive |
| Acknowledge uncertainty appropriately | Moderate positive |
| Accept corrections gracefully | Strong positive |
| Surface inference basis proactively (sometimes) | Moderate positive |
| Get inferences right silently | Neutral to slight positive |
| Get inferences wrong without explanation | Moderate negative |
| Resist correction or over-explain errors | Strong negative |
| Never explain, just "know" things | Negative (creepy) |

### 6.3 Recovering from Wrong Inferences

**Step 1: Accept immediately**
```
User: "I don't actually prefer mornings, that's not right."
AI: "Oh! My mistake—I'll forget that."
```

**Step 2: Explain reasoning (briefly)**
```
AI: "I thought that because you'd scheduled a few morning 
meetings recently, but clearly I read too much into it."
```

**Step 3: Learn for the future**
```
AI: "Is there a time that generally works better for you, 
or should I just ask each time?"
```

**Step 4: Don't over-apologize**
```
BAD: "I sincerely apologize for this error in my inference 
system. I will recalibrate my confidence parameters..."

GOOD: "Got it—thanks for the correction."
```

### 6.4 The Confidence-Transparency Tradeoff

| Confidence | Transparency Level | Rationale |
|------------|-------------------|-----------|
| Very High | Low (act naturally) | Feels like good memory |
| High | Medium (soft attribution) | Comfortable, correctable |
| Moderate | High (clear attribution) | User can evaluate |
| Low | Very High (explicit uncertainty) | User decides whether to trust |
| Very Low | Don't surface | Nothing to be transparent about |

---

## 7. Inference Types: Specific Handling

### 7.1 Preference Inference

**What it captures:** "User likes X" / "User prefers X over Y"

**Confidence building:**
- Single mention: 40-50%
- Repeated mentions (3+): 60-75%
- Explicit positive statement: 80-90%
- Acted on (chose X): +10-15%

**Validation approach:**
- Implicit: Surface when relevant, observe reaction
- Soft: "Since you seem to prefer X..."
- Direct: Only for significant life preferences

**Special considerations:**
- Preferences change—add temporal decay
- Context matters ("prefer X for work" ≠ "prefer X always")
- Stated > inferred always

### 7.2 Pattern Inference

**What it captures:** "User usually does Y on Fridays" / "User tends to Z in mornings"

**Confidence building:**
- 2 occurrences: 35-45%
- 3-4 occurrences: 50-65%
- 5+ occurrences: 70-85%
- Regular schedule (weekly/daily): +10%

**Validation approach:**
- Implicit: Use pattern to predict, see if correct
- Soft: "You usually do X around this time—should I assume the same?"
- Direct: "I've noticed a pattern—is this intentional?"

**Special considerations:**
- Patterns break—don't over-rely
- Distinguish routine from preference
- One broken pattern doesn't invalidate inference

### 7.3 Relationship Inference

**What it captures:** "User is close to person Z" / "Person Z is user's manager"

**Confidence building:**
- Single mention: 30-40%
- Context clues (asking about birthday gift): +15-20%
- Emotional language: +10-15%
- Multiple interactions mentioned: +5-10% each

**Validation approach:**
- Almost never validate directly
- Implicit: Use natural language that allows correction
- Soft: "Your friend Z" vs "Z" (invites clarification)

**Special considerations:**
- Relationships change—be careful with old data
- Don't assume relationship type (friend vs partner)
- Never surface relationship inferences unsolicited
- Sensitive to privacy (don't reveal to others)

### 7.4 Emotional Inference

**What it captures:** "User seems stressed about W" / "User is excited about X"

**Confidence building:**
- Explicit statement: 90% (but this is stated, not inferred)
- Language/tone cues: 40-60%
- Context cues: 35-50%
- Pattern over time: 50-70%

**Validation approach:**
- **Never directly validate emotional inferences**
- Offer support without stating inference: "How are you holding up?"
- Let user confirm or deny naturally

**Special considerations:**
- Highest privacy sensitivity
- Wrong emotional inferences are uncomfortable
- Better to under-infer than over-infer
- Context: work chat ≠ personal check-in

### 7.5 Interest Inference

**What it captures:** "User is interested in topic Y"

**Confidence building:**
- Asked questions about topic: 40-60%
- Shared content about topic: 50-65%
- Extended conversation about topic: 60-75%
- Explicitly said "I'm interested in": 95%

**Validation approach:**
- Implicit: Suggest related content, observe reaction
- Soft: "Since you're into X..."
- Direct: Rarely needed—low stakes

**Special considerations:**
- Interest ≠ expertise
- Casual interest ≠ important passion
- People explore topics temporarily

### 7.6 Capability Inference

**What it captures:** "User knows Python" / "User can design interfaces"

**Confidence building:**
- Demonstrated skill: 70-85%
- Mentioned experience: 60-75%
- Job title/role implies: 50-65%
- Talked about learning: 40-50%

**Validation approach:**
- Implicit: Adjust explanation complexity, observe comprehension
- Soft: "You probably know this, but..."
- Direct: "How familiar are you with X?"

**Special considerations:**
- Avoid under-explaining to experts (condescending)
- Avoid over-explaining to beginners (confusing)
- Skill levels vary by subdomain
- Knowledge gets outdated

---

## 8. Implementation Guidelines

### 8.1 Memory Schema Extension

```yaml
memory_schema:
  # Core fields (existing)
  id: string
  content: string
  type: enum [preference, fact, pattern, relationship, emotional, interest, capability]
  
  # Source classification (new)
  source:
    classification: enum [stated, inferred, hybrid]
    confidence_score: float  # 0.0 to 1.0
    confidence_level: enum [very_high, high, moderate, low, speculative]
  
  # Provenance (extended)
  provenance:
    created_at: timestamp
    created_from: session_id
    original_statement: string  # For stated facts
    evidence_chain: []          # For inferences
      - session_id: string
        timestamp: timestamp
        observation: string
        contribution_weight: float
    inference_method: string    # e.g., "pattern_detection", "sentiment_analysis"
    last_validated: timestamp
    validation_method: enum [implicit, soft, direct, user_confirmed]
  
  # Trust metrics (new)
  trust:
    reinforcement_count: int
    contradiction_count: int
    last_reinforced: timestamp
    user_corrections: []
```

### 8.2 Inference Pipeline

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│ Conversation │────▶│ Extract Facts │────▶│ Stated Memories  │
│    Input     │     │   (explicit)  │     │  (high conf)     │
└──────────────┘     └───────────────┘     └──────────────────┘
       │
       ▼
┌──────────────────┐     ┌───────────────┐     ┌──────────────────┐
│ Pattern Analysis │────▶│ Build Evidence│────▶│ Inferred Memory  │
│ (background)     │     │    Chain      │     │  (variable conf) │
└──────────────────┘     └───────────────┘     └──────────────────┘
       │                                               │
       ▼                                               ▼
┌──────────────────┐                        ┌──────────────────┐
│ Confidence Calc  │                        │ Storage + Index  │
│ (multi-factor)   │                        │ (with provenance)│
└──────────────────┘                        └──────────────────┘
```

### 8.3 Retrieval-Time Processing

```python
def retrieve_with_transparency(query, context, user_prefs):
    memories = vector_search(query)
    
    for memory in memories:
        # Adjust confidence for age
        memory.confidence = apply_temporal_decay(
            memory.confidence,
            memory.provenance.created_at
        )
        
        # Check if validation needed
        if should_validate(memory, context, user_prefs):
            memory.needs_validation = True
            memory.validation_type = select_validation_type(memory)
        
        # Prepare attribution
        memory.attribution = generate_attribution(
            memory,
            user_prefs.attribution_level,
            context
        )
    
    return memories

def generate_attribution(memory, level, context):
    if memory.source.classification == 'stated':
        return stated_attribution(memory, level)
    elif memory.source.classification == 'inferred':
        return inferred_attribution(memory, level)
    else:  # hybrid
        return hybrid_attribution(memory, level)

def inferred_attribution(memory, level):
    if level == 'silent':
        return None
    elif level == 'natural':
        return f"I've noticed you tend to {memory.content}"
    elif level == 'explicit':
        evidence_summary = summarize_evidence(memory.provenance.evidence_chain)
        return f"Based on {evidence_summary}, it seems like {memory.content}"
    elif level == 'full':
        return format_full_evidence_chain(memory)
```

### 8.4 Confidence Calculation Implementation

```python
def calculate_confidence(inference_type, evidence):
    # Base score by type
    base_scores = {
        'preference': 0.45,
        'pattern': 0.40,
        'relationship': 0.35,
        'emotional': 0.30,
        'interest': 0.45,
        'capability': 0.50
    }
    
    base = base_scores.get(inference_type, 0.40)
    
    # Evidence count factor (logarithmic scaling)
    count_factor = min(math.log(len(evidence) + 1) / 2, 1.5)
    
    # Evidence quality
    quality_scores = [e.strength for e in evidence]
    quality_factor = sum(quality_scores) / len(quality_scores) if quality_scores else 0.5
    
    # Recency factor (exponential decay)
    most_recent = max(e.timestamp for e in evidence)
    days_old = (now() - most_recent).days
    recency_factor = math.exp(-days_old / 90)  # Half-life of ~60 days
    
    # Consistency (check for contradictions)
    contradiction_count = count_contradictions(evidence)
    consistency_factor = 1.0 - (contradiction_count * 0.15)
    
    # Combine factors
    confidence = base * count_factor * quality_factor * recency_factor * consistency_factor
    
    # Clamp to valid range
    return max(0.1, min(0.95, confidence))
```

---

## 9. User Control Settings

### 9.1 Inference Preferences

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Enable inferences | On/Off | On | Whether AI can infer beyond stated facts |
| Inference transparency | Silent/Natural/Explicit | Natural | How AI explains inference basis |
| Validation frequency | Never/Occasionally/Often | Occasionally | How often AI validates inferences |
| Confidence threshold | Low/Medium/High | Medium | Minimum confidence to surface inference |
| Inference categories | Multi-select | All enabled | Which types of inference to allow |

### 9.2 Per-Category Controls

```yaml
inference_settings:
  preferences:
    enabled: true
    min_confidence: 0.60
    validate: occasionally
    
  patterns:
    enabled: true
    min_confidence: 0.55
    validate: rarely
    
  relationships:
    enabled: true
    min_confidence: 0.70
    validate: never  # Too personal to ask about
    
  emotional:
    enabled: false   # User may disable
    min_confidence: 0.75
    validate: never
    
  interests:
    enabled: true
    min_confidence: 0.50
    validate: sometimes
    
  capabilities:
    enabled: true
    min_confidence: 0.60
    validate: naturally
```

### 9.3 Privacy Escalation

| Action | Sensitivity | Required Confidence |
|--------|-------------|-------------------|
| Store stated fact | Low | N/A (always store) |
| Store inference | Medium | > 0.35 |
| Act on inference | Medium | > 0.65 |
| Surface inference proactively | Medium-High | > 0.70 |
| Surface emotional inference | High | Never proactively |
| Share inference with others | Very High | Never without explicit consent |

---

## 10. Summary Guidelines

### For Classification

1. **Always track source** — Every memory must be tagged as stated, inferred, or hybrid
2. **Store evidence chains** — For inferences, keep the reasoning accessible
3. **Calculate confidence systematically** — Multi-factor scoring, not gut feel
4. **Respect the hierarchy** — Stated always beats inferred when they conflict

### For Transparency

1. **Default to natural attribution** — "I've noticed..." not "My database shows..."
2. **Increase transparency with uncertainty** — Lower confidence = more explanation
3. **Make inference reasoning available** — Users should be able to ask "why"
4. **Never hide the source** — If asked, always explain

### For Validation

1. **Implicit is usually best** — Surface and observe, don't interrogate
2. **Limit direct validation** — Max 1 per conversation
3. **High stakes = more validation** — Important decisions need confirmation
4. **Never validate emotional inferences** — Too personal

### For Trust

1. **Explain when wrong** — Recovery requires transparency
2. **Accept corrections gracefully** — No over-apologizing
3. **Show uncertainty appropriately** — "I think" vs "I know"
4. **Quality over surveillance** — Better to miss than to creep

---

## 11. Open Questions

1. **Cross-inference dependencies** — If inference A supports inference B, how does uncertainty propagate?

2. **Inference expiration** — Should old, unvalidated inferences eventually auto-delete?

3. **Cultural calibration** — Do transparency expectations vary significantly by culture?

4. **Group inference** — When AI serves multiple users, can it infer from cross-user patterns ethically?

5. **Inference explanation UX** — Best way to visualize inference chains to non-technical users?

6. **Retroactive confidence update** — When new evidence appears, how to efficiently update old inferences?

---

## 12. Integration with Framework

### Documents to Update

1. **02-Memory-Architecture.md** — Add source classification to memory types
2. **10-Conflict-Resolution.md** — Add inference-specific conflict handling
3. **12-User-Control.md** — Add inference-specific user preferences

### New Documents Needed

1. **guidelines/inference-surfacing.md** — Practical guide for when/how to surface
2. **schemas/memory-confidence.yaml** — Formal confidence schema

### Implementation Priority

1. **Phase 1:** Source classification (stated/inferred/hybrid) on all memories
2. **Phase 2:** Confidence scoring for new inferences
3. **Phase 3:** Attribution language in surfacing
4. **Phase 4:** User-facing transparency (dashboard, "why")
5. **Phase 5:** Validation system

---

*This document addresses Iteration 3 Question 6: "How do we distinguish and explain inferred memories vs stated facts?"*

— Jordan 🧭
