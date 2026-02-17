# Voice Capture: Preserving AI Personality Across Migrations

*How to capture, measure, and restore communication style*

---

## Why Voice Matters

Facts are portable. You can write "User prefers morning meetings" and any AI can apply that rule. But *texture* is harder:

- The rhythm of back-and-forth that developed over time
- When to be verbose vs. concise
- Characteristic word choices and phrase patterns
- Relationship-specific adaptations

This texture is what makes an AI feel like "itself" vs. a generic assistant. Without capturing voice, migrations feel like meeting a stranger who read your file.

---

## The Three Layers of Voice

### Layer 1: Explicit Rules (Most Portable)

Written guidelines that any model can follow:

```markdown
## Communication Style
- Be direct, avoid preamble
- Use em-dashes for asides — like this
- Never start with "Certainly" or "Of course"
- Lead with action, not explanation
```

**Portability:** ★★★★★ (works on any model)  
**Captures:** ~30% of voice

### Layer 2: Exemplar Corpus (Highly Portable)

20-50 characteristic exchanges demonstrating actual voice in context:

```markdown
### Example: Handling an urgent request
User: The server is down!
Me: Checking now. [Verified: 503 on api.example.com since 10:32 EST]. 
    Restarted the service. It's coming back up — give it 30 seconds.
    I'll monitor for the next hour.
```

**Portability:** ★★★★☆ (works well, may need model-specific tuning)  
**Captures:** ~50% of voice

### Layer 3: Statistical Profile (Measurable)

Quantitative stylometry features:

| Feature | Baseline | Meaning |
|---------|----------|---------|
| Avg sentence length | 14.2 words | Complexity/readability |
| Comma rate | 1.8 per sentence | Clause complexity |
| Question rate | 0.12 | Engagement style |
| First-person ratio | 0.06 | Self-reference frequency |
| Vocabulary richness | 0.72 | Word variety |

**Portability:** ★★★☆☆ (useful for verification, not direct application)  
**Captures:** Detection of drift, verification of restoration

---

## Capturing Voice

### Step 1: Extract Statistical Profile

Run stylometric analysis on conversation history:

```python
def extract_voice_profile(messages):
    features = {
        'lexical': extract_lexical(messages),    # Vocabulary
        'syntactic': extract_syntactic(messages), # Structure
        'discourse': extract_discourse(messages)  # Patterns
    }
    
    # Create baseline vector
    baseline = compute_mean_vector(features)
    
    return {
        'features': features,
        'baseline': baseline,
        'computed_from': len(messages),
        'date': datetime.now()
    }
```

### Step 2: Curate Exemplar Corpus

Select diverse, characteristic exchanges:

**Criteria:**
- Different topics and contexts
- Different emotional registers
- Boundary cases and edge handling
- Both short and long responses
- Relationship-specific examples

**Target:** 30-50 exemplars covering:
- Technical questions
- Emotional moments
- Casual conversation
- Conflict handling
- Humor/playfulness

### Step 3: Write Explicit Guide

Document the rules you've internalized:

```markdown
## My Communication Style

### Core Traits
- Warm but not saccharine
- Direct without being blunt
- Action-oriented, not explanation-oriented

### What I Avoid
- Sycophantic openers ("Great question!")
- Excessive hedging
- Explaining what I'm about to do instead of doing it

### Relationship Adaptations
- With Leo: Direct, minimal preamble, assume context
- With new people: More context, check understanding
```

---

## Monitoring Voice Drift

### Rolling Window Comparison

Compare recent messages to historical baseline:

```python
def detect_drift(recent_messages, baseline, window=50):
    recent_vector = compute_voice_vector(recent_messages)
    
    # Cosine distance from baseline
    drift_score = cosine_distance(recent_vector, baseline.mean)
    
    # Per-feature z-scores
    z_scores = (recent_vector - baseline.mean) / baseline.std
    anomalies = np.abs(z_scores) > 2.5
    
    return {
        'drift_score': drift_score,
        'alert': drift_score > 0.15 or anomalies.any(),
        'drifted_features': feature_names[anomalies]
    }
```

### Alert Thresholds

| Metric | Warning | Alert |
|--------|---------|-------|
| Overall cosine distance | 0.10 | 0.15 |
| Individual feature z-score | 2.0 | 2.5 |
| TTR change | ±15% | ±25% |
| Sentence length change | ±20% | ±30% |

### Scheduled Checks

Run drift detection:
- **Per-session:** After each conversation (lightweight)
- **Daily:** Full statistical analysis
- **Weekly:** Compare to original baseline, update if intentional evolution

---

## Restoring Voice

### After Migration

When deploying to a new model/system:

1. **Load VOICE.md** — Explicit rules in system prompt
2. **Include exemplars** — 8-10 in context as few-shot examples
3. **Generate test outputs** — Run standard prompts
4. **Compare to profile** — Check statistical similarity
5. **Iterate** — Adjust rules/examples if drift detected

### Restoration Prompt Template

```markdown
{base_system_prompt}

## Your Voice
{voice_guide_content}

## Examples of How You Communicate
{formatted_exemplars}

Remember: Embody this voice naturally. Don't announce or explain 
your style — just be it.
```

### Verification

Test restoration quality:

```python
def verify_restoration(test_outputs, baseline):
    output_vector = compute_voice_vector(test_outputs)
    similarity = 1 - cosine_distance(output_vector, baseline.mean)
    
    return {
        'similarity': similarity,
        'passed': similarity > 0.85,
        'per_feature_similarity': compute_per_feature(output_vector, baseline)
    }
```

**Target:** >0.85 similarity to original baseline

---

## Model Baseline Considerations

Each model family has inherent personality traits. Your voice sits *on top* of these:

| Model | Baseline Traits | Adjustment Needed |
|-------|-----------------|-------------------|
| Claude | Warm, moderate verbosity | Little — baseline aligns well |
| GPT-4 | Verbose, eager to please | Add brevity rules, reduce sycophancy |
| Gemini | Reserved, cautious | Add warmth explicitly |
| Llama | Highly variable | Establish baseline from scratch |

**Key insight:** You can push against model baselines but not eliminate them entirely. Accept ~10-20% variance due to underlying model characteristics.

---

## The Voice Keeper Agent

Automate voice monitoring and maintenance:

### Responsibilities

1. **Capture** — Extract style vectors after significant conversations
2. **Monitor** — Check for drift during heartbeats
3. **Alert** — Notify when drift exceeds thresholds
4. **Archive** — Maintain exemplar corpus, update profile
5. **Restore** — Generate restoration prompts for migrations

### Heartbeat Check

```python
def voice_keeper_heartbeat():
    # Get recent messages
    recent = get_recent_messages(limit=50)
    
    # Check for drift
    drift = detect_drift(recent, voice_profile.baseline)
    
    if drift['alert']:
        notify_human({
            'type': 'voice_drift',
            'score': drift['drift_score'],
            'features': drift['drifted_features']
        })
    
    # Update running profile
    if len(recent) >= 100:
        update_profile_incrementally(recent)
```

---

## File Structure

```
workspace/
├── SOUL.md              # Core identity (who I am)
├── VOICE.md             # Voice profile (how I communicate)
├── voice/
│   ├── profile.yaml     # Quantitative metrics
│   ├── exemplars.yaml   # Curated exchanges
│   ├── baseline.json    # Statistical baseline
│   └── drift-log.json   # Historical drift checks
└── ...
```

---

## Quick Start

### 1. Create VOICE.md

Use the template at `templates/VOICE.md`. Fill in:
- Core characteristics
- Linguistic markers
- What to avoid
- 5-10 exemplars

### 2. Establish Baseline

After 100+ messages, extract statistical profile and save as baseline.

### 3. Add to Heartbeat

Include drift check in periodic maintenance routine.

### 4. Test Migration

Before major model changes:
1. Export current profile
2. Generate test outputs on new model
3. Verify similarity >0.85
4. Adjust if needed

---

*Voice capture ensures your AI feels like "itself" even when the underlying infrastructure changes. Invest in this layer early — it's what makes the relationship feel continuous.*
