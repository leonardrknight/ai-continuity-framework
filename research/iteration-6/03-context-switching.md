# Context Switching: Handling Rapid Topic/Project Changes

*Research Document — AI Continuity Framework, Iteration 6*  
*Author: Jordan 🧭*  
*Date: 2026-02-17*  
*Status: Complete*

---

## Executive Summary

Context switching is one of the most challenging aspects of conversational AI memory. Unlike cross-session continuity (handling gaps between conversations), context switching addresses rapid, fluid topic changes *within* a single session. Users jump between projects, mix personal and professional contexts, and expect the AI to track multiple concurrent threads without confusion or inappropriate bleed.

This document explores detection algorithms, isolation strategies, restoration patterns, and UX guidelines for graceful context switching.

### Key Findings

| Challenge | Recommended Solution | Confidence |
|-----------|---------------------|------------|
| **Context detection** | Multi-signal hybrid (semantic + explicit + entity + pragmatic) | High |
| **Gradual vs. hard switches** | Different handling strategies per switch type | High |
| **Context isolation** | Hierarchical namespace model with memory tagging | High |
| **Context restoration** | Stack-based with LRU eviction + bookmark system | Medium |
| **Memory scoping** | Context inheritance with explicit cross-reference | High |
| **UX for confusion** | Light confirmation for ambiguous cases only | High |

---

## 1. The Problem Space

### What Makes Context Switching Hard

**The fundamental challenge:** Humans context-switch fluidly without explicit markers. They expect their conversational partner to "just know" when topics change.

Consider this exchange:
```
User: "The API should return 404 for missing resources, not 200 with null."
User: "Oh, also—any good restaurant recommendations for Friday?"
User: "Back to the API—what about pagination?"
```

The AI must:
1. Recognize the restaurant question as a context switch
2. Keep the API discussion context intact but not active
3. Recognize "Back to the API" as a context restoration
4. Resume pagination discussion with the 404 context intact

**Why existing approaches fail:**

| Approach | Why It Fails for Context Switching |
|----------|-----------------------------------|
| Single context window | All topics blend together; no isolation |
| Session-based isolation | Doesn't help within a single session |
| Explicit threading | Requires user overhead; breaks flow |
| Pure semantic search | Can't distinguish current vs. paused topics |

### User Behavior Patterns

Based on conversation analysis, users exhibit these context-switching patterns:

**1. Hard Switch (Explicit):**
- "Oh, completely different topic..."
- "Switching gears—"
- "Before I forget..."
- Clear signal, easy to detect

**2. Hard Switch (Implicit):**
- Abrupt topic change with no marker
- "What's the weather tomorrow?"
- Requires semantic discontinuity detection

**3. Gradual Drift:**
- API discussion → performance → server costs → budgeting
- Related topics that drift away from origin
- No clear boundary moment

**4. Nested Context:**
- "While we're on that—quick question about X—anyway, back to Y"
- Context pushed onto stack, then popped
- Requires stack-like management

**5. Parallel Contexts:**
- Multiple ongoing threads interleaved
- "For the Sharp app: do X. For the website: do Y."
- Requires context multiplexing

**6. Context Bleed (The Failure Mode):**
- User asks about "the project" but means different project than AI assumes
- AI surfaces wrong context due to ambiguity
- Trust-damaging when wrong assumptions are made

---

## 2. Context Detection Algorithms

### Detection Signal Taxonomy

Context switches can be detected through multiple signal types:

**Signal 1: Semantic Discontinuity**

Measure embedding distance between consecutive messages:

```python
def detect_semantic_discontinuity(prev_message, curr_message, threshold=0.65):
    """
    High semantic distance suggests context switch.
    Calibrated threshold: 0.65 (based on empirical testing)
    
    Returns: (is_switch: bool, confidence: float)
    """
    prev_embedding = embed(prev_message)
    curr_embedding = embed(curr_message)
    
    similarity = cosine_similarity(prev_embedding, curr_embedding)
    
    if similarity < threshold:
        confidence = (threshold - similarity) / threshold
        return (True, min(confidence * 1.5, 1.0))
    return (False, 0.0)
```

**Signal 2: Explicit Markers**

Pattern matching for linguistic switch indicators:

```python
HARD_SWITCH_PATTERNS = [
    r"(?i)^(anyway|anyhow|moving on|switching gears)",
    r"(?i)^(oh|hey),? (also|btw|by the way)",
    r"(?i)^(completely )?(different|unrelated) (topic|thing|question)",
    r"(?i)^before I forget",
    r"(?i)^quick (question|thing)",
    r"(?i)^on (another|a different) note",
]

CONTEXT_RETURN_PATTERNS = [
    r"(?i)^(back to|returning to|anyway|so)",
    r"(?i)^(as I was saying|where were we)",
    r"(?i)^(re:|regarding) ",  # Email-style
    r"(?i)continuing (with|on|from)",
]

def detect_explicit_markers(message):
    """
    Returns: (switch_type: str, matched_pattern: str | None)
    switch_type: 'hard_switch' | 'context_return' | 'none'
    """
    for pattern in HARD_SWITCH_PATTERNS:
        if re.search(pattern, message):
            return ('hard_switch', pattern)
    for pattern in CONTEXT_RETURN_PATTERNS:
        if re.search(pattern, message):
            return ('context_return', pattern)
    return ('none', None)
```

**Signal 3: Entity Discontinuity**

Track named entities and detect when new entities appear with no relation to active context:

```python
def detect_entity_discontinuity(active_context, message):
    """
    New entities unrelated to active context suggest switch.
    """
    current_entities = extract_entities(message)
    context_entities = active_context.entities
    
    # Check entity overlap
    overlap = len(current_entities & context_entities)
    new_entities = current_entities - context_entities
    
    if overlap == 0 and len(new_entities) > 0:
        return (True, 0.7)  # Strong signal
    if len(new_entities) > len(overlap) * 2:
        return (True, 0.4)  # Weak signal
    return (False, 0.0)
```

**Signal 4: Pragmatic Discontinuity**

Detect shifts in conversational intent/speech act:

```python
INTENT_CATEGORIES = {
    'task': ['create', 'build', 'implement', 'fix', 'debug'],
    'question': ['what', 'how', 'why', 'when', 'where'],
    'planning': ['should we', 'let\'s', 'plan', 'schedule'],
    'social': ['how are you', 'thanks', 'hi', 'bye'],
    'meta': ['forget that', 'ignore', 'actually', 'wait'],
}

def detect_pragmatic_discontinuity(prev_intent, curr_intent):
    """
    Sharp intent change suggests context switch.
    """
    # Map to categories
    prev_cat = classify_intent(prev_intent)
    curr_cat = classify_intent(curr_intent)
    
    # Task ↔ Social is strong switch signal
    if (prev_cat == 'task' and curr_cat == 'social') or \
       (prev_cat == 'social' and curr_cat == 'task'):
        return (True, 0.8)
    
    if prev_cat != curr_cat:
        return (True, 0.3)
    return (False, 0.0)
```

### Composite Detection Algorithm

Combine signals for robust detection:

```python
def detect_context_switch(conversation, new_message):
    """
    Master context switch detection algorithm.
    
    Returns: ContextSwitchResult {
        switch_detected: bool,
        switch_type: 'hard' | 'soft' | 'drift' | 'return' | 'none',
        confidence: float,
        target_context: Context | None,  # For returns
        signals: dict,
    }
    """
    prev_message = conversation.last_message
    active_context = conversation.active_context
    
    # Gather all signals
    signals = {
        'semantic': detect_semantic_discontinuity(prev_message, new_message),
        'explicit': detect_explicit_markers(new_message),
        'entity': detect_entity_discontinuity(active_context, new_message),
        'pragmatic': detect_pragmatic_discontinuity(prev_message, new_message),
    }
    
    # Check for context return first (takes priority)
    if signals['explicit'][0] == 'context_return':
        target = find_matching_paused_context(new_message, conversation.context_stack)
        if target:
            return ContextSwitchResult(
                switch_detected=True,
                switch_type='return',
                confidence=0.9,
                target_context=target,
                signals=signals,
            )
    
    # Check for hard switch (explicit marker)
    if signals['explicit'][0] == 'hard_switch':
        return ContextSwitchResult(
            switch_detected=True,
            switch_type='hard',
            confidence=0.95,
            target_context=None,
            signals=signals,
        )
    
    # Compute composite score for implicit switches
    composite_score = (
        signals['semantic'][1] * 0.35 +
        signals['entity'][1] * 0.30 +
        signals['pragmatic'][1] * 0.25 +
        (0.1 if signals['explicit'][0] != 'none' else 0.0)
    )
    
    # Thresholds
    if composite_score > 0.7:
        return ContextSwitchResult(
            switch_detected=True,
            switch_type='hard',
            confidence=composite_score,
            target_context=None,
            signals=signals,
        )
    elif composite_score > 0.4:
        return ContextSwitchResult(
            switch_detected=True,
            switch_type='soft',
            confidence=composite_score,
            target_context=None,
            signals=signals,
        )
    elif composite_score > 0.2:
        # Potential drift—flag but don't act
        return ContextSwitchResult(
            switch_detected=False,
            switch_type='drift',
            confidence=composite_score,
            target_context=None,
            signals=signals,
        )
    else:
        return ContextSwitchResult(
            switch_detected=False,
            switch_type='none',
            confidence=0.0,
            target_context=None,
            signals=signals,
        )
```

### Handling Gradual Drift

Drift is the hardest case—topics gradually shift without clear boundaries.

**Strategy: Drift Checkpointing**

```python
class DriftDetector:
    """
    Track topic drift over multiple turns.
    Creates checkpoints when cumulative drift exceeds threshold.
    """
    
    def __init__(self, checkpoint_threshold=0.5):
        self.checkpoint_threshold = checkpoint_threshold
        self.drift_accumulator = 0.0
        self.last_checkpoint_embedding = None
        
    def update(self, message_embedding, turn_drift_score):
        self.drift_accumulator += turn_drift_score
        
        if self.drift_accumulator > self.checkpoint_threshold:
            # Topic has drifted significantly from last checkpoint
            old_checkpoint = self.last_checkpoint_embedding
            self.last_checkpoint_embedding = message_embedding
            self.drift_accumulator = 0.0
            
            return DriftCheckpoint(
                from_embedding=old_checkpoint,
                to_embedding=message_embedding,
                drift_amount=self.checkpoint_threshold,
            )
        return None
```

**Application:** Use drift checkpoints to create implicit sub-contexts that can be returned to. "We drifted from API design → performance → costs. User can say 'back to the API design' and we restore that checkpoint."

---

## 3. Context Isolation Strategies

### The Context Object

Every active topic/project gets a context container:

```yaml
Context:
  id: uuid
  label: "Sharp App API Design"        # Auto-generated or user-named
  created_at: timestamp
  last_active: timestamp
  status: active | paused | archived
  
  # Content
  summary: "Designing REST API with pagination, 404s for missing resources..."
  key_facts: ["Using REST", "404 for missing", "JWT auth"]
  open_threads: ["Pagination approach", "Error format"]
  
  # Embedding for matching
  embedding: vector
  
  # Hierarchy
  parent_context: context_id | null    # For nested contexts
  related_contexts: [context_ids]       # Cross-references
  
  # Memory scope
  scoped_memories: [memory_ids]         # Memories created in this context
  
  # State
  turn_count: int                        # How many turns in this context
  resumption_count: int                  # How many times returned to this
```

### Isolation Mechanisms

**1. Namespace Tagging**

Every memory gets a context_id tag:

```python
def store_memory(content, context, memory_type='fact'):
    memory = Memory(
        content=content,
        context_id=context.id,
        context_label=context.label,
        context_embedding=context.embedding,
        memory_type=memory_type,
        created_at=now(),
    )
    vector_store.insert(memory)
```

**2. Scoped Retrieval**

When retrieving memories, filter by active context:

```python
def retrieve_memories(query, active_context, include_related=True):
    """
    Retrieve memories scoped to active context.
    Optionally include related/parent contexts.
    """
    context_ids = [active_context.id]
    
    if include_related:
        context_ids.extend(active_context.related_contexts)
    if active_context.parent_context:
        context_ids.append(active_context.parent_context)
    
    results = vector_store.search(
        query=query,
        filter={'context_id': {'$in': context_ids}},
        limit=10,
    )
    
    # Score boost for exact context match
    for result in results:
        if result.context_id == active_context.id:
            result.score *= 1.2
    
    return sorted(results, key=lambda x: x.score, reverse=True)
```

**3. Context Boundaries as Privacy Barriers**

Different contexts may have different privacy levels:

```python
CONTEXT_TYPES = {
    'professional': {
        'default_privacy': 'org_visible',
        'bleed_allowed': False,
        'cross_reference': 'explicit_only',
    },
    'personal': {
        'default_privacy': 'private',
        'bleed_allowed': False,
        'cross_reference': 'never',
    },
    'project': {
        'default_privacy': 'project_visible',
        'bleed_allowed': True,  # Related projects can share
        'cross_reference': 'auto',
    },
}
```

### Preventing Context Bleed

Context bleed is the most trust-damaging failure mode. The AI references information from the wrong context.

**Anti-Bleed Safeguards:**

```python
def validate_memory_surfacing(memory, active_context, user_message):
    """
    Before surfacing a memory, validate it belongs in current context.
    """
    # Rule 1: Exact context match always OK
    if memory.context_id == active_context.id:
        return ValidationResult(allowed=True)
    
    # Rule 2: Check explicit cross-reference
    if memory.context_id in active_context.related_contexts:
        return ValidationResult(
            allowed=True,
            attribution_required=True,
            attribution="From your work on {memory.context_label}..."
        )
    
    # Rule 3: Parent context can surface to child
    if memory.context_id == active_context.parent_context:
        return ValidationResult(allowed=True)
    
    # Rule 4: Check if user explicitly referenced the other context
    if references_context(user_message, memory.context_label):
        return ValidationResult(allowed=True)
    
    # Rule 5: Different privacy levels block bleed
    if memory.privacy_level != active_context.privacy_level:
        return ValidationResult(
            allowed=False,
            reason='privacy_mismatch',
        )
    
    # Rule 6: By default, don't surface cross-context memories
    # unless high relevance AND low ambiguity
    if memory.relevance_score > 0.9 and is_unambiguous(memory, user_message):
        return ValidationResult(
            allowed=True,
            confirmation_required=True,
            confirmation="You mentioned X before in {context}—relevant here?"
        )
    
    return ValidationResult(allowed=False, reason='context_boundary')
```

### Personal vs. Professional Separation

A critical special case: users often mix personal and professional topics.

**Detection:**
```python
def classify_context_domain(message, active_contexts):
    """
    Classify whether message is personal, professional, or ambiguous.
    """
    professional_signals = [
        r'\b(project|client|deadline|meeting|sprint|api|deploy)\b',
        r'\b(work|office|team|company|business)\b',
    ]
    
    personal_signals = [
        r'\b(family|friend|weekend|vacation|dinner|birthday)\b',
        r'\b(feeling|stressed|happy|tired|excited)\b',
        r'\b(movie|show|restaurant|game|hobby)\b',
    ]
    
    prof_score = sum(1 for p in professional_signals if re.search(p, message, re.I))
    pers_score = sum(1 for p in personal_signals if re.search(p, message, re.I))
    
    if prof_score > pers_score + 1:
        return 'professional'
    elif pers_score > prof_score + 1:
        return 'personal'
    else:
        return 'ambiguous'
```

**Isolation Policy:**
- Personal memories never auto-surface in professional contexts
- Professional memories never auto-surface in personal contexts
- User can explicitly bridge: "Remember what I said about needing a vacation? That's why I want this project done by Friday."

---

## 4. Context Restoration Patterns

### The Context Stack

Manage paused contexts with a stack-like structure:

```python
class ContextStack:
    """
    Stack-based context management with LRU eviction.
    """
    
    def __init__(self, max_size=10):
        self.stack = []  # List of Context objects
        self.max_size = max_size
        self.active = None
        
    def push(self, new_context):
        """
        Push new context onto stack, pause current active.
        """
        if self.active:
            self.active.status = 'paused'
            self.active.last_active = now()
            self.stack.append(self.active)
        
        # LRU eviction if at capacity
        if len(self.stack) >= self.max_size:
            oldest = min(self.stack, key=lambda c: c.last_active)
            self._archive(oldest)
            self.stack.remove(oldest)
        
        new_context.status = 'active'
        self.active = new_context
        
    def pop(self):
        """
        Archive current context, restore most recent paused.
        """
        if self.active:
            self._archive(self.active)
        
        if self.stack:
            self.active = self.stack.pop()
            self.active.status = 'active'
            self.active.resumption_count += 1
        else:
            self.active = None
            
    def find_and_restore(self, query_embedding):
        """
        Find best matching paused context and restore it.
        """
        if not self.stack:
            return None
            
        best_match = max(
            self.stack,
            key=lambda c: cosine_similarity(query_embedding, c.embedding)
        )
        
        if cosine_similarity(query_embedding, best_match.embedding) > 0.6:
            self.stack.remove(best_match)
            
            # Push current to stack
            if self.active:
                self.active.status = 'paused'
                self.stack.append(self.active)
            
            best_match.status = 'active'
            best_match.resumption_count += 1
            self.active = best_match
            return best_match
        return None
    
    def _archive(self, context):
        """Move context to long-term storage."""
        context.status = 'archived'
        archive_store.insert(context)
```

### Restoration Strategies

**1. Explicit Restoration (User-Initiated)**

User says: "Back to the API design..."

```python
def handle_explicit_restoration(message, context_stack):
    # Extract restoration target
    target_hint = extract_restoration_target(message)
    # "the API design" → embedding
    
    target_embedding = embed(target_hint)
    restored = context_stack.find_and_restore(target_embedding)
    
    if restored:
        return RestorationResult(
            success=True,
            context=restored,
            acknowledgment=f"Picking up on {restored.label}. {restored.summary}"
        )
    else:
        # No matching paused context—might be archived or new
        archived = search_archived_contexts(target_embedding)
        if archived:
            return RestorationResult(
                success=True,
                context=reactivate_archived(archived),
                acknowledgment=f"Resuming {archived.label} from earlier."
            )
        return RestorationResult(
            success=False,
            suggestion="I don't have a paused context for that. Want to start fresh?"
        )
```

**2. Implicit Restoration (AI-Detected)**

User message semantically matches a paused context better than active:

```python
def check_implicit_restoration(message, active_context, context_stack):
    msg_embedding = embed(message)
    
    # Score against active context
    active_score = cosine_similarity(msg_embedding, active_context.embedding)
    
    # Score against paused contexts
    paused_scores = [
        (c, cosine_similarity(msg_embedding, c.embedding))
        for c in context_stack.stack
    ]
    
    if paused_scores:
        best_paused, best_score = max(paused_scores, key=lambda x: x[1])
        
        # If paused context is significantly better match
        if best_score > active_score + 0.2 and best_score > 0.7:
            return ImplicitRestorationSuggestion(
                suggested_context=best_paused,
                confidence=best_score - active_score,
                prompt=f"This seems related to {best_paused.label}—should I switch?"
            )
    return None
```

**3. Bookmark System (User-Named Restoration Points)**

Allow users to create explicit bookmarks:

```python
BOOKMARK_PATTERNS = [
    r"(?i)let'?s call this (.+)",
    r"(?i)bookmark this as (.+)",
    r"(?i)save this (context|topic|thread) as (.+)",
]

def detect_bookmark_creation(message):
    for pattern in BOOKMARK_PATTERNS:
        match = re.search(pattern, message)
        if match:
            return match.group(1) or match.group(2)
    return None

def create_bookmark(context, name):
    context.bookmark_name = name.strip().lower()
    context.bookmarked_at = now()
    # Bookmarked contexts persist longer than unbookmarked
    context.archival_priority = 'low'
```

Usage: "Let's call this 'auth system design'" → Creates named bookmark that survives longer and can be restored by name.

---

## 5. Memory Scoping Across Contexts

### Which Memories Apply Where?

**Scoping Rules:**

| Memory Type | Scope | Cross-Context Behavior |
|-------------|-------|------------------------|
| Fact (stated) | Context of origin | Searchable from related contexts |
| Preference | User-wide | Always accessible |
| Decision | Context of origin | Inherits to child contexts |
| Task | Context of origin | Strict isolation |
| Emotion | Context of origin | Never crosses boundaries |

### Context Inheritance

Child contexts inherit from parents:

```python
class Context:
    def get_applicable_memories(self, query):
        """
        Get memories that apply to this context,
        including inherited ones.
        """
        own_memories = self.scoped_memories
        inherited = []
        
        if self.parent_context:
            parent = get_context(self.parent_context)
            # Inherit facts and decisions, not tasks or emotions
            inherited = [
                m for m in parent.get_applicable_memories(query)
                if m.memory_type in ['fact', 'decision', 'preference']
            ]
        
        return own_memories + inherited
```

### Cross-Context Memories

Some memories are explicitly multi-context:

```python
def create_cross_context_memory(content, contexts, memory_type='fact'):
    """
    Create a memory that lives in multiple contexts.
    """
    memory = Memory(
        content=content,
        context_ids=contexts,  # List instead of single
        memory_type=memory_type,
        cross_context=True,
    )
    
    for ctx_id in contexts:
        context = get_context(ctx_id)
        context.scoped_memories.append(memory.id)
```

**Detection:** When user explicitly bridges contexts:
- "Like I mentioned for the Sharp App, we should do the same here"
- "This is related to what we discussed about the API"

---

## 6. User Experience Guidelines

### When to Announce Context Switches

**Do Announce:**
- When restoring a paused context: "Picking up on [context]..."
- When ambiguity exists: "Are you asking about [A] or [B]?"
- When creating a new context after long discussion: "Starting fresh on [topic]."

**Don't Announce:**
- Quick asides that will immediately return: (User asks time → answer → continue)
- Obvious hard switches: (User says "Completely different topic—")
- Smooth drift: (Just update context silently)

### Confirmation Patterns

**Light Confirmation (Preferred):**
```
"Got it—[continue with response in new context]"
```

**Clarifying Confirmation (When Ambiguous):**
```
"Just to make sure—you're asking about the Sharp App's API, not the Amigo API?"
```

**Restoration Confirmation:**
```
"Picking up on the auth system design. We were deciding between JWT and session tokens."
```

### Context Confusion Recovery

When the AI gets the context wrong:

```python
CORRECTION_PATTERNS = [
    r"(?i)no,? (I mean|I meant|talking about)",
    r"(?i)not that (one|project|thing)",
    r"(?i)wrong (context|project|topic)",
    r"(?i)I was (asking|talking) about",
]

def detect_context_correction(message):
    for pattern in CORRECTION_PATTERNS:
        if re.search(pattern, message):
            return True
    return False

def handle_context_correction(message, context_stack):
    """
    User is correcting our context assumption.
    """
    # Extract what they actually meant
    intended_context = extract_intended_context(message)
    
    # Find matching context
    match = context_stack.find_and_restore(embed(intended_context))
    
    if match:
        return CorrectionResponse(
            apology="Ah, got it—you meant {match.label}.",
            restoration=match,
            retry_prompt="Let me try that again...",
        )
    else:
        return CorrectionResponse(
            apology="Sorry about the confusion.",
            clarification="Which project/topic were you referring to?",
        )
```

### Visual Context Indicators (for UI-based Interfaces)

For chat UIs, show subtle context indicators:

```yaml
ContextIndicator:
  format: "pill" | "sidebar" | "header"
  content:
    active_context: "Sharp App API"
    paused_contexts: ["Auth System", "Budget Planning"]
    indicator_color: context-specific  # Different projects get different colors
  interactions:
    click_paused: restore that context
    click_active: show context summary
```

---

## 7. Performance Considerations

### Caching Per Context

Cache recent retrievals per context to avoid redundant searches:

```python
class ContextCache:
    """
    LRU cache scoped to context.
    """
    
    def __init__(self, max_entries=100):
        self.caches = {}  # context_id → LRU cache
        self.max_entries = max_entries
        
    def get(self, context_id, query_hash):
        if context_id in self.caches:
            return self.caches[context_id].get(query_hash)
        return None
    
    def set(self, context_id, query_hash, results):
        if context_id not in self.caches:
            self.caches[context_id] = LRUCache(self.max_entries)
        self.caches[context_id].set(query_hash, results)
    
    def invalidate_context(self, context_id):
        """Clear cache when context is modified."""
        if context_id in self.caches:
            del self.caches[context_id]
```

### Pre-Loading Likely Contexts

Predict and pre-load context based on patterns:

```python
def predict_likely_contexts(user, time_of_day, day_of_week):
    """
    Predict which contexts the user is likely to need.
    Pre-load their embeddings and recent memories.
    """
    # Check historical patterns
    patterns = get_context_usage_patterns(user)
    
    # Time-based prediction (work contexts during work hours)
    if is_work_hours(time_of_day, day_of_week):
        likely = patterns.work_contexts[:3]
    else:
        likely = patterns.personal_contexts[:3]
    
    # Day-of-week patterns (certain projects on certain days)
    dow_likely = patterns.by_day_of_week.get(day_of_week, [])
    
    # Combine and pre-load
    to_preload = set(likely + dow_likely[:2])
    
    for ctx_id in to_preload:
        preload_context(ctx_id)
```

### Context Prediction Based on Message

Before full processing, predict likely context switch:

```python
def predict_context_fast(message_start, active_context, context_stack):
    """
    Fast prediction based on first few words.
    Used to pre-load context before full analysis.
    """
    # Check for explicit markers first (very fast)
    explicit = detect_explicit_markers(message_start[:50])
    if explicit[0] == 'context_return':
        # Pre-load stack contexts
        for ctx in context_stack.stack[:3]:
            preload_context(ctx.id)
        return 'likely_restoration'
    
    if explicit[0] == 'hard_switch':
        # Don't preload—new context coming
        return 'likely_new'
    
    # Keywords for known contexts
    for ctx in context_stack.all_contexts[:5]:
        if any(kw in message_start.lower() for kw in ctx.keywords):
            preload_context(ctx.id)
            return ('likely_match', ctx.id)
    
    return 'unknown'
```

---

## 8. Implementation Recommendations

### Phase 1: Basic Context Tracking

1. Implement Context object with embedding, summary, status
2. Simple context stack with push/pop
3. Explicit marker detection for hard switches
4. Basic semantic discontinuity detection

### Phase 2: Smart Isolation

1. Context-scoped memory retrieval
2. Privacy boundary enforcement
3. Cross-context memory validation
4. Personal/professional domain classification

### Phase 3: Graceful Restoration

1. Find-and-restore by semantic similarity
2. Bookmark system for named contexts
3. Drift checkpointing
4. UI context indicators (where applicable)

### Phase 4: Performance & Prediction

1. Per-context caching
2. Preloading based on patterns
3. Fast prediction for streaming responses
4. Context usage analytics

---

## 9. Testing Framework

### Test Cases for Context Switching

```python
TEST_CASES = [
    {
        'name': 'hard_switch_explicit',
        'messages': [
            "The API should use 404 for missing resources.",
            "Completely different topic—what's good for dinner Friday?",
        ],
        'expected': 'hard_switch',
        'expected_confidence': 0.9,
    },
    {
        'name': 'hard_switch_implicit',
        'messages': [
            "The API should use 404 for missing resources.",
            "What's the weather tomorrow?",
        ],
        'expected': 'hard_switch',
        'expected_confidence': 0.7,
    },
    {
        'name': 'context_return',
        'messages': [
            "The API should use 404 for missing resources.",
            "Oh, what time is our meeting?",
            "3pm. Back to the API—what about pagination?",
        ],
        'expected_sequence': ['continuation', 'hard_switch', 'context_return'],
    },
    {
        'name': 'gradual_drift',
        'messages': [
            "The API response times are slow.",
            "Yeah, the database queries take too long.",
            "We should add caching.",
            "Redis would work well.",
            "What's our infrastructure budget for that?",
        ],
        'expected': 'drift',
        'drift_checkpoint_at': 4,  # Budget diverges from original API topic
    },
    {
        'name': 'nested_context',
        'messages': [
            "Working on the auth system.",
            "Quick aside—did you get the email from Carlos?",
            "Ok thanks. Anyway, back to auth—should we use JWT?",
        ],
        'expected_sequence': ['new_context', 'nested_push', 'nested_pop'],
    },
    {
        'name': 'personal_professional_boundary',
        'messages': [
            "The sprint deadline is Friday.",
            "My daughter's birthday is Saturday.",
            "So I really need to finish the sprint by Thursday.",
        ],
        'expected': ['professional', 'personal', 'professional'],
        'bleed_detected': False,  # Birthday shouldn't surface in work context
    },
]
```

---

## 10. Key Takeaways

### Detection Summary

| Switch Type | Detection Method | Confidence |
|-------------|------------------|------------|
| Hard explicit | Pattern matching | Very high (0.95) |
| Hard implicit | Semantic + entity discontinuity | High (0.7-0.8) |
| Soft switch | Composite scoring | Medium (0.4-0.7) |
| Gradual drift | Cumulative drift tracking | Medium (checkpoint-based) |
| Context return | Explicit patterns + semantic matching | High (0.85-0.95) |

### Isolation Summary

- Tag all memories with context_id
- Filter retrieval by active + related contexts
- Block personal ↔ professional bleed
- Validate before surfacing cross-context memories
- Use explicit attribution when crossing boundaries

### Restoration Summary

- Stack-based management with LRU eviction
- Semantic matching for implicit restoration
- User bookmarks for important contexts
- Progressive archive search for older contexts

### UX Summary

- Announce restorations, not obvious switches
- Confirm only when genuinely ambiguous
- Recover gracefully from confusion
- Show context indicators in UI where possible

---

## References

- Iteration 3, Document 02: Cross-Session Continuity (related but session-scoped)
- Iteration 2, Document 05: Multi-User Memory Isolation (privacy model)
- Iteration 4, Document 02: Collaborative Memory (context boundaries)
- Generative Agents paper: context window management strategies
- MemGPT: hierarchical memory paging approach
