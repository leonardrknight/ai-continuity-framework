# Memory Consolidation Algorithms: From Human Brain to AI Systems

## Executive Summary

This document investigates how human brains decide what to keep versus forget, and surveys AI systems that implement memory consolidation for long-term agent memory. The goal is to inform algorithm design for an AI assistant's memory management system.

---

## 1. Neuroscience of Memory Consolidation

### 1.1 Overview

Memory consolidation is the biological process that stabilizes memories over time after initial learning. The brain employs a two-stage process that progressively strengthens and reorganizes memory traces.

### 1.2 Synaptic Consolidation (Minutes to Hours)

**What happens:** Molecular and cellular changes at individual synapses strengthen neural connections.

**Mechanism:**
- Long-term potentiation (LTP) strengthens synaptic connections through repeated activation
- Protein synthesis creates lasting structural changes at synapses
- Occurs within ~6 hours of learning
- Corresponds to "early" memory formation

**Key insight for AI:** Fast consolidation happens immediately after experience—similar to how an AI agent might "mark" important events for potential long-term storage.

### 1.3 Systems Consolidation (Days to Years)

**What happens:** Gradual reorganization where memories become less dependent on the hippocampus and more distributed across cortical networks.

**Mechanism:**
- Hippocampus acts as temporary storage and "teacher" to neocortex
- Repeated reactivation during rest/sleep transfers memories to cortical long-term storage
- Creates redundant, compressed representations over time
- Takes weeks to years for complete consolidation

**Key insight for AI:** Long-term memories should be gradually "promoted" from working storage to permanent archive, with the original detailed version eventually becoming unnecessary.

### 1.4 Role of Sleep in Memory

Sleep is critical for memory consolidation:

1. **Slow-wave sleep (SWS):** Reactivates hippocampal memories, replaying them to neocortex
2. **REM sleep:** May strengthen emotional and procedural memories
3. **Memory replay:** The brain literally "replays" recent experiences during sleep, reinforcing important ones

**Key insight for AI:** Periodic "offline" processing (heartbeats, background tasks) could review and consolidate recent memories, similar to sleep replay.

### 1.5 Emotional Enhancement (Amygdala Activation)

Emotionally significant events are preferentially remembered:

- Amygdala activation during encoding enhances consolidation
- Stress hormones (cortisol, adrenaline) modulate memory strength
- Emotional memories receive priority processing during sleep
- Called "flashbulb memories" for particularly vivid emotional events

**Key insight for AI:** Memories involving user emotional markers, important decisions, or high-stakes situations should receive higher importance scores.

### 1.6 The Ebbinghaus Forgetting Curve

Hermann Ebbinghaus (1885) discovered that memory retention decays exponentially without reinforcement:

**Original Ebbinghaus formula:**
```
b = 100k / ((log(t))^c + k)

Where:
- b = memory retention (%)
- t = time in minutes since learning
- k, c = constants (fitted parameters)
```

**Modern exponential approximation:**
```
R(t) = e^(-t/S)

Where:
- R(t) = retrievability (probability of recall) at time t
- S = stability of memory (how slowly it decays)
- t = time since last review
```

**With spaced repetition (Pimsleur intervals):**
- Each successful recall increases S (stability)
- Optimal review timing: just before the memory would decay below threshold

**Typical decay without reinforcement:**
- 1 hour: ~56% retained
- 1 day: ~33% retained  
- 1 week: ~25% retained
- 1 month: ~21% retained

**Key insight for AI:** Unreinforced memories should decay naturally. Recalled memories should have their stability boosted. This creates an elegant "graceful forgetting" mechanism.

---

## 2. Importance Scoring Methods

### 2.1 LLM-Based Rating

**Approach:** Ask the language model itself to rate memory importance.

**Implementation:**
```python
def score_importance(memory_text, context):
    prompt = f"""
    Rate the importance of this memory on a scale of 1-10.
    Consider: decisions made, emotional significance, 
    user preferences revealed, commitments, and future relevance.
    
    Memory: {memory_text}
    Context: {context}
    
    Output only a number 1-10.
    """
    return int(llm.complete(prompt))
```

**Pros:**
- Leverages LLM's semantic understanding
- Can consider nuanced factors
- Adapts to context

**Cons:**
- Expensive (requires LLM call per memory)
- May be inconsistent across calls
- Subject to model biases

### 2.2 Feature Heuristics

**Approach:** Use simple rules based on observable features.

**Heuristic factors:**

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Contains decision | +3 | Decisions define user preferences |
| Contains emotion words | +2 | Emotional salience |
| User said "remember this" | +5 | Explicit importance marker |
| Contains names/dates | +1 | Factual information |
| Contains commitment/promise | +4 | Future action required |
| Length > threshold | +1 | More detailed = often more important |
| Question answered | +2 | Resolved uncertainty |

**Implementation:**
```python
def heuristic_importance(memory):
    score = 5  # baseline
    
    if has_decision_marker(memory):
        score += 3
    if has_emotion_words(memory):
        score += 2
    if has_explicit_remember(memory):
        score += 5
    if has_commitment(memory):
        score += 4
    # ... etc
    
    return min(10, max(1, score))
```

**Pros:**
- Fast and cheap
- Consistent and explainable
- No LLM call required

**Cons:**
- May miss subtle importance
- Requires manual rule tuning

### 2.3 User Signals

**Approach:** Infer importance from user behavior.

**Signals:**
- **Repetition:** User asks about same topic multiple times → important
- **Time spent:** Longer conversations on a topic → important
- **Follow-up questions:** User digs deeper → important
- **Corrections:** User corrects assistant → very important (learn the preference)
- **Explicit feedback:** "That's helpful" / "Remember that" → importance boost

**Implementation:**
```python
def user_signal_boost(memory, conversation_history):
    topic = extract_topic(memory)
    
    repetition_count = count_topic_mentions(topic, conversation_history)
    follow_up_count = count_follow_ups(memory, conversation_history)
    
    boost = repetition_count * 0.5 + follow_up_count * 1.0
    return boost
```

### 2.4 Retroactive Reweighting

**Approach:** If a memory is recalled later, boost its importance (it proved useful).

**Implementation:**
```python
def on_memory_recalled(memory):
    # The fact that we retrieved this memory means it was relevant
    memory.importance = min(10, memory.importance + 1)
    memory.recall_count += 1
    memory.last_accessed = now()
    memory.stability *= 1.5  # Ebbinghaus: successful recall increases retention
```

**Key insight:** This creates a self-reinforcing system—memories that are actually useful get stronger, while unused memories naturally fade.

---

## 3. AI Systems That Implement Consolidation

### 3.1 Generative Agents (Park et al., 2023)

**Paper:** "Generative Agents: Interactive Simulacra of Human Behavior"

**Architecture:**
- Maintains complete record of agent experiences in natural language
- Synthesizes memories into higher-level "reflections" over time
- Retrieves memories dynamically to plan behavior

**Memory Retrieval Formula:**
```
score(memory) = α × recency + β × importance + γ × relevance

Where:
- recency = exponential decay from memory creation time
- importance = LLM-rated importance score (1-10)
- relevance = embedding similarity to current query
- α, β, γ = weighting parameters (summing to 1)
```

**Specific implementation:**
```python
def memory_score(memory, query, current_time):
    # Recency: exponential decay
    hours_ago = (current_time - memory.timestamp).total_seconds() / 3600
    recency = 0.99 ** hours_ago  # decay factor
    
    # Importance: pre-computed LLM score, normalized
    importance = memory.importance / 10
    
    # Relevance: cosine similarity of embeddings
    relevance = cosine_similarity(
        embed(memory.text), 
        embed(query)
    )
    
    # Weighted combination
    return 1.0 * recency + 1.0 * importance + 1.0 * relevance
```

**Reflection mechanism:**
- Periodically asks: "What high-level insights can you infer?"
- Creates new "reflection" memories that synthesize lower-level observations
- Reflections are higher importance and more abstract

### 3.2 MemoryBank (Zhong et al., 2023)

**Paper:** "MemoryBank: Enhancing Large Language Models with Long-Term Memory"

**Key innovation:** Ebbinghaus-inspired forgetting and reinforcement.

**Memory Update Mechanism:**
```python
def update_memory_strength(memory, event_type, current_time):
    time_elapsed = current_time - memory.last_update
    
    # Apply Ebbinghaus decay
    decay = math.exp(-time_elapsed / memory.stability)
    memory.strength *= decay
    
    if event_type == "recall":
        # Memory was accessed - reinforce it
        memory.strength = min(1.0, memory.strength + 0.2)
        memory.stability *= 1.5  # Slower future decay
    
    memory.last_update = current_time
```

**Forgetting threshold:**
```python
def should_forget(memory):
    return memory.strength < 0.1  # Below 10% retrievability
```

**Key features:**
- Memories have explicit "strength" values
- Unused memories decay toward forgetting threshold
- Accessed memories get reinforced
- Mimics human memory dynamics

### 3.3 MemGPT / Letta (Packer et al., 2023)

**Paper:** "MemGPT: Towards LLMs as Operating Systems"

**Key insight:** Treat LLM memory like OS virtual memory.

**Architecture:**
```
┌─────────────────────────────────┐
│     Main Context (In-Context)   │ ← "RAM" - limited, fast
│     - Current conversation      │
│     - Working memory            │
├─────────────────────────────────┤
│     Core Memory (Persistent)    │ ← "SSD" - editable facts
│     - User persona              │
│     - System persona            │
├─────────────────────────────────┤
│     Archival Memory (External)  │ ← "Disk" - unlimited, slow
│     - Full conversation history │
│     - Long-term facts           │
└─────────────────────────────────┘
```

**Memory Operations (as function calls):**
```python
# Page data into context
def core_memory_append(section: str, content: str):
    """Add to persistent core memory."""
    
def core_memory_replace(section: str, old: str, new: str):
    """Update core memory content."""

def archival_memory_insert(content: str):
    """Store in long-term archival memory."""

def archival_memory_search(query: str, n: int):
    """Retrieve from archival memory by semantic search."""
```

**Key features:**
- LLM decides when to page memory in/out
- Separation of working vs. long-term memory
- Interrupts for memory management (self-invoked)
- Unlimited external storage

### 3.4 CoALA (Cognitive Architectures for Language Agents)

**Paper:** "Cognitive Architectures for Language Agents" (Yao et al., 2023)

**Framework:** Organizes memory into distinct layers inspired by cognitive science.

**Memory Structure:**
```
┌─────────────────────────────────────────┐
│            Working Memory               │
│  - Current task state                   │
│  - Reasoning scratchpad                 │
│  - Recently retrieved information       │
├─────────────────────────────────────────┤
│           Episodic Memory               │
│  - Specific past experiences            │
│  - Temporal context preserved           │
│  - "What happened"                      │
├─────────────────────────────────────────┤
│           Semantic Memory               │
│  - General knowledge                    │
│  - Learned facts and concepts           │
│  - "What I know"                        │
├─────────────────────────────────────────┤
│          Procedural Memory              │
│  - Skills and how-to knowledge          │
│  - Tool usage patterns                  │
│  - "How to do things"                   │
└─────────────────────────────────────────┘
```

**Consolidation flow:**
```
Episodic (specific) → Semantic (general)
                   ↘
                    Procedural (skills)
```

**Key insight:** Different memory types serve different purposes:
- Episodic: Specific past conversations (what happened when)
- Semantic: Distilled facts about user preferences (general knowledge)
- Procedural: Learned patterns for how to respond

---

## 4. Spaced Repetition Algorithms

### 4.1 SM-2 Algorithm (SuperMemo)

**Origin:** Created by Piotr Woźniak (1987), the foundation of modern spaced repetition.

**Variables tracked per item:**
- `n` = repetition number (successful recalls in a row)
- `EF` = easiness factor (how quickly intervals grow), initial = 2.5
- `I` = inter-repetition interval (days until next review)

**Algorithm:**
```python
def sm2_update(n, EF, I, grade):
    """
    grade: 0-5 quality of recall
      0 = complete blackout
      3 = correct with difficulty  
      5 = perfect recall
    """
    if grade >= 3:  # Correct response
        if n == 0:
            I = 1
        elif n == 1:
            I = 6
        else:
            I = round(I * EF)
        n += 1
    else:  # Incorrect response
        n = 0
        I = 1
    
    # Update easiness factor
    EF = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    EF = max(1.3, EF)  # Minimum EF
    
    return n, EF, I
```

**Interval progression (EF=2.5, perfect recalls):**
- After 1st review: 1 day
- After 2nd review: 6 days
- After 3rd review: 15 days
- After 4th review: 38 days
- After 5th review: 94 days

### 4.2 Anki's Implementation (SM-2 Modified)

Anki uses SM-2 with modifications:
- Intervals calculated as: `I_new = I_old * EF * interval_modifier`
- Adds "graduating interval" concept
- Supports "again/hard/good/easy" buttons instead of 0-5 grades
- Includes "fuzz factor" to spread reviews

### 4.3 Application to AI Memory

**Concept:** Use spaced repetition principles to decide when to "review" (consolidate) memories.

```python
def memory_needs_review(memory, current_time):
    """Should we consolidate this memory now?"""
    days_since = (current_time - memory.last_review).days
    return days_since >= memory.interval

def consolidate_memory(memory, was_useful):
    """Update memory after it was either useful or not."""
    if was_useful:
        # Successful "recall" - increase interval
        memory.interval = round(memory.interval * memory.EF)
        memory.EF = min(2.5, memory.EF + 0.1)
        memory.consolidation_level += 1
    else:
        # Memory wasn't useful when retrieved
        memory.interval = 1
        memory.EF = max(1.3, memory.EF - 0.2)
```

**Key insight:** Instead of asking "when should user review this?", we ask "when should the system consolidate/compress this memory?"

---

## 5. Graceful Forgetting

### 5.1 Not Deletion, But Compression

Human forgetting isn't deletion—it's lossy compression:
- Details fade while gist remains
- Specific episodes become general knowledge
- Redundant information is deduplicated

**AI parallel:**
```
Day 1: "User asked about Python list comprehensions at 2pm"
Day 7: "User learning Python, interested in advanced features"  
Day 30: "User is a Python developer"
```

### 5.2 Essence Extraction Algorithm

```python
def extract_essence(detailed_memory):
    """Compress a detailed memory to its core meaning."""
    prompt = f"""
    Extract the essential, lasting information from this memory.
    Remove temporal details, keep facts that will remain relevant.
    
    Original: {detailed_memory}
    
    Essence (1-2 sentences):
    """
    return llm.complete(prompt)

def compress_old_memories(memories, age_threshold_days=30):
    """Periodically compress old detailed memories."""
    for memory in memories:
        if memory.age > age_threshold_days and not memory.is_compressed:
            essence = extract_essence(memory.content)
            memory.content = essence
            memory.is_compressed = True
```

### 5.3 Archive Tiers

**Proposed tier structure:**

```
┌──────────────────────────────────────────────────────────────┐
│  TIER 0: Active Context (Hours)                              │
│  - Full conversation context                                  │
│  - Complete details preserved                                 │
│  - In-context or immediate retrieval                          │
├──────────────────────────────────────────────────────────────┤
│  TIER 1: Recent Memory (Days)                                 │
│  - Recent conversations and decisions                         │
│  - Full detail preserved                                      │
│  - Vector search retrieval                                    │
├──────────────────────────────────────────────────────────────┤
│  TIER 2: Consolidated Memory (Weeks/Months)                   │
│  - Compressed summaries of episodes                           │
│  - Key facts and preferences extracted                        │
│  - Semantic memory formation                                  │
├──────────────────────────────────────────────────────────────┤
│  TIER 3: Archive (Months/Years)                               │
│  - Highly compressed or raw storage                           │
│  - Rarely accessed                                            │
│  - Can be retrieved for specific queries                      │
├──────────────────────────────────────────────────────────────┤
│  TIER 4: Forgotten                                            │
│  - Below retention threshold                                  │
│  - Deleted or marked for cleanup                              │
└──────────────────────────────────────────────────────────────┘
```

**Promotion/Demotion Rules:**
```python
def memory_lifecycle(memory, time_since_creation, recall_count):
    # Promotion: frequently accessed → move to higher tier
    if recall_count > 3 and memory.tier > 1:
        promote(memory)
    
    # Demotion: old + unused → move to lower tier
    if time_since_creation > memory.tier_threshold and recall_count == 0:
        demote(memory)
    
    # Forgetting: below threshold in lowest active tier
    if memory.tier == 3 and memory.strength < 0.1:
        memory.tier = 4  # Mark for deletion
```

---

## 6. Recommendation: Proposed Algorithm for AI Assistant

### 6.1 Design Goals

1. **Selective consolidation:** Not everything is worth remembering
2. **Graceful decay:** Unused memories fade naturally
3. **Usage reinforcement:** Recalled memories get stronger
4. **Compression over time:** Details → essence → semantic knowledge
5. **Efficient retrieval:** Multi-tier architecture for speed

### 6.2 Proposed Hybrid Algorithm

**Memory Structure:**
```python
@dataclass
class Memory:
    id: str
    content: str
    created_at: datetime
    last_accessed: datetime
    
    # Importance scoring
    importance: float  # 0-10, LLM or heuristic rated
    
    # Ebbinghaus decay
    strength: float  # 0-1, current retrievability
    stability: float  # days, how slowly it decays
    
    # Tier management
    tier: int  # 0-4
    is_compressed: bool
    recall_count: int
    
    # Type
    memory_type: str  # "episodic", "semantic", "procedural"
```

### 6.3 Importance Scoring (Hybrid)

```python
def compute_importance(memory_text, context):
    # Fast heuristic score (always compute)
    heuristic_score = heuristic_importance(memory_text)
    
    # If heuristic suggests important, confirm with LLM
    if heuristic_score >= 7:
        llm_score = llm_importance_rating(memory_text, context)
        return 0.3 * heuristic_score + 0.7 * llm_score
    
    return heuristic_score
```

### 6.4 Decay and Reinforcement (Ebbinghaus-inspired)

```python
def update_memory_strength(memory, current_time, event=None):
    """Update memory strength based on time and events."""
    
    # Calculate decay
    days_elapsed = (current_time - memory.last_accessed).days
    decay = math.exp(-days_elapsed / memory.stability)
    memory.strength *= decay
    
    # Handle events
    if event == "recalled":
        # Successful recall reinforces memory
        memory.strength = min(1.0, memory.strength + 0.2)
        memory.stability *= 1.3  # Slower future decay
        memory.recall_count += 1
    elif event == "user_referenced":
        # User mentioned this topic - very strong signal
        memory.strength = min(1.0, memory.strength + 0.4)
        memory.stability *= 1.5
    
    memory.last_accessed = current_time
```

### 6.5 Retrieval Scoring (Generative Agents inspired)

```python
def retrieval_score(memory, query, current_time, alpha=1.0, beta=1.0, gamma=1.0):
    """Score memories for retrieval."""
    
    # Recency (exponential decay)
    hours_ago = (current_time - memory.last_accessed).total_seconds() / 3600
    recency = 0.995 ** hours_ago
    
    # Importance (normalized)
    importance = memory.importance / 10
    
    # Relevance (semantic similarity)
    relevance = cosine_similarity(embed(memory.content), embed(query))
    
    # Strength (current retrievability)
    strength_factor = memory.strength
    
    # Combined score
    return (alpha * recency + 
            beta * importance + 
            gamma * relevance) * strength_factor
```

### 6.6 Consolidation Pipeline

```python
def consolidation_pass(memories, current_time):
    """Run periodically (daily or during heartbeat)."""
    
    for memory in memories:
        update_memory_strength(memory, current_time)
        
        # Check for tier transitions
        if should_demote(memory):
            if memory.tier < 3:
                demote_memory(memory)
            elif memory.strength < 0.05:
                mark_for_deletion(memory)
        
        # Compress old memories
        if memory.tier == 1 and memory.age_days > 7 and not memory.is_compressed:
            promote_to_tier_2(memory)
        
        # Extract semantic knowledge from episodic memories
        if memory.tier == 2 and memory.recall_count >= 3:
            extract_semantic_knowledge(memory)

def promote_to_tier_2(memory):
    """Compress and consolidate a memory."""
    essence = extract_essence(memory.content)
    memory.content = essence
    memory.is_compressed = True
    memory.tier = 2

def extract_semantic_knowledge(memory):
    """Convert repeated episodic pattern to semantic fact."""
    fact = extract_general_fact(memory.content)
    create_semantic_memory(fact, source_memory=memory)
```

### 6.7 Implementation Summary

| Component | Algorithm | Inspiration |
|-----------|-----------|-------------|
| Importance scoring | Hybrid heuristic + LLM | Generative Agents |
| Decay function | Exponential with stability | Ebbinghaus/MemoryBank |
| Reinforcement | Recall boosts strength + stability | SM-2/Spaced Repetition |
| Retrieval ranking | Recency × Importance × Relevance × Strength | Generative Agents |
| Memory tiers | 5-tier hierarchy | MemGPT + CoALA |
| Compression | LLM essence extraction | CoALA consolidation |
| Forgetting | Strength threshold deletion | MemoryBank |

---

## 7. Summary

### Key Principles from Neuroscience
1. Memory consolidation is a multi-stage process (fast → slow)
2. Sleep/offline processing is crucial for replay and consolidation
3. Emotional salience enhances memory
4. Forgetting follows predictable exponential decay
5. Retrieval reinforces memories

### Key Principles from AI Systems
1. Combine recency, importance, and relevance for retrieval (Generative Agents)
2. Use Ebbinghaus decay for graceful forgetting (MemoryBank)
3. Tier memory by access pattern and age (MemGPT)
4. Separate episodic from semantic knowledge (CoALA)
5. Compress over time, don't just delete

### Recommended Implementation
Use a hybrid approach:
- **Fast path:** Heuristic importance + embedding retrieval
- **Slow path:** LLM importance rating for high-signal memories
- **Background:** Periodic consolidation passes to compress and forget
- **Architecture:** Multi-tier storage with promotion/demotion rules

This creates a memory system that feels more human: it remembers what matters, forgets what doesn't, and gracefully compresses detailed memories into lasting knowledge.

---

## References

1. Ebbinghaus, H. (1885). Memory: A Contribution to Experimental Psychology
2. Park, J. S., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." arXiv:2304.03442
3. Packer, C., et al. (2023). "MemGPT: Towards LLMs as Operating Systems." arXiv:2310.08560
4. Zhong, W., et al. (2023). "MemoryBank: Enhancing Large Language Models with Long-Term Memory." arXiv:2305.10250
5. Yao, S., et al. (2023). "Cognitive Architectures for Language Agents." arXiv:2309.02427
6. Woźniak, P. (1990). "Application of a computer to improve the results obtained in working with the SuperMemo method" (SM-2 algorithm)
