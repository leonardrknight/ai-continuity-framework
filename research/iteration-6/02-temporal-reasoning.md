# Temporal Reasoning in AI Memory Systems

*Research Document: Iteration 6, Document 02*  
*Date: 2025-07-13*  
*Topic: How AI should reason about time in memory systems*

---

## Executive Summary

Time is the hidden dimension in all memory systems. Every memory has temporal context—when it happened, how long ago it feels, whether it's still relevant. This document explores how AI continuity systems should represent, query, reason about, and decay temporal information.

Key insight: **Time in human memory isn't just timestamps—it's relational, contextual, and emotional.** "Last week" means something different than "7 days ago." "During the project" anchors to events, not dates. Effective AI memory must handle both machine-precise and human-fuzzy temporal concepts.

---

## The Challenge

### Why Temporal Reasoning Is Hard

1. **Relativity of reference:** "Last week" said on Monday means different days than said on Friday
2. **Multiple time systems:** Calendar time, event time, emotional time, business cycles
3. **Ambiguity:** "Recently" could be hours or months depending on context
4. **Decay asymmetry:** Some old things matter forever; some new things are instantly obsolete
5. **Future uncertainty:** Commitments and predictions have different truth values than facts
6. **Timezone hell:** "Tomorrow morning" in a global context

### What Memory Systems Need

- Store when things happened (absolute)
- Answer when things happened relative to now (computed)
- Link events to other events (relational)
- Understand duration and overlap
- Handle recurrence and patterns
- Decay relevance appropriately
- Track future commitments differently from past facts

---

## 1. Temporal Representation

### 1.1 The Dual Model: Absolute + Contextual

Every temporal memory should store both:

```yaml
temporal:
  absolute:
    timestamp: "2025-07-13T14:30:00Z"    # Machine-precise
    timezone: "America/New_York"          # Context for human interpretation
    precision: "minute"                   # How precise is this? (year/month/day/hour/minute/second)
    
  contextual:
    relative_reference: "last Friday"     # Original human expression
    anchor_event: "after the board meeting"  # Event-relative reference
    period: "during Q2 2025"              # Named period
    recurrence: "every Monday morning"    # Pattern if recurring
```

**Why both?**
- Absolute enables precise queries and ordering
- Contextual preserves the *meaning* the user intended
- "The day after my birthday" matters differently than "March 15"

### 1.2 Precision Levels

Not all timestamps are created equal:

| Precision | Example | Use Case |
|-----------|---------|----------|
| Vague | "A while ago" | Uncertain/emotional memories |
| Year | "Back in 2023" | Historical context |
| Quarter | "Q3 last year" | Business cycles |
| Month | "In January" | Seasonal context |
| Week | "Last week" | Relative recent past |
| Day | "Tuesday" | Specific events |
| Hour | "This morning" | Same-day context |
| Minute | "At 3:47pm" | Precise scheduling |

**Store precision metadata.** A memory marked as "sometime in 2023" shouldn't match a query for "January 2023" with high confidence.

### 1.3 Duration vs Point-in-Time

Two fundamentally different temporal types:

**Point-in-time (Instant):**
```yaml
type: instant
when: "2025-07-13T14:30:00Z"
```

**Duration (Interval):**
```yaml
type: interval
start: "2025-01-15"
end: "2025-03-20"
status: completed  # or: ongoing, planned
name: "The Sharp App MVP sprint"
```

**Ongoing/Open-ended:**
```yaml
type: interval
start: "2025-06-01"
end: null  # Still happening
status: ongoing
name: "The Mi Amigos project"
```

### 1.4 Recurring Patterns

Recurrence is a first-class temporal concept:

```yaml
recurrence:
  pattern: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"  # iCalendar standard
  natural: "Every Monday, Wednesday, Friday"
  start_date: "2025-01-06"
  end_date: null  # Indefinite
  exceptions:
    - "2025-07-04"  # Holiday skip
  instances_stored: true  # Do we log each occurrence?
```

**Key decisions:**
- Store the pattern, not every instance (for scheduling)
- Store specific instances when they have unique content
- Track "skipped" or "modified" instances explicitly

### 1.5 Timezone Handling

The timezone problem isn't just technical—it's semantic:

```yaml
timezone_context:
  user_primary: "America/New_York"          # User's home timezone
  conversation_context: "America/Los_Angeles"  # Where they were when discussing
  event_timezone: "Europe/London"            # Where the event occurs
  
  # Store all three when relevant
  display_preference: user_primary           # Default for queries
```

**Rules:**
1. Always store UTC internally
2. Always store the user's timezone at time of input
3. For events, store the event's timezone separately
4. Display in user's current/preferred timezone

---

## 2. Temporal Queries

### 2.1 Query Types

**Absolute Range Queries:**
```sql
-- "What did we discuss in January?"
SELECT * FROM memories 
WHERE timestamp BETWEEN '2025-01-01' AND '2025-01-31';
```

**Relative Queries (Computed at Query Time):**
```python
# "What happened last week?"
def last_week():
    now = datetime.now(user_timezone)
    start = now - timedelta(days=now.weekday() + 7)  # Last Monday
    end = start + timedelta(days=7)
    return (start, end)
```

**Event-Anchored Queries:**
```python
# "What did we discuss after the board meeting?"
anchor = find_event("board meeting", date_hint="recent")
return memories.filter(timestamp__gte=anchor.end_time)
```

**Fuzzy Temporal Queries:**
```python
# "Around the time of the product launch"
anchor = find_event("product launch")
buffer = timedelta(days=7)  # Fuzzy "around"
return memories.filter(
    timestamp__gte=anchor.start - buffer,
    timestamp__lte=anchor.end + buffer
)
```

### 2.2 Temporal Query Patterns

| Query Type | Example | Resolution Strategy |
|------------|---------|---------------------|
| Relative recent | "last week" | Compute from now |
| Relative past | "3 months ago" | Compute from now |
| Named period | "during Q2" | Map to date range |
| Event-relative | "after the merger" | Find anchor event first |
| Recurrence query | "our Friday meetings" | Match pattern, return instances |
| Duration overlap | "while I was traveling" | Interval intersection |
| Fuzzy | "around the holidays" | Expand to fuzzy range |

### 2.3 Ambiguity Resolution

When temporal references are ambiguous:

**"Friday"** — Which Friday?
1. If today is before Friday → This week's Friday
2. If today is Friday → Today
3. If today is after Friday → Either last Friday or next Friday (ask or infer from verb tense)

**"January"** — Which year?
1. If we're in January → This January
2. If January passed this year → This year's January
3. If discussing future → Next year's January (requires context)

**"The meeting"** — Which meeting?
1. Check recency: Most recent by default
2. Check conversation context: Referenced meeting?
3. Check uniqueness: Only one match? Use it.
4. Ask if ambiguous

**Resolution priority:**
1. Explicit context ("the Friday before last")
2. Conversation context (recently discussed)
3. Recency bias (most recent match)
4. Ask for clarification

### 2.4 Temporal Distance Functions

How "far" is a memory temporally?

```python
def temporal_distance(memory_time, query_time, scale='human'):
    """
    Calculate temporal distance with human-perceived scaling.
    
    Human time perception is logarithmic:
    - Yesterday feels close
    - Last week feels moderately far
    - Last month feels far
    - Last year feels very far
    """
    delta = query_time - memory_time
    days = delta.days
    
    if scale == 'linear':
        return days
    
    if scale == 'human':
        # Logarithmic scaling matches human perception
        if days == 0:
            return 0
        return math.log(days + 1)
    
    if scale == 'business':
        # Business days only (weekdays)
        return count_business_days(memory_time, query_time)
```

---

## 3. Temporal Reasoning

### 3.1 Causality Chains

Memories often have causal relationships:

```yaml
memory:
  id: m_123
  content: "User switched to the new architecture"
  caused_by: m_119  # "User hit performance ceiling"
  caused: [m_125, m_127]  # Downstream effects
  
temporal_order:
  - m_119: "2025-05-15"  # Cause
  - m_123: "2025-05-20"  # Decision
  - m_125: "2025-06-01"  # Effect 1
  - m_127: "2025-06-15"  # Effect 2
```

**Causal reasoning enables:**
- "Why did we make this change?" → Follow caused_by chain
- "What happened because of X?" → Follow caused chain
- Narrative reconstruction from fragments

### 3.2 Sequence Reasoning

Some memories are sequences:

```yaml
sequence:
  name: "Onboarding flow"
  steps:
    - step: 1, memory: m_100, event: "First meeting"
    - step: 2, memory: m_105, event: "Shared requirements doc"
    - step: 3, memory: m_110, event: "Initial demo"
    - step: 4, memory: m_115, event: "Feedback session"
  completed_steps: [1, 2, 3]
  next_step: 4
  status: in_progress
```

**Sequence queries:**
- "Where are we in the onboarding?" → Return status and next step
- "What happened first?" → Return step 1
- "What did we do after the demo?" → Return step 4

### 3.3 Overlap and Containment

Temporal intervals have relationships:

```
Project X:  |---------------|
   Event A:     |---|
   Event B:              |------|
   Event C: |--|
```

**Allen's Interval Algebra** (the standard):

| Relation | Meaning | Example |
|----------|---------|---------|
| before | X ends before Y starts | Meeting before lunch |
| meets | X ends when Y starts | Back-to-back meetings |
| overlaps | X starts before Y, ends during Y | Projects overlap |
| starts | X starts when Y starts | Kicked off together |
| during | X is contained in Y | Event during project |
| finishes | X ends when Y ends | Completed together |
| equals | Same interval | Same time |

(Plus inverses: after, met-by, overlapped-by, started-by, contains, finished-by)

**Implementation:**
```python
def interval_relation(a, b):
    """Determine Allen's interval relation between a and b."""
    if a.end < b.start:
        return 'before'
    elif a.end == b.start:
        return 'meets'
    elif a.start < b.start and a.end < b.end and a.end > b.start:
        return 'overlaps'
    elif a.start == b.start and a.end < b.end:
        return 'starts'
    elif a.start > b.start and a.end < b.end:
        return 'during'
    elif a.start > b.start and a.end == b.end:
        return 'finishes'
    elif a.start == b.start and a.end == b.end:
        return 'equals'
    # ... inverses
```

### 3.4 Recurrence Reasoning

Understanding patterns in time:

```python
def detect_recurrence(events):
    """
    Analyze a list of events for temporal patterns.
    Returns detected recurrence pattern or None.
    """
    if len(events) < 3:
        return None
    
    timestamps = [e.timestamp for e in events]
    intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
    
    # Check for regularity
    mean_interval = statistics.mean(intervals)
    stdev = statistics.stdev(intervals)
    coefficient_of_variation = stdev / mean_interval
    
    if coefficient_of_variation < 0.1:  # Low variance = regular pattern
        if mean_interval == timedelta(days=1):
            return "daily"
        elif mean_interval == timedelta(weeks=1):
            return "weekly"
        elif 28 <= mean_interval.days <= 31:
            return "monthly"
    
    # Check for day-of-week patterns
    days_of_week = [t.weekday() for t in timestamps]
    if len(set(days_of_week)) == 1:
        day_name = calendar.day_name[days_of_week[0]]
        return f"every {day_name}"
    
    return None
```

---

## 4. Time Decay and Relevance

### 4.1 The Decay Function

Not all memories age equally. Three factors:

```python
def relevance_score(memory, query_time):
    """
    Calculate memory relevance incorporating temporal decay.
    
    Based on Generative Agents paper:
    relevance = recency × importance × similarity
    """
    
    # 1. Recency decay (exponential)
    age_hours = (query_time - memory.timestamp).total_seconds() / 3600
    recency = math.exp(-age_hours * decay_rate)  # decay_rate tunable
    
    # 2. Importance (stored with memory)
    importance = memory.importance  # 0-1 scale
    
    # 3. Semantic similarity to query
    similarity = cosine_similarity(memory.embedding, query.embedding)
    
    # Combined score
    return recency * importance * similarity
```

### 4.2 Decay Curves

Different decay curves for different memory types:

| Memory Type | Decay Curve | Rationale |
|-------------|-------------|-----------|
| Facts | Flat (no decay) | "User's birthday is March 15" — always relevant |
| Preferences | Slow decay | "User prefers dark mode" — stable but can change |
| Events | Medium decay | "Had a meeting yesterday" — less relevant over time |
| Conversations | Fast decay | "Discussed X" — context fades quickly |
| Emotions | Context-dependent | "User was frustrated" — matters in moment, less later |

**Configurable decay:**
```python
DECAY_RATES = {
    'fact': 0.0,           # No decay
    'preference': 0.001,   # Very slow
    'event': 0.01,         # Medium
    'conversation': 0.05,  # Fast
    'emotion': 0.1,        # Very fast
}
```

### 4.3 Anniversary Effects

Some old memories become relevant again:

```python
def anniversary_boost(memory, query_time):
    """
    Boost relevance for anniversary-related memories.
    """
    memory_date = memory.timestamp.date()
    query_date = query_time.date()
    
    # Same day of year?
    if (memory_date.month == query_date.month and 
        memory_date.day == query_date.day):
        years_ago = query_date.year - memory_date.year
        if years_ago >= 1:
            return 0.3  # Boost factor for anniversary
    
    # Same week of year?
    if memory_date.isocalendar()[1] == query_date.isocalendar()[1]:
        return 0.1  # Smaller boost for "this week last year"
    
    return 0.0
```

**Use cases:**
- "What were we working on this time last year?"
- "It's the anniversary of the product launch"
- Proactive reminders: "One year ago today..."

### 4.4 Importance vs Recency Tradeoffs

The fundamental tension:

```
Recent but unimportant: "User said 'thanks'" (yesterday)
Old but important: "User's company went public" (6 months ago)
```

**Resolution strategy:**
```python
def adjusted_relevance(memory, query_time, query_context):
    base_score = relevance_score(memory, query_time)
    
    # Query context adjustments
    if query_context.temporal_bias == 'recent':
        recency_weight = 0.6
    elif query_context.temporal_bias == 'historical':
        recency_weight = 0.2
    else:
        recency_weight = 0.4  # Balanced
    
    importance_weight = 1 - recency_weight
    
    return (memory.recency_score * recency_weight + 
            memory.importance * importance_weight)
```

---

## 5. Future vs Past

### 5.1 Temporal States

Memories have different temporal states:

```yaml
temporal_state:
  past:
    - fact          # "User graduated from MIT" — happened, verified
    - event         # "Had meeting on Tuesday" — happened
    - observation   # "User seemed tired" — subjective past
    
  present:
    - ongoing       # "User is working on project X" — continuous
    - current       # "User is frustrated" — immediate state
    
  future:
    - commitment    # "User will send the doc tomorrow" — promised
    - intention     # "User wants to learn Spanish" — expressed desire
    - prediction    # "User will probably need help with X" — AI inference
    - scheduled     # "Meeting on Friday at 3pm" — calendared
```

### 5.2 Commitment Tracking

Future commitments require special handling:

```yaml
commitment:
  id: c_001
  type: commitment  # vs prediction vs intention
  content: "User will send the requirements doc"
  made_at: "2025-07-10T14:00:00Z"
  due_at: "2025-07-15T09:00:00Z"
  
  status: pending  # pending | fulfilled | overdue | cancelled
  
  # Follow-up tracking
  follow_up_enabled: true
  follow_up_intervals: [1d, 3d, 7d]  # Remind if unfulfilled
  
  # Resolution
  resolved_at: null
  resolution_memory: null  # Link to memory when fulfilled
```

### 5.3 Follow-Up System

Proactive follow-up on future items:

```python
def check_commitments(user_id, check_time):
    """Check for commitments that need follow-up."""
    
    commitments = get_pending_commitments(user_id)
    
    follow_ups = []
    for c in commitments:
        if c.due_at < check_time and c.status == 'pending':
            c.status = 'overdue'
            follow_ups.append({
                'type': 'overdue_commitment',
                'commitment': c,
                'message': f"Following up: {c.content} was due {humanize(c.due_at)}"
            })
        
        elif c.due_at < check_time + timedelta(days=1):
            follow_ups.append({
                'type': 'upcoming_commitment',
                'commitment': c,
                'message': f"Reminder: {c.content} is due {humanize(c.due_at)}"
            })
    
    return follow_ups
```

### 5.4 Truth Values Over Time

Different temporal states have different truth values:

| State | Truth Value | Handling |
|-------|-------------|----------|
| Past fact | True/False | Stored as is |
| Past observation | Subjective | Store with confidence |
| Present state | Current truth | May change |
| Future commitment | Expected | Track fulfillment |
| Future prediction | Probabilistic | Store with confidence, verify later |

**Verification loop for predictions:**
```python
def verify_predictions(user_id, check_time):
    """Check if past predictions came true."""
    predictions = get_past_predictions(user_id, before=check_time)
    
    for p in predictions:
        if p.verification_needed_at < check_time:
            # Time to check if this prediction was accurate
            actual_outcome = check_outcome(p)
            
            if actual_outcome is not None:
                p.status = 'verified' if actual_outcome else 'falsified'
                p.verified_at = check_time
                
                # Update confidence in future predictions
                update_prediction_confidence(user_id, p.status)
```

---

## 6. Cultural and Contextual Time

### 6.1 Calendar Systems

Different users, different calendars:

```yaml
calendar_context:
  primary: gregorian
  additional:
    - fiscal_year:
        start_month: 10  # October fiscal year
    - academic_year:
        start_month: 8   # August
    - religious:
        system: hebrew   # For Jewish holidays
```

**Named periods by calendar:**
```python
FISCAL_PERIODS = {
    'Q1': ('10-01', '12-31'),  # Oct-Dec
    'Q2': ('01-01', '03-31'),  # Jan-Mar
    'Q3': ('04-01', '06-30'),  # Apr-Jun
    'Q4': ('07-01', '09-30'),  # Jul-Sep
}

def resolve_period(period_name, calendar_context):
    """Resolve a named period to actual dates."""
    if period_name.startswith('Q') and calendar_context.fiscal_year:
        return FISCAL_PERIODS[period_name]
    # ... other calendars
```

### 6.2 Cultural Time Concepts

Time means different things in different contexts:

**Business vs Personal:**
```yaml
time_context:
  business:
    - "business day" = Mon-Fri
    - "business hours" = 9am-5pm
    - "EOD" = 5pm or midnight
    - "EOM" = last business day
    
  personal:
    - "weekend" = Sat-Sun
    - "morning" = flexible
    - "evening" = flexible
```

**Regional interpretations:**
```yaml
# "The meeting is at 9am" 
regional_time:
  german: show up at 8:55  # Punctual
  brazilian: show up at 9:15  # Flexible
  japanese: show up at 8:50  # Extra punctual
```

### 6.3 Event-Based Time

Some cultures/contexts use event-based more than clock-based time:

```yaml
event_time:
  - "after Ramadan"
  - "before the harvest"
  - "during the holidays" (Christmas season? Diwali? Depends)
  - "next sprint"
  - "post-IPO"
```

**Resolution requires:**
1. Cultural context of user
2. Industry context
3. Recent conversation context

---

## 7. Implementation Approaches

### 7.1 Database Schema

```sql
-- Core memory table with temporal fields
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    
    -- Absolute temporal
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_at TIMESTAMPTZ,  -- When the event occurred (may differ from created_at)
    timezone TEXT,
    precision TEXT CHECK (precision IN ('year', 'month', 'day', 'hour', 'minute', 'second', 'vague')),
    
    -- Interval support
    is_interval BOOLEAN DEFAULT FALSE,
    interval_end TIMESTAMPTZ,
    interval_status TEXT CHECK (interval_status IN ('completed', 'ongoing', 'planned')),
    
    -- Temporal state
    temporal_state TEXT CHECK (temporal_state IN ('fact', 'event', 'ongoing', 'commitment', 'intention', 'prediction', 'scheduled')),
    
    -- For future items
    due_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    
    -- Contextual temporal
    original_reference TEXT,  -- "last Friday" as said
    anchor_event_id UUID REFERENCES memories(id),  -- "after the meeting"
    
    -- Metadata
    importance FLOAT DEFAULT 0.5,
    decay_rate FLOAT DEFAULT 0.01
);

-- Recurrence patterns
CREATE TABLE recurrence_patterns (
    id UUID PRIMARY KEY,
    memory_id UUID REFERENCES memories(id),
    rrule TEXT NOT NULL,  -- iCalendar RRULE
    natural_description TEXT,
    start_date DATE NOT NULL,
    end_date DATE
);

-- Causal relationships
CREATE TABLE memory_relations (
    id UUID PRIMARY KEY,
    from_memory_id UUID REFERENCES memories(id),
    to_memory_id UUID REFERENCES memories(id),
    relation_type TEXT CHECK (relation_type IN ('caused', 'followed_by', 'part_of', 'contradicts')),
    confidence FLOAT DEFAULT 1.0
);

-- Temporal indices
CREATE INDEX idx_memories_event_at ON memories(event_at);
CREATE INDEX idx_memories_user_temporal ON memories(user_id, event_at);
CREATE INDEX idx_memories_temporal_state ON memories(temporal_state);
CREATE INDEX idx_memories_due_at ON memories(due_at) WHERE due_at IS NOT NULL;
```

### 7.2 Query Interface

```python
class TemporalMemoryQuery:
    """Fluent interface for temporal memory queries."""
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.filters = []
    
    def between(self, start, end):
        """Absolute date range."""
        self.filters.append(('between', start, end))
        return self
    
    def relative(self, reference):
        """Relative time reference (resolved at query time)."""
        # "last week", "yesterday", "3 months ago"
        resolved = resolve_relative(reference)
        return self.between(*resolved)
    
    def during_event(self, event_query):
        """Memories during an event/project."""
        event = find_event(event_query)
        return self.between(event.start, event.end)
    
    def around(self, anchor, buffer='1 week'):
        """Fuzzy temporal match."""
        buffer_delta = parse_duration(buffer)
        return self.between(anchor - buffer_delta, anchor + buffer_delta)
    
    def state(self, temporal_state):
        """Filter by temporal state."""
        self.filters.append(('state', temporal_state))
        return self
    
    def with_recurrence(self, pattern=None):
        """Include recurring items."""
        self.filters.append(('recurrence', pattern))
        return self
    
    def execute(self, include_relevance=True):
        """Execute query and return results."""
        results = self._build_and_run_query()
        if include_relevance:
            results = self._score_results(results)
        return results
```

### 7.3 Temporal Extraction Pipeline

When storing new memories, extract temporal information:

```python
def extract_temporal_info(content, context):
    """
    Extract temporal information from memory content.
    
    Uses SUTime or similar for parsing, with context enhancement.
    """
    # 1. Parse explicit temporal expressions
    temporal_expressions = parse_temporal(content)
    
    # 2. Infer from tense
    tense = detect_tense(content)  # past, present, future
    
    # 3. Detect temporal state
    if contains_commitment_language(content):
        state = 'commitment'
    elif contains_prediction_language(content):
        state = 'prediction'
    elif tense == 'future':
        state = 'intention'
    elif tense == 'past':
        state = 'event'
    else:
        state = 'ongoing'
    
    # 4. Resolve relative references using context
    resolved = []
    for expr in temporal_expressions:
        if expr.is_relative:
            resolved.append(resolve_relative(expr, context.current_time))
        else:
            resolved.append(expr)
    
    # 5. Detect recurrence patterns
    recurrence = detect_recurrence_in_text(content)
    
    return TemporalInfo(
        expressions=resolved,
        state=state,
        recurrence=recurrence,
        original_text=content
    )
```

### 7.4 Proactive Temporal Checks

Background process for temporal awareness:

```python
async def temporal_maintenance_loop():
    """Background loop for temporal-aware operations."""
    
    while True:
        now = datetime.utcnow()
        
        # 1. Check upcoming commitments
        upcoming = get_commitments_due_within(hours=24)
        for commitment in upcoming:
            if not commitment.reminder_sent:
                queue_reminder(commitment)
        
        # 2. Check overdue items
        overdue = get_overdue_commitments()
        for commitment in overdue:
            if should_escalate(commitment):
                queue_follow_up(commitment)
        
        # 3. Anniversary check
        anniversaries = get_anniversaries_today()
        for memory in anniversaries:
            if memory.importance > 0.7:
                queue_anniversary_note(memory)
        
        # 4. Verify old predictions
        predictions = get_predictions_needing_verification()
        for prediction in predictions:
            queue_prediction_check(prediction)
        
        # 5. Decay stale memories
        stale_memories = get_memories_for_decay_check()
        for memory in stale_memories:
            memory.relevance_score = calculate_current_relevance(memory)
            memory.save()
        
        await asyncio.sleep(3600)  # Run hourly
```

---

## 8. Key Insights and Recommendations

### 8.1 Design Principles

1. **Store both machine time and human time.** Timestamps for computation, original references for meaning.

2. **Precision is metadata.** Not all times are equally certain—track confidence.

3. **Time is relational, not just absolute.** "After the meeting" is often more meaningful than "at 3pm."

4. **Decay must be configurable per memory type.** Facts don't decay; conversations do.

5. **Future items need verification loops.** Track commitments through fulfillment.

6. **Anniversary effects are real.** Old memories can become relevant again at the right time.

7. **Context determines interpretation.** "Last Friday" requires knowing when "now" is.

### 8.2 Implementation Priority

**Phase 1: Foundation**
- Absolute timestamps on all memories
- Basic relative query resolution
- Temporal state classification (past/present/future)

**Phase 2: Relationships**
- Event anchoring ("during project X")
- Causal chains
- Interval/duration support

**Phase 3: Intelligence**
- Recurrence detection and prediction
- Commitment tracking and follow-up
- Anniversary awareness
- Adaptive decay curves

**Phase 4: Polish**
- Multi-calendar support
- Cultural time interpretation
- Proactive temporal suggestions

### 8.3 Challenges to Watch

1. **Ambiguity creep:** As we store more temporal context, disambiguation gets harder
2. **Storage cost:** Storing multiple temporal representations increases storage
3. **Query complexity:** Temporal queries can be expensive—need good indices
4. **Timezone edge cases:** Daylight saving transitions, timezone changes
5. **User expectations:** Users expect AI to "just know" when things happened

---

## 9. Research Connections

This research connects to other framework topics:

- **Memory capacity** (Iteration 5, Doc 02): Temporal decay directly affects capacity management
- **Memory consolidation** (Iteration 1, Doc 04): Time-based consolidation triggers
- **Semantic search** (Iteration 1, Doc 02): Temporal metadata as hybrid search filter
- **Multi-agent memory** (Core Doc 08): How do agents share temporal context?
- **Weekly reflection** (Core Doc 04): Temporal cadence for memory review

---

## 10. Appendix: Temporal NLP Patterns

### Common Temporal Expressions

| Expression | Type | Resolution |
|------------|------|------------|
| "yesterday" | Relative | query_date - 1 day |
| "last week" | Relative | Previous Mon-Sun |
| "next month" | Relative | Following calendar month |
| "in 3 days" | Relative | query_date + 3 days |
| "Q3 2025" | Named period | Jul 1 - Sep 30, 2025 |
| "the holidays" | Cultural | Dec 20 - Jan 2 (Western) |
| "after lunch" | Event-relative | ~12:00-13:00 |
| "EOD" | Business | 5pm or midnight |
| "ASAP" | Urgency | Immediately, context-dependent |
| "eventually" | Vague | Unknown future |
| "a while ago" | Vague | Past, precision unknown |

### Tense Markers for State Detection

| Markers | Tense | Temporal State |
|---------|-------|----------------|
| "did", "was", "had" | Past | event/fact |
| "is", "am", "are" | Present | ongoing |
| "will", "going to", "shall" | Future | intention/commitment |
| "might", "could", "may" | Uncertain | prediction |
| "always", "every", "never" | Recurring | recurrence |

---

*End of Temporal Reasoning Research Document*
