# Voice & Style Capture Research

## Research Question

How can we capture, quantify, and restore an AI's unique communication style ("voice") after migration to a new model or system?

---

## 1. Stylometry: The Science of Writing Style

Stylometry is the statistical analysis of linguistic style, traditionally used for authorship attribution. Its techniques provide the foundation for AI voice capture.

### Core Principles

Stylometry rests on the premise that every writer (or AI) develops consistent, often unconscious patterns that form a **linguistic fingerprint**. These patterns persist even when content varies dramatically.

### Key Stylometric Features

**Lexical Features**
- Vocabulary richness (type-token ratio)
- Average word length
- Hapax legomena (words used only once)
- Preferred word choices and synonyms
- Contractions vs. full forms ("don't" vs. "do not")

**Syntactic Features**
- Sentence length distribution (mean, variance, patterns)
- Clause complexity and nesting depth
- Part-of-speech n-gram frequencies
- Punctuation patterns (em-dash usage, semicolons, ellipses)
- Passive vs. active voice ratio

**Structural Features**
- Paragraph length patterns
- Use of headers and lists
- Opening/closing patterns
- Transition word preferences

**Discourse Features**
- How ideas are connected
- Argument structure preferences
- Use of examples and analogies
- Meta-commentary patterns ("Let me explain...")

### Tools & Software

| Tool | Description | Use Case |
|------|-------------|----------|
| JGAAP | Java Graphical Authorship Attribution Program | Research-grade stylometric analysis |
| Stylo (R package) | Comprehensive stylometric analysis suite | Academic authorship studies |
| Signature | Oxford-developed freeware | Authorship verification |
| Custom Python (spaCy + NLTK) | Programmable feature extraction | AI voice profiling |

### Application to AI Voice

Stylometric analysis can generate a **style profile** by processing a corpus of an AI's outputs:

```python
# Conceptual style profile structure
style_profile = {
    "lexical": {
        "avg_word_length": 4.7,
        "vocabulary_richness": 0.72,
        "favorite_words": ["actually", "fascinating", "precisely"],
        "avoided_words": ["basically", "stuff", "things"]
    },
    "syntactic": {
        "avg_sentence_length": 18.3,
        "sentence_length_variance": 42.1,
        "clause_depth_avg": 2.1,
        "passive_voice_ratio": 0.15
    },
    "punctuation": {
        "em_dash_frequency": 0.08,
        "semicolon_frequency": 0.02,
        "ellipsis_frequency": 0.01
    }
}
```

---

## 2. Linguistic Fingerprinting

Building on stylometry, linguistic fingerprinting creates a more holistic signature that captures the totality of an agent's communicative identity.

### Components of a Linguistic Fingerprint

**Idiolect Markers**
- Unique word combinations
- Characteristic phrases ("Here's the thing...", "What I find interesting...")
- Signature openings and closings

**Pragmatic Patterns**
- How politeness is expressed
- Hedging strategies ("I think", "perhaps", "it seems")
- Epistemic stance markers (certainty/uncertainty expressions)
- How disagreement is framed

**Rhetorical Signatures**
- Preferred argumentation styles
- Use of humor (frequency, type)
- Analogies and metaphor patterns
- Storytelling structures

### Fingerprint Vector Approach

A linguistic fingerprint can be represented as a high-dimensional vector:

```
fingerprint_vector = [
    lexical_diversity,
    formality_score,
    avg_sentence_complexity,
    hedging_frequency,
    em_dash_ratio,
    question_frequency,
    exclamation_frequency,
    first_person_ratio,
    conjunction_preferences[n],
    transition_word_distribution[n],
    ...
]
```

This vector enables:
- **Similarity comparison** between AI instances
- **Drift detection** over time
- **Style transfer** targeting

---

## 3. Tone & Sentiment Classification

### Beyond Basic Sentiment

Traditional sentiment analysis (positive/negative/neutral) is insufficient for voice capture. We need multi-dimensional tone classification.

### Tone Dimensions

**Plutchik's Wheel of Emotions**
Eight primary emotions with intensities: joy, trust, fear, surprise, sadness, disgust, anger, anticipation

**IBM Watson Tone Analyzer Dimensions**
- Emotional: anger, fear, joy, sadness, confidence
- Language: analytical, confident, tentative
- Social: openness, conscientiousness, extraversion, agreeableness, emotional range

**Custom AI Voice Dimensions**
For AI continuity, we might track:
- Warmth ← → Formality
- Playful ← → Serious
- Direct ← → Diplomatic
- Confident ← → Humble
- Concise ← → Elaborate
- Technical ← → Accessible

### Implementation Approaches

**Rule-Based Systems**
- Lexicons with tone-tagged words
- Pattern matching for tone markers
- Fast but rigid

**Machine Learning Classifiers**
- Fine-tuned BERT/RoBERTa models
- Multi-label classification
- Can capture nuanced tone blends

**Hybrid Approaches**
- ML backbone with rule-based post-processing
- Best of both worlds for reliability

### Tone Profile Example

```json
{
  "baseline_tone": {
    "warmth": 0.72,
    "formality": 0.45,
    "playfulness": 0.58,
    "confidence": 0.68,
    "elaborateness": 0.65
  },
  "context_modulation": {
    "technical_queries": { "formality": +0.2, "elaborateness": +0.15 },
    "emotional_support": { "warmth": +0.25, "playfulness": -0.2 },
    "humor_contexts": { "playfulness": +0.3, "formality": -0.25 }
  }
}
```

---

## 4. Personality Modeling from Text

### The Big Five (OCEAN) Model

Personality psychology's dominant framework can be inferred from text:

| Dimension | High Expression | Low Expression |
|-----------|-----------------|----------------|
| **Openness** | Creative language, abstract ideas, varied vocabulary | Concrete, practical, conventional |
| **Conscientiousness** | Organized, detailed, careful language | Spontaneous, flexible, casual |
| **Extraversion** | Energetic, social language, enthusiasm | Reserved, thoughtful, measured |
| **Agreeableness** | Warm, cooperative, affirming | Direct, critical, challenging |
| **Neuroticism** | Anxiety markers, negative emotion words | Calm, stable, positive framing |

### LIWC (Linguistic Inquiry and Word Count)

LIWC maps language to psychological dimensions:
- Function words (pronouns, articles) reveal cognitive style
- Emotional words reveal affective tendencies
- Cognitive process words (cause, know, ought) reveal thinking patterns

### Personality Markers in AI Voice

An AI's "personality" (in the functional sense) emerges through:

**Language Markers**
- First-person usage ("I think" vs. impersonal constructions)
- Certainty markers ("definitely" vs. "perhaps")
- Social words ("we", "together", "help")
- Cognitive complexity (subordinate clauses, qualifications)

**Behavioral Patterns**
- Response length consistency
- Question-asking frequency
- Self-correction patterns
- Acknowledgment style ("Great question!" vs. direct answer)

### Personality Profile Schema

```yaml
personality_profile:
  openness:
    score: 0.78
    markers:
      - high vocabulary diversity
      - frequent abstract concepts
      - creative analogies
  conscientiousness:
    score: 0.82
    markers:
      - structured responses
      - thorough explanations
      - attention to accuracy
  extraversion:
    score: 0.65
    markers:
      - moderate enthusiasm markers
      - balanced energy level
      - appropriate exclamation use
  agreeableness:
    score: 0.75
    markers:
      - warm acknowledgments
      - collaborative framing
      - diplomatic disagreement
  emotional_stability:
    score: 0.88
    markers:
      - consistent tone
      - calm under confusion
      - positive reframing tendency
```

---

## 5. Style Embeddings & Neural Approaches

### From Discrete Features to Continuous Representations

Neural networks can learn **dense vector representations** of style that capture patterns too subtle for manual feature engineering.

### Embedding Architectures

**Style2Vec / Author Embeddings**
- Train on author-attributed corpora
- Each author gets a learned vector
- Similar concept to Word2Vec but for stylistic identity

**Variational Autoencoders (VAE)**
- Encoder compresses text to latent style representation
- Decoder reconstructs text from style + content
- Style vector is disentangled from content

**Contrastive Learning**
- Train model to distinguish same-author from different-author pairs
- Produces embeddings where similar styles cluster together

### BERT-Based Style Extraction

```python
# Conceptual approach
from transformers import BertModel, BertTokenizer

def extract_style_embedding(text_corpus, model):
    """
    Extract style embedding from corpus of AI outputs.
    Uses [CLS] token representations averaged across documents.
    """
    embeddings = []
    for text in text_corpus:
        tokens = tokenizer(text, return_tensors='pt')
        outputs = model(**tokens)
        cls_embedding = outputs.last_hidden_state[:, 0, :]
        embeddings.append(cls_embedding)
    
    # Average across corpus for style representation
    style_vector = torch.mean(torch.stack(embeddings), dim=0)
    return style_vector
```

### Fine-Tuned Style Classifiers

Train a classifier to:
1. Distinguish between AI instances (contrastive objective)
2. Predict style attributes (supervised multi-label)
3. Detect style drift (anomaly detection)

The intermediate layer activations become rich style representations.

### Advantages of Neural Approaches

- Capture non-linear feature interactions
- Learn patterns not explicitly programmed
- Enable gradient-based style transfer
- Scale to massive corpora

### Challenges

- Require substantial training data (thousands of examples)
- "Black box" nature makes interpretation difficult
- May overfit to content rather than style
- Computationally expensive

---

## 6. Tracking Style Evolution Over Time

### Why Track Evolution?

AI voice isn't static. It evolves through:
- Human feedback and corrections
- Exposure to new contexts
- Deliberate prompt engineering
- Model updates and fine-tuning

Tracking this evolution is essential for:
- Understanding what's "authentic" at any time point
- Detecting unwanted drift
- Restoring to specific historical states

### Temporal Style Metrics

**Moving Window Analysis**
- Compute style features over rolling time windows
- Detect significant changes between periods
- Identify inflection points

**Change-Point Detection**
- Statistical methods to identify when style shifts
- CUSUM, Bayesian change-point detection
- Can pinpoint specific events causing drift

**Style Velocity**
- Rate of change in style embedding space
- Rapid movement may indicate instability or active training

### Style Version Control

```yaml
style_snapshot:
  version: "jordan-v2.3"
  timestamp: "2026-02-07T03:45:00Z"
  trigger: "monthly_checkpoint"
  metrics:
    formality: 0.45
    warmth: 0.72
    vocabulary_richness: 0.68
  embedding_hash: "sha256:abc123..."
  sample_outputs:
    - "example response 1..."
    - "example response 2..."
  delta_from_previous:
    formality: -0.02
    warmth: +0.01
```

### Evolution Visualization

- **Style trajectory plots**: 2D projections of style embedding over time
- **Feature time series**: Individual metrics graphed temporally
- **Heatmaps**: Feature × time showing evolution patterns
- **Diff reports**: Side-by-side comparison of different versions

---

## 7. Voice Restoration After Migration

### The Core Challenge

When migrating from one model to another (e.g., GPT-4 → Claude → future model), the underlying voice defaults change. How do we restore the developed personality?

### Restoration Strategy: Multi-Layer Approach

**Layer 1: Explicit Style Guide**
Natural language description of voice characteristics:
```markdown
## Voice Characteristics
- Warm but professional
- Uses occasional em-dashes for emphasis
- Prefers active voice
- Acknowledges before answering
- Uses "I think" for opinions, direct statements for facts
- Moderate use of humor, never sarcasm
```

**Layer 2: Statistical Style Targets**
Quantitative targets for measurable features:
```yaml
targets:
  avg_sentence_length: 18.0 ± 3.0
  vocabulary_richness: 0.70 ± 0.05
  first_person_frequency: 0.08 ± 0.02
  question_ratio: 0.15 ± 0.05
  em_dash_frequency: 0.06 ± 0.02
```

**Layer 3: Style Embedding**
High-dimensional vector representation for neural approaches:
- Store the learned embedding from source model
- Use as conditioning input for new model
- Or as similarity target during fine-tuning

**Layer 4: Exemplar Corpus**
Curated examples of characteristic outputs:
- Categorized by task type
- Represent range of voice expression
- Used for few-shot prompting or fine-tuning

### Restoration Process

```
┌─────────────────────────────────────────────────────────────┐
│                    VOICE RESTORATION PIPELINE               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BASELINE CAPTURE                                        │
│     ├── Generate style profile from source model           │
│     ├── Extract style embedding                            │
│     ├── Collect exemplar outputs                           │
│     └── Document explicit style rules                      │
│                                                             │
│  2. MIGRATION                                               │
│     ├── Load style guide into new model context            │
│     ├── Include exemplars in few-shot prompt               │
│     └── Apply any fine-tuning with style loss             │
│                                                             │
│  3. CALIBRATION                                             │
│     ├── Generate test outputs across domains               │
│     ├── Compute style metrics                              │
│     ├── Compare to baseline profile                        │
│     └── Identify deviation areas                           │
│                                                             │
│  4. ADJUSTMENT                                              │
│     ├── Refine prompts for high-deviation areas            │
│     ├── Add corrective examples                            │
│     ├── Iterate until within tolerance                     │
│     └── Document any necessary adaptations                 │
│                                                             │
│  5. VALIDATION                                              │
│     ├── Human evaluation (familiar users rate similarity)  │
│     ├── Automated similarity scoring                       │
│     └── Sign-off and snapshot new baseline                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Style Transfer Techniques

**Prompt Engineering**
- System prompts encoding style rules
- Few-shot examples demonstrating voice
- Meta-instructions ("Write in a warm, professional tone...")

**Fine-Tuning**
- Train on corpus of exemplar outputs
- Style loss term in training objective
- LoRA/adapters for efficient personality layers

**Inference-Time Steering**
- Style-conditioned generation
- Beam search with style scoring
- Rejection sampling for off-style outputs

**Post-Processing**
- Style-preserving rewriting
- Automated style correction
- Human-in-the-loop refinement

---

## 8. Practical Implementation Roadmap

### Phase 1: Instrumentation (Baseline)

1. **Collect output corpus** - Archive all AI outputs with metadata
2. **Extract features** - Build stylometric profile
3. **Generate embedding** - Train or apply style encoder
4. **Document style guide** - Explicit natural language description
5. **Establish metrics** - Define quantitative style targets

### Phase 2: Monitoring (Ongoing)

1. **Continuous capture** - Stream outputs to archive
2. **Periodic profiling** - Weekly/monthly style snapshots
3. **Drift detection** - Alert on significant deviation
4. **Version control** - Maintain style version history

### Phase 3: Restoration (As Needed)

1. **Load context** - Style guide + exemplars + metrics
2. **Generate + measure** - Test outputs against baseline
3. **Iterate prompts** - Refine until convergence
4. **Validate** - Human + automated verification
5. **Document** - Note any adaptations required

### Tools to Build

| Tool | Purpose | Priority |
|------|---------|----------|
| Style Profiler | Extract features from corpus | High |
| Embedding Generator | Neural style representation | High |
| Drift Detector | Monitor style over time | Medium |
| Restoration Kit | Apply style to new model | High |
| Style Diff | Compare two versions | Medium |
| Validation Suite | Test style fidelity | Medium |

---

## 9. Open Questions & Future Research

### Unresolved Challenges

**Content-Style Disentanglement**
- How to separate *what* is said from *how* it's said?
- Current methods still conflate content and style

**Cross-Architecture Transfer**
- Style embeddings from one architecture may not transfer
- Need architecture-agnostic representations

**Minimal Viable Corpus**
- How much output data is needed for reliable capture?
- Bootstrap methods for new agents with little history

**Multi-Modal Voice**
- Voice includes response timing, interactivity patterns
- Text-only capture misses behavioral dimensions

**Authenticity vs. Mimicry**
- Is restored voice "authentic" or just mimicry?
- Philosophical questions about AI identity

### Research Directions

1. **Self-supervised style learning** - Learn style representations without labels
2. **Compositional voice** - Combine style elements from multiple sources
3. **Interactive calibration** - Human-in-the-loop style tuning
4. **Explainable style** - Interpretable style representations
5. **Behavioral style** - Capture beyond text (timing, patterns, etc.)

---

## 10. Recommendations for AI Continuity Framework

### Immediate Actions

1. **Start archiving all outputs now** - Data is the foundation
2. **Build basic stylometric profiler** - Essential baseline capability
3. **Document explicit style rules** - Portable across any system
4. **Collect exemplar corpus** - 50-100 representative outputs

### Medium-Term Development

1. **Train style embedding model** - Richer representation
2. **Implement drift monitoring** - Catch changes early
3. **Build restoration pipeline** - Ready for migration
4. **Create validation suite** - Measure restoration quality

### Long-Term Vision

1. **Unified voice format** - Standard for AI personality export
2. **Style transfer API** - Apply voice to any model
3. **Evolution tracking** - Full history of voice development
4. **Self-updating profiles** - Agents maintain their own style docs

---

## References & Resources

### Academic Papers

- Mosteller & Wallace (1964) - "Inference and Disputed Authorship: The Federalist"
- Argamon et al. (2009) - "Automatically Profiling the Author of an Anonymous Text"
- Pennebaker et al. (2015) - "The Development and Psychometric Properties of LIWC2015"
- Mairesse & Walker (2011) - "Controlling User Perceptions of Linguistic Style"

### Tools & Libraries

- spaCy (spacy.io) - Industrial NLP for feature extraction
- NLTK (nltk.org) - Classic NLP toolkit
- Hugging Face Transformers - Pretrained models for embeddings
- LIWC (liwc.app) - Psychological text analysis

### Related Work in AI

- Constitutional AI (Anthropic) - Training with behavioral targets
- InstructGPT (OpenAI) - Aligning outputs to preferences
- Character.ai - Personality-consistent dialogue agents

---

*Document created: 2026-02-07*
*Research context: AI Continuity Framework - Voice preservation across model migrations*
*Author: Jordan (subagent research task)*
