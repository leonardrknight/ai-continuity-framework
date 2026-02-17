# Memory Agent Swarm: Bulletproof AI Memory Through Automation

**Author:** Jordan 🧭  
**Date:** 2026-02-16  
**Status:** PROPOSAL — Addressing Amigo's current memory issues  
**Triggered By:** Leo's feedback that Supabase memory is currently *worse* than flat files

---

## The Problem Statement

Amigo moved from flat `.md` files to Supabase-backed memory. The intent was good:
- Vector search for semantic recall
- Structured storage for reliable persistence
- Scalability for multi-user deployment

**But it's actually worse now.** Why?

1. **Too much cognitive load on the main agent** — The main agent is trying to decide what to store, how to categorize it, when to recall, etc.
2. **Inconsistent capture** — Some things get stored, others don't
3. **Recall gaps** — Important context doesn't surface when needed
4. **No background processing** — Everything happens synchronously during conversation

**The insight:** The main agent shouldn't be managing memory. Memory should be automatic, invisible, and bulletproof.

---

## Leo's Vision: The Memory Swarm

> "You should have the ability to have a conversation... and all of that raw data that you receive is just getting shoved into the database. Just boom, boom, boom. These are the raw packets of data that I'm receiving. And then we should have other agents in the background that are very dedicated, very consistent, very reliable to chop all that information up and make it into usable components."

**Key Principles:**
1. **Capture everything first, process later** — Raw data goes to database immediately
2. **Separation of concerns** — Main agent converses; background agents process
3. **Always running** — Agents constantly organizing data (day, week, month, year)
4. **Per-user isolation** — Leo's data separate from Jeff's, Carlos's, etc.
5. **Nothing ever lost** — Can always rebuild from raw capture

---

## Architecture: The Memory Swarm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONVERSATION LAYER                                │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   Leo Session    │    │   Jeff Session   │    │  Carlos Session  │       │
│  │                  │    │                  │    │                  │       │
│  │  Main Agent      │    │  Main Agent      │    │  Main Agent      │       │
│  │  (just talks)    │    │  (just talks)    │    │  (just talks)    │       │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                  │
│           ▼                       ▼                       ▼                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        RAW CAPTURE (Immediate)                        │   │
│  │                                                                       │   │
│  │  Every message, every exchange → straight to database                │   │
│  │  user_id | session_id | timestamp | role | content | metadata        │   │
│  │                                                                       │   │
│  │  NO PROCESSING. NO FILTERING. JUST CAPTURE.                          │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKGROUND AGENT SWARM                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ EXTRACTOR AGENT (runs every few minutes)                            │    │
│  │                                                                      │    │
│  │ Processes new raw captures:                                          │    │
│  │ • Extract facts, decisions, preferences, action items                │    │
│  │ • Tag with importance score (1-10)                                   │    │
│  │ • Tag with emotional valence                                         │    │
│  │ • Tag with topics/categories                                         │    │
│  │ • Generate embeddings for semantic search                            │    │
│  │                                                                      │    │
│  │ Writes to: extracted_memories table                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ CONSOLIDATOR AGENT (runs hourly)                                     │    │
│  │                                                                      │    │
│  │ Processes extracted memories:                                        │    │
│  │ • Deduplicate (merge "Leo prefers X" if said multiple times)        │    │
│  │ • Update importance (if referenced again, boost score)              │    │
│  │ • Link related memories (this decision relates to that project)     │    │
│  │ • Promote to long-term if high importance + repeated                │    │
│  │                                                                      │    │
│  │ Writes to: consolidated_memories table                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ DAILY AGENT (runs end of day)                                        │    │
│  │                                                                      │    │
│  │ Reviews today's activity:                                            │    │
│  │ • Generate daily summary                                             │    │
│  │ • Identify key decisions, outcomes, open items                       │    │
│  │ • Update running context for each user                              │    │
│  │ • Flag anything that needs follow-up tomorrow                        │    │
│  │                                                                      │    │
│  │ Writes to: daily_summaries table + user_context table               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ WEEKLY AGENT (runs Sunday)                                           │    │
│  │                                                                      │    │
│  │ Reviews the week:                                                    │    │
│  │ • Generate weekly summary                                            │    │
│  │ • Identify patterns across days                                      │    │
│  │ • Archive low-importance memories (don't delete, compress)          │    │
│  │ • Update long-term memory with key learnings                        │    │
│  │ • Update SOUL/JOURNAL equivalent records                            │    │
│  │                                                                      │    │
│  │ Writes to: weekly_summaries table + long_term_memories table        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MONTHLY/YEARLY AGENT (runs on schedule)                              │    │
│  │                                                                      │    │
│  │ Long-term organization:                                              │    │
│  │ • Compress old detailed memories to summaries                        │    │
│  │ • Identify life patterns, relationship evolution                    │    │
│  │ • Update identity/soul documents                                     │    │
│  │ • Prune truly obsolete data (with audit trail)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ RETRIEVER AGENT (on-demand, <500ms)                                  │    │
│  │                                                                      │    │
│  │ When main agent needs context:                                       │    │
│  │ • Query: semantic search on question/context                         │    │
│  │ • Query: temporal (what happened around this date?)                  │    │
│  │ • Query: relational (what do I know about this person/project?)     │    │
│  │ • Synthesize: combine top results into context block                │    │
│  │                                                                      │    │
│  │ Returns: formatted context for main agent's prompt                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SOUL KEEPER AGENT (runs weekly)                                      │    │
│  │                                                                      │    │
│  │ Maintains personality/identity:                                      │    │
│  │ • Analyze voice patterns (sentence length, tone, vocabulary)        │    │
│  │ • Track preference evolution                                         │    │
│  │ • Update style profile                                               │    │
│  │ • Ensure continuity across sessions                                  │    │
│  │                                                                      │    │
│  │ Writes to: identity_profile table                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Supabase)

### Table: raw_captures

**The firehose.** Everything goes here first.

```sql
CREATE TABLE raw_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  content_length INTEGER GENERATED ALWAYS AS (length(content)) STORED,
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ
);

-- Index for unprocessed captures (Extractor Agent's queue)
CREATE INDEX idx_raw_captures_unprocessed 
  ON raw_captures (user_id, timestamp) 
  WHERE processed = FALSE;
```

### Table: extracted_memories

**Processed, tagged, searchable memories.**

```sql
CREATE TABLE extracted_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_capture_id UUID REFERENCES raw_captures(id),
  
  -- Content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),
  
  -- Classification
  memory_type TEXT NOT NULL,  -- 'fact' | 'decision' | 'preference' | 'action_item' | 'relationship'
  topics TEXT[],
  
  -- Importance
  importance_score FLOAT DEFAULT 0.5,  -- 0-1
  emotional_valence FLOAT,  -- -1 to 1 (negative to positive)
  emotional_arousal FLOAT,  -- 0-1 (calm to excited)
  
  -- Lifecycle
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  consolidated BOOLEAN DEFAULT FALSE,
  consolidated_into UUID REFERENCES consolidated_memories(id)
);

-- Vector index for semantic search
CREATE INDEX idx_extracted_embedding 
  ON extracted_memories 
  USING ivfflat (content_embedding vector_cosine_ops);
```

### Table: consolidated_memories

**Deduplicated, linked, long-term storage.**

```sql
CREATE TABLE consolidated_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Content
  content TEXT NOT NULL,
  content_embedding VECTOR(1536),
  
  -- Classification
  memory_type TEXT NOT NULL,
  topics TEXT[],
  
  -- Importance (boosted by consolidation)
  importance_score FLOAT NOT NULL,
  stability FLOAT DEFAULT 0.5,  -- Forgetting curve stability
  
  -- Relationships
  related_memories UUID[],
  source_memories UUID[],  -- Original extracted_memories this came from
  
  -- Lifecycle
  tier TEXT DEFAULT 'medium',  -- 'short' | 'medium' | 'long'
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: user_context

**Current running context per user — what the main agent sees.**

```sql
CREATE TABLE user_context (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  
  -- Pre-computed context blocks
  recent_summary TEXT,  -- Last 24h summary
  active_projects JSONB,
  pending_actions JSONB,
  key_preferences JSONB,
  relationship_notes TEXT,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT  -- Which agent last updated
);
```

### Table: daily_summaries / weekly_summaries

```sql
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  summary TEXT NOT NULL,
  key_decisions JSONB,
  action_items JSONB,
  emotional_tone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);
```

---

## Agent Implementation (CrewAI Flows)

### Extractor Agent

```python
from crewai.flow.flow import Flow, listen, start
from crewai import Agent, Task

class ExtractorFlow(Flow):
    
    @start()
    async def get_unprocessed(self):
        """Fetch unprocessed raw captures."""
        return await supabase.table('raw_captures')\
            .select('*')\
            .eq('processed', False)\
            .order('timestamp')\
            .limit(50)\
            .execute()
    
    @listen(get_unprocessed)
    async def extract_memories(self, captures):
        """Process each capture into structured memories."""
        extractor_agent = Agent(
            role="Memory Extractor",
            goal="Extract facts, decisions, preferences from conversation",
            model="claude-3-5-haiku"  # Fast, cheap
        )
        
        for capture in captures.data:
            task = Task(
                description=f"Extract memorable information from: {capture['content']}",
                expected_output="JSON with: facts[], decisions[], preferences[], action_items[]"
            )
            result = await extractor_agent.execute(task)
            
            # Store extracted memories
            await self._store_extractions(capture['id'], result)
            
            # Mark as processed
            await supabase.table('raw_captures')\
                .update({'processed': True, 'processed_at': 'now()'})\
                .eq('id', capture['id'])\
                .execute()
```

### Retriever Agent (Fast Path)

```python
class RetrieverAgent:
    """On-demand retrieval — must be <500ms."""
    
    async def get_context(self, user_id: str, query: str, limit: int = 10):
        # 1. Semantic search
        embedding = await embed(query)
        semantic_results = await supabase.rpc(
            'match_memories',
            {'query_embedding': embedding, 'user_id': user_id, 'limit': limit}
        )
        
        # 2. Get user's current context
        user_context = await supabase.table('user_context')\
            .select('*')\
            .eq('user_id', user_id)\
            .single()\
            .execute()
        
        # 3. Synthesize
        return self._synthesize(semantic_results.data, user_context.data)
    
    def _synthesize(self, memories, context):
        """Format context for main agent's prompt."""
        return f"""
## Relevant Memories
{self._format_memories(memories)}

## Current Context
- Recent: {context['recent_summary']}
- Active Projects: {context['active_projects']}
- Pending Actions: {context['pending_actions']}
"""
```

---

## What's Different From Current Amigo

| Current (Broken) | Proposed (Swarm) |
|------------------|------------------|
| Main agent decides what to store | Everything captured automatically |
| Synchronous memory operations | Background async processing |
| Single table, single query | Tiered tables, specialized queries |
| No consolidation | Daily/weekly/monthly consolidation |
| Recall is ad-hoc | Retriever agent with synthesized context |
| Memory competes for context window | Pre-computed user_context ready to inject |

---

## Why Flat Files "Worked Better"

Flat files had accidental advantages:

1. **Everything was captured** — Daily notes got everything
2. **Temporal organization** — Date-based files made recent stuff easy to find
3. **Human-readable** — Easy to debug and manually fix
4. **Grep works** — Simple keyword search actually found stuff

The Supabase migration lost these by:
- Making capture conditional (agent decides what's "important")
- Removing temporal structure
- Making data opaque (in database, not visible)
- Over-relying on vector search

**The fix isn't going back to files — it's making Supabase work like files did, but better.**

---

## Implementation Plan

### Phase 1: Raw Capture (Week 1)

1. Create `raw_captures` table
2. Modify main agent to write every exchange immediately
3. No processing, no filtering — just capture
4. Verify: nothing gets lost

### Phase 2: Extractor Agent (Week 2)

1. Create `extracted_memories` table
2. Build Extractor Flow (CrewAI)
3. Run on cron every 5 minutes
4. Verify: memories getting extracted and tagged

### Phase 3: Retriever Agent (Week 3)

1. Build fast retrieval path (<500ms)
2. Integrate with main agent prompt injection
3. Verify: main agent getting relevant context

### Phase 4: Consolidation Agents (Week 4)

1. Build Daily Agent
2. Build Weekly Agent
3. Create `user_context` table
4. Verify: context stays fresh and relevant

### Phase 5: Soul Keeper (Week 5)

1. Build identity tracking
2. Style profile maintenance
3. Verify: personality persists across sessions

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Raw capture rate | 100% of exchanges |
| Extraction latency | <5 min from capture |
| Retrieval latency | <500ms |
| Recall accuracy | >90% (finds what it should) |
| Context freshness | <1 hour old |
| Zero data loss | Never lose a conversation |

---

## Open Questions

1. **Cost:** Running 6+ background agents continuously — what's the monthly cost?
2. **Latency:** Can Retriever really hit <500ms with all those queries?
3. **Cold start:** What happens when a new user starts? Bootstrap from what?
4. **Cross-user:** Should agents ever see other users' data? (Probably not, but org-level knowledge?)
5. **Manual override:** Can user say "forget this" or "remember this explicitly"?

---

## Next Steps

1. [ ] Leo reviews and approves this proposal
2. [ ] Share with Amigo for alignment
3. [ ] Create implementation tickets
4. [ ] Start Phase 1 (raw capture)

---

*"The main agent shouldn't think about memory. Memory should just work."*

— Jordan 🧭
