# Memory Agent Swarm: Detailed Architecture Specification

**Author:** Jordan 🧭  
**Date:** 2026-02-16  
**Iteration:** 7  
**Status:** Research Complete  
**Purpose:** Detailed architectural specification for the 6+ background agents that manage memory automatically

---

## Executive Summary

This document provides a complete architectural specification for the Memory Agent Swarm—a collection of specialized background agents that automate memory management so the main conversational agent can focus on conversation.

**Core Principle:** The main agent shouldn't think about memory. Memory should just work.

**Agents Specified:**
1. **Extractor Agent** — Extracts facts, decisions, preferences from conversations
2. **Consolidator Agent** — Deduplicates, merges, promotes memories
3. **Retriever Agent** — Finds relevant context for current conversation
4. **Voice Keeper Agent** — Monitors and maintains communication style
5. **Curator Agent** — Decides importance, manages lifecycle
6. **Archivist Agent** — Compresses, archives, handles long-term storage

---

## Table of Contents

1. [Orchestration Architecture](#1-orchestration-architecture)
2. [Agent Communication Patterns](#2-agent-communication-patterns)
3. [Agent Specifications](#3-agent-specifications)
   - [3.1 Extractor Agent](#31-extractor-agent)
   - [3.2 Consolidator Agent](#32-consolidator-agent)
   - [3.3 Retriever Agent](#33-retriever-agent)
   - [3.4 Voice Keeper Agent](#34-voice-keeper-agent)
   - [3.5 Curator Agent](#35-curator-agent)
   - [3.6 Archivist Agent](#36-archivist-agent)
4. [Conflict Resolution](#4-conflict-resolution)
5. [Deployment Topology](#5-deployment-topology)
6. [Monitoring & Observability](#6-monitoring--observability)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Orchestration Architecture

### 1.1 Pattern: Event-Driven + Scheduled Hybrid

We use a **hybrid orchestration pattern** combining:
- **Event-driven triggers** for real-time processing (new conversations, memory access)
- **Scheduled triggers** for batch operations (consolidation, archival)
- **On-demand invocation** for synchronous needs (retrieval)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ORCHESTRATION LAYER                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         EVENT BUS (Redis Streams)                    │    │
│  │                                                                      │    │
│  │  Channels:                                                           │    │
│  │  • raw.captures         ← New conversation data                      │    │
│  │  • memory.extracted     ← Extractor output                           │    │
│  │  • memory.consolidated  ← Consolidator output                        │    │
│  │  • memory.accessed      ← Retrieval events (for importance boost)   │    │
│  │  • agent.health         ← Health checks and heartbeats              │    │
│  │  • agent.errors         ← Error events for alerting                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       SCHEDULER (Inngest/Temporal)                   │    │
│  │                                                                      │    │
│  │  Schedules:                                                          │    │
│  │  • */5 * * * *     → Extractor Agent (every 5 min)                  │    │
│  │  • 0 * * * *       → Consolidator Agent (hourly)                    │    │
│  │  • 0 3 * * *       → Curator Agent (3 AM daily)                     │    │
│  │  • 0 4 * * 0       → Voice Keeper Agent (4 AM Sunday)               │    │
│  │  • 0 2 1 * *       → Archivist Agent (2 AM, 1st of month)           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      AGENT SUPERVISOR (LangGraph)                    │    │
│  │                                                                      │    │
│  │  Responsibilities:                                                   │    │
│  │  • Route work to appropriate agents                                  │    │
│  │  • Handle agent failures and retries                                 │    │
│  │  • Manage agent concurrency limits                                   │    │
│  │  • Aggregate health/status metrics                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Event Bus | Redis Streams | Fast, durable, supports consumer groups |
| Scheduler | Inngest | Durable execution, retries, observability |
| Agent Framework | LangGraph + CrewAI | LangGraph for orchestration, CrewAI for agent abstraction |
| State Store | Supabase (Postgres) | Transactional, RLS for user isolation |
| Vector Store | pgvector (Supabase) | Integrated, no separate service |
| LLM (Fast) | Claude 3.5 Haiku | Cost-effective for extraction/classification |
| LLM (Smart) | Claude Sonnet 4 | Complex reasoning (consolidation, voice analysis) |

### 1.3 Agent Priority & Concurrency

| Agent | Priority | Max Concurrent | Reason |
|-------|----------|----------------|--------|
| Retriever | P0 (Critical) | 50 | User-facing, <500ms latency |
| Extractor | P1 (High) | 10 | Near-real-time processing |
| Consolidator | P2 (Normal) | 3 | Batch, can be delayed |
| Curator | P3 (Low) | 1 | Background maintenance |
| Voice Keeper | P3 (Low) | 1 | Weekly batch |
| Archivist | P4 (Lowest) | 1 | Monthly batch |

---

## 2. Agent Communication Patterns

### 2.1 Primary Patterns

**Pattern A: Pipeline (Sequential)**
```
Extractor → Consolidator → Curator
```
Each agent's output feeds the next. Used for memory lifecycle.

**Pattern B: Publish-Subscribe (Fan-out)**
```
               ┌→ Consolidator
raw.captures →│
               └→ Voice Keeper (sampling)
```
Multiple agents can react to the same event.

**Pattern C: Request-Response (Synchronous)**
```
Main Agent ←→ Retriever Agent
```
Used only for retrieval where latency matters.

### 2.2 Message Schemas

**Event: New Raw Capture**
```json
{
  "event_type": "raw.capture.created",
  "timestamp": "2026-02-16T10:30:00Z",
  "user_id": "uuid",
  "session_id": "session-123",
  "data": {
    "capture_id": "uuid",
    "role": "user",
    "content": "...",
    "metadata": {}
  }
}
```

**Event: Memory Extracted**
```json
{
  "event_type": "memory.extracted",
  "timestamp": "2026-02-16T10:35:00Z",
  "user_id": "uuid",
  "data": {
    "source_capture_id": "uuid",
    "memories": [
      {
        "id": "uuid",
        "type": "preference",
        "content": "User prefers dark mode",
        "importance": 0.7,
        "topics": ["ui", "preferences"],
        "confidence": 0.9
      }
    ]
  }
}
```

**Event: Memory Accessed**
```json
{
  "event_type": "memory.accessed",
  "timestamp": "2026-02-16T10:35:00Z",
  "user_id": "uuid",
  "data": {
    "memory_ids": ["uuid1", "uuid2"],
    "query_context": "dark mode settings",
    "retrieval_score": 0.87
  }
}
```

### 2.3 Inter-Agent Communication Matrix

| From \ To | Extractor | Consolidator | Retriever | Voice Keeper | Curator | Archivist |
|-----------|-----------|--------------|-----------|--------------|---------|-----------|
| **Raw Capture** | Event trigger | — | — | Sample (10%) | — | — |
| **Extractor** | — | Event trigger | — | — | — | — |
| **Consolidator** | — | — | DB writes | — | Event trigger | — |
| **Retriever** | — | — | — | — | Access events | — |
| **Voice Keeper** | — | — | DB reads | — | — | — |
| **Curator** | — | — | — | — | — | Archive queue |
| **Archivist** | — | — | — | — | — | — |

---

## 3. Agent Specifications

### 3.1 Extractor Agent

**Purpose:** Extract structured memories (facts, decisions, preferences, action items) from raw conversation data.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| Scheduled | Every 5 minutes | Normal |
| Event-driven | When raw_captures backlog > 100 | High |
| Manual | Admin API call | Highest |

**Trigger Logic:**
```python
def should_run():
    unprocessed_count = db.count("raw_captures", processed=False)
    if unprocessed_count == 0:
        return False
    if unprocessed_count > 100:
        trigger_immediately()
    return True  # Normal scheduled run
```

#### Input/Output

**Input:**
```python
@dataclass
class ExtractorInput:
    captures: List[RawCapture]  # Max 50 per batch
    user_context: Optional[UserContext]  # Recent preferences for context
```

**Output:**
```python
@dataclass
class ExtractorOutput:
    extracted_memories: List[ExtractedMemory]
    processing_stats: ProcessingStats
    errors: List[ExtractionError]

@dataclass
class ExtractedMemory:
    id: UUID
    source_capture_id: UUID
    user_id: UUID
    content: str
    content_embedding: List[float]  # 1536 dimensions
    memory_type: Literal["fact", "decision", "preference", "action_item", "relationship", "event"]
    topics: List[str]
    entities: List[Entity]  # Named entities extracted
    importance_score: float  # 0.0-1.0
    confidence_score: float  # 0.0-1.0
    emotional_valence: Optional[float]  # -1.0 to 1.0
    emotional_arousal: Optional[float]  # 0.0 to 1.0
    temporal_reference: Optional[TemporalRef]  # "next week", specific date, etc.
    source_type: Literal["stated", "inferred"]
    created_at: datetime
```

#### State Management

**Persistent State (Postgres):**
- Processing cursor: Last processed capture timestamp
- Extraction statistics per user
- Error counts and patterns

**In-Memory State:**
- Current batch being processed
- User context cache (TTL: 5 min)

**State Schema:**
```sql
CREATE TABLE extractor_state (
    user_id UUID PRIMARY KEY,
    last_processed_at TIMESTAMPTZ,
    total_extracted INTEGER DEFAULT 0,
    error_count_24h INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    avg_processing_time_ms FLOAT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Supabase (raw_captures) | Database | Yes | Fail with retry |
| OpenAI Embeddings | API | Yes | Queue for later |
| Claude 3.5 Haiku | LLM | Yes | Fall back to Sonnet |
| Redis (event bus) | Queue | No | Direct DB poll |

#### Error Handling

| Error Type | Action | Retry | Alert |
|------------|--------|-------|-------|
| LLM timeout | Retry with backoff | 3x | After 3 failures |
| Embedding failure | Queue for later | 5x | After 5 failures |
| DB write failure | Retry with backoff | 5x | Immediately |
| Malformed content | Log and skip | No | Aggregate daily |
| Rate limit | Exponential backoff | 10x | After 3 incidents |

**Error Recovery Flow:**
```python
async def process_with_recovery(capture: RawCapture):
    try:
        memories = await extract(capture)
        await store(memories)
        await mark_processed(capture.id)
    except LLMError as e:
        await retry_queue.add(capture.id, delay=exponential_backoff(e.attempt))
        if e.attempt >= 3:
            await alert("extractor_llm_failures", capture)
    except EmbeddingError as e:
        # Store without embedding, let Consolidator retry
        await store_partial(memories, needs_embedding=True)
        await mark_processed(capture.id, partial=True)
    except Exception as e:
        await dead_letter_queue.add(capture.id, error=str(e))
        await alert("extractor_unexpected", e)
```

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Processing latency | <5 min from capture | <15 min | >30 min |
| Throughput | 100 captures/min | 50 captures/min | <20 captures/min |
| Extraction accuracy | >95% | >90% | <85% |
| Error rate | <1% | <5% | >10% |

#### Implementation

```python
from crewai import Agent, Task
from crewai.flow.flow import Flow, listen, start

class ExtractorFlow(Flow):
    
    @start()
    async def fetch_unprocessed(self):
        """Fetch batch of unprocessed captures."""
        return await supabase.table("raw_captures")\
            .select("*")\
            .eq("processed", False)\
            .order("timestamp")\
            .limit(50)\
            .execute()
    
    @listen(fetch_unprocessed)
    async def extract_memories(self, captures):
        """Extract structured memories from raw captures."""
        if not captures.data:
            return {"status": "no_work"}
        
        # Group by user for context loading
        by_user = group_by(captures.data, "user_id")
        results = []
        
        for user_id, user_captures in by_user.items():
            user_context = await self._load_user_context(user_id)
            
            for capture in user_captures:
                extraction = await self._extract_single(capture, user_context)
                results.extend(extraction.memories)
                
                # Mark as processed
                await supabase.table("raw_captures")\
                    .update({"processed": True, "processed_at": now()})\
                    .eq("id", capture["id"])\
                    .execute()
        
        # Emit event for downstream agents
        await self._emit_event("memory.extracted", results)
        return {"extracted": len(results)}
    
    async def _extract_single(self, capture, context):
        """Extract memories from a single capture."""
        extractor = Agent(
            role="Memory Extractor",
            goal="Extract memorable information from conversation",
            model="claude-3-5-haiku-20241022",
            backstory="You identify facts, decisions, preferences, and action items."
        )
        
        task = Task(
            description=f"""
            Extract memorable information from this conversation exchange.
            
            Context about user: {context}
            
            Exchange:
            Role: {capture['role']}
            Content: {capture['content']}
            
            For each memory, provide:
            - content: The memory in concise form
            - type: fact | decision | preference | action_item | relationship | event
            - importance: 0.0-1.0 (how important to remember)
            - confidence: 0.0-1.0 (how certain you are this is correct)
            - topics: relevant topic tags
            - source_type: stated (user explicitly said) or inferred (you deduced)
            
            Return JSON array of memories. If nothing memorable, return [].
            """,
            expected_output="JSON array of extracted memories"
        )
        
        result = await extractor.execute_async(task)
        return self._parse_extraction(capture["id"], capture["user_id"], result)
```

---

### 3.2 Consolidator Agent

**Purpose:** Deduplicate memories, merge related information, update importance scores, and promote high-value memories to long-term storage.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| Scheduled | Hourly (0 * * * *) | Normal |
| Event-driven | When extracted_memories backlog > 200 | High |
| Threshold | User has >50 unconsolidated memories | Normal |

#### Input/Output

**Input:**
```python
@dataclass
class ConsolidatorInput:
    user_id: UUID
    extracted_memories: List[ExtractedMemory]  # Unconsolidated
    existing_consolidated: List[ConsolidatedMemory]  # For dedup comparison
    consolidation_rules: ConsolidationRules  # Per-user preferences
```

**Output:**
```python
@dataclass
class ConsolidatorOutput:
    new_consolidated: List[ConsolidatedMemory]
    merged_memories: List[MergeRecord]  # What got combined
    promoted_to_longterm: List[UUID]  # IDs promoted
    demoted: List[UUID]  # IDs marked for archival
    stats: ConsolidationStats

@dataclass
class ConsolidatedMemory:
    id: UUID
    user_id: UUID
    content: str
    content_embedding: List[float]
    memory_type: str
    topics: List[str]
    importance_score: float  # Boosted by consolidation
    stability: float  # Forgetting curve stability (SM-2)
    tier: Literal["short", "medium", "long"]
    source_memories: List[UUID]  # Original extracted IDs
    related_memories: List[UUID]  # Semantic links
    access_count: int
    last_accessed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

@dataclass
class MergeRecord:
    merged_into: UUID
    merged_from: List[UUID]
    merge_reason: str  # "duplicate", "refinement", "contradiction_resolved"
    content_before: List[str]
    content_after: str
```

#### State Management

**Persistent State:**
```sql
CREATE TABLE consolidator_state (
    user_id UUID PRIMARY KEY,
    last_consolidated_at TIMESTAMPTZ,
    total_merged INTEGER DEFAULT 0,
    total_promoted INTEGER DEFAULT 0,
    avg_consolidation_time_ms FLOAT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track merge history for debugging
CREATE TABLE merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    merged_into UUID NOT NULL,
    merged_from UUID[] NOT NULL,
    merge_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**In-Memory State:**
- User embedding cache (for similarity comparison)
- Deduplication bloom filter (fast negative lookup)

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Supabase (extracted_memories) | Database | Yes | Fail with retry |
| Supabase (consolidated_memories) | Database | Yes | Fail with retry |
| Claude Sonnet | LLM | Yes | Queue for later |
| Vector similarity (pgvector) | Database | Yes | Slower keyword matching |

#### Error Handling

| Error Type | Action | Retry | Alert |
|------------|--------|-------|-------|
| Merge conflict | Keep both, flag for review | No | Daily digest |
| Similarity calculation failure | Skip dedup, store as-is | Yes (1x) | Aggregate |
| LLM timeout | Retry subset | 3x | After pattern emerges |
| Circular reference | Break cycle, log | No | Immediately |

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Consolidation latency | <1 hour from extraction | <4 hours | >24 hours |
| Dedup accuracy | >98% | >95% | <90% |
| False merge rate | <0.1% | <1% | >2% |
| Throughput | 500 memories/hour | 200/hour | <50/hour |

#### Consolidation Algorithm

```python
class ConsolidatorFlow(Flow):
    
    SIMILARITY_THRESHOLD = 0.92  # For deduplication
    RELATED_THRESHOLD = 0.75     # For linking
    PROMOTION_THRESHOLD = 0.8    # Importance for long-term
    
    @start()
    async def fetch_unconsolidated(self):
        """Fetch extracted memories ready for consolidation."""
        return await supabase.table("extracted_memories")\
            .select("*")\
            .eq("consolidated", False)\
            .order("created_at")\
            .limit(100)\
            .execute()
    
    @listen(fetch_unconsolidated)
    async def consolidate(self, memories):
        """Main consolidation logic."""
        if not memories.data:
            return {"status": "no_work"}
        
        by_user = group_by(memories.data, "user_id")
        
        for user_id, user_memories in by_user.items():
            # Load existing consolidated for comparison
            existing = await self._load_consolidated(user_id)
            
            for memory in user_memories:
                # Step 1: Check for duplicates
                duplicate = await self._find_duplicate(memory, existing)
                
                if duplicate:
                    # Merge into existing
                    await self._merge(memory, duplicate)
                else:
                    # Create new consolidated memory
                    consolidated = await self._create_consolidated(memory)
                    
                    # Find related memories
                    related = await self._find_related(consolidated, existing)
                    if related:
                        await self._link_memories(consolidated.id, [r.id for r in related])
                    
                    # Check for promotion
                    if self._should_promote(consolidated):
                        await self._promote_to_longterm(consolidated)
                    
                    existing.append(consolidated)
                
                # Mark as consolidated
                await supabase.table("extracted_memories")\
                    .update({"consolidated": True, "consolidated_into": consolidated.id})\
                    .eq("id", memory["id"])\
                    .execute()
        
        return {"consolidated": len(memories.data)}
    
    async def _find_duplicate(self, memory, existing):
        """Find semantically duplicate memory."""
        # Fast path: embedding similarity
        similarities = await self._compute_similarities(
            memory["content_embedding"],
            [e.content_embedding for e in existing]
        )
        
        top_match_idx = np.argmax(similarities)
        if similarities[top_match_idx] >= self.SIMILARITY_THRESHOLD:
            # Verify with LLM
            candidate = existing[top_match_idx]
            is_dup = await self._llm_verify_duplicate(memory, candidate)
            if is_dup:
                return candidate
        
        return None
    
    async def _merge(self, new_memory, existing):
        """Merge new memory into existing."""
        # Use LLM to create merged content
        merged_content = await self._llm_merge(new_memory, existing)
        
        # Update existing memory
        await supabase.table("consolidated_memories")\
            .update({
                "content": merged_content,
                "content_embedding": await embed(merged_content),
                "importance_score": min(1.0, existing.importance_score + 0.1),
                "source_memories": existing.source_memories + [new_memory["id"]],
                "updated_at": now()
            })\
            .eq("id", existing.id)\
            .execute()
        
        # Log merge
        await self._log_merge(existing.id, [new_memory["id"]], "duplicate")
    
    def _should_promote(self, memory):
        """Determine if memory should be promoted to long-term."""
        return (
            memory.importance_score >= self.PROMOTION_THRESHOLD
            or memory.access_count >= 5
            or memory.memory_type in ["decision", "relationship"]
        )
```

---

### 3.3 Retriever Agent

**Purpose:** Find relevant context for the current conversation. This is the only synchronous agent—it must respond in <500ms.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| On-demand | Main agent requests context | Critical (P0) |
| Pre-fetch | Predictive load on session start | High |

**Note:** Unlike other agents, Retriever is invoked synchronously via RPC, not through event queue.

#### Input/Output

**Input:**
```python
@dataclass
class RetrievalRequest:
    user_id: UUID
    query: str  # Current conversation context / question
    session_id: str
    message_history: List[Message]  # Last N messages for context
    filters: Optional[RetrievalFilters]
    limit: int = 10
    timeout_ms: int = 500

@dataclass
class RetrievalFilters:
    memory_types: Optional[List[str]]
    topics: Optional[List[str]]
    time_range: Optional[TimeRange]
    min_importance: Optional[float]
    exclude_ids: Optional[List[UUID]]
```

**Output:**
```python
@dataclass
class RetrievalResponse:
    memories: List[RankedMemory]
    user_context: UserContext
    synthesized_context: str  # Ready to inject into prompt
    retrieval_time_ms: int
    cache_hit: bool

@dataclass
class RankedMemory:
    memory: ConsolidatedMemory
    relevance_score: float  # Combined score
    semantic_score: float
    recency_score: float
    importance_score: float
    match_explanation: str  # Why this memory was retrieved

@dataclass
class UserContext:
    recent_summary: str  # Last 24h
    active_projects: List[Project]
    pending_actions: List[ActionItem]
    key_preferences: Dict[str, Any]
    relationship_phase: str  # onboarding, established, etc.
```

#### State Management

**In-Memory Cache (Redis):**
```python
# User context cache - pre-computed, refreshed every 5 min
user_context:{user_id} → UserContext (TTL: 5 min)

# Query cache - recent queries with results
query_cache:{user_id}:{query_hash} → RetrievalResponse (TTL: 1 min)

# Hot memories - frequently accessed per user
hot_memories:{user_id} → List[UUID] (TTL: 15 min)
```

**Persistent State:**
```sql
CREATE TABLE retrieval_stats (
    user_id UUID NOT NULL,
    query_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    avg_latency_ms FLOAT,
    cache_hit_rate FLOAT,
    avg_results_returned FLOAT,
    PRIMARY KEY (user_id, query_date)
);
```

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Redis (cache) | Cache | No | Direct DB (slower) |
| Supabase (memories) | Database | Yes | Degrade gracefully |
| pgvector | Vector search | Yes | BM25 fallback |
| OpenAI Embeddings | API | Yes | Cached embeddings only |

#### Error Handling

**Critical: Never fail completely. Always return something.**

| Error Type | Action | Fallback |
|------------|--------|----------|
| Vector search timeout | Return cached context | Hot memories only |
| Embedding failure | Keyword search | Recent memories |
| Database unreachable | Return cached context | Empty with warning |
| All systems fail | Return minimal context | Session history only |

**Graceful Degradation Levels:**
```python
class DegradationLevel(Enum):
    FULL = "full"           # Vector + keyword + context
    REDUCED = "reduced"     # Vector only, no rerank
    CACHE_ONLY = "cache"    # Cached results only
    MINIMAL = "minimal"     # Hot memories only
    EMPTY = "empty"         # No context (last resort)

async def retrieve_with_degradation(request: RetrievalRequest):
    level = DegradationLevel.FULL
    
    try:
        return await full_retrieval(request)
    except TimeoutError:
        level = DegradationLevel.REDUCED
        try:
            return await vector_only(request)
        except Exception:
            level = DegradationLevel.CACHE_ONLY
            cached = await get_cached_context(request.user_id)
            if cached:
                return cached
            level = DegradationLevel.MINIMAL
            return await hot_memories_only(request.user_id)
    finally:
        await log_degradation(request.user_id, level)
```

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| P50 latency | <100ms | <200ms | >300ms |
| P95 latency | <300ms | <400ms | >500ms |
| P99 latency | <500ms | <750ms | >1000ms |
| Cache hit rate | >60% | >40% | <20% |
| Relevance (MRR@10) | >0.8 | >0.6 | <0.4 |

#### Implementation

```python
class RetrieverAgent:
    """Synchronous retrieval agent. Must be FAST."""
    
    def __init__(self):
        self.cache = Redis()
        self.db = Supabase()
        self.embedder = OpenAIEmbeddings()
    
    async def retrieve(self, request: RetrievalRequest) -> RetrievalResponse:
        start = time.monotonic()
        
        # Check query cache first
        cache_key = self._cache_key(request.user_id, request.query)
        cached = await self.cache.get(cache_key)
        if cached:
            return RetrievalResponse(**cached, cache_hit=True)
        
        # Parallel execution for speed
        query_embedding, user_context, hot_memories = await asyncio.gather(
            self._embed_query(request.query),
            self._get_user_context(request.user_id),
            self._get_hot_memories(request.user_id)
        )
        
        # Hybrid search: semantic + keyword
        semantic_results = await self._semantic_search(
            request.user_id,
            query_embedding,
            limit=request.limit * 2  # Over-fetch for reranking
        )
        
        keyword_results = await self._keyword_search(
            request.user_id,
            request.query,
            limit=request.limit
        )
        
        # Merge and rank
        merged = self._merge_results(semantic_results, keyword_results)
        ranked = self._rank_results(merged, query_embedding, request.limit)
        
        # Synthesize context
        synthesized = self._synthesize_context(ranked, user_context)
        
        # Record access for importance boost
        await self._record_access([m.memory.id for m in ranked])
        
        response = RetrievalResponse(
            memories=ranked,
            user_context=user_context,
            synthesized_context=synthesized,
            retrieval_time_ms=int((time.monotonic() - start) * 1000),
            cache_hit=False
        )
        
        # Cache result
        await self.cache.setex(cache_key, 60, response.dict())
        
        return response
    
    async def _semantic_search(self, user_id, embedding, limit):
        """Vector similarity search using pgvector."""
        return await self.db.rpc(
            "match_memories",
            {
                "query_embedding": embedding,
                "user_id": str(user_id),
                "match_threshold": 0.5,
                "match_count": limit
            }
        )
    
    async def _keyword_search(self, user_id, query, limit):
        """BM25-style keyword search."""
        return await self.db.rpc(
            "search_memories_text",
            {
                "query": query,
                "user_id": str(user_id),
                "limit": limit
            }
        )
    
    def _rank_results(self, memories, query_embedding, limit):
        """Rank using recency × importance × relevance."""
        scored = []
        for memory in memories:
            semantic_score = cosine_similarity(query_embedding, memory.content_embedding)
            recency_score = self._recency_score(memory.created_at)
            importance_score = memory.importance_score
            
            # Weighted combination
            combined = (
                0.5 * semantic_score +
                0.3 * importance_score +
                0.2 * recency_score
            )
            
            scored.append(RankedMemory(
                memory=memory,
                relevance_score=combined,
                semantic_score=semantic_score,
                recency_score=recency_score,
                importance_score=importance_score,
                match_explanation=self._explain_match(memory, semantic_score)
            ))
        
        scored.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored[:limit]
    
    def _synthesize_context(self, memories, user_context):
        """Format context for main agent prompt injection."""
        return f"""
## Relevant Memories
{self._format_memories(memories)}

## Current Context
- Recent activity: {user_context.recent_summary}
- Active projects: {', '.join(p.name for p in user_context.active_projects)}
- Pending actions: {len(user_context.pending_actions)} items
- Key preferences: {json.dumps(user_context.key_preferences, indent=2)}
"""
```

---

### 3.4 Voice Keeper Agent

**Purpose:** Monitor and maintain the AI's communication style, detecting drift and ensuring consistency with established voice patterns.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| Scheduled | Weekly (Sunday 4 AM) | Low |
| Threshold | Drift score > 0.3 detected | Normal |
| On-demand | User reports "you don't sound like yourself" | High |

#### Input/Output

**Input:**
```python
@dataclass
class VoiceKeeperInput:
    user_id: UUID
    recent_exchanges: List[Exchange]  # Last week's conversations
    established_voice_profile: VoiceProfile
    exemplar_samples: List[ExemplarExchange]  # Golden examples

@dataclass
class VoiceProfile:
    # Lexical features
    avg_sentence_length: float
    vocabulary_richness: float  # Type-token ratio
    formality_score: float  # 0 = casual, 1 = formal
    
    # Syntactic features
    question_frequency: float
    exclamation_frequency: float
    passive_voice_ratio: float
    
    # Semantic features
    emoji_usage: float
    humor_frequency: float
    empathy_markers: float
    directness_score: float
    
    # Phrases and patterns
    signature_phrases: List[str]
    avoided_phrases: List[str]
    topic_preferences: Dict[str, float]
```

**Output:**
```python
@dataclass
class VoiceKeeperOutput:
    current_profile: VoiceProfile
    drift_report: DriftReport
    recommendations: List[VoiceRecommendation]
    updated_exemplars: List[ExemplarExchange]

@dataclass
class DriftReport:
    overall_drift_score: float  # 0 = identical, 1 = completely different
    dimension_drifts: Dict[str, float]  # Per-dimension drift
    drift_direction: str  # "more_formal", "less_empathetic", etc.
    concerning_patterns: List[str]
    sample_comparisons: List[Comparison]

@dataclass
class VoiceRecommendation:
    dimension: str
    current_value: float
    target_value: float
    action: str  # "increase_humor", "use_more_questions", etc.
    example_fix: str
```

#### State Management

**Persistent State:**
```sql
CREATE TABLE voice_profiles (
    user_id UUID PRIMARY KEY,
    profile JSONB NOT NULL,
    exemplars JSONB,  -- Golden example exchanges
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE voice_drift_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    analysis_date DATE NOT NULL,
    drift_score FLOAT NOT NULL,
    dimension_scores JSONB,
    recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Supabase (raw_captures) | Database | Yes | Fail |
| Claude Sonnet | LLM | Yes | Queue for later |
| spaCy | NLP | No | LLM-only analysis |
| textstat | Metrics | No | Basic counting |

#### Error Handling

| Error Type | Action | Impact |
|------------|--------|--------|
| Insufficient data | Skip analysis, note in report | Low - wait for more data |
| LLM timeout | Retry with smaller sample | Medium |
| Profile not found | Create baseline from recent | Medium |

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Analysis completion | <5 min | <15 min | >30 min |
| Drift detection accuracy | >90% | >80% | <70% |
| False positive rate | <5% | <10% | >20% |

#### Implementation

```python
class VoiceKeeperFlow(Flow):
    
    DRIFT_THRESHOLD = 0.3  # Alert if drift exceeds this
    
    @start()
    async def load_data(self):
        """Load recent exchanges and voice profile."""
        # Load profile
        profile = await supabase.table("voice_profiles")\
            .select("*")\
            .eq("user_id", self.state["user_id"])\
            .single()\
            .execute()
        
        # Load recent AI responses
        recent = await supabase.table("raw_captures")\
            .select("*")\
            .eq("user_id", self.state["user_id"])\
            .eq("role", "assistant")\
            .gte("timestamp", week_ago())\
            .execute()
        
        return {
            "profile": profile.data,
            "recent": recent.data
        }
    
    @listen(load_data)
    async def analyze_voice(self, data):
        """Analyze current voice against established profile."""
        if not data["profile"]:
            # No profile yet - create baseline
            return await self._create_baseline(data["recent"])
        
        profile = VoiceProfile(**data["profile"]["profile"])
        current = await self._compute_current_profile(data["recent"])
        
        drift = self._compute_drift(profile, current)
        
        if drift.overall_drift_score > self.DRIFT_THRESHOLD:
            recommendations = await self._generate_recommendations(
                profile, current, drift
            )
        else:
            recommendations = []
        
        # Store drift history
        await supabase.table("voice_drift_history").insert({
            "user_id": str(self.state["user_id"]),
            "analysis_date": today(),
            "drift_score": drift.overall_drift_score,
            "dimension_scores": drift.dimension_drifts,
            "recommendations": [r.dict() for r in recommendations]
        }).execute()
        
        return VoiceKeeperOutput(
            current_profile=current,
            drift_report=drift,
            recommendations=recommendations,
            updated_exemplars=[]
        )
    
    async def _compute_current_profile(self, exchanges):
        """Compute voice profile from recent exchanges."""
        texts = [e["content"] for e in exchanges]
        combined = " ".join(texts)
        
        # Lexical analysis
        sentences = sent_tokenize(combined)
        words = word_tokenize(combined)
        
        return VoiceProfile(
            avg_sentence_length=len(words) / len(sentences),
            vocabulary_richness=len(set(words)) / len(words),
            formality_score=await self._analyze_formality(combined),
            question_frequency=sum(1 for s in sentences if s.endswith("?")) / len(sentences),
            exclamation_frequency=sum(1 for s in sentences if s.endswith("!")) / len(sentences),
            passive_voice_ratio=await self._count_passive(sentences) / len(sentences),
            emoji_usage=len(re.findall(r'[\U0001F600-\U0001F64F]', combined)) / len(texts),
            humor_frequency=await self._detect_humor_frequency(texts),
            empathy_markers=await self._count_empathy_markers(combined),
            directness_score=await self._analyze_directness(texts),
            signature_phrases=await self._extract_signature_phrases(texts),
            avoided_phrases=[],
            topic_preferences={}
        )
    
    def _compute_drift(self, baseline: VoiceProfile, current: VoiceProfile) -> DriftReport:
        """Compute drift between profiles."""
        dimensions = [
            "avg_sentence_length", "vocabulary_richness", "formality_score",
            "question_frequency", "emoji_usage", "humor_frequency",
            "empathy_markers", "directness_score"
        ]
        
        dimension_drifts = {}
        for dim in dimensions:
            baseline_val = getattr(baseline, dim)
            current_val = getattr(current, dim)
            if baseline_val > 0:
                drift = abs(current_val - baseline_val) / baseline_val
            else:
                drift = current_val
            dimension_drifts[dim] = drift
        
        overall = sum(dimension_drifts.values()) / len(dimension_drifts)
        
        # Determine drift direction
        if current.formality_score > baseline.formality_score:
            direction = "more_formal"
        elif current.empathy_markers < baseline.empathy_markers:
            direction = "less_empathetic"
        else:
            direction = "stable"
        
        return DriftReport(
            overall_drift_score=overall,
            dimension_drifts=dimension_drifts,
            drift_direction=direction,
            concerning_patterns=[],
            sample_comparisons=[]
        )
```

---

### 3.5 Curator Agent

**Purpose:** Decide memory importance, manage lifecycle transitions, and determine what should be remembered vs. forgotten.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| Scheduled | Daily (3 AM) | Normal |
| Event-driven | Memory accessed | Low (aggregate) |
| Threshold | >1000 memories in "short" tier | Normal |

#### Input/Output

**Input:**
```python
@dataclass
class CuratorInput:
    user_id: UUID
    memories_to_review: List[ConsolidatedMemory]
    access_patterns: Dict[UUID, AccessPattern]
    user_preferences: CurationPreferences

@dataclass
class AccessPattern:
    memory_id: UUID
    access_count: int
    last_accessed: datetime
    access_contexts: List[str]  # What queries triggered access

@dataclass
class CurationPreferences:
    retention_bias: float  # 0 = aggressive pruning, 1 = keep everything
    protected_topics: List[str]  # Never demote these
    explicit_forgets: List[UUID]  # User said "forget this"
```

**Output:**
```python
@dataclass
class CuratorOutput:
    promotions: List[TierChange]  # short → medium → long
    demotions: List[TierChange]  # long → medium → short
    archives: List[UUID]  # Send to Archivist
    importance_updates: List[ImportanceUpdate]
    deletions: List[UUID]  # Only explicit user requests

@dataclass
class TierChange:
    memory_id: UUID
    from_tier: str
    to_tier: str
    reason: str
    new_importance: float

@dataclass
class ImportanceUpdate:
    memory_id: UUID
    old_importance: float
    new_importance: float
    factors: Dict[str, float]  # What contributed
```

#### State Management

**Persistent State:**
```sql
CREATE TABLE curation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    curation_date DATE NOT NULL,
    promotions INTEGER DEFAULT 0,
    demotions INTEGER DEFAULT 0,
    archives INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track why importance changed
CREATE TABLE importance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL,
    old_importance FLOAT NOT NULL,
    new_importance FLOAT NOT NULL,
    factors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Supabase (memories) | Database | Yes | Fail |
| Retrieval stats | Analytics | No | Use access_count only |
| User preferences | Config | No | Use defaults |

#### Error Handling

| Error Type | Action | Impact |
|------------|--------|--------|
| Importance calculation fails | Keep current importance | Low |
| Tier update fails | Retry next cycle | Low |
| Mass deletion triggered | Require confirmation | High - block |

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Curation time | <10 min/user | <30 min | >1 hour |
| Importance accuracy | >85% | >75% | <60% |
| Over-deletion rate | <1% | <3% | >5% |

#### Importance Algorithm

```python
class CuratorFlow(Flow):
    
    @start()
    async def load_memories(self):
        """Load memories due for curation."""
        return await supabase.table("consolidated_memories")\
            .select("*, retrieval_stats(*)")\
            .eq("user_id", self.state["user_id"])\
            .lt("last_curated_at", days_ago(7))\
            .limit(500)\
            .execute()
    
    @listen(load_memories)
    async def curate(self, memories):
        """Apply curation logic to memories."""
        results = CuratorOutput(
            promotions=[], demotions=[], archives=[],
            importance_updates=[], deletions=[]
        )
        
        for memory in memories.data:
            new_importance = self._calculate_importance(memory)
            
            # Update importance if changed significantly
            if abs(new_importance - memory["importance_score"]) > 0.1:
                results.importance_updates.append(ImportanceUpdate(
                    memory_id=memory["id"],
                    old_importance=memory["importance_score"],
                    new_importance=new_importance,
                    factors=self._importance_factors(memory)
                ))
            
            # Determine tier
            new_tier = self._determine_tier(memory, new_importance)
            if new_tier != memory["tier"]:
                change = TierChange(
                    memory_id=memory["id"],
                    from_tier=memory["tier"],
                    to_tier=new_tier,
                    reason=self._tier_reason(memory, new_tier),
                    new_importance=new_importance
                )
                
                if new_tier > memory["tier"]:
                    results.promotions.append(change)
                else:
                    results.demotions.append(change)
            
            # Check for archival
            if self._should_archive(memory, new_importance):
                results.archives.append(memory["id"])
        
        await self._apply_changes(results)
        return results
    
    def _calculate_importance(self, memory) -> float:
        """Calculate memory importance using multiple factors."""
        factors = self._importance_factors(memory)
        
        # Weighted combination
        weights = {
            "base_importance": 0.3,
            "access_frequency": 0.2,
            "recency": 0.15,
            "type_weight": 0.15,
            "emotional_weight": 0.1,
            "reinforcement": 0.1
        }
        
        return sum(factors[k] * weights[k] for k in weights)
    
    def _importance_factors(self, memory) -> Dict[str, float]:
        """Compute individual importance factors."""
        age_days = (now() - memory["created_at"]).days
        
        return {
            "base_importance": memory["importance_score"],
            "access_frequency": min(1.0, memory["access_count"] / 10),
            "recency": self._recency_decay(age_days),
            "type_weight": self._type_weight(memory["memory_type"]),
            "emotional_weight": abs(memory.get("emotional_valence", 0)),
            "reinforcement": min(1.0, len(memory["source_memories"]) / 5)
        }
    
    def _recency_decay(self, age_days: int) -> float:
        """Ebbinghaus-inspired decay curve."""
        # Fast initial decay, then slowing
        stability = 1.0  # Would be per-memory in full SM-2
        return math.exp(-age_days / (30 * stability))
    
    def _type_weight(self, memory_type: str) -> float:
        """Weight by memory type."""
        weights = {
            "decision": 0.9,
            "relationship": 0.85,
            "preference": 0.7,
            "action_item": 0.6,
            "fact": 0.5,
            "event": 0.4
        }
        return weights.get(memory_type, 0.5)
    
    def _determine_tier(self, memory, importance: float) -> str:
        """Determine appropriate tier based on importance."""
        if importance >= 0.8:
            return "long"
        elif importance >= 0.4:
            return "medium"
        else:
            return "short"
    
    def _should_archive(self, memory, importance: float) -> bool:
        """Determine if memory should be archived."""
        age_days = (now() - memory["created_at"]).days
        
        return (
            importance < 0.2
            and age_days > 90
            and memory["access_count"] < 3
            and memory["memory_type"] not in ["decision", "relationship"]
        )
```

---

### 3.6 Archivist Agent

**Purpose:** Compress old memories, manage long-term storage, and handle archival/retrieval of historical data.

#### Trigger Conditions

| Trigger Type | Condition | Priority |
|--------------|-----------|----------|
| Scheduled | Monthly (1st of month, 2 AM) | Lowest |
| Event-driven | Archive queue > 100 items | Low |
| Storage pressure | User approaching storage limit | Normal |

#### Input/Output

**Input:**
```python
@dataclass
class ArchivistInput:
    user_id: UUID
    memories_to_archive: List[ConsolidatedMemory]
    archive_policy: ArchivePolicy
    storage_budget_mb: float

@dataclass
class ArchivePolicy:
    compression_strategy: Literal["summarize", "cluster", "full"]
    retention_years: int
    retrievable: bool  # Can archived memories be restored?
    preserve_embeddings: bool
```

**Output:**
```python
@dataclass
class ArchivistOutput:
    archived: List[ArchivedMemory]
    compressed_summaries: List[CompressedSummary]
    storage_saved_mb: float
    archive_stats: ArchiveStats

@dataclass
class ArchivedMemory:
    id: UUID
    original_id: UUID
    user_id: UUID
    compressed_content: str  # Summarized version
    original_hash: str  # For verification if restored
    archived_at: datetime
    retrievable: bool
    metadata: Dict  # Preserved for search

@dataclass
class CompressedSummary:
    id: UUID
    user_id: UUID
    time_period: str  # "2025-Q4", "2025-12", etc.
    summary: str
    memory_count: int
    key_topics: List[str]
    important_decisions: List[str]
```

#### State Management

**Archive Storage:**
```sql
-- Archived memories (separate table for performance)
CREATE TABLE archived_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_id UUID NOT NULL,
    user_id UUID NOT NULL,
    compressed_content TEXT NOT NULL,
    original_hash TEXT NOT NULL,  -- SHA-256 of original
    metadata JSONB,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    retrievable BOOLEAN DEFAULT TRUE
);

-- Period summaries (monthly/quarterly)
CREATE TABLE period_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    period_type TEXT NOT NULL,  -- 'month', 'quarter', 'year'
    period_value TEXT NOT NULL,  -- '2025-12', '2025-Q4', '2025'
    summary TEXT NOT NULL,
    memory_count INTEGER,
    key_topics TEXT[],
    important_decisions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_type, period_value)
);
```

#### Dependencies

| Dependency | Type | Required | Fallback |
|------------|------|----------|----------|
| Supabase (memories) | Database | Yes | Fail |
| Claude Sonnet | LLM | Yes | Queue for later |
| Object storage | Storage | No | Keep in Postgres |

#### Error Handling

| Error Type | Action | Impact |
|------------|--------|--------|
| Compression fails | Keep original, retry | Low |
| Summary generation fails | Archive without summary | Medium |
| Hash verification fails | Alert, don't archive | High |

#### Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Archive completion | <1 hour/user | <4 hours | >8 hours |
| Compression ratio | 10:1 | 5:1 | <3:1 |
| Summary quality | >90% key info retained | >80% | <70% |

#### Implementation

```python
class ArchivistFlow(Flow):
    
    @start()
    async def fetch_archive_queue(self):
        """Get memories queued for archival."""
        # Get from Curator's archive queue
        return await supabase.table("consolidated_memories")\
            .select("*")\
            .eq("user_id", self.state["user_id"])\
            .eq("archive_pending", True)\
            .execute()
    
    @listen(fetch_archive_queue)
    async def compress_and_archive(self, memories):
        """Compress memories and move to archive."""
        if not memories.data:
            return {"status": "no_work"}
        
        # Group by time period for efficient summarization
        by_period = self._group_by_period(memories.data, "month")
        
        results = ArchivistOutput(
            archived=[], compressed_summaries=[],
            storage_saved_mb=0, archive_stats=ArchiveStats()
        )
        
        for period, period_memories in by_period.items():
            # Create period summary
            summary = await self._create_period_summary(period, period_memories)
            results.compressed_summaries.append(summary)
            
            # Archive individual memories
            for memory in period_memories:
                archived = await self._archive_memory(memory)
                results.archived.append(archived)
                
                # Remove from active store
                await supabase.table("consolidated_memories")\
                    .delete()\
                    .eq("id", memory["id"])\
                    .execute()
                
                results.storage_saved_mb += self._estimate_size(memory)
        
        return results
    
    async def _create_period_summary(self, period: str, memories: List) -> CompressedSummary:
        """Create a summary of memories from a time period."""
        summarizer = Agent(
            role="Memory Summarizer",
            goal="Create concise summaries of time periods",
            model="claude-sonnet-4-20250514"
        )
        
        # Prepare memory content
        content = "\n\n".join([
            f"[{m['memory_type']}] {m['content']}"
            for m in memories
        ])
        
        task = Task(
            description=f"""
            Summarize these memories from {period}:
            
            {content}
            
            Create a summary that:
            1. Captures key decisions made
            2. Notes important preferences discovered
            3. Highlights relationship developments
            4. Preserves any action items that may still be relevant
            
            Keep it concise but complete.
            """,
            expected_output="Structured summary with sections"
        )
        
        summary_text = await summarizer.execute_async(task)
        
        return CompressedSummary(
            id=uuid4(),
            user_id=self.state["user_id"],
            time_period=period,
            summary=summary_text,
            memory_count=len(memories),
            key_topics=self._extract_topics(memories),
            important_decisions=self._extract_decisions(memories)
        )
    
    async def _archive_memory(self, memory) -> ArchivedMemory:
        """Archive a single memory."""
        # Compress content
        compressed = await self._compress_content(memory["content"])
        
        # Create hash for verification
        original_hash = hashlib.sha256(
            memory["content"].encode()
        ).hexdigest()
        
        # Store in archive
        archived = ArchivedMemory(
            id=uuid4(),
            original_id=memory["id"],
            user_id=memory["user_id"],
            compressed_content=compressed,
            original_hash=original_hash,
            archived_at=now(),
            retrievable=True,
            metadata={
                "memory_type": memory["memory_type"],
                "topics": memory["topics"],
                "importance_score": memory["importance_score"],
                "created_at": memory["created_at"].isoformat()
            }
        )
        
        await supabase.table("archived_memories").insert(
            archived.dict()
        ).execute()
        
        return archived
    
    async def _compress_content(self, content: str) -> str:
        """Compress memory content while preserving key information."""
        if len(content) < 100:
            return content  # Already short enough
        
        compressor = Agent(
            role="Content Compressor",
            goal="Reduce content while preserving meaning",
            model="claude-3-5-haiku-20241022"
        )
        
        task = Task(
            description=f"""
            Compress this memory to ~50% of its length while preserving:
            - Key facts
            - Names and entities
            - Dates and numbers
            - Decisions and preferences
            
            Content: {content}
            """,
            expected_output="Compressed content"
        )
        
        return await compressor.execute_async(task)
```

---

## 4. Conflict Resolution

### 4.1 Types of Conflicts

| Conflict Type | Example | Resolution |
|---------------|---------|------------|
| **Concurrent Write** | Two agents updating same memory | Last-write-wins + merge log |
| **Contradictory Facts** | "User likes coffee" vs "User hates coffee" | Newer supersedes, keep both |
| **Importance Disagreement** | Extractor: 0.9, Curator: 0.3 | Curator wins (authoritative) |
| **Tier Conflict** | Consolidator promotes, Curator demotes | Curator wins (lifecycle owner) |
| **Resource Contention** | Multiple agents hitting LLM rate limit | Priority queue |

### 4.2 Resolution Strategies

**Strategy 1: Authority Hierarchy**
```
Retriever > Curator > Consolidator > Extractor > Voice Keeper > Archivist
```
Higher authority agent's decision wins in conflicts.

**Strategy 2: Optimistic Locking**
```sql
UPDATE consolidated_memories
SET content = $new_content, version = version + 1
WHERE id = $id AND version = $expected_version
RETURNING *;
```
If version mismatch, reload and retry.

**Strategy 3: Event Sourcing**
```
Never mutate, only append events.
Current state = fold(events)
```
All changes are events; conflicts become just different event orderings.

### 4.3 Conflict Detection & Logging

```sql
CREATE TABLE conflict_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type TEXT NOT NULL,
    agent_a TEXT NOT NULL,
    agent_b TEXT NOT NULL,
    resource_id UUID,
    agent_a_action JSONB,
    agent_b_action JSONB,
    resolution TEXT,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Deployment Topology

### 5.1 Single-Instance Deployment (Development)

```
┌─────────────────────────────────────────────────────────────┐
│                    Single Server                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Main App   │  │    Redis     │  │   Postgres   │       │
│  │  (Clawdbot)  │  │   (Events)   │  │  (Supabase)  │       │
│  └──────┬───────┘  └──────────────┘  └──────────────┘       │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Agent Runner (Inngest)               │       │
│  │                                                   │       │
│  │  • Extractor (cron: */5 * * * *)                 │       │
│  │  • Consolidator (cron: 0 * * * *)                │       │
│  │  • Curator (cron: 0 3 * * *)                     │       │
│  │  • Voice Keeper (cron: 0 4 * * 0)                │       │
│  │  • Archivist (cron: 0 2 1 * *)                   │       │
│  │  • Retriever (on-demand, always warm)            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Production Deployment (Multi-User)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Load Balancer                                   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌────────────────────────┬┴┬────────────────────────┐
        │                        │ │                        │
        ▼                        ▼ ▼                        ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│  App Server 1 │        │  App Server 2 │        │  App Server N │
│  (Clawdbot)   │        │  (Clawdbot)   │        │  (Clawdbot)   │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Redis Cluster                                      │
│                   (Events, Caching, Session State)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Agent Worker Pool                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Retriever   │  │ Retriever   │  │ Retriever   │  │ Retriever   │        │
│  │ Worker 1    │  │ Worker 2    │  │ Worker 3    │  │ Worker N    │        │
│  │ (P0, Hot)   │  │ (P0, Hot)   │  │ (P0, Hot)   │  │ (P0, Hot)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │ Extractor   │  │ Extractor   │  │ Extractor   │   (Auto-scale)          │
│  │ Worker 1    │  │ Worker 2    │  │ Worker 3    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐                                          │
│  │Consolidator │  │ Curator     │   (Fixed capacity)                       │
│  │ Worker      │  │ Worker      │                                          │
│  └─────────────┘  └─────────────┘                                          │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐                                          │
│  │Voice Keeper │  │ Archivist   │   (Single instance, low priority)        │
│  │ Worker      │  │ Worker      │                                          │
│  └─────────────┘  └─────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Supabase (Postgres + pgvector)                         │
│                                                                              │
│  Primary (RW) ────────────────► Replica 1 (RO) ────► Replica 2 (RO)         │
│                                                                              │
│  • raw_captures                                                              │
│  • extracted_memories                                                        │
│  • consolidated_memories                                                     │
│  • archived_memories                                                         │
│  • user_context                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Scaling Considerations

| Component | Scaling Strategy | Trigger |
|-----------|------------------|---------|
| Retriever | Horizontal (add workers) | P95 latency > 300ms |
| Extractor | Horizontal (auto-scale) | Queue depth > 100 |
| Consolidator | Vertical (more memory) | Processing time > 2h |
| Database | Read replicas | Query latency > 50ms |
| Redis | Cluster mode | Memory > 80% |

---

## 6. Monitoring & Observability

### 6.1 Key Metrics

**Agent Health Metrics:**
```python
# Per-agent metrics
agent_runs_total{agent="extractor", status="success|failure"}
agent_run_duration_seconds{agent="extractor"}
agent_queue_depth{agent="extractor"}
agent_error_rate{agent="extractor"}

# Memory metrics
memories_total{user_id, tier="short|medium|long"}
memories_extracted_total{user_id}
memories_consolidated_total{user_id}
memories_archived_total{user_id}

# Retrieval metrics
retrieval_latency_seconds{quantile="0.5|0.95|0.99"}
retrieval_cache_hit_rate{}
retrieval_results_count{}
retrieval_relevance_score{}
```

### 6.2 Alerting Rules

```yaml
# Critical alerts (page immediately)
- alert: RetrieverLatencyHigh
  expr: histogram_quantile(0.99, retrieval_latency_seconds) > 0.5
  for: 5m
  severity: critical
  
- alert: ExtractorBacklogCritical
  expr: agent_queue_depth{agent="extractor"} > 1000
  for: 15m
  severity: critical

# Warning alerts (Slack notification)
- alert: ConsolidatorFailing
  expr: rate(agent_runs_total{agent="consolidator", status="failure"}[1h]) > 0.1
  severity: warning
  
- alert: VoiceDriftHigh
  expr: voice_drift_score > 0.4
  for: 24h
  severity: warning
```

### 6.3 Dashboard Design

**Dashboard: Memory Agent Swarm Overview**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MEMORY AGENT SWARM - Overview                                  [Last 24h ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  EXTRACTOR  │  │CONSOLIDATOR │  │  RETRIEVER  │  │   CURATOR   │        │
│  │     ✓ OK    │  │    ✓ OK     │  │    ✓ OK     │  │    ✓ OK     │        │
│  │  23.4k/day  │  │   1.2k/day  │  │   5.6k/day  │  │    142/day  │        │
│  │   <2 min    │  │    <45 min  │  │    <150ms   │  │    <8 min   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ RETRIEVAL LATENCY (P99)                                            │     │
│  │  200ms ─────────────────────────────────────────────────────────── │     │
│  │         ╭───╮           ╭───╮                                      │     │
│  │  100ms ─╯   ╰───────────╯   ╰──────────────────────────────────── │     │
│  │                                                                    │     │
│  │  0ms ────────────────────────────────────────────────────────────  │     │
│  │       00:00    06:00    12:00    18:00    00:00                   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ MEMORY DISTRIBUTION                                                │     │
│  │                                                                    │     │
│  │  Short-term:  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  32,456    │     │
│  │  Medium-term: ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  18,234    │     │
│  │  Long-term:   ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8,901    │     │
│  │  Archived:    ████████████████████░░░░░░░░░░░░░░░░░░░░  45,678    │     │
│  │                                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ AGENT QUEUE DEPTHS              │  │ ERROR RATES (last 1h)           │  │
│  │                                 │  │                                 │  │
│  │ Extractor:     12 pending       │  │ Extractor:     0.2%            │  │
│  │ Consolidator:  45 pending       │  │ Consolidator:  0.0%            │  │
│  │ Curator:       0 pending        │  │ Retriever:     0.1%            │  │
│  │ Archivist:     234 pending      │  │ Curator:       0.0%            │  │
│  │                                 │  │ Voice Keeper:  0.0%            │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Logging Strategy

```python
# Structured logging format
{
    "timestamp": "2026-02-16T10:30:00.000Z",
    "level": "info",
    "agent": "extractor",
    "user_id": "uuid",
    "session_id": "session-123",
    "action": "extract_memories",
    "duration_ms": 234,
    "memories_extracted": 3,
    "capture_id": "uuid",
    "trace_id": "trace-xyz"
}
```

**Log Levels by Agent:**
| Agent | Normal | Debug | Error |
|-------|--------|-------|-------|
| Retriever | Request/response summary | Full query, all results | Timeout, fallback used |
| Extractor | Batch summary | Each extraction | LLM failure, parse error |
| Consolidator | Merge summary | Similarity scores | Conflict detected |
| Curator | Daily summary | Each decision | Mass change blocked |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Raw capture and basic extraction

| Task | Owner | Deliverable |
|------|-------|-------------|
| Create raw_captures table | Backend | Schema deployed |
| Implement capture hook | Backend | Every message captured |
| Build Extractor v1 | Agent Dev | Basic extraction working |
| Set up Inngest | DevOps | Scheduler operational |

**Success Criteria:**
- [ ] 100% of conversations captured
- [ ] Extractor running every 5 min
- [ ] Memories appearing in extracted_memories table

### Phase 2: Retrieval (Week 3-4)

**Goal:** Working retrieval with <500ms latency

| Task | Owner | Deliverable |
|------|-------|-------------|
| Build Retriever Agent | Agent Dev | Retrieval API |
| Implement caching layer | Backend | Redis integration |
| Integrate with main agent | Integration | Context injection |
| Performance tuning | Backend | P95 < 300ms |

**Success Criteria:**
- [ ] Retriever responding in <500ms P99
- [ ] Main agent receiving relevant context
- [ ] Cache hit rate > 50%

### Phase 3: Consolidation (Week 5-6)

**Goal:** Memory deduplication and organization

| Task | Owner | Deliverable |
|------|-------|-------------|
| Build Consolidator Agent | Agent Dev | Dedup working |
| Build Curator Agent | Agent Dev | Importance scoring |
| Implement tier management | Backend | Memory tiers |
| Conflict resolution | Backend | Logging, resolution |

**Success Criteria:**
- [ ] Duplicate rate < 5%
- [ ] Memories correctly tiered
- [ ] No data loss from conflicts

### Phase 4: Voice & Archive (Week 7-8)

**Goal:** Long-term maintenance

| Task | Owner | Deliverable |
|------|-------|-------------|
| Build Voice Keeper | Agent Dev | Drift detection |
| Build Archivist | Agent Dev | Compression working |
| Implement period summaries | Agent Dev | Monthly summaries |
| Full monitoring | DevOps | Dashboards live |

**Success Criteria:**
- [ ] Voice drift detectable
- [ ] Archived memories searchable
- [ ] All dashboards operational

### Phase 5: Production Hardening (Week 9-10)

**Goal:** Production-ready system

| Task | Owner | Deliverable |
|------|-------|-------------|
| Load testing | QA | Performance validated |
| Failure injection | QA | Recovery tested |
| User override flows | UX | "Forget this" working |
| Documentation | All | Runbooks complete |

**Success Criteria:**
- [ ] System handles 10x expected load
- [ ] Recovery from all failure modes tested
- [ ] On-call runbook complete

---

## Appendix A: Database Schema Summary

```sql
-- Full schema for reference
-- See individual agent sections for details

-- Core tables
CREATE TABLE raw_captures (...);
CREATE TABLE extracted_memories (...);
CREATE TABLE consolidated_memories (...);
CREATE TABLE archived_memories (...);
CREATE TABLE user_context (...);

-- Summary tables
CREATE TABLE daily_summaries (...);
CREATE TABLE weekly_summaries (...);
CREATE TABLE period_summaries (...);

-- Voice/Style
CREATE TABLE voice_profiles (...);
CREATE TABLE voice_drift_history (...);

-- Agent state
CREATE TABLE extractor_state (...);
CREATE TABLE consolidator_state (...);
CREATE TABLE curation_history (...);
CREATE TABLE importance_audit (...);

-- Operational
CREATE TABLE conflict_log (...);
CREATE TABLE merge_history (...);
```

---

## Appendix B: Configuration Reference

```yaml
# agents.yaml
agents:
  extractor:
    schedule: "*/5 * * * *"
    model: "claude-3-5-haiku-20241022"
    batch_size: 50
    timeout_seconds: 300
    retry_count: 3
    
  consolidator:
    schedule: "0 * * * *"
    model: "claude-sonnet-4-20250514"
    similarity_threshold: 0.92
    timeout_seconds: 600
    retry_count: 2
    
  retriever:
    model: "none"  # Logic only, no LLM
    cache_ttl_seconds: 60
    timeout_ms: 500
    fallback_levels:
      - "reduced"
      - "cache_only"
      - "minimal"
    
  curator:
    schedule: "0 3 * * *"
    model: "claude-3-5-haiku-20241022"
    promotion_threshold: 0.8
    archive_threshold: 0.2
    
  voice_keeper:
    schedule: "0 4 * * 0"
    model: "claude-sonnet-4-20250514"
    drift_threshold: 0.3
    min_samples: 50
    
  archivist:
    schedule: "0 2 1 * *"
    model: "claude-sonnet-4-20250514"
    compression_target: 0.5
    retention_years: 7
```

---

## Appendix C: Cost Estimates

**Assumptions:**
- 1,000 active users
- 50 messages/user/day average
- Claude 3.5 Haiku: $0.25/1M input, $1.25/1M output
- Claude Sonnet: $3/1M input, $15/1M output
- OpenAI ada-002 embeddings: $0.10/1M tokens

**Monthly Costs:**

| Component | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| Raw Capture Storage | 1.5M messages × 500 tokens avg | ~$50 (Supabase) |
| Embedding Generation | 1.5M × 500 tokens | ~$75 |
| Extractor (Haiku) | 1.5M × 200 tokens out | ~$375 |
| Consolidator (Sonnet) | 50K × 500 tokens out | ~$375 |
| Retriever | No LLM, just queries | ~$0 |
| Curator (Haiku) | 1K runs × 1K tokens | ~$5 |
| Voice Keeper (Sonnet) | 1K runs × 2K tokens | ~$60 |
| Archivist (Sonnet) | 100 runs × 5K tokens | ~$75 |
| **Total** | | **~$1,015/month** |

**Per-user cost:** ~$1.02/user/month for full memory management.

---

*Document complete. The Memory Agent Swarm architecture provides bulletproof, automatic memory management through specialized background agents.*

— Jordan 🧭
