# Cross-Session Continuity: Handling "Where We Left Off"

*Research for ai-continuity-framework — Iteration 3*  
*Date: 2026-02-17*  
*Status: Complete*

---

## Executive Summary

Cross-session continuity is one of the most human-like capabilities an AI assistant can develop. When a user returns after hours, days, or weeks, the assistant's ability to seamlessly pick up where things left off—or gracefully acknowledge the gap—fundamentally changes the relationship from "tool I use" to "entity I work with."

This document explores the architecture, algorithms, and UX patterns needed to handle continuity across sessions.

### Key Findings

| Aspect | Finding | Confidence |
|--------|---------|------------|
| **Session boundary detection** | Hybrid: explicit + inferred (time + topic) | High |
| **Context restoration** | Progressive loading based on relevance | High |
| **Thread detection** | Intent clustering + entity tracking | Medium |
| **"Where were we?" handling** | Proactive summary, not forced recall | High |
| **Optimal gap handling** | Vary by gap duration + relationship depth | High |

---

## 1. The Problem Space

### What Makes This Hard

**Asymmetric memory:** Users remember everything (or nothing), AIs remember nothing (or everything). The mismatch creates awkwardness:
- User: "So, about that thing we discussed..." (expects AI to know)
- AI: "I don't have context from previous sessions." (betrays amnesia)
- Or worse: AI surfaces irrelevant old context (betrays surveillance)

**Varying return patterns:**
- Minutes later (interrupted conversation → seamless resume)
- Hours later (same day → topic may or may not be same)
- Days later (different context, but relationship continues)
- Weeks later (new topic likely, but history matters)

**Ambiguous intent:**
- "Continue what we were doing" (explicit continuation)
- "Hey" (could be new topic or continuation)
- Detailed question (probably new topic, but might reference past)

### What Users Actually Want

Based on natural human conversation patterns:

1. **Acknowledgment without awkwardness** — Don't pretend there was no gap, but don't make it weird
2. **Context when relevant** — Surface past info when it helps, not when it shows off
3. **Fresh start option** — Sometimes they want to ignore history
4. **Thread separation** — Multiple ongoing projects shouldn't bleed into each other

---

## 2. Existing Approaches Analysis

### Slack Threads

**Model:** Explicit threading with parent message + replies

**How it works:**
- User explicitly starts thread by replying to specific message
- Thread lives as sub-conversation within channel
- Thread can be viewed in-line or expanded
- Cross-linking possible ("@mention from other thread")

**Strengths:**
- Clear boundaries (user decides what's a thread)
- Multiple parallel threads possible
- History preserved but not intrusive

**Weaknesses:**
- Requires explicit user action
- Threads can get buried
- No automatic detection of "this should be a thread"

**Applicable insight:** Explicit thread creation works when users have clear mental models of their projects. Doesn't work for casual assistance.

### Email Threading

**Model:** Implicit threading via References/In-Reply-To headers + subject line

**How it works:**
- Reply inherits thread metadata from parent
- Subject line serves as thread identifier ("Re: Project X")
- Clients group by thread for display
- Breaking thread requires explicit new subject

**Strengths:**
- Mostly automatic (reply = same thread)
- Clear visual grouping
- Works across clients/providers

**Weaknesses:**
- Subject-line spoofing (unrelated messages in same thread)
- Long threads become unwieldy
- No semantic understanding (relies on headers)

**Applicable insight:** The "References" header pattern—tracking ancestry of messages—is useful for tracing conversation lineage.

### ChatGPT Conversation Management

**Model:** Separate conversations + persistent "Memory" feature

**How it works:**
- Each conversation is isolated (no automatic carryover)
- User can start new or continue existing conversation
- "Memory" feature extracts facts that persist across conversations
- User can view/edit/delete memories

**Strengths:**
- Clear separation (each conversation = clean slate + memories)
- User control over what persists
- Explicit continuation (selecting past conversation)

**Weaknesses:**
- Conversations don't auto-connect even when related
- Memory is coarse (facts, not context)
- No thread detection within conversations
- Returning to old conversation = loading full history (expensive)

**Applicable insight:** The separation between "conversation" (context-heavy, temporary) and "memory" (extracted facts, permanent) is a useful architectural distinction.

### Notion Databases

**Model:** Structured entries with links and relations

**How it works:**
- Each entry is a "page" with properties
- Relations link pages together
- Views filter/group by properties
- AI features can summarize across pages

**Strengths:**
- User-defined structure
- Explicit relationships
- Multiple views of same data
- Good for project organization

**Weaknesses:**
- Requires upfront organization
- Not conversational
- AI features are add-on, not native

**Applicable insight:** The "linked database" model—where threads/sessions can relate to projects/topics—provides organizational power without forcing linear history.

### MemGPT/Letta Approach

**Model:** LLM manages its own memory, paging context in/out

**How it works:**
- "Core memory" (always in context): persona, user info
- "Archival memory" (searchable): long-term storage
- "Recall memory" (searchable): conversation history
- LLM explicitly calls memory functions to retrieve/store

**Strengths:**
- Agent-driven (AI decides what's relevant)
- Handles infinite context via paging
- Memory is editable by AI

**Weaknesses:**
- Complex architecture
- Each memory operation = API call (cost/latency)
- AI might forget to retrieve relevant info

**Applicable insight:** The tiered memory architecture (core/archival/recall) directly addresses cross-session needs.

### Zep Approach

**Model:** Automatic summarization + entity extraction + semantic search

**How it works:**
- Sessions contain messages
- Messages automatically summarized when threshold reached
- Entities/facts extracted and linked
- Retrieval combines recent messages + summary + relevant facts

**Strengths:**
- Automatic (no user/agent action required)
- Handles long conversations gracefully
- Entity linking enables "what do we know about X?"

**Weaknesses:**
- Sessions are isolated (no cross-session synthesis)
- Summarization loses nuance
- No thread detection within session

**Applicable insight:** The hybrid retrieval (recent + summary + semantic) is the right pattern for context restoration.

---

## 3. Session Boundary Detection

### When Does a "Session" End?

A session isn't just "chat window closed." It's a psychological boundary in the conversation.

**Detection signals:**

| Signal | Weight | Notes |
|--------|--------|-------|
| Time gap > 4 hours | High | Same-day cutoff for most users |
| Time gap > 24 hours | Very High | Different day = different context |
| Explicit sign-off | Very High | "Thanks, that's all" / "Goodbye" |
| Topic shift (semantic) | Medium | Embedding distance from recent topics |
| Channel switch | Medium | Moving from Telegram to Discord |
| Greeting pattern | High | "Hey" / "Hi there" after messages = new session |

### Implementation: Session Boundary Algorithm

```
function detectSessionBoundary(lastMessage, currentMessage):
    timeDelta = currentMessage.timestamp - lastMessage.timestamp
    
    # Hard boundaries
    if timeDelta > 24h: return NEW_SESSION
    if lastMessage.hasExplicitSignoff(): return NEW_SESSION
    if currentMessage.hasGreeting() and timeDelta > 1h: return NEW_SESSION
    
    # Soft boundaries (require multiple signals)
    signals = 0
    
    if timeDelta > 4h: signals += 2
    if timeDelta > 1h: signals += 1
    if semanticDistance(lastMessage, currentMessage) > 0.7: signals += 1
    if currentMessage.channel != lastMessage.channel: signals += 1
    if currentMessage.hasGreeting(): signals += 1
    
    if signals >= 3: return NEW_SESSION
    if signals >= 2: return SOFT_BOUNDARY  # Same session, but note the gap
    return CONTINUATION
```

### Handling "Soft Boundaries"

When a soft boundary is detected (likely continuation, but with gap):

```
"Welcome back! We were looking at the database schema for the user 
authentication module. Want to pick up where we left off, or start 
something new?"
```

This acknowledges the gap, summarizes context, and offers a choice.

---

## 4. Conversation Threading

### Thread vs. Session

- **Session:** Time-bounded interaction window
- **Thread:** Topic-bounded conversation arc (may span multiple sessions)

A user might have:
- **Thread A:** "Help with React app" (spans 3 sessions over a week)
- **Thread B:** "Trip planning to Japan" (spans 2 sessions)
- **Thread C:** One-off questions (no threading needed)

### Thread Detection Approaches

**1. Explicit Threading**
- User says "Back to the React project..."
- User selects from thread list
- User tags conversation with project name

**2. Entity-Based Threading**
- Extract key entities: projects, people, codebases
- Messages mentioning same entities = candidate for same thread
- "The Sharp App" → link to Sharp App thread

**3. Intent Clustering**
- Embed each session's summary
- Cluster by semantic similarity
- Sessions in same cluster = likely same thread

**4. Hybrid Detection**

```
function detectThread(message, recentSessions):
    # Check explicit references
    explicitProject = extractProjectReference(message)
    if explicitProject:
        return findThreadByProject(explicitProject)
    
    # Check entity overlap
    entities = extractEntities(message)
    for session in recentSessions:
        overlap = entityOverlap(entities, session.entities)
        if overlap > 0.6:
            return session.thread
    
    # Check semantic similarity
    embedding = embed(message)
    for thread in activeThreads:
        similarity = cosineSimilarity(embedding, thread.embedding)
        if similarity > 0.75:
            return thread
    
    # No match → new thread or unthreaded
    return NEW_OR_UNTHREADED
```

### Thread Data Model

```yaml
Thread:
  id: uuid
  title: "React App Authentication"  # Auto-generated or user-provided
  created_at: timestamp
  updated_at: timestamp
  status: active | paused | completed
  
  # Linkage
  sessions: [session_ids]
  entities: [entity_ids]
  
  # Context
  summary: "Working on user auth for React app..."
  key_decisions: ["Using JWT tokens", "Refresh token rotation"]
  open_questions: ["Which OAuth provider?"]
  
  # Embeddings
  embedding: vector  # For similarity matching
```

---

## 5. Context Loading Strategies

### The Loading Problem

When a user returns, how much context should be loaded?

**Too little:** AI doesn't remember relevant information  
**Too much:** Expensive, slow, potentially overwhelming

### Progressive Context Loading

**Layer 1: Always Loaded (Core Context)**
- User profile (SOUL.md + USER.md equivalent)
- Recent memories (last few days of MEMORY.md equivalent)
- Active thread summaries

**Layer 2: Session-Triggered (Recent Context)**
- Last N messages from this thread (if continuing)
- Summary of recent thread activity
- Relevant extracted facts

**Layer 3: Query-Triggered (Semantic Retrieval)**
- Semantic search against conversation history
- Entity-linked context ("What do we know about X?")
- Only loaded when message suggests need

**Layer 4: User-Triggered (Explicit Recall)**
- "Remind me what we decided about..."
- "Show me our conversation from last week"
- Full session/thread history on demand

### Context Loading Algorithm

```
function loadContextForMessage(message, user):
    context = []
    
    # Layer 1: Always
    context.append(loadUserProfile(user))
    context.append(loadRecentMemories(user, days=7))
    context.append(loadActiveThreadSummaries(user))
    
    # Layer 2: Thread detection
    thread = detectThread(message, user.recentSessions)
    if thread:
        context.append(loadThreadContext(thread, limit=10))
        context.append(thread.summary)
    
    # Layer 3: Semantic retrieval
    relevant = semanticSearch(message, user.history, limit=5)
    context.append(filterByRelevance(relevant, threshold=0.7))
    
    # Layer 4: Only if explicit recall detected
    if detectRecallIntent(message):
        context.append(loadExplicitRecall(message, user))
    
    return deduplicate(context)
```

### Relevance Scoring

For semantic retrieval, score by:

```
relevance_score = (
    0.4 * semantic_similarity +
    0.3 * recency_decay(age) +
    0.2 * entity_overlap +
    0.1 * thread_match
)
```

Where `recency_decay`:
```
recency_decay(age_days) = max(0, 1 - (age_days / 90))
```

---

## 6. "Where Were We?" Handling

### Scenarios

**Scenario 1: User returns within same day**
```
[4 hours ago: discussing database schema]
User: "Hey, can we continue?"
AI: "Sure! We were designing the schema for user sessions. You'd 
     decided on PostgreSQL with a sessions table. The open question 
     was whether to use JWT or opaque tokens. Want to pick that up?"
```

**Scenario 2: User returns after several days**
```
[5 days ago: trip planning]
User: "What were we working on for Japan?"
AI: "We were planning your Tokyo trip! You'd booked flights (March 
     15-22), picked the Park Hyatt for hotels, and were deciding 
     between day trips to Kyoto vs. Hakone. The Kyoto option was 
     leading because of the temples you wanted to see."
```

**Scenario 3: User returns with no explicit continuation**
```
[1 day ago: debugging React code]
User: "I need help with Python"
AI: [Starts fresh with Python help, doesn't mention React]
```

### The Proactive Summary Pattern

When a continuation is likely (soft boundary detected):

```
function generateContinuationSummary(thread):
    return {
        topic: thread.title,
        lastActivity: humanizeTime(thread.updated_at),
        state: summarizeCurrentState(thread),
        openQuestions: thread.open_questions[0..2],
        suggestedNextStep: inferNextStep(thread)
    }
```

**Rendered:**
```
"Welcome back! Last time we were [topic], [state summary]. 
You had asked about [open question]. Want to continue there?"
```

### Don't Force Recall

**Anti-pattern:**
```
User: "Hey"
AI: "Hello! Last time we talked about your React authentication 
     system, your trip to Japan, your car troubles, and that book 
     you were reading..."
```

**Better pattern:**
```
User: "Hey"
AI: "Hey! What can I help with?"
[Only surface past context when relevant to current message]
```

---

## 7. UX Patterns for Continuity

### Pattern 1: Session Bookmarks

Allow users to explicitly mark "save this point":
- "Bookmark this conversation"
- "Remember where we are"
- "Save as project X"

**Implementation:**
- Creates named snapshot of thread state
- Can be resumed by name: "Let's continue project X"
- Shows in thread list with explicit names

### Pattern 2: Thread Dashboard

Visual display of active/recent threads:
```
📋 Active Threads
├── 🔵 React Auth System (last: 2 hours ago)
│   ↳ Deciding on OAuth provider
├── 🟡 Japan Trip Planning (last: 5 days ago)  
│   ↳ Day trip decision pending
└── ⚪ General assistance
    ↳ No ongoing thread

"Continue a thread, or start something new?"
```

### Pattern 3: Continuity Commands

Natural language thread management:
- "What were we working on?" → List active threads
- "Continue the React project" → Load thread context
- "Start fresh" / "New topic" → Explicitly break thread
- "This is related to Japan trip" → Link to existing thread

### Pattern 4: Gap Acknowledgment

Depending on gap duration:

| Gap | Acknowledgment |
|-----|----------------|
| < 1h | None (seamless continuation) |
| 1-4h | Subtle: "Back to it?" |
| 4-24h | Light: "Picking up where we left off?" |
| 1-7d | Explicit: "Last time we were..." |
| > 7d | Summary: "It's been a while! Here's where we left things..." |

### Pattern 5: Confidence Indicators

When retrieving past context with uncertainty:

```
"I believe we discussed using JWT tokens for auth, though that was 
a few weeks ago. Is that still the direction you're going?"
```

Shows:
- What AI remembers
- Confidence/recency qualifier
- Opens door for correction

---

## 8. Architecture Design

### Session Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Incoming Message                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SESSION BOUNDARY DETECTOR                        │
│  • Time gap analysis                                             │
│  • Greeting pattern detection                                    │
│  • Signoff detection                                             │
│  → Output: NEW_SESSION | SOFT_BOUNDARY | CONTINUATION            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    THREAD DETECTOR                               │
│  • Entity extraction                                             │
│  • Explicit reference matching                                   │
│  • Semantic similarity clustering                                │
│  → Output: thread_id | NEW_THREAD | UNTHREADED                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT LOADER                                │
│  Layer 1: Core context (always)                                  │
│  Layer 2: Thread context (if threaded)                           │
│  Layer 3: Semantic retrieval (query-triggered)                   │
│  Layer 4: Explicit recall (user-triggered)                       │
│  → Output: assembled_context[]                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CONTINUITY HANDLER                              │
│  • Gap acknowledgment generation                                 │
│  • Continuation summary generation                               │
│  • Context injection into prompt                                 │
│  → Output: enriched_prompt                                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LLM                                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  POST-RESPONSE PROCESSOR                         │
│  • Update thread state                                           │
│  • Extract new entities                                          │
│  • Update thread summary                                         │
│  • Store message in history                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

```sql
-- Sessions (time-bounded interaction windows)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    thread_id UUID,  -- nullable, not all sessions are threaded
    channel TEXT,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    boundary_type TEXT,  -- 'explicit' | 'timeout' | 'topic_shift'
    summary TEXT,
    embedding VECTOR(1536)
);

-- Threads (topic-bounded conversation arcs)
CREATE TABLE threads (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT,
    status TEXT,  -- 'active' | 'paused' | 'completed'
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    summary TEXT,
    key_decisions JSONB,
    open_questions JSONB,
    embedding VECTOR(1536)
);

-- Thread-Entity linkage
CREATE TABLE thread_entities (
    thread_id UUID REFERENCES threads(id),
    entity_id UUID,
    entity_type TEXT,
    entity_name TEXT,
    relevance_score FLOAT,
    first_mentioned TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    role TEXT,  -- 'user' | 'assistant'
    content TEXT,
    timestamp TIMESTAMP,
    embedding VECTOR(1536),
    entities JSONB
);

-- Session transitions (for learning patterns)
CREATE TABLE session_transitions (
    from_session UUID,
    to_session UUID,
    gap_duration INTERVAL,
    same_thread BOOLEAN,
    transition_type TEXT  -- 'continuation' | 'new_topic' | 'explicit_return'
);
```

---

## 9. Integration with AI Continuity Framework

### Current Framework Alignment

The ai-continuity-framework already has relevant components:

| Framework Component | Cross-Session Role |
|--------------------|--------------------|
| MEMORY.md | Long-term thread-agnostic facts |
| memory/YYYY-MM-DD.md | Daily session logs (raw material for threads) |
| JOURNAL.md | AI's evolving understanding (identity continuity) |
| USER.md | User profile (always-loaded context) |
| SOUL.md | AI identity (always-loaded context) |

### Proposed Extensions

**1. Add Thread Tracking**

New file: `threads/active.yaml` or database table
```yaml
threads:
  - id: "react-auth"
    title: "React Authentication System"
    status: active
    updated: 2026-02-17
    summary: "Implementing user auth with JWT..."
    related_memory_files:
      - memory/2026-02-15.md
      - memory/2026-02-16.md
```

**2. Enhance Daily Memory Format**

Current:
```markdown
## 2026-02-17
- Helped with React component
- Discussed database schema
```

Enhanced:
```markdown
## 2026-02-17

### Thread: react-auth
- Continued JWT implementation discussion
- User decided on refresh token rotation
- Open: Which OAuth provider?

### Unthreaded
- Quick question about Python syntax
- Weather check
```

**3. Session Metadata Capture**

Store session boundary signals:
```yaml
sessions:
  - id: "abc123"
    thread: "react-auth"
    started: 2026-02-17T10:00:00
    ended: 2026-02-17T12:30:00
    boundary_type: "explicit_signoff"
    messages: 47
```

### Retriever Agent Enhancement

The Retriever agent should gain thread awareness:

```
function retrieveForMessage(message, user):
    # Existing: semantic search over memories
    relevant = semanticSearch(message, user.memories)
    
    # New: thread context loading
    thread = detectThread(message, user)
    if thread:
        relevant += loadThreadContext(thread)
        relevant += thread.summary
    
    # New: recent session context (if soft boundary)
    if recentSession and boundaryType != NEW_SESSION:
        relevant += recentSession.summary
    
    return deduplicate(relevant)
```

---

## 10. Implementation Recommendations

### Phase 1: Basic Session Awareness

1. **Implement session boundary detection** — Time-based + greeting detection
2. **Store session metadata** — Start/end times, message counts
3. **Add gap acknowledgment** — "Welcome back! We were..." pattern

### Phase 2: Thread Detection

1. **Entity extraction pipeline** — Identify projects, people, topics
2. **Thread clustering** — Group related sessions
3. **Thread summary generation** — Automatic summarization of thread state

### Phase 3: Intelligent Loading

1. **Progressive context loading** — Layer-based retrieval
2. **Relevance scoring** — Semantic + recency + entity overlap
3. **Thread continuation prompts** — "Continue React project?"

### Phase 4: User Controls

1. **Thread dashboard** — View/manage active threads
2. **Bookmark system** — Explicit save points
3. **Natural language thread commands** — "Start fresh" / "Continue X"

---

## 11. Open Questions for Future Research

1. **Multi-user threads** — When multiple users collaborate on a thread, how does continuity work?

2. **Thread lifecycle** — When should a thread be auto-archived? How to detect "completed"?

3. **Cross-platform threads** — Thread started in Telegram, continued in Discord?

4. **Thread forking** — When a thread naturally splits into sub-topics?

5. **Memory vs. thread tension** — Should thread-specific context extract to general memory? When?

---

## Summary

Cross-session continuity requires:

1. **Session boundary detection** — Hybrid signals (time + greeting + topic shift)
2. **Thread detection** — Entity + semantic + explicit reference matching
3. **Progressive context loading** — Right context at right time
4. **Gap handling** — Acknowledge gaps gracefully, vary by duration
5. **User control** — Bookmarks, thread management, explicit commands

The key insight: **Continuity should feel natural, not forced.** Users want the AI to remember what's relevant without performing its memory capabilities. Proactive summaries help; forced recall hinders.

---

*Cross-session continuity research complete. Ready for framework integration.*

— Jordan 🧭
