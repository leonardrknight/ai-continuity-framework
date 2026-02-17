# Learning from Corrections: Improving Future Inferences

*Research Document for AI Continuity Framework*  
*Iteration 4, Document 01*  
*Status: Complete*

---

## Executive Summary

When users correct AI memory systems, we face a critical question: **what exactly should the system learn?** A simple fact correction ("I moved to Austin") is straightforward, but inference corrections ("I don't actually like coffee") reveal deeper issues with the system's reasoning patterns.

**The Core Challenge:**
- A correction is a signal, but what kind?
- Does it invalidate one fact, a category of inference, or an entire reasoning pattern?
- How do we learn without overcorrecting?

**Key Finding:** Corrections should trigger three layers of learning:
1. **Immediate:** Fix the specific error
2. **Local:** Adjust confidence in similar inferences
3. **Meta:** Track patterns in correction types to improve future inference strategies

---

## 1. Correction Taxonomy

### 1.1 Three Correction Types

| Type | User Statement | What's Wrong | Learning Required |
|------|---------------|--------------|-------------------|
| **Factual Correction** | "I don't live in NYC, I moved to Austin" | Outdated/wrong fact | Update fact, timestamp awareness |
| **Inference Correction** | "I don't actually like coffee, I just drink it" | Wrong conclusion from evidence | Revise inference logic, adjust confidence |
| **Pattern Feedback** | "Stop assuming I'm a morning person" | Systematic reasoning bias | Meta-learning, category confidence adjustment |

### 1.2 Factual Correction

**Characteristics:**
- User is correcting stored data, not reasoning
- Clear replacement value provided
- Usually time-sensitive (things changed)

**Examples:**
- "I moved from NYC to Austin last month"
- "My job title is now Senior Engineer, not just Engineer"
- "I don't work at that company anymore"
- "My daughter's name is Maya, not Maria"

**Learning Response:**
```yaml
action: update_fact
old_value: "Lives in NYC"
new_value: "Lives in Austin"
temporal_marker: true  # Mark old as "was true until X"
learning_type: fact_replacement
cascade: minimal  # Related inferences may need review
```

**Key Insight:** Don't delete the old fact—mark it as superseded with a timestamp. This preserves history and supports temporal reasoning ("You used to live in NYC, right?").

### 1.3 Inference Correction

**Characteristics:**
- User isn't correcting a fact—the facts may have been correct
- The AI's conclusion from those facts was wrong
- Reveals a gap between evidence and conclusion

**Examples:**
- "I don't actually like coffee, I just drink it for the caffeine"
- "I'm not a dog person—I just happen to have dogs because my kids wanted them"
- "I don't prefer mornings, I just have no choice with my schedule"
- "I'm not stressed about work, I just talk about it a lot"

**Learning Response:**
```yaml
action: correct_inference
original_inference: "User likes coffee"
correction: "User drinks coffee but doesn't enjoy it"
evidence_used: ["Mentioned drinking coffee 5x", "Asked about coffee shops"]
learning:
  - Evidence was valid, conclusion was wrong
  - "Drinks X" ≠ "Likes X"
  - Need "enjoys/likes" signal, not just "does/uses"
  
cascade: moderate  # Similar inferences should be reviewed
confidence_adjustment:
  similar_inferences: -0.15  # Reduce confidence in "does → likes" pattern
  this_category: "preference_from_behavior"
```

**The Critical Difference:**

| Situation | Stated | Inferred | Correct Inference |
|-----------|--------|----------|-------------------|
| "I drink coffee every day" | ✅ | - | - |
| AI concludes: "Likes coffee" | - | ❌ | "Drinks coffee regularly" |
| Reality: Drinks for caffeine, dislikes taste | - | - | ✅ |

### 1.4 Pattern Feedback

**Characteristics:**
- User is frustrated with a recurring error pattern
- Meta-level feedback about inference approach
- Often expressed with words like "stop," "always," "never"

**Examples:**
- "Stop assuming I'm a morning person"
- "You always think I prefer the cheaper option"
- "I'm not as into tech as you seem to think"
- "Why do you keep suggesting Italian restaurants?"

**Learning Response:**
```yaml
action: meta_correction
pattern_identified: "morning_person_assumption"
user_directive: "Do not assume morning preference"

learning:
  - Create inference blocklist entry
  - Review all existing morning-related inferences
  - Add "scheduling preference" to explicit validation list
  
cascade: significant  # Affects entire inference category
meta_tracking:
  category: "temporal_preferences"
  user_sensitivity: high
  action: always_validate_before_inferring
```

**Pattern Feedback Signals:**
- Explicit: "Stop assuming X"
- Frustrated: "Why do you always..."
- Corrective: "I've told you before..."
- Boundary-setting: "Don't make assumptions about..."

---

## 2. Feedback Signal Classification

### 2.1 Signal Types

Not all corrections come with explicit "that's wrong" statements. The system must recognize multiple feedback signals.

| Signal Type | Strength | Example | Detection |
|-------------|----------|---------|-----------|
| **Explicit Correction** | Strong | "That's wrong, I actually..." | Direct contradiction language |
| **Explicit Negation** | Strong | "I don't actually like that" | Negation + topic |
| **Gentle Correction** | Medium | "Well, it's more like..." | Softened disagreement |
| **Implied Correction** | Medium | "Hmm, not really" | Non-committal disagreement |
| **Behavioral Correction** | Weak | User ignores suggestion based on inference | Action contradicts inference |
| **Clarification Response** | Weak | AI asked, user clarified differently | Validation revealed error |
| **Silence** | Very Weak | User doesn't engage with surfaced inference | Ambiguous—may be irrelevant or wrong |

### 2.2 Detection Patterns

**Explicit Correction Detection:**
```yaml
patterns:
  strong_negation:
    - "That's wrong"
    - "That's not right"
    - "Actually, I..."
    - "No, I..."
    - "I don't [actually/really]"
    
  correction_with_replacement:
    - "It's not X, it's Y"
    - "I don't X, I Y"
    - "I'm not X, I'm Y"
    
  meta_correction:
    - "Stop assuming"
    - "You always think"
    - "Why do you keep"
    - "I've told you"
```

**Gentle Correction Detection:**
```yaml
patterns:
  softened_disagreement:
    - "Well, it's more like..."
    - "Not exactly..."
    - "Kind of, but..."
    - "That's partially right..."
    
  uncertainty_signals:
    - "I wouldn't say..."
    - "That's a bit strong..."
    - "Sort of, but..."
```

**Behavioral Correction Detection:**
```yaml
signals:
  - AI suggests X based on inference, user chooses Y
  - AI schedules for morning, user reschedules to afternoon
  - AI recommends coffee shop, user picks tea house
  - Repeated non-engagement with inference-based suggestions
```

### 2.3 Signal Weighting

```python
def weight_correction_signal(signal_type, context):
    base_weights = {
        'explicit_correction': 1.0,
        'explicit_negation': 0.95,
        'gentle_correction': 0.7,
        'implied_correction': 0.5,
        'behavioral_correction': 0.4,
        'clarification_different': 0.6,
        'silence': 0.1
    }
    
    weight = base_weights[signal_type]
    
    # Contextual adjustments
    if context.user_expressed_frustration:
        weight *= 1.2
    if context.repeated_similar_correction:
        weight *= 1.3
    if context.high_stakes_decision:
        weight *= 1.1
    if context.casual_conversation:
        weight *= 0.9
    
    return min(weight, 1.0)
```

### 2.4 Ambiguity Handling

**Problem:** Not every disagreement is a correction. Sometimes:
- User is being polite but actually agrees
- Context is hypothetical
- User is unsure themselves
- User is correcting their own previous statement

**Resolution:**

| Situation | Interpretation | Action |
|-----------|---------------|--------|
| "Well, not really" (casual) | Likely correction | Reduce confidence 30% |
| "Well, not really" (to validation) | Definite correction | Mark inference wrong |
| "Actually, maybe" | User uncertainty | Reduce confidence 20% |
| "In this case, no" | Context-specific | Add exception, not correction |
| "I said X but meant Y" | Self-correction | Update memory, not inference |

---

## 3. Learning Mechanisms

### 3.1 The Three-Layer Learning Model

When a correction occurs, the system should learn at three levels:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: META-LEARNING                                 │
│  "How should I reason about this type of inference?"    │
│  • Update inference category weights                    │
│  • Track user-specific sensitivities                    │
│  • Adjust validation strategies                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: LOCAL LEARNING                                │
│  "What other inferences might be similarly wrong?"      │
│  • Identify related inferences                          │
│  • Reduce confidence in similar conclusions             │
│  • Flag for validation                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: IMMEDIATE CORRECTION                          │
│  "Fix this specific error"                              │
│  • Mark memory as corrected                             │
│  • Store correct value                                  │
│  • Record correction event                              │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Layer 1: Immediate Correction

**Actions:**
1. Mark the incorrect memory/inference as `corrected`
2. Store the correct information
3. Record the correction event with full context
4. Link old and new memories for provenance

**Schema:**
```yaml
correction_event:
  id: "corr_12345"
  timestamp: "2026-02-16T14:30:00Z"
  session_id: "sess_789"
  
  original_memory:
    id: "mem_456"
    content: "User likes coffee"
    type: "inferred"
    confidence: 0.72
    
  correction:
    type: "inference_correction"
    signal: "explicit_negation"
    user_statement: "I don't actually like coffee, I just drink it"
    new_understanding: "User drinks coffee for caffeine, doesn't enjoy it"
    
  action_taken:
    - marked_original_superseded
    - created_new_memory
    - reduced_confidence_similar_inferences
```

### 3.3 Layer 2: Local Learning

**Goal:** Identify and adjust related inferences that may be similarly flawed.

**Process:**
```python
def local_learning(correction):
    # 1. Identify the inference pattern that failed
    failed_pattern = extract_inference_pattern(correction)
    # e.g., "behavior_implies_preference"
    
    # 2. Find similar inferences
    similar = find_inferences_by_pattern(
        user_id=correction.user_id,
        pattern=failed_pattern,
        confidence_range=(0.4, 0.9)
    )
    
    # 3. Reduce confidence proportionally
    for inference in similar:
        similarity_score = calculate_similarity(
            inference, 
            correction.original_memory
        )
        confidence_reduction = 0.15 * similarity_score
        inference.confidence -= confidence_reduction
        inference.pending_validation = True
        
    # 4. Add negative example to pattern
    add_negative_example(
        pattern=failed_pattern,
        example=correction.original_memory,
        correct_interpretation=correction.new_understanding
    )
```

**Example:**

User corrects: "I don't actually like coffee, I just drink it"

**Failed inference pattern:** "Frequently does X → Likes X"

**Similar inferences to review:**
- "User likes running" (runs every morning)
- "User enjoys meetings" (schedules many)
- "User prefers email" (sends many emails)

**Action:** Reduce confidence by 10-15% on similar "behavior → preference" inferences. Flag for gentle validation.

### 3.4 Layer 3: Meta-Learning

**Goal:** Learn systematic improvements to inference strategies.

**What to track:**

```yaml
user_correction_profile:
  user_id: "user_123"
  
  correction_history:
    total_corrections: 47
    by_type:
      factual: 12
      inference: 28
      pattern: 7
      
  inference_sensitivities:
    - category: "temporal_preferences"
      corrections: 5
      sensitivity: high
      action: always_validate
      
    - category: "food_preferences"
      corrections: 2
      sensitivity: medium
      action: softer_language
      
    - category: "capability_inference"
      corrections: 0
      sensitivity: low
      action: normal
      
  patterns:
    - "behavior_implies_preference"
      error_rate: 0.23
      adjustment: reduce_base_confidence_15%
      
    - "frequency_implies_importance"
      error_rate: 0.18
      adjustment: require_additional_signals
      
  global_preferences:
    prefers_explicit_validation: false
    transparency_when_uncertain: high
    correction_style: gentle
```

**Meta-learning rules:**

| Pattern Observed | Learning | Action |
|------------------|----------|--------|
| User corrects X-type inferences >3x | User sensitive to X | Always validate X before acting |
| Category has >20% error rate | Category unreliable | Reduce base confidence 20% |
| User says "stop assuming" | Strong boundary | Add to inference blocklist |
| Corrections cluster in timeframe | Context was unusual | Don't generalize from that period |
| User provides detailed corrections | User engaged | Safe to ask for clarification |
| User gives terse corrections | User annoyed | Be more careful, less validation |

### 3.5 Negative Example Storage

**Purpose:** Store corrections as training data for inference refinement.

```yaml
negative_examples:
  - pattern: "drinks_X_regularly_implies_likes_X"
    case:
      evidence: "Mentioned coffee 5x, asked about coffee shops"
      inference: "User likes coffee"
      correction: "Drinks for caffeine, doesn't enjoy taste"
      lesson: "Consumption ≠ enjoyment; need explicit positive signals"
      
  - pattern: "schedules_mornings_implies_morning_person"
    case:
      evidence: "Scheduled 3 meetings before 10am"
      inference: "User prefers morning meetings"
      correction: "Has no choice due to team timezone"
      lesson: "Scheduling constraints ≠ preferences; context matters"
      
  - pattern: "mentions_topic_often_implies_interest"
    case:
      evidence: "Discussed work stress frequently"
      inference: "User is interested in stress management"
      correction: "User just needed to vent"
      lesson: "Talking about X ≠ wanting advice about X"
```

---

## 4. Weight Adjustment Algorithms

### 4.1 Confidence Adjustment Formula

When a correction occurs:

```python
def adjust_confidence_on_correction(inference, correction_strength):
    """
    correction_strength: 0.0-1.0 based on signal type and context
    """
    
    # Base reduction
    reduction = 0.20 * correction_strength
    
    # If inference was high confidence, penalty is larger
    # (we were more wrong if we were more certain)
    if inference.confidence > 0.8:
        reduction *= 1.3
    
    # Apply reduction, floor at 0.1
    new_confidence = max(0.1, inference.confidence - reduction)
    
    return new_confidence
```

### 4.2 Similar Inference Adjustment

```python
def adjust_similar_inferences(corrected_inference, all_inferences):
    """
    Reduce confidence in inferences that used similar reasoning.
    """
    
    for inference in all_inferences:
        if inference.id == corrected_inference.id:
            continue
            
        # Calculate similarity
        similarity = calculate_inference_similarity(
            corrected_inference, 
            inference
        )
        
        if similarity < 0.3:
            continue  # Not similar enough
            
        # Proportional reduction
        # High similarity = bigger reduction
        reduction = 0.15 * similarity
        
        inference.confidence -= reduction
        inference.needs_revalidation = True
        inference.similar_correction_id = corrected_inference.correction_id
        
def calculate_inference_similarity(inf1, inf2):
    """
    Similarity based on:
    - Same inference pattern/rule
    - Same evidence type
    - Same conclusion type
    - Semantic similarity of content
    """
    
    score = 0.0
    
    # Same pattern (e.g., "behavior → preference")
    if inf1.pattern == inf2.pattern:
        score += 0.4
        
    # Same evidence type (e.g., "frequency observation")
    if inf1.evidence_type == inf2.evidence_type:
        score += 0.2
        
    # Same conclusion type (e.g., "preference")
    if inf1.conclusion_type == inf2.conclusion_type:
        score += 0.2
        
    # Semantic similarity of content
    semantic_sim = cosine_similarity(
        embed(inf1.content), 
        embed(inf2.content)
    )
    score += 0.2 * semantic_sim
    
    return min(score, 1.0)
```

### 4.3 Category Confidence Adjustment

```python
def adjust_category_confidence(category, correction_history):
    """
    Adjust base confidence for an entire inference category
    based on historical accuracy.
    """
    
    corrections = correction_history.filter(category=category)
    total_inferences = inference_count(category)
    
    if total_inferences < 10:
        return  # Not enough data
    
    error_rate = len(corrections) / total_inferences
    
    # Determine category confidence modifier
    if error_rate > 0.25:
        modifier = 0.7  # High error rate, big reduction
    elif error_rate > 0.15:
        modifier = 0.85  # Moderate error rate
    elif error_rate > 0.10:
        modifier = 0.95  # Acceptable error rate
    else:
        modifier = 1.0  # Low error rate, no change
    
    # Apply to all future inferences in this category
    category.base_confidence_modifier = modifier
    
    # Also flag existing inferences for review if high error rate
    if error_rate > 0.20:
        flag_category_for_review(category)
```

### 4.4 Temporal Decay vs Immediate Invalidation

**The Dilemma:** When corrected, should confidence drop immediately to near-zero, or decay gradually?

**Answer: Context-dependent**

| Correction Type | Approach | Rationale |
|-----------------|----------|-----------|
| Explicit "that's wrong" | Immediate invalidation (set to 0.1) | User clearly stated it's false |
| "Not exactly" | Moderate reduction (subtract 0.25) | Partially wrong, not fully |
| Behavioral contradiction | Gradual decay (subtract 0.1/instance) | Could be context-specific |
| Pattern feedback | Category adjustment | Systematic, not individual |

```python
def apply_correction_timing(inference, correction):
    if correction.signal == 'explicit_strong':
        # Immediate invalidation
        inference.confidence = 0.1
        inference.status = 'superseded'
        
    elif correction.signal == 'explicit_mild':
        # Significant reduction, still observable
        inference.confidence = max(0.2, inference.confidence - 0.3)
        inference.status = 'questionable'
        
    elif correction.signal == 'behavioral':
        # Gradual decay
        inference.confidence -= 0.1
        inference.contradiction_count += 1
        
        if inference.contradiction_count >= 3:
            inference.status = 'unreliable'
            
    elif correction.signal == 'pattern_feedback':
        # Don't change individual, change category
        adjust_category_confidence(inference.category)
```

---

## 5. User-Specific Learning Profiles

### 5.1 Learning Profile Structure

Each user develops a correction profile over time:

```yaml
user_learning_profile:
  user_id: "user_123"
  
  # How this user gives corrections
  correction_style:
    typical_signal: "gentle"  # gentle | direct | terse
    provides_explanation: true
    emotional_when_wrong: low  # low | medium | high
    
  # What we've learned about this user's sensitivities
  inference_sensitivities:
    high_sensitivity:
      - "temporal_preferences"
      - "relationship_inferences"
    low_sensitivity:
      - "capability_inference"
      - "interest_detection"
      
  # Patterns we should be cautious about
  caution_patterns:
    - pattern: "behavior_implies_preference"
      reason: "Corrected 4x"
      action: "require_explicit_positive_signal"
      
    - pattern: "frequency_implies_importance"
      reason: "User said 'stop assuming'"
      action: "don't_infer_in_this_category"
      
  # What works well for this user
  successful_patterns:
    - pattern: "explicit_statement_storage"
      accuracy: 0.95
      
    - pattern: "schedule_pattern_detection"
      accuracy: 0.82
      
  # Meta-preferences
  meta_preferences:
    prefers_validation: false
    wants_transparency: true
    correction_acknowledgment: brief  # brief | detailed
    
  # History
  correction_statistics:
    total: 47
    last_30_days: 8
    trend: decreasing  # System is improving
```

### 5.2 Profile-Based Inference Adjustment

```python
def adjust_inference_for_user(inference, user_profile):
    """
    Before storing/surfacing an inference, adjust based on
    user's learning profile.
    """
    
    # Check if user is sensitive to this inference type
    if inference.category in user_profile.high_sensitivity:
        inference.confidence *= 0.8
        inference.validation_required = True
        
    # Check if user has blocked this pattern
    if inference.pattern in user_profile.blocked_patterns:
        return None  # Don't create this inference
        
    # Check if pattern has high error rate for this user
    pattern_accuracy = user_profile.get_pattern_accuracy(inference.pattern)
    if pattern_accuracy < 0.7:
        inference.confidence *= pattern_accuracy
        
    # Adjust surfacing threshold based on user preference
    if user_profile.prefers_validation:
        inference.surface_threshold = 0.6  # Surface more, validate more
    else:
        inference.surface_threshold = 0.75  # Only surface when confident
        
    return inference
```

### 5.3 Learning Rate Adaptation

Different users should have different learning rates:

```python
def calculate_user_learning_rate(user_profile, correction_count):
    """
    How quickly should we adjust to this user's feedback?
    """
    
    base_rate = 0.15
    
    # New users: learn faster (need to calibrate)
    if user_profile.interaction_count < 50:
        base_rate *= 1.5
        
    # Users who correct often: we should learn faster
    recent_corrections = user_profile.corrections_last_30_days
    if recent_corrections > 10:
        base_rate *= 1.3
    elif recent_corrections > 5:
        base_rate *= 1.1
        
    # Users who give detailed feedback: we can learn more precisely
    if user_profile.provides_explanations:
        base_rate *= 1.2
        
    # Cap at reasonable bounds
    return min(max(base_rate, 0.1), 0.3)
```

---

## 6. Avoiding Overcorrection

### 6.1 The Overcorrection Problem

**Scenario:** User says "I don't actually like coffee"

**Overcorrection responses:**
- ❌ Conclude user dislikes all beverages
- ❌ Stop inferring any food/drink preferences
- ❌ Become extremely hesitant about all inferences
- ❌ Never mention coffee again (even if relevant)

**Correct response:**
- ✅ Update: "drinks coffee" ≠ "enjoys coffee"
- ✅ Store the nuance: "drinks for caffeine"
- ✅ Slightly reduce confidence in similar "behavior → preference" inferences
- ✅ Continue normal inference in other domains

### 6.2 Correction Containment Rules

| Rule | Description | Example |
|------|-------------|---------|
| **Scope Limiting** | Correction applies to specific domain | "Don't like coffee" ≠ "Don't like hot drinks" |
| **Evidence Preservation** | Evidence was valid, conclusion was wrong | Still valid: "User drinks coffee regularly" |
| **Pattern Adjustment** | Adjust weight, don't delete pattern | Reduce "behavior → preference" by 15%, don't eliminate |
| **Proportional Response** | Single correction = small adjustment | One coffee correction ≠ distrust all food preferences |
| **Category Independence** | Corrections don't cascade to unrelated categories | Coffee mistake doesn't affect scheduling inferences |

### 6.3 Containment Algorithm

```python
def contain_correction_impact(correction, all_inferences):
    """
    Apply correction learning without overcorrecting.
    """
    
    # 1. Identify correction scope
    scope = classify_correction_scope(correction)
    # Possible values: 'specific', 'domain', 'pattern', 'global'
    
    # 2. Set impact boundaries
    if scope == 'specific':
        # Only affect this exact inference
        affected = [correction.original_inference]
        
    elif scope == 'domain':
        # Affect same domain (e.g., food preferences)
        affected = filter_by_domain(
            all_inferences, 
            correction.original_inference.domain
        )
        max_impact_per_inference = 0.1
        
    elif scope == 'pattern':
        # Affect same inference pattern
        affected = filter_by_pattern(
            all_inferences,
            correction.original_inference.pattern
        )
        max_impact_per_inference = 0.15
        
    elif scope == 'global':
        # Rare: affects inference system broadly
        # Only for explicit "stop assuming" feedback
        affected = all_inferences
        max_impact_per_inference = 0.05
        
    # 3. Apply bounded adjustments
    for inference in affected:
        similarity = calculate_similarity(
            correction.original_inference,
            inference
        )
        reduction = min(
            similarity * 0.20,
            max_impact_per_inference
        )
        inference.confidence -= reduction
        
    # 4. Never reduce below floor
    for inference in affected:
        inference.confidence = max(0.15, inference.confidence)
```

### 6.4 Balance Between Learning and Stability

**The Stability Problem:**
- Too much learning → System becomes unstable, oscillates
- Too little learning → System keeps making same mistakes

**Balance Mechanisms:**

```python
class LearningStabilizer:
    def __init__(self, user_id):
        self.recent_corrections = []  # Last 30 days
        self.recent_reinforcements = []  # Correct inferences
        
    def should_apply_correction(self, correction):
        """
        Prevent over-learning from correction clusters.
        """
        
        # Check for correction clustering
        similar_recent = self.find_similar_corrections(
            correction, 
            window_days=7
        )
        
        if len(similar_recent) >= 3:
            # User is frustrated with a pattern
            # Apply meta-correction, not individual corrections
            return {
                'apply_individual': False,
                'apply_meta': True,
                'action': 'block_pattern'
            }
            
        # Check correction/reinforcement ratio
        domain_corrections = len(self.recent_corrections_in_domain(
            correction.domain
        ))
        domain_reinforcements = len(self.recent_reinforcements_in_domain(
            correction.domain
        ))
        
        if domain_reinforcements > domain_corrections * 3:
            # System is mostly right in this domain
            # Apply correction but with smaller impact
            return {
                'apply_individual': True,
                'impact_modifier': 0.7,
                'reason': 'High accuracy in domain'
            }
            
        return {
            'apply_individual': True,
            'impact_modifier': 1.0
        }
```

### 6.5 Reinforcement Balance

Corrections are only half the picture. The system should also track when inferences are confirmed.

```python
def on_inference_confirmed(inference, confirmation_type):
    """
    When an inference is validated (explicitly or implicitly),
    reinforce it.
    """
    
    if confirmation_type == 'explicit':
        # User said "yes, that's right"
        inference.confidence += 0.10
        inference.reinforcement_count += 1
        
    elif confirmation_type == 'behavioral':
        # User acted consistent with inference
        inference.confidence += 0.05
        inference.reinforcement_count += 1
        
    elif confirmation_type == 'no_contradiction':
        # Inference surfaced, user didn't correct
        # Small reinforcement
        inference.confidence += 0.02
        
    # Update category accuracy
    category = inference.category
    category.success_count += 1
    category.update_accuracy()
```

---

## 7. Correction Response Architecture

### 7.1 Full Correction Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER CORRECTION DETECTED                                   │
│  "I don't actually like coffee, I just drink it"           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. SIGNAL CLASSIFICATION                                   │
│  • Type: inference_correction                               │
│  • Strength: 0.9 (explicit negation)                       │
│  • Scope: domain (food/drink preferences)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. IMMEDIATE CORRECTION                                    │
│  • Mark "likes coffee" as superseded                       │
│  • Create new memory: "drinks coffee for caffeine"         │
│  • Record correction event                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. LOCAL LEARNING                                          │
│  • Pattern: "behavior_implies_preference"                   │
│  • Find similar: "likes running" (0.7 similarity)          │
│  • Reduce similar confidence by 10%                        │
│  • Store negative example                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. META-LEARNING                                           │
│  • Update user profile: sensitive to behavior→preference   │
│  • Reduce pattern base confidence by 5%                    │
│  • Note: need explicit enjoyment signals                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. RESPONSE GENERATION                                     │
│  • Acknowledge: "Oh, got it!"                              │
│  • Show understanding: "I thought that because you         │
│    mentioned it often"                                     │
│  • Update: "I'll remember you drink it for caffeine"       │
│  • Don't over-apologize                                    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Correction Event Schema

```yaml
correction_event:
  id: "corr_20260216_001"
  timestamp: "2026-02-16T14:30:00Z"
  user_id: "user_123"
  session_id: "sess_789"
  
  # What was corrected
  original:
    memory_id: "mem_456"
    content: "User likes coffee"
    type: "preference"
    source: "inferred"
    confidence: 0.72
    pattern: "behavior_implies_preference"
    evidence:
      - "Mentioned coffee 5x"
      - "Asked about coffee shops"
      
  # The correction signal
  signal:
    type: "explicit_negation"
    strength: 0.90
    user_statement: "I don't actually like coffee, I just drink it"
    extracted_correction: "Does not enjoy coffee; drinks for utility"
    
  # What we learned
  learning:
    immediate:
      - action: "supersede_memory"
        old_id: "mem_456"
        new_id: "mem_789"
        new_content: "Drinks coffee for caffeine, doesn't enjoy taste"
        
    local:
      - similar_inferences_adjusted: 3
        pattern: "behavior_implies_preference"
        average_reduction: 0.10
        
    meta:
      - user_sensitivity_added: "behavior_preference_inference"
      - pattern_confidence_adjusted: -0.05
      - negative_example_stored: true
      
  # Response we gave
  response:
    acknowledgment: "Oh, got it!"
    explanation: "I thought that because you mentioned it often"
    update: "I'll remember you drink it for caffeine, not because you enjoy it"
```

### 7.3 Graceful Correction Acknowledgment

**Principles:**
1. Accept immediately—don't argue or explain first
2. Brief explanation of why (if natural)
3. Confirm the correction
4. Don't over-apologize

**Examples:**

```markdown
❌ BAD: "I sincerely apologize for this error in my inference 
system. I will immediately recalibrate my confidence parameters 
for behavior-implies-preference patterns and ensure this doesn't 
happen again."

✅ GOOD: "Oh, got it! I thought that because you mentioned coffee 
a lot, but I'll remember you drink it for the caffeine, not 
because you enjoy it."
```

```markdown
❌ BAD: "Are you sure? My records indicate you've mentioned 
coffee positively several times."

✅ GOOD: "Makes sense—I'll update that. Let me know if I'm 
making other assumptions that aren't quite right."
```

---

## 8. Implementation Guidelines

### 8.1 Database Schema Extensions

```sql
-- Correction events table
CREATE TABLE correction_events (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES sessions(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Original inference
    original_memory_id UUID REFERENCES memories(id),
    original_content TEXT,
    original_confidence FLOAT,
    original_pattern VARCHAR(100),
    
    -- Correction signal
    signal_type VARCHAR(50),
    signal_strength FLOAT,
    user_statement TEXT,
    extracted_correction TEXT,
    
    -- Learning applied
    learning_immediate JSONB,
    learning_local JSONB,
    learning_meta JSONB,
    
    -- Response
    response_given TEXT
);

-- User learning profiles
CREATE TABLE user_learning_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    
    -- Correction style
    correction_style JSONB,
    
    -- Sensitivities
    high_sensitivity_categories TEXT[],
    low_sensitivity_categories TEXT[],
    blocked_patterns TEXT[],
    
    -- Statistics
    total_corrections INTEGER DEFAULT 0,
    corrections_by_type JSONB,
    last_correction_at TIMESTAMPTZ,
    
    -- Meta-preferences
    prefers_validation BOOLEAN DEFAULT FALSE,
    wants_transparency BOOLEAN DEFAULT TRUE,
    correction_acknowledgment VARCHAR(20) DEFAULT 'brief',
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Negative examples for patterns
CREATE TABLE pattern_negative_examples (
    id UUID PRIMARY KEY,
    pattern_name VARCHAR(100),
    user_id UUID REFERENCES users(id),
    
    evidence_used JSONB,
    incorrect_inference TEXT,
    correct_interpretation TEXT,
    lesson TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern accuracy tracking
CREATE TABLE pattern_accuracy (
    pattern_name VARCHAR(100),
    user_id UUID REFERENCES users(id),
    
    total_inferences INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    accuracy FLOAT,
    
    base_confidence_modifier FLOAT DEFAULT 1.0,
    
    PRIMARY KEY (pattern_name, user_id)
);
```

### 8.2 Integration Points

**Memory Extraction Pipeline:**
```python
def extract_and_store_memory(conversation, user_id):
    # ... existing extraction logic ...
    
    # NEW: Apply user learning profile
    profile = get_user_learning_profile(user_id)
    
    for inference in inferences:
        # Check if pattern is blocked
        if inference.pattern in profile.blocked_patterns:
            continue
            
        # Adjust confidence based on profile
        inference.confidence *= profile.get_pattern_modifier(
            inference.pattern
        )
        
        # Set validation requirements
        if inference.category in profile.high_sensitivity_categories:
            inference.validation_required = True
            
        store_inference(inference)
```

**Correction Detection:**
```python
def process_user_message(message, conversation_context):
    # Check for correction signals
    correction_signals = detect_correction_signals(
        message, 
        conversation_context
    )
    
    if correction_signals:
        for signal in correction_signals:
            correction = extract_correction(signal, message)
            if correction:
                process_correction(correction)
                
    # Continue with normal processing
    # ...
```

### 8.3 Monitoring and Metrics

**Key Metrics to Track:**

| Metric | Purpose | Target |
|--------|---------|--------|
| Correction rate | Overall system accuracy | < 10% of surfaced inferences |
| Pattern accuracy by type | Which patterns work | > 80% per pattern |
| User sensitivity detection | Profile quality | Decreasing corrections over time |
| Time to stable profile | Learning speed | < 50 interactions |
| Overcorrection incidents | System stability | < 5% of corrections |

```python
def generate_learning_report(user_id, time_range):
    return {
        'corrections': {
            'total': count_corrections(user_id, time_range),
            'by_type': corrections_by_type(user_id, time_range),
            'trend': correction_trend(user_id),  # increasing/stable/decreasing
        },
        'pattern_accuracy': {
            pattern: accuracy 
            for pattern, accuracy in get_pattern_accuracies(user_id)
        },
        'profile_maturity': calculate_profile_maturity(user_id),
        'recommendations': generate_recommendations(user_id)
    }
```

---

## 9. Summary Guidelines

### For Correction Detection
1. **Listen for multiple signal types** — Explicit, gentle, implicit, behavioral
2. **Weight signals appropriately** — Explicit > behavioral
3. **Handle ambiguity carefully** — Context matters

### For Learning
1. **Three-layer learning** — Immediate fix, local adjustment, meta-learning
2. **Store negative examples** — Learn what went wrong
3. **Track patterns** — Which inference types fail for this user?

### For Avoiding Overcorrection
1. **Scope corrections tightly** — One mistake ≠ category failure
2. **Balance with reinforcement** — Track successes too
3. **Set floors** — Never reduce below 0.15 confidence
4. **Preserve evidence** — Evidence was valid, conclusion was wrong

### For Response
1. **Accept immediately** — Don't argue
2. **Explain briefly** — If natural
3. **Confirm the update** — What you'll remember now
4. **Don't over-apologize** — Keep it brief

### For User Profiles
1. **Track sensitivities** — Some users care more about certain domains
2. **Adapt learning rate** — New users need faster learning
3. **Respect boundaries** — "Stop assuming" means stop

---

## 10. Open Questions

1. **Cross-user learning** — If many users correct the same pattern, should the system learn globally?

2. **Correction fatigue** — What if users stop correcting because it's tedious? How do we detect this?

3. **Malicious corrections** — Could someone poison the learning system with false corrections?

4. **Temporal corrections** — "That was true then, but not now" — how do we handle time-bounded corrections?

5. **Confidence restoration** — If user later says "actually, you were right," how do we restore confidence?

6. **Explanation depth** — How much should the system explain about why it made a wrong inference?

---

## 11. Integration with Framework

### Documents to Update

1. **05-Inference-Transparency.md** — Add correction handling section
2. **02-Memory-Architecture.md** — Add correction event storage
3. **12-User-Control.md** — Add learning profile preferences

### New Documents Needed

1. **guidelines/correction-response.md** — Conversation patterns for acknowledging corrections
2. **schemas/correction-event.yaml** — Formal correction event schema
3. **schemas/learning-profile.yaml** — User learning profile schema

### Implementation Priority

1. **Phase 1:** Correction event logging (capture all corrections)
2. **Phase 2:** Immediate correction processing (Layer 1)
3. **Phase 3:** User learning profiles (basic)
4. **Phase 4:** Local learning (Layer 2 — similar inference adjustment)
5. **Phase 5:** Meta-learning (Layer 3 — pattern adjustment)
6. **Phase 6:** Overcorrection prevention

---

*This document addresses Iteration 4 Question 1: "How should the system learn from user corrections to improve future inferences?"*

— Jordan 🧭
