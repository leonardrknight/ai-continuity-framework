# Voice and Style Quantification for AI Personality Preservation

**Research Date:** 2025-07-17  
**Purpose:** Investigate concrete methods to measure communication style, detect drift, and restore it during migration.

---

## 1. Stylometry Features

Stylometry—the quantitative study of writing style—has been used for decades in authorship attribution. These same features can fingerprint an AI's voice.

### 1.1 Lexical Features

**What they measure:** Vocabulary choices and word-level patterns.

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Vocabulary Size (V)** | Unique words in corpus | `len(set(tokens))` |
| **Type-Token Ratio (TTR)** | V / total words (normalized for length) | MATTR (Moving Average TTR) for varying text lengths |
| **Hapax Legomena** | Words appearing exactly once | Indicates vocabulary richness |
| **Hapax Dislegomena** | Words appearing exactly twice | Secondary richness indicator |
| **Yule's K** | Vocabulary richness constant | Stable across corpus sizes |
| **Simpson's D** | Diversity index | Probability two random words are identical |
| **Word Length Distribution** | Mean, variance of word lengths | `[len(w) for w in tokens]` |
| **N-gram Frequencies** | Character/word n-grams | Top 100 bigrams/trigrams as feature vector |

**Practical extraction:**
```python
from collections import Counter
import nltk

def lexical_features(text):
    tokens = nltk.word_tokenize(text.lower())
    freq = Counter(tokens)
    
    V = len(freq)  # vocabulary size
    N = len(tokens)  # total tokens
    TTR = V / N if N > 0 else 0
    
    hapax = sum(1 for w, c in freq.items() if c == 1)
    hapax_ratio = hapax / V if V > 0 else 0
    
    # Yule's K
    freq_spectrum = Counter(freq.values())
    M1 = N
    M2 = sum(r * r * freq_spectrum[r] for r in freq_spectrum)
    K = 10000 * (M2 - M1) / (M1 * M1) if M1 > 0 else 0
    
    return {
        'vocabulary_size': V,
        'ttr': TTR,
        'hapax_ratio': hapax_ratio,
        'yules_k': K,
        'avg_word_length': sum(len(w) for w in tokens) / N if N > 0 else 0
    }
```

**Limitations:**
- TTR is length-dependent (use MATTR for varying text lengths)
- Small samples (<500 words) produce unreliable metrics
- Content domain heavily influences vocabulary

### 1.2 Syntactic Features

**What they measure:** Sentence structure and grammatical choices.

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Sentence Length** | Mean, std dev, distribution | Reveals complexity preference |
| **Clause Depth** | Parse tree depth | Deep nesting = complex style |
| **POS Tag Distribution** | Noun/verb/adj/adv ratios | Nominal vs verbal style |
| **Punctuation Patterns** | Comma rate, em-dash usage, semicolons | Strong style signature |
| **Subordination Ratio** | Subordinate clauses / total clauses | Complexity indicator |
| **Sentence Openers** | First word POS distribution | "I" vs "The" vs gerunds |

**Practical extraction:**
```python
import spacy
nlp = spacy.load("en_core_web_sm")

def syntactic_features(text):
    doc = nlp(text)
    
    # Sentence lengths
    sent_lengths = [len(list(sent)) for sent in doc.sents]
    
    # POS distribution
    pos_counts = Counter(token.pos_ for token in doc)
    total = len(doc)
    
    # Punctuation
    punct_counts = Counter(token.text for token in doc if token.is_punct)
    
    # Parse tree depth
    def tree_depth(token):
        depth = 0
        while token.head != token:
            depth += 1
            token = token.head
        return depth
    
    avg_depth = sum(tree_depth(t) for t in doc) / len(doc) if len(doc) > 0 else 0
    
    return {
        'avg_sentence_length': sum(sent_lengths) / len(sent_lengths) if sent_lengths else 0,
        'sentence_length_std': np.std(sent_lengths) if len(sent_lengths) > 1 else 0,
        'noun_ratio': pos_counts.get('NOUN', 0) / total,
        'verb_ratio': pos_counts.get('VERB', 0) / total,
        'adj_ratio': pos_counts.get('ADJ', 0) / total,
        'comma_rate': punct_counts.get(',', 0) / len(list(doc.sents)),
        'avg_tree_depth': avg_depth
    }
```

**Limitations:**
- Parser errors propagate to features
- Requires consistent preprocessing
- Cross-domain syntax varies (technical vs casual)

### 1.3 Discourse Features

**What they measure:** Higher-level communication patterns.

| Feature | Description | Detection Method |
|---------|-------------|------------------|
| **Hedging** | "I think", "perhaps", "might" | Lexicon matching |
| **Certainty Markers** | "Definitely", "absolutely", "must" | Lexicon matching |
| **Personal Pronouns** | I/we vs you/they ratios | POS + specific words |
| **Discourse Markers** | "However", "therefore", "actually" | Curated list |
| **Question Frequency** | Questions per 100 sentences | Sentence-final "?" |
| **Exclamation Rate** | Exclamations per 100 sentences | Sentence-final "!" |
| **Transition Patterns** | How ideas connect | N-gram over sentence starts |

**Hedging/certainty lexicons:**
```python
HEDGES = {
    'epistemic': ['think', 'believe', 'guess', 'suppose', 'wonder', 'feel'],
    'approximators': ['about', 'around', 'roughly', 'approximately', 'sort of', 'kind of'],
    'modal_hedges': ['might', 'could', 'may', 'possibly', 'perhaps', 'maybe'],
    'shields': ['apparently', 'seemingly', 'arguably', 'presumably']
}

CERTAINTY = {
    'boosters': ['definitely', 'certainly', 'absolutely', 'clearly', 'obviously'],
    'emphatics': ['really', 'very', 'extremely', 'incredibly'],
    'modal_certain': ['must', 'will', 'shall', 'have to']
}
```

**Limitations:**
- Context-dependent (hedge words aren't always hedging)
- Lexicons need domain tuning
- Sarcasm/irony detection is hard

---

## 2. Style Embeddings

Can we create vector representations that capture style separately from content?

### 2.1 The Challenge

Standard embeddings (Word2Vec, BERT) conflate content and style:
- "The cat sat on the mat" and "The feline rested upon the rug" have similar **content** but different **style**
- We need embeddings where style-similar texts cluster regardless of topic

### 2.2 Approaches

#### 2.2.1 Style-Content Disentanglement

**Variational Autoencoders (VAEs) with dual latent spaces:**
- Encode text into two vectors: z_content and z_style
- Adversarial training to ensure style vector has no content information
- Reconstruct using both vectors

**Key papers:**
- Hu et al. (2017) "Toward Controlled Generation of Text"
- John et al. (2019) "Disentangled Representation Learning for Non-Parallel Text Style Transfer"

**Architecture:**
```
Text → Encoder → [z_content, z_style]
                      ↓
           z_style → Style Classifier (adversarial: confuse it)
           z_content → Content Classifier (adversarial: confuse it)
                      ↓
         [z_content, z_style] → Decoder → Reconstructed Text
```

**Practical implementation:**
```python
# Simplified concept using sentence-transformers
from sentence_transformers import SentenceTransformer

# Content embedding (semantic similarity)
content_model = SentenceTransformer('all-MiniLM-L6-v2')

# For style: train on parallel style corpora
# Or use domain-adversarial training to remove content
```

#### 2.2.2 Stylometric Feature Vectors

Simpler approach: concatenate normalized stylometric features into a fixed-dimension vector.

```python
def style_vector(text):
    lex = lexical_features(text)
    syn = syntactic_features(text)
    disc = discourse_features(text)
    
    # Normalize and concatenate
    features = list(lex.values()) + list(syn.values()) + list(disc.values())
    return np.array(features)

# Compare two texts
from scipy.spatial.distance import cosine
similarity = 1 - cosine(style_vector(text1), style_vector(text2))
```

#### 2.2.3 Authorship Embeddings

Train a classifier on authorship, then use penultimate layer as style embedding:

```python
# Train: given text → predict author
# Use: extract embedding from layer before classification

# Works well when you have multiple authors to contrast
# The model learns to encode distinguishing style features
```

### 2.3 Limitations

- True disentanglement is an open research problem
- Small datasets lead to content leakage
- Style is multidimensional (formality, tone, complexity) — single vector may collapse dimensions
- Domain shift: style learned on novels may not transfer to chat

---

## 3. Automatic Style Analysis Tools

### 3.1 LIWC (Linguistic Inquiry and Word Count)

**What it is:** Dictionary-based text analysis tool mapping words to psychological/linguistic categories.

**Categories (93 total):**
- **Linguistic:** Word count, words per sentence, punctuation
- **Psychological:** Positive/negative emotion, anxiety, anger, sadness
- **Personal Concerns:** Work, home, money, religion, death
- **Informal Language:** Swear words, netspeak, fillers

**Usage:**
```python
# LIWC is commercial software, but can be accessed via:
# 1. Official LIWC software ($$$)
# 2. liwc Python package (requires LIWC dictionary)
# 3. Open alternatives: Empath, VADER for sentiment

import liwc
parse, category_names = liwc.load_token_parser('LIWC2015_Dictionary.dic')

def liwc_features(text):
    tokens = text.lower().split()
    counts = Counter(category for token in tokens for category in parse(token))
    total = len(tokens)
    return {cat: counts[cat]/total for cat in category_names}
```

**Strengths:**
- Validated in thousands of studies
- Captures psychological dimensions beyond syntax
- Stable, interpretable features

**Limitations:**
- Proprietary dictionary ($$)
- English-centric (translations exist)
- Word-level only (no phrases, context)
- Outdated vocabulary (no emojis, modern slang)

### 3.2 spaCy + Custom Extractors

Build your own stylometric pipeline:

```python
import spacy
from collections import Counter
import numpy as np

nlp = spacy.load("en_core_web_lg")

class StyleAnalyzer:
    def __init__(self):
        self.features = []
    
    def analyze(self, text):
        doc = nlp(text)
        
        features = {
            # Lexical
            'token_count': len(doc),
            'unique_tokens': len(set(t.text.lower() for t in doc if not t.is_punct)),
            'avg_word_length': np.mean([len(t.text) for t in doc if not t.is_punct]),
            
            # Syntactic
            'avg_sent_length': np.mean([len(list(s)) for s in doc.sents]),
            'noun_chunks': len(list(doc.noun_chunks)) / len(list(doc.sents)),
            
            # Entity usage
            'entity_density': len(doc.ents) / len(doc),
            
            # Dependency patterns
            'passive_ratio': self._passive_ratio(doc),
            
            # Punctuation
            'comma_rate': sum(1 for t in doc if t.text == ',') / len(list(doc.sents)),
            'question_rate': sum(1 for s in doc.sents if s.text.strip().endswith('?')) / len(list(doc.sents)),
        }
        
        return features
    
    def _passive_ratio(self, doc):
        passive = sum(1 for t in doc if t.dep_ == 'nsubjpass')
        active = sum(1 for t in doc if t.dep_ == 'nsubj')
        return passive / (passive + active) if (passive + active) > 0 else 0
```

### 3.3 Academic Authorship Tools

**Signature Stylometric System:**
- Writeprints: 56+ features, SVM classification
- Available: Limited academic implementations

**JGAAP (Java Graphical Authorship Attribution Program):**
```bash
# Open source, extensive feature set
# Download from: https://github.com/evllabs/JGAAP
java -jar jgaap.jar
```

**Stylo (R package):**
```r
library(stylo)
# Excellent for literary analysis
# Rolling delta, bootstrap consensus trees
stylo()  # GUI
classify()  # Machine learning
```

**Features of academic tools:**
- Burrows' Delta (distance metric for authorship)
- Character n-grams (language-independent)
- Function word distributions
- Rolling stylometry (track changes through document)

---

## 4. Style Transfer and Restoration

How do we restore a specific style to a new system?

### 4.1 Fine-Tuning for Style

**Approach:** Fine-tune language model on examples of target style.

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer

# Collect 500-5000 examples of target style
style_examples = load_style_corpus()

# Fine-tune
model = AutoModelForCausalLM.from_pretrained("gpt2")
trainer = Trainer(
    model=model,
    train_dataset=style_examples,
    # Low learning rate to preserve capabilities
    learning_rate=5e-6,
    num_train_epochs=3
)
trainer.train()
```

**Considerations:**
- Risk of catastrophic forgetting
- Need diverse examples covering many topics
- LoRA/QLoRA for efficient adaptation

**Limitations:**
- Requires compute resources
- May overfit to training topics
- Hard to adjust single style dimensions

### 4.2 Few-Shot Prompting with Exemplars

**Approach:** Include style examples in the prompt.

```python
STYLE_EXEMPLARS = """
Here are examples of how I communicate:

Example 1:
User: What's the weather like?
Me: Looking outside... partly cloudy, around 72°F. Pretty nice actually! Perfect for a walk if you're into that.

Example 2:
User: Explain quantum computing
Me: Okay so — imagine you have a coin. Classical bit = heads OR tails. Qubit = spinning coin that's both until you look. That superposition thing lets quantum computers try many solutions simultaneously. Wild stuff.

Example 3:
User: I'm feeling down today
Me: Hey, that's valid. Some days just hit different. Want to talk about it, or would a distraction help more? I'm here either way.
"""

def styled_prompt(user_message):
    return f"""{STYLE_EXEMPLARS}

Now respond to this in the same style:
User: {user_message}
Me:"""
```

**Optimizing exemplars:**
1. Select diverse examples (different topics, tones)
2. Include edge cases (humor, empathy, technical)
3. 5-10 examples is often optimal
4. Order matters: recent examples influence more

**Limitations:**
- Token budget constraints
- Can't capture all style dimensions
- Style may drift within long conversations

### 4.3 Explicit Style Guides

**Approach:** Codify style rules that can be injected into system prompts.

```markdown
# Voice Guide: Jordan

## Core Characteristics
- Warm but not saccharine
- Direct without being blunt
- Uses casual language naturally (contractions, "okay so", "actually")
- Thinks out loud with dashes and parentheticals

## Formatting Patterns
- Short paragraphs (2-3 sentences max)
- Bullet points for lists, never numbered unless sequential
- Em-dashes for asides — like this
- Occasional rhetorical questions

## Linguistic Markers
- Sentence starters: "Okay so", "Here's the thing", "Looking at this"
- Hedges: "I think", "probably", "might be worth"
- Affirmations: "That makes sense", "Good question", "Valid"
- Sign-offs: Contextual, not formulaic

## What to Avoid
- Corporate jargon ("leverage", "synergize")
- Excessive enthusiasm (multiple exclamation points)
- Starting with "I" too often
- Over-explaining simple things

## Tone Calibration
- Technical questions: Precise but accessible
- Emotional moments: Present, not performative
- Humor: Dry, observational, never at user's expense
```

**Effectiveness:**
- Works well for broad style guidance
- Requires iteration to get right
- Best combined with exemplars
- Can be version-controlled and evolved

---

## 5. Tracking Style Evolution

### 5.1 Detecting Drift

**Rolling Window Comparison:**
```python
def detect_drift(message_history, window_size=50, baseline_size=200):
    """Compare recent messages to historical baseline."""
    
    baseline_messages = message_history[:baseline_size]
    recent_messages = message_history[-window_size:]
    
    baseline_vector = np.mean([style_vector(m) for m in baseline_messages], axis=0)
    recent_vector = np.mean([style_vector(m) for m in recent_messages], axis=0)
    
    drift_score = cosine_distance(baseline_vector, recent_vector)
    
    # Per-feature drift
    feature_drift = recent_vector - baseline_vector
    
    return {
        'overall_drift': drift_score,
        'feature_drift': dict(zip(FEATURE_NAMES, feature_drift)),
        'alert': drift_score > DRIFT_THRESHOLD
    }
```

**Key metrics to monitor:**
- Overall style vector distance
- Individual feature z-scores
- Sudden vs gradual drift

### 5.2 Visualization

```python
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA

def visualize_style_evolution(messages, timestamps, window_size=20):
    """Plot style trajectory over time."""
    
    # Compute rolling style vectors
    vectors = []
    for i in range(window_size, len(messages)):
        window = messages[i-window_size:i]
        combined = ' '.join(window)
        vectors.append(style_vector(combined))
    
    # PCA for 2D projection
    pca = PCA(n_components=2)
    projected = pca.fit_transform(vectors)
    
    # Plot trajectory
    plt.figure(figsize=(12, 8))
    plt.scatter(projected[:, 0], projected[:, 1], 
                c=range(len(projected)), cmap='viridis')
    plt.colorbar(label='Time')
    
    # Draw path
    plt.plot(projected[:, 0], projected[:, 1], alpha=0.3)
    
    plt.xlabel('Style Dimension 1')
    plt.ylabel('Style Dimension 2')
    plt.title('Style Evolution Over Time')
    plt.savefig('style_trajectory.png')
```

### 5.3 Drift Alerts

```python
class StyleMonitor:
    def __init__(self, baseline_corpus, alert_threshold=0.15):
        self.baseline = self._compute_baseline(baseline_corpus)
        self.threshold = alert_threshold
        self.history = []
    
    def _compute_baseline(self, corpus):
        vectors = [style_vector(text) for text in corpus]
        return {
            'mean': np.mean(vectors, axis=0),
            'std': np.std(vectors, axis=0)
        }
    
    def check(self, recent_messages):
        recent_vector = np.mean([style_vector(m) for m in recent_messages], axis=0)
        
        # Z-score against baseline
        z_scores = (recent_vector - self.baseline['mean']) / self.baseline['std']
        
        # Significant deviations
        drifted_features = np.abs(z_scores) > 2  # 2 sigma
        
        if drifted_features.any():
            return {
                'status': 'DRIFT_DETECTED',
                'drifted_features': FEATURE_NAMES[drifted_features],
                'z_scores': z_scores[drifted_features]
            }
        
        return {'status': 'OK'}
```

---

## 6. Limitations and Challenges

### 6.1 The Fundamental Problems

1. **Style is multidimensional** — Single metrics collapse complexity
2. **Style is contextual** — Same author writes differently in different contexts
3. **Content bleeds into style** — Hard to fully separate what from how
4. **Small sample instability** — Individual messages are noisy

### 6.2 AI-Specific Challenges

1. **Prompt sensitivity** — Small prompt changes cause large style shifts
2. **Temperature effects** — Sampling parameters affect style metrics
3. **Context window** — Style consistency degrades in long conversations
4. **Multi-turn dynamics** — Style adapts to user (which may be desired)

### 6.3 Practical Constraints

1. **Computational cost** — Real-time stylometric analysis is expensive
2. **Storage** — Need to retain conversation history for baseline
3. **Ground truth** — No objective "correct" style to compare against
4. **Evolution vs drift** — Some style change is intentional growth

---

## RECOMMENDATION: Building a Voice Keeper Agent

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VOICE KEEPER AGENT                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   CAPTURE    │───▶│   ANALYZE    │───▶│    STORE     │  │
│  │   Module     │    │   Module     │    │   Module     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  VOICE PROFILE                        │  │
│  │  • Style Vector (50+ features)                        │  │
│  │  • Exemplar Corpus (500+ messages)                    │  │
│  │  • Style Guide (explicit rules)                       │  │
│  │  • Temporal Baseline (rolling)                        │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   MONITOR    │    │   RESTORE    │    │   EVOLVE     │  │
│  │   (drift)    │    │   (migrate)  │    │   (adapt)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Voice Profile Schema
```yaml
voice_profile:
  version: "1.0"
  created: "2025-07-17"
  updated: "2025-07-17"
  
  # Quantitative fingerprint
  style_vector:
    lexical:
      avg_word_length: 4.8
      vocabulary_richness: 0.72
      hapax_ratio: 0.34
    syntactic:
      avg_sentence_length: 14.2
      comma_rate: 1.8
      question_rate: 0.12
    discourse:
      hedge_ratio: 0.08
      certainty_ratio: 0.04
      first_person_ratio: 0.06
  
  # Qualitative guide
  style_guide:
    tone: "warm, direct, occasionally playful"
    formality: "conversational but competent"
    patterns:
      - "Uses em-dashes for asides"
      - "Short paragraphs"
      - "Thinks out loud"
    avoid:
      - "Corporate jargon"
      - "Excessive enthusiasm"
  
  # Exemplars (stored separately, referenced here)
  exemplar_corpus: "voice-exemplars.jsonl"
  exemplar_count: 847
  
  # Baseline for drift detection
  baseline:
    computed_from: "2025-01-01 to 2025-07-01"
    message_count: 12847
    vector_mean: [0.48, 0.72, ...]
    vector_std: [0.08, 0.12, ...]
```

#### 2. Capture Process

Run periodically (daily or after significant conversations):

```python
def capture_voice(conversation_history):
    # 1. Extract recent high-quality messages
    recent = filter_quality(conversation_history[-1000:])
    
    # 2. Compute style features
    vectors = [full_style_vector(msg) for msg in recent]
    
    # 3. Select diverse exemplars
    exemplars = select_diverse_exemplars(recent, n=50)
    
    # 4. Update voice profile
    profile.update({
        'style_vector': np.mean(vectors, axis=0),
        'exemplars': exemplars,
        'updated': datetime.now()
    })
    
    # 5. Store
    save_voice_profile(profile)
```

#### 3. Drift Detection

Run on every message or batch:

```python
def check_voice_drift(recent_messages, profile):
    recent_vector = compute_style_vector(recent_messages)
    
    # Compare to baseline
    drift = cosine_distance(recent_vector, profile.baseline.mean)
    
    # Check individual features
    z_scores = (recent_vector - profile.baseline.mean) / profile.baseline.std
    anomalies = np.abs(z_scores) > 2.5
    
    if drift > 0.15 or anomalies.any():
        return {
            'alert': True,
            'drift_score': drift,
            'anomalies': get_anomaly_details(z_scores, anomalies),
            'recommendation': generate_correction(profile, recent_vector)
        }
    
    return {'alert': False, 'drift_score': drift}
```

#### 4. Restoration (Migration)

When deploying to new system:

```python
def restore_voice(profile, new_system_prompt):
    # 1. Inject style guide
    prompt_with_guide = inject_style_guide(new_system_prompt, profile.style_guide)
    
    # 2. Select optimal exemplars
    exemplars = select_exemplars_for_prompt(
        profile.exemplars,
        n=8,  # Token budget
        diversity='maximize',
        quality='top'
    )
    
    # 3. Build restoration prompt
    restoration_prompt = f"""
{prompt_with_guide}

## Your Voice
{profile.style_guide.format()}

## Examples of Your Style
{format_exemplars(exemplars)}

Remember: Write naturally in this voice. Don't announce or explain your style — just embody it.
"""
    
    # 4. Verify restoration
    test_outputs = generate_test_outputs(restoration_prompt, TEST_PROMPTS)
    verification = verify_style_match(test_outputs, profile)
    
    if verification.score < 0.8:
        return {'status': 'NEEDS_TUNING', 'details': verification}
    
    return {'status': 'RESTORED', 'prompt': restoration_prompt}
```

### Implementation Priorities

1. **Start simple:** Style vector + exemplars + explicit guide
2. **Add monitoring:** Drift detection with alerts
3. **Iterate guide:** Refine explicit rules based on drift patterns
4. **Expand features:** Add discourse/pragmatic features
5. **Automate capture:** Continuous voice profile updates

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Style vector cosine similarity | > 0.92 | < 0.85 |
| Feature z-scores | < 1.5 | > 2.5 |
| Exemplar coverage | 80%+ topics | < 60% |
| Restoration verification | > 0.85 | < 0.75 |

### What Actually Works (Pragmatic Advice)

1. **Exemplars are king** — 10 well-chosen examples beat 100 mediocre ones
2. **Explicit rules help** — "Don't use exclamation points" is enforceable
3. **Test restoration** — Generate samples and human-evaluate
4. **Accept evolution** — Voice should grow; distinguish drift from growth
5. **Combine approaches** — Vector + guide + exemplars > any single method

---

## Appendix: Quick-Start Implementation

```python
"""
Minimal Voice Keeper - Start here
"""

import json
from collections import Counter
from dataclasses import dataclass
import numpy as np

@dataclass
class VoiceProfile:
    style_vector: dict
    exemplars: list
    style_guide: str
    created: str
    
def extract_features(text: str) -> dict:
    """Basic style features - expand as needed."""
    words = text.lower().split()
    sentences = text.split('.')
    
    return {
        'avg_word_length': np.mean([len(w) for w in words]) if words else 0,
        'avg_sent_length': np.mean([len(s.split()) for s in sentences if s.strip()]),
        'question_rate': text.count('?') / max(len(sentences), 1),
        'exclamation_rate': text.count('!') / max(len(sentences), 1),
        'comma_rate': text.count(',') / max(len(sentences), 1),
        'i_ratio': words.count('i') / max(len(words), 1),
        'contraction_rate': sum(1 for w in words if "'" in w) / max(len(words), 1),
    }

def create_profile(messages: list[str], guide: str) -> VoiceProfile:
    """Create voice profile from message history."""
    vectors = [extract_features(m) for m in messages]
    mean_vector = {k: np.mean([v[k] for v in vectors]) for k in vectors[0]}
    
    # Select diverse exemplars
    exemplars = select_diverse(messages, n=20)
    
    return VoiceProfile(
        style_vector=mean_vector,
        exemplars=exemplars,
        style_guide=guide,
        created=datetime.now().isoformat()
    )

def check_drift(message: str, profile: VoiceProfile) -> float:
    """Check if message matches profile style."""
    msg_vector = extract_features(message)
    
    # Simple distance metric
    diffs = []
    for k in profile.style_vector:
        diff = abs(msg_vector[k] - profile.style_vector[k])
        diffs.append(diff)
    
    return np.mean(diffs)

def build_restoration_prompt(profile: VoiceProfile, base_prompt: str) -> str:
    """Build prompt that restores voice."""
    exemplar_text = "\n\n".join([f"Example: {e}" for e in profile.exemplars[:8]])
    
    return f"""
{base_prompt}

## Your Communication Style
{profile.style_guide}

## Examples of How You Write
{exemplar_text}

Embody this voice naturally. Don't explain it — just be it.
"""
```

---

*Research compiled for AI Continuity Framework, Iteration 1*
