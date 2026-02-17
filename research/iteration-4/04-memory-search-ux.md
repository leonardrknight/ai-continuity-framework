# Memory Search UX — Natural Language Memory Queries

Research findings on letting users search their AI's memory using natural language.

---

## The Core Problem

When an AI has persistent memory, users need ways to:
1. **Retrieve** specific memories ("When did I mention X?")
2. **Audit** what the AI knows ("What do you know about Y?")
3. **Navigate** their shared history ("Find our conversation about Z")
4. **Review** patterns ("What decisions have we made about project A?")

Unlike traditional search (documents, emails), memory search must feel conversational. Users aren't constructing queries—they're asking questions.

---

## Query Types & Intent Classification

### The Five Query Archetypes

| Query Type | Example | Intent | Expected Output |
|------------|---------|--------|-----------------|
| **Temporal** | "When did I mention X?" | Locate in time | Date/timeframe + context |
| **Knowledge** | "What do you know about Y?" | Knowledge audit | Summarized facts |
| **Retrieval** | "Find our conversation about Z" | Locate content | Conversation snippets |
| **Analytical** | "What decisions have we made about A?" | Pattern synthesis | Aggregated insights |
| **Relational** | "What have I told you about my family?" | Relationship map | Entity-grouped memories |

### Intent Classification Architecture

```
User Query → Intent Classifier → Route to Handler

Classifiers:
├── Temporal markers: when, what time, how long ago, last
├── Knowledge markers: what do you know, tell me, summarize
├── Retrieval markers: find, search, show me, where
├── Analytical markers: decisions, patterns, always, usually
└── Relational markers: about [entity], related to, connected
```

**Implementation:** Fine-tuned classifier or few-shot LLM prompt:

```
Classify this memory query:
- TEMPORAL: User wants to know when something happened
- KNOWLEDGE: User wants a summary of what you know
- RETRIEVAL: User wants to find specific content
- ANALYTICAL: User wants patterns/decisions synthesized
- RELATIONAL: User wants information about an entity

Query: "When did I first mention the kitchen renovation?"
Classification: TEMPORAL
```

---

## Entity & Temporal Extraction

### Entity Extraction

Memory queries reference entities the AI should already know:

| Entity Type | Examples | Extraction Method |
|-------------|----------|-------------------|
| **People** | "my sister", "John from work" | Named entity + relationship resolution |
| **Projects** | "the mobile app", "Project Alpha" | Topic/tag matching |
| **Places** | "the cabin", "that restaurant" | Location entities + nicknames |
| **Events** | "the conference", "last vacation" | Event memory type + temporal anchors |
| **Concepts** | "my diet", "that book idea" | Semantic topic clustering |

**Resolution challenge:** "My sister" requires knowing the user has mentioned a sister, and resolving to stored entity "Sarah (sister)."

**Architecture:**
```
Query: "What did I say about Sarah's wedding?"

Entity extraction:
├── Person: Sarah → resolve: user.relationships.sister
└── Event: wedding → resolve: memory.events where person=Sarah, type=wedding

Search: memories WHERE entities CONTAINS [sarah_id, wedding_event_id]
```

### Temporal Parsing

Natural time references are notoriously ambiguous:

| Expression | Parsing Challenge | Resolution Strategy |
|------------|-------------------|---------------------|
| "last month" | Calendar vs rolling 30 days | Use calendar boundaries (user expectation) |
| "around my birthday" | Requires user profile | ±2 weeks of stored birthday date |
| "when we started" | Requires relationship anchor | First interaction timestamp |
| "recently" | Subjective | Last 7-14 days, tune per user |
| "a while ago" | Very subjective | 1-6 months; surface clarification |
| "that time" | Conversational reference | Check recent context for time anchor |

**Implementation with libraries:**
- `chrono` (Python) for structured parsing
- `dateparser` for informal expressions
- LLM extraction for complex relative references

**Example temporal resolution:**
```
Query: "What did I mention about the budget around Thanksgiving?"

Temporal parsing:
├── Event anchor: Thanksgiving → November 28, 2024 (this year)
├── Window: "around" → ±2 weeks
└── Range: November 14 - December 12, 2024

Search: memories WHERE topic=budget AND timestamp BETWEEN range
```

### Ambiguity Handling

When extraction is uncertain, the system should:
1. **Make reasonable assumption** and surface confidence
2. **Ask for clarification** only when truly ambiguous
3. **Show alternatives** if multiple interpretations exist

**Bad UX:** "Did you mean your sister Sarah or your colleague Sarah?"
**Better UX:** "Here's what you've said about Sarah (your sister). Did you mean someone else?"

---

## Search Capabilities

### 1. Semantic Search (Meaning-Based)

**Use case:** Conceptually similar content, paraphrased memories, related ideas.

```
Query: "What have I said about being overwhelmed?"
Search: Embed query → Find memories about stress, burnout, workload, anxiety
```

**Strengths:** Handles synonyms, paraphrasing, conceptual similarity
**Weaknesses:** May miss exact phrases; requires good embeddings

### 2. Keyword Search (Exact Matches)

**Use case:** Specific names, terms, codes, quotes.

```
Query: "Find where I mentioned 'Project Falcon'"
Search: BM25/exact match for "Project Falcon"
```

**Strengths:** Precise, fast, handles proper nouns
**Weaknesses:** Misses paraphrases ("the falcon project")

### 3. Temporal Search (Time Ranges)

**Use case:** Memories from specific periods.

```
Query: "What did we discuss last week?"
Search: Filter timestamp BETWEEN start_of_week AND end_of_week
```

**Strengths:** Precise filtering, fast
**Weaknesses:** Requires accurate timestamps; time boundaries can be ambiguous

### 4. Relationship Search (Connected to Entity)

**Use case:** Everything related to a person, project, or concept.

```
Query: "What do I know about my health goals?"
Search: Find memories WHERE entities CONTAINS 'health_goals' 
        OR topic IN ['fitness', 'diet', 'exercise', 'weight']
```

**Architecture:** Entity graph with explicit relationships:
```
User → mentions → Sarah (sister)
Sarah → has_event → Wedding
Wedding → discussed_on → [2024-02-15, 2024-03-01]
Wedding → topics → [venue, guest_list, date]
```

### 5. Category Search (All of Type X)

**Use case:** Browse all preferences, all decisions, all to-dos.

```
Query: "Show me all the preferences you've learned"
Search: memories WHERE type='preference' ORDER BY recency
```

**Memory categories:**
- **Preferences:** Likes, dislikes, habits
- **Decisions:** Commitments made
- **Facts:** Biographical information
- **Opinions:** User's viewpoints
- **Tasks:** To-dos, reminders
- **Events:** Things that happened
- **Relationships:** People connections

### Hybrid Search Architecture

Combine methods for robust retrieval:

```
Query: "What did I decide about the kitchen renovation last month?"

Execution plan:
1. Temporal filter: last month (Nov 1-30, 2024)
2. Category filter: type='decision'
3. Semantic search: kitchen renovation concept
4. Entity match: kitchen_renovation_project

Fusion:
├── RRF across keyword + semantic results
├── Filter by temporal + category
└── Rank by relevance × recency
```

---

## Result Presentation

### Presentation Modes by Query Type

| Query Type | Primary View | Supporting Info |
|------------|--------------|-----------------|
| **Temporal** | Timeline/date | Conversation snippet |
| **Knowledge** | Summarized answer | Source citations |
| **Retrieval** | Conversation snippets | Timestamp, session link |
| **Analytical** | Synthesized summary | Supporting examples |
| **Relational** | Entity card + facts | Timeline of mentions |

### 1. List of Matching Memories

Best for: Retrieval queries, browsing

```
Your conversations about "kitchen renovation":

📅 Nov 3, 2024
"...thinking about replacing the cabinets, maybe white shaker style..."

📅 Oct 28, 2024  
"...got a quote from the contractor, $15,000 for the full job..."

📅 Oct 15, 2024
"...kitchen layout isn't working, might need to move the island..."

[Load more]
```

**Design principles:**
- **Snippet length:** 50-100 chars, centered on match
- **Context indicators:** Date, session type, topic tags
- **Expandability:** Click to see full context
- **Highlighting:** Bold matched terms

### 2. Summarized Answer

Best for: Knowledge queries, analytical queries

```
Q: "What do you know about my dietary preferences?"

Here's what I've learned about your diet:

• You're vegetarian but eat fish occasionally (pescatarian)
• You avoid gluten when possible, but it's not an allergy
• You mentioned loving Thai and Indian food
• You're trying to reduce sugar intake (mentioned Jan 15)
• Coffee preference: oat milk latte, no sugar

[See all 12 related memories]
```

**Design principles:**
- **Structured summary:** Bullet points, not paragraphs
- **Attribution hints:** "(mentioned Jan 15)" for recent/important
- **Confidence indicators:** "you mentioned" vs "I inferred"
- **Drill-down link:** See underlying memories

### 3. Timeline View

Best for: Temporal queries, understanding evolution

```
Q: "How has our discussion about the career change evolved?"

Timeline: Career Change Discussions
═══════════════════════════════════════════════════

Oct 2023  ●─────────────────────────────────────────
          First mentioned frustration with current role
          
Dec 2023  ●─────────────────────────────────────────
          Exploring MBA options
          
Feb 2024  ●─────────────────────────────────────────
          Decided against MBA, looking at direct switch
          
May 2024  ●─────────────────────────────────────────
          Started networking in target industry
          
Aug 2024  ●─────────────────────────────────────────
          Got first interview at target company

[Expand any point for full context]
```

**Design principles:**
- **Visual timeline:** Shows progression at a glance
- **Summary per node:** 1-line essence
- **Expandability:** Click to see full memory
- **Pattern visibility:** Decisions, changes in direction highlighted

### 4. Entity Card

Best for: Relational queries

```
Q: "What do you know about my brother?"

┌─────────────────────────────────────────────┐
│  👤 Michael (Brother)                       │
├─────────────────────────────────────────────┤
│  Lives in: Austin, TX                       │
│  Works at: Dell (mentioned Oct 2024)        │
│  Family: Married to Jessica, 2 kids         │
│                                             │
│  Recent mentions:                           │
│  • Nov 15: Planning Thanksgiving visit      │
│  • Oct 3: His promotion to Senior Manager   │
│  • Aug 20: Your shared childhood memory     │
│                                             │
│  [See all 23 mentions] [Edit info]          │
└─────────────────────────────────────────────┘
```

### Interface Patterns from Existing Products

**Gmail search:**
- Powerful operators (from:, before:, has:attachment)
- Autocomplete with recent searches
- Filter chips after search (from, date, has attachment)
- Results show snippet with highlighted match

**Notion search:**
- Semantic by default, keyword fallback
- Filter by page, database, date
- Quick actions on results (open, copy link)
- Shows match context in preview

**Slack search:**
- Natural language + operators (from:@user in:#channel)
- Filters panel (people, channels, dates)
- Expandable results with "show more context"
- "In:" autocomplete for channels

**ChatGPT "Search my chats":**
- Simple text search across conversations
- Returns conversation snippets
- Links to original conversation
- No advanced operators (basic)

### Best Practices Synthesis

1. **Progressive disclosure:** Show summary first, full context on demand
2. **Source attribution:** Always link to original conversation/memory
3. **Confidence transparency:** Distinguish stated vs inferred
4. **Actionability:** Edit, delete, expand options on results
5. **Empty state guidance:** Suggest queries if no results

---

## Conversational Search UX

### Follow-up Queries

Memory search should support conversational refinement:

```
User: "When did I mention the budget issues?"
AI: "You discussed budget concerns on Oct 15 and Nov 3. The October 
     conversation was about the kitchen renovation, November was about 
     the vacation planning."

User: "Earlier than that"
AI: "Looking further back... You mentioned budget constraints in 
     August regarding the car purchase decision."

User: "That one. What exactly did I say?"
AI: [Expands full context of August conversation]
```

**Implementation:**
- Track search session state (current results, filters)
- Parse refinement intent: "earlier", "later", "more like that", "not that"
- Map refinements to filter modifications

### Refinement Types

| Refinement | Meaning | Action |
|------------|---------|--------|
| "Earlier than that" | Shift time window backward | Adjust date filter |
| "More recent" | Shift time window forward | Adjust date filter |
| "Only work-related" | Add topic filter | Add category=work |
| "From last year" | Absolute time constraint | Set year filter |
| "More like the second one" | Similar to specific result | Re-search using result #2 embedding |
| "Not about that" | Exclude topic | Add negative filter |

### Clarification Patterns

When queries are ambiguous, prefer:

**Implicit clarification (preferred):**
```
User: "What do I think about politics?"
AI: "You've shared views on local politics—specifically the transit 
     proposal in October. You haven't discussed national politics with me. 
     Want me to focus on the transit discussions?"
```

**Explicit clarification (when necessary):**
```
User: "Find that conversation about the thing"
AI: "I'd need a bit more context. Are you thinking of:
     • Recent conversations this week?
     • Something about a specific project?
     • A conversation with a particular person?"
```

**Avoid over-clarification:**
```
❌ "Did you mean conversations about 'things' or 'the thing' 
   specifically? And what time range?"
   
✓ "I found a few candidates—most recently we discussed 'the car 
   thing' on Tuesday. Is that what you meant?"
```

### Null Result Handling

When no memories match:

```
User: "When did we discuss cryptocurrency?"
AI: "I don't have any memories of us discussing cryptocurrency. 
     Either we haven't talked about it, or it might be stored 
     differently. Try:
     • 'Bitcoin' or specific coin names
     • 'Investments' (broader category)
     • 'That money thing' (if you remember phrasing it that way)"
```

---

## Privacy Considerations in Search

### Should All Memories Be Searchable?

**Argument for full searchability:**
- User owns their data
- AI shouldn't hide information from its human
- Transparency builds trust

**Argument for selective searchability:**
- Some memories are highly sensitive (health, finances, relationships)
- Accidental exposure risk if device shared
- Search results might appear in autocomplete

### Tiered Search Privacy Model

| Privacy Level | Search Behavior | Example |
|---------------|-----------------|---------|
| **Open** | Fully searchable, appears in suggestions | "Favorite restaurant" |
| **Searchable** | Can be found, no autocomplete | "Salary information" |
| **Protected** | Requires confirmation to reveal | "Medical conditions" |
| **Sealed** | Cannot be searched, only naturally surfaced | "Therapy discussions" |

### Protected Search Pattern

```
User: "What do you know about my health?"

AI: "I have some memories about health topics. Some may be sensitive. 
     Should I include:
     ☐ General wellness discussions
     ☐ Specific medical information
     ☐ Mental health conversations
     
     [Show selected] [Show all]"
```

### Search History Privacy

The search queries themselves create a privacy concern:

- **Don't log searches** by default
- **Allow search history** as opt-in for "recent searches"
- **Never surface search queries** to other systems
- **Clear search session** after conversation ends

### Sensitive Content Detection

Automatically flag memories as potentially sensitive:

```python
sensitive_categories = [
    'medical', 'mental_health', 'financial', 'legal',
    'relationship_conflict', 'passwords', 'private_opinions'
]

# During memory storage
if any(detect_category(memory) in sensitive_categories):
    memory.privacy_level = 'protected'
```

---

## Comparison to Existing Search Systems

### Gmail Search

**Strengths:**
- Powerful operator syntax (from:, to:, before:, after:, has:)
- Date range picker UI
- Filters as chips (can be added/removed post-search)
- Search within search (refinement)
- Saved searches

**Weaknesses:**
- Steep learning curve for operators
- Poor semantic understanding ("meeting" won't find "call")
- No natural language support

**Lessons for Memory Search:**
- Operator power users exist—support them
- Visual filter chips are intuitive
- Search refinement is expected

### Notion Search

**Strengths:**
- Semantic understanding built-in
- Filters by database, date, creator
- Quick actions on results
- Search across all content types
- Recent searches and quick links

**Weaknesses:**
- Can be slow on large workspaces
- Ranking sometimes opaque
- Limited date precision

**Lessons for Memory Search:**
- Semantic search is table stakes now
- Quick actions (edit, delete) on results are valuable
- Recent searches save repeated queries

### Slack Search

**Strengths:**
- Natural language + operators hybrid
- "In:" and "from:" autocomplete
- Date filters with presets (today, this week, this month)
- Shows match in context with expand option
- Search modifiers visible in results

**Weaknesses:**
- Can miss semantic matches
- Results ranking sometimes unclear
- Limited to text (files separate)

**Lessons for Memory Search:**
- Presets (today, this week) are faster than date pickers
- "In:" autocomplete for contexts (work, personal) would be valuable
- Expand-in-place beats navigation away

### ChatGPT Search

**Strengths:**
- Dead simple (just type what you want)
- Returns conversation snippets
- Links to original chat
- Integrated with main interface

**Weaknesses:**
- Very basic (no filters, no operators)
- Pure keyword match (no semantic)
- No refinement support
- Can't search within conversations

**Lessons for Memory Search:**
- Simplicity has value—power users are minority
- Integration with main chat is expected
- Link to source conversation is essential

### Synthesis: What Memory Search Should Have

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Natural language queries | P0 | Core use case |
| Semantic + keyword hybrid | P0 | Handle both concept and exact match |
| Time filters (presets + picker) | P0 | Most common refinement |
| Source attribution | P0 | Trust and auditability |
| Result expansion in-place | P1 | Don't navigate away |
| Category filters | P1 | Browse by type |
| Follow-up refinement | P1 | Conversational expectation |
| Operator syntax | P2 | Power user value |
| Search history | P2 | Convenience |
| Saved searches | P3 | Low frequency use |

---

## Query Language Specification

### Natural Language (Primary)

The default interface—no special syntax required:

```
"When did I mention the kitchen renovation?"
"What do you know about my brother?"
"Find our conversations about vacation planning"
```

**Processing pipeline:**
```
Query → Intent Classification → Entity Extraction → 
Temporal Parsing → Search Plan → Execute → Rank → Present
```

### Operator Syntax (Power Users)

For precise control, support Gmail-style operators:

| Operator | Meaning | Example |
|----------|---------|---------|
| `before:` | Before date | `before:2024-01-01` |
| `after:` | After date | `after:2024-06-01` |
| `type:` | Memory category | `type:decision` |
| `about:` | Entity reference | `about:Michael` |
| `topic:` | Topic filter | `topic:work` |
| `"exact phrase"` | Literal match | `"kitchen renovation"` |
| `-exclude` | Exclude term | `-budget` |
| `confidence:high` | Confidence filter | Only high-confidence memories |

**Examples:**
```
budget type:decision after:2024-01-01
about:Sarah topic:wedding before:2024-06-01
"Project Falcon" type:task -completed
```

### Mixed Mode

Natural language with operator hints:

```
"What decisions did we make about the kitchen last month?"
→ type:decision topic:kitchen after:2024-10-01 before:2024-11-01

"Everything about Michael except work stuff"
→ about:Michael -topic:work
```

### Query Parsing Architecture

```python
class MemoryQuery:
    intent: QueryIntent  # TEMPORAL, KNOWLEDGE, RETRIEVAL, ANALYTICAL, RELATIONAL
    entities: list[Entity]  # Extracted entities
    time_range: TimeRange | None  # Parsed time constraints
    categories: list[str]  # Memory types to include
    topics: list[str]  # Topic filters
    keywords: list[str]  # Exact match terms
    semantic_query: str  # Text for embedding search
    exclusions: list[str]  # Negative filters
    confidence_threshold: float  # Minimum confidence
    
def parse_query(natural_language: str) -> MemoryQuery:
    # 1. Extract operators if present
    operators, remaining = extract_operators(natural_language)
    
    # 2. Classify intent
    intent = classify_intent(remaining)
    
    # 3. Extract entities
    entities = extract_entities(remaining, user_knowledge_graph)
    
    # 4. Parse temporal references
    time_range = parse_temporal(remaining, entities)
    
    # 5. Build query object
    return MemoryQuery(
        intent=intent,
        entities=entities,
        time_range=time_range,
        categories=operators.get('type', []),
        topics=operators.get('topic', []),
        keywords=extract_quoted_phrases(natural_language),
        semantic_query=remaining,
        exclusions=operators.get('exclude', []),
        confidence_threshold=0.7
    )
```

---

## Search UX Patterns

### Pattern 1: Inline Search

Search integrated into main conversation:

```
┌─────────────────────────────────────────────┐
│ [Search my memories...]                🔍  │
├─────────────────────────────────────────────┤
│ Recent searches:                            │
│ • kitchen renovation                        │
│ • decisions this month                      │
│ • about Michael                             │
└─────────────────────────────────────────────┘
```

**Interaction:**
1. User types in search box or asks naturally in chat
2. Results appear inline (don't navigate away)
3. Conversation continues with results as context

### Pattern 2: Memory Explorer Mode

Dedicated interface for memory browsing:

```
┌──────────────────────────────────────────────────────┐
│ 🧠 Memory Explorer                            [×]    │
├──────────────────────────────────────────────────────┤
│ Search: [kitchen renovation              ] [🔍]     │
│                                                      │
│ Filters: [📅 Last month ▼] [📁 All types ▼]         │
├──────────────────────────────────────────────────────┤
│ 3 memories found                                     │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ 📅 Nov 3, 2024 • Decision                      │  │
│ │ "Decided to go with white shaker cabinets..."  │  │
│ │ [Expand] [Edit] [Delete]                       │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ 📅 Oct 28, 2024 • Fact                         │  │
│ │ "Contractor quoted $15,000 for full job..."    │  │
│ │ [Expand] [Edit] [Delete]                       │  │
│ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Pattern 3: Conversational Search

Search as natural dialogue:

```
User: "What have we talked about regarding my career?"

AI: I found 15 memories about your career spanning the last 8 months.
    
    Key themes:
    • Career change exploration (7 mentions)
    • Current job frustrations (5 mentions)
    • Networking efforts (3 mentions)
    
    Most recent: On Nov 10, you mentioned the interview went well.
    
    Want me to:
    • Show the timeline of your career discussions?
    • Summarize what I know about your career goals?
    • Find a specific conversation?
```

### Pattern 4: Proactive Memory Surfaces

AI mentions relevant memories without explicit search:

```
User: "I'm thinking about taking a vacation"

AI: "That sounds great! I remember you mentioned wanting to visit 
     Japan back in August—is that still on your radar? You also 
     talked about needing a break after the project wraps up."
```

**Triggers for proactive surfacing:**
- Topic overlap with stored memories
- Time-based relevance (anniversary of a decision)
- Follow-up to previous commitment
- Contradiction with stated preference

---

## Implementation Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      MEMORY SEARCH SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Query     │───▶│    Search    │───▶│    Result     │  │
│  │  Processor  │    │  Orchestrator│    │   Presenter   │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│        │                   │                    │           │
│        ▼                   ▼                    ▼           │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Intent    │    │   Hybrid     │    │   Response    │  │
│  │ Classifier  │    │   Search     │    │  Generator    │  │
│  ├─────────────┤    ├──────────────┤    ├───────────────┤  │
│  │   Entity    │    │   Vector DB  │    │   Snippet     │  │
│  │  Extractor  │    │  (Pinecone)  │    │  Highlighter  │  │
│  ├─────────────┤    ├──────────────┤    ├───────────────┤  │
│  │  Temporal   │    │   BM25/      │    │   Summary     │  │
│  │   Parser    │    │   Keyword    │    │  Synthesizer  │  │
│  ├─────────────┤    ├──────────────┤    ├───────────────┤  │
│  │   Entity    │    │  Metadata    │    │   Timeline    │  │
│  │   Resolver  │    │   Filters    │    │   Generator   │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   MEMORY STORE                        │   │
│  │  • Vector embeddings (semantic content)              │   │
│  │  • Full text index (keyword search)                  │   │
│  │  • Entity graph (relationships)                      │   │
│  │  • Temporal index (time-based queries)               │   │
│  │  • Category tags (type-based filtering)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Memory {
  id: string;
  content: string;
  embedding: number[];  // Vector for semantic search
  
  // Categorization
  type: 'fact' | 'preference' | 'decision' | 'event' | 'opinion' | 'task';
  topics: string[];
  
  // Entities
  entities: EntityReference[];
  
  // Temporal
  created_at: Date;
  refers_to_date?: Date;  // "Last summer" → resolved date
  
  // Provenance
  source_session: string;
  source_type: 'stated' | 'inferred' | 'observed';
  confidence: number;
  
  // Privacy
  privacy_level: 'open' | 'searchable' | 'protected' | 'sealed';
  
  // Search optimization
  keywords: string[];  // Extracted for BM25
  summary: string;  // Short version for snippets
}

interface EntityReference {
  entity_id: string;
  entity_type: 'person' | 'place' | 'project' | 'organization' | 'concept';
  relationship: string;  // "brother", "workplace", "favorite"
}

interface SearchResult {
  memory: Memory;
  score: number;
  match_type: 'semantic' | 'keyword' | 'entity' | 'temporal';
  highlighted_snippet: string;
  context_before?: string;
  context_after?: string;
}
```

### Search Execution Flow

```python
async def execute_memory_search(query: str, user_id: str) -> SearchResponse:
    # 1. Parse query
    parsed = parse_query(query)
    
    # 2. Build search plan based on intent
    if parsed.intent == QueryIntent.TEMPORAL:
        plan = TemporalSearchPlan(parsed)
    elif parsed.intent == QueryIntent.KNOWLEDGE:
        plan = KnowledgeSynthesisPlan(parsed)
    elif parsed.intent == QueryIntent.RETRIEVAL:
        plan = RetrievalSearchPlan(parsed)
    elif parsed.intent == QueryIntent.ANALYTICAL:
        plan = AnalyticalSearchPlan(parsed)
    elif parsed.intent == QueryIntent.RELATIONAL:
        plan = RelationalSearchPlan(parsed)
    
    # 3. Execute hybrid search
    results = await hybrid_search(
        semantic_query=parsed.semantic_query,
        keywords=parsed.keywords,
        filters={
            'user_id': user_id,
            'time_range': parsed.time_range,
            'categories': parsed.categories,
            'entities': [e.id for e in parsed.entities],
            'privacy_level': {'$in': ['open', 'searchable']}
        },
        alpha=0.6,  # Favor semantic slightly
        top_k=50
    )
    
    # 4. Rerank if needed
    if should_rerank(results):
        results = await rerank(parsed.semantic_query, results)
    
    # 5. Apply confidence threshold
    results = [r for r in results if r.score >= parsed.confidence_threshold]
    
    # 6. Present based on intent
    return present_results(parsed.intent, results)
```

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Search latency (P50) | <200ms | Without reranking |
| Search latency (P95) | <500ms | With reranking |
| Result relevance | >80% precision@5 | Top 5 results are relevant |
| Query understanding | >90% intent accuracy | Correct intent classification |
| Entity resolution | >85% accuracy | Correct entity identified |
| Temporal parsing | >90% accuracy | Correct time range extracted |

---

## Recommendations

### For MVP Implementation

1. **Start with conversational search** — No separate UI, just answer queries in chat
2. **Hybrid search from day 1** — BM25 + vector avoids "why didn't it find X?" issues
3. **Basic temporal presets** — "today", "this week", "this month" covers 80% of time queries
4. **Result snippets with context** — Show where the memory came from
5. **No operator syntax initially** — Add later based on power user demand

### For User Trust

1. **Always attribute sources** — "You mentioned this on Nov 3"
2. **Show confidence** — "I'm fairly confident about this" vs "I think I remember"
3. **Allow corrections** — "That's not right" should update the memory
4. **Explain empty results** — Suggest alternative queries
5. **Respect privacy levels** — Don't accidentally surface sensitive memories

### For UX Polish

1. **Proactive surfacing** — Don't wait for explicit search; connect relevant memories naturally
2. **Conversational refinement** — "Earlier than that", "More recent", "Not that one"
3. **Summarize, don't dump** — For knowledge queries, synthesize before listing
4. **Progressive disclosure** — Summary first, details on demand
5. **Recent searches** — Save users from retyping common queries

---

## Open Questions for Future Research

1. **Voice search** — How does memory search work in voice-only interfaces?
2. **Multi-modal memories** — Searching through images, audio transcripts?
3. **Collaborative memory search** — Searching shared memories between users?
4. **Memory search delegation** — Can user A search user B's memories about them?
5. **Search analytics** — What do search patterns tell us about memory quality?
6. **Adversarial queries** — How do we handle attempts to extract sensitive info through search?

---

## Sources & References

- Gmail Search Operators documentation
- Notion Search & Filter documentation
- Slack Search best practices
- ChatGPT conversation search feature analysis
- Prior iteration research: 02-semantic-search-quality.md
- Prior iteration research: 03-memory-visualization.md
- Pinecone hybrid search architecture
- LangChain Self-Query Retriever documentation
- dateparser and chrono temporal parsing libraries
