# Multi-Tenant Memory Systems at Scale for AI Applications

**A Technical Analysis for the Amigo AI Assistant Platform**

*Research Report — March 2026*

---

## Executive Summary

This report examines the architectural patterns, technology options, and economic considerations for building a multi-tenant memory system capable of serving 100,000+ concurrent users with persistent, personalized conversation memory. The analysis focuses on four primary vector database solutions (Pinecone, Weaviate, Qdrant, and pgvector), evaluates memory architecture patterns drawn from recent academic research, and provides cost projections across various scale scenarios.

**Key Findings:**

1. **Multi-tenancy is economically viable at scale** — Per-user memory costs can be reduced to $0.01–0.05/user/month at 100K+ users through proper architecture choices.

2. **Namespace-based isolation is optimal** — Pinecone's serverless architecture with namespace-per-tenant provides the best balance of isolation, performance, and cost efficiency.

3. **Memory consolidation is critical** — Without consolidation, embedding costs grow unbounded; LLM-based summarization can reduce storage by 85-95% while preserving semantic value.

4. **Hybrid storage with hot/cold tiering** — Essential at scale; Weaviate and Qdrant offer native tenant offloading to cold storage, reducing costs by 60-80%.

5. **pgvector offers compelling economics** — For organizations already on PostgreSQL, pgvector provides 70-75% cost reduction versus managed vector databases, with acceptable performance trade-offs.

**Recommendation for Amigo:** A hybrid architecture using Qdrant Cloud for active memory with hot/cold tiering, combined with PostgreSQL/pgvector for archival memory consolidation, provides the optimal balance of cost, performance, and operational simplicity at the target 100K+ user scale.

---

## 1. Current State of the Art

### 1.1 The Memory Problem in AI Assistants

Modern large language models operate within finite context windows (4K–200K tokens), creating a fundamental tension between conversation continuity and computational cost. Each interaction requires reconstructing relevant context, leading to:

- **Token inefficiency**: Repeating user preferences and history consumes 30-60% of available context in long-running conversations
- **User experience degradation**: Users must re-explain preferences, creating friction
- **Loss of personalization**: Without persistent memory, each session starts from zero

The seminal "Generative Agents" paper (Park et al., 2023) demonstrated that believable AI agents require three memory components:

1. **Observation stream**: Raw records of experiences stored in natural language
2. **Reflection synthesis**: Higher-level abstractions derived from observations
3. **Dynamic retrieval**: Context-appropriate memory retrieval for behavior planning

This architecture has been validated by subsequent implementations including Mem0, LangChain Memory, and various commercial AI assistant platforms.

### 1.2 Memory Architecture Taxonomy

Contemporary AI memory systems employ one or more of the following patterns:

**Short-Term Memory (Working Memory)**
- In-context learning via conversation history
- Limited by context window size
- No persistence across sessions
- Cost: Direct token charges per interaction

**Long-Term Memory (Retrieval-Augmented)**
- Vector embeddings stored in external databases
- Semantic similarity search for retrieval
- Persists indefinitely
- Cost: Storage + retrieval + embedding generation

**Episodic Memory**
- Temporal sequences of experiences
- Enables "time travel" queries ("What did we discuss last Tuesday?")
- Requires metadata indexing beyond vector similarity

**Semantic Memory**
- Factual knowledge extracted from conversations
- Graph structures for relationship modeling
- Higher extraction cost, lower retrieval cost

### 1.3 Industry Benchmarks

Mem0's published research (Chhikara et al., 2025) establishes important benchmarks:

- **+26% accuracy** over OpenAI Memory on LOCOMO benchmark
- **91% faster responses** than full-context approaches
- **90% reduction in token usage** compared to full context window utilization

These results validate the economic and performance case for external memory systems.

---

## 2. Vector Database Technical Analysis

### 2.1 Pinecone

**Architecture**: Serverless, fully managed vector database with namespace-based isolation.

**Multi-Tenancy Model**: 
- **Namespace isolation** (recommended): Each tenant gets a dedicated namespace within a shared index. Namespaces provide physical isolation in the serverless architecture.
- Up to 100,000 namespaces per index
- Query cost scales with namespace size, not total index size (1 RU per 1 GB queried)

**Scale Limits**:
- Up to 2,000 dimensions for dense vectors
- No explicit vector count limits (serverless scales automatically)
- 20 indexes per project (Standard), 200 indexes (Enterprise)

**Pricing (Standard Plan, 2026)**:
| Dimension | Cost |
|-----------|------|
| Storage | $0.33/GB/month |
| Write Units | $4 per million |
| Read Units | $16 per million |
| Minimum | $50/month |

**Advantages**:
- Zero operational overhead
- Namespace isolation prevents noisy neighbor problems
- Cost-efficient for multi-tenant queries (RU cost based on namespace size)
- Simple tenant offboarding (delete namespace)

**Disadvantages**:
- Higher per-unit costs than self-hosted alternatives
- Lock-in to proprietary system
- Enterprise tier ($500/mo minimum) required for private networking

### 2.2 Weaviate

**Architecture**: Cloud-native with explicit multi-tenancy support and tenant state management.

**Multi-Tenancy Model**:
- Native multi-tenancy at the shard level
- Each tenant occupies a dedicated shard
- Support for 50,000+ active tenants per node
- Explicit tenant state management: ACTIVE, INACTIVE, OFFLOADED

**Cold Storage (Offloading)**:
- Tenants can be offloaded to cloud storage (AWS S3) when inactive
- Automatic reactivation on access
- Significant cost reduction for dormant users

**Scale Limits**:
- Unlimited vector dimensions (practical limits depend on memory)
- Horizontal scaling across nodes
- 1M+ tenants possible with proper cluster sizing

**Pricing (Flex Plan, 2026)**:
| Dimension | Cost |
|-----------|------|
| Vector Dimensions | From $0.01668/1M dimensions |
| Storage | From $0.255/GiB |
| Backup | From $0.0264/GiB |
| Minimum | $45/month |

**Advantages**:
- Native multi-tenancy with state management
- Hot/cold/frozen storage tiers
- Open-source option for self-hosting
- Strong compression options (RQ-8 provides 4x memory reduction)

**Disadvantages**:
- More complex operational model
- Tenant state propagation delays across clusters
- Cold storage retrieval latency (offloaded tenants)

### 2.3 Qdrant

**Architecture**: High-performance vector search engine with payload-based or shard-based multitenancy.

**Multi-Tenancy Models**:

1. **Payload-based partitioning** (recommended for most cases):
   - Single collection with `group_id` payload field
   - `is_tenant=true` parameter co-locates tenant vectors for sequential read optimization
   - Per-tenant HNSW graphs via `payload_m` configuration

2. **User-defined sharding** (for large tenants):
   - Dedicated shards for high-volume tenants
   - Fallback shards for smaller tenants
   - Tiered multitenancy combining both approaches

**Scale Limits**:
- Billions of vectors per collection (tested)
- Horizontal and vertical scaling
- 1 GB free tier for development

**Pricing (Managed Cloud, 2026)**:
- Starts at $0 (1GB free forever)
- Pay-per-use for additional capacity
- Custom pricing for Hybrid/Private Cloud

**Advantages**:
- Excellent performance/cost ratio
- Tiered multitenancy for heterogeneous tenant sizes
- Strong filtering performance with tenant-optimized indexes
- Open-source with self-hosting option

**Disadvantages**:
- Payload-based multitenancy scans full collection for cross-tenant queries
- Less mature managed offering than Pinecone
- No native cold storage offloading (requires external implementation)

### 2.4 pgvector (PostgreSQL Extension)

**Architecture**: Vector similarity search as PostgreSQL extension, deployable via Supabase, Neon, or self-hosted.

**Multi-Tenancy Model**:
- Row-level security (RLS) for tenant isolation
- Standard PostgreSQL partitioning for large deployments
- Table-per-tenant or shared table with tenant_id column

**Scale Limits**:
- HNSW: Up to 2,000 dimensions (4,000 for halfvec)
- IVFFlat: Up to 2,000 dimensions
- Practical limit: Millions of vectors per table with proper indexing

**Pricing (Neon, 2026)**:
| Plan | Compute | Storage | Notes |
|------|---------|---------|-------|
| Free | 100 CU-hours/project | Included | Scale to zero |
| Launch | $0.106/CU-hour | $0.35/GB | Auto-scaling |
| Scale | $0.222/CU-hour | $0.35/GB | Enterprise features |

**Advantages**:
- Leverage existing PostgreSQL infrastructure
- ACID compliance and transactional guarantees
- JOINs with relational data (user profiles, metadata)
- 70-75% cost reduction vs. managed vector DBs (per industry benchmarks)
- Neon offers scale-to-zero for cost optimization

**Disadvantages**:
- Lower query performance than purpose-built vector DBs at scale
- Requires index tuning expertise
- Memory constraints for large HNSW indexes

### 2.5 Comparative Summary

| Feature | Pinecone | Weaviate | Qdrant | pgvector |
|---------|----------|----------|--------|----------|
| Multi-tenancy | Namespaces | Native shards | Payload/Shards | RLS/Partitions |
| Max tenants | 100K/index | 50K+/node | Unlimited | Table limits |
| Cold storage | No | Yes (S3) | No | Manual |
| Self-host option | BYOC only | Yes | Yes | Yes |
| Typical latency | <50ms | <100ms | <50ms | <200ms |
| Cost at 100K users | $$$ | $$ | $ | $ |

---

## 3. Memory Architecture Patterns

### 3.1 Conversation Memory Embedding Structure

**Recommended schema for each memory record:**

```json
{
  "id": "uuid",
  "tenant_id": "user_123",
  "session_id": "session_456",
  "timestamp": "2026-03-11T10:30:00Z",
  "memory_type": "observation|reflection|fact",
  "content": "User prefers morning meetings before 10am",
  "embedding": [0.123, -0.456, ...],  // 1536-dim for OpenAI
  "importance_score": 0.85,
  "access_count": 12,
  "last_accessed": "2026-03-10T15:00:00Z",
  "source_messages": ["msg_789", "msg_790"],
  "categories": ["scheduling", "preferences"],
  "decay_eligible": true
}
```

**Key design decisions:**

1. **Separate vectors from metadata**: Store embeddings in vector DB, metadata in relational DB
2. **Memory typing**: Distinguish observations (raw) from reflections (synthesized)
3. **Importance scoring**: Enable prioritized retrieval and consolidation
4. **Access tracking**: Support LRU-style memory management

### 3.2 Memory Retrieval Patterns

**Hybrid retrieval (recommended):**

1. **Vector similarity**: Semantic relevance to current query
2. **Recency weighting**: Boost recent memories (exponential decay)
3. **Importance filtering**: Minimum threshold for retrieval
4. **Category matching**: Contextual filtering based on conversation topic

**Retrieval formula:**

```
final_score = (similarity * 0.5) + (recency_weight * 0.3) + (importance * 0.2)

where:
  recency_weight = exp(-decay_rate * hours_since_access)
  decay_rate ≈ 0.01 (configurable per use case)
```

### 3.3 Memory Consolidation Strategies

Without consolidation, memory storage grows unbounded. The following strategies address this:

**3.3.1 Hierarchical Summarization (Generative Agents approach)**

Every N observations, generate a reflection:
```
observations = get_recent_observations(user_id, limit=20)
reflection = llm.generate(f"""
  Given these observations about the user:
  {observations}
  
  Synthesize 2-3 higher-level insights about this person's 
  preferences, habits, or characteristics.
""")
store_as_reflection(reflection, source_observations=observations)
mark_for_archival(observations)
```

**Consolidation ratios:**
- 20 observations → 2-3 reflections
- Effective compression: 85-90%
- Semantic preservation: High (validated by retrieval accuracy)

**3.3.2 Memory Merging**

When memories are semantically similar (cosine similarity > 0.92):
```
merged_memory = llm.generate(f"""
  These two memories are very similar:
  Memory A: {memory_a}
  Memory B: {memory_b}
  
  Create a single, more comprehensive memory that captures 
  all information from both.
""")
replace_both_with(merged_memory)
```

**3.3.3 Temporal Decay with Archival**

```python
def consolidate_old_memories(user_id, age_threshold_days=30):
    old_memories = get_memories_older_than(user_id, age_threshold_days)
    
    # Group by category
    for category, memories in group_by_category(old_memories):
        if len(memories) > 5:
            summary = summarize_memories(memories)
            archive_to_cold_storage(memories)
            store_as_consolidated(summary, category)
```

**3.3.4 Mem0's Approach: Automatic Deduplication**

Mem0 implements automatic memory deduplication:
- Detects semantic duplicates before storage
- Merges conflicting information intelligently
- Updates existing memories rather than creating duplicates

This reduces storage by 40-60% compared to naive append-only approaches.

### 3.4 Memory Lifecycle Management

```
[New Message] 
    ↓
[Extract Memories] → LLM extracts facts, preferences, events
    ↓
[Deduplicate] → Check similarity against existing memories
    ↓
[Store/Update] → Embed and store (or update existing)
    ↓
[Periodic Consolidation] → Background job runs hourly/daily
    ↓
[Cold Storage Offload] → Move inactive tenant memories to S3
    ↓
[Archival/Deletion] → GDPR compliance, user requests
```

---

## 4. Cost Projections

### 4.1 Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Embedding model | OpenAI text-embedding-3-small | Good balance of cost/quality |
| Embedding dimensions | 1536 | Standard for OpenAI |
| Avg memories per user | 100 (initial), 500 (mature) | Based on active AI assistant usage |
| Memory size | ~200 bytes content + 6KB embedding | Typical conversation memory |
| Daily active users | 20% of total | Industry standard |
| Queries per active session | 5 | Average RAG retrievals |
| Consolidation ratio | 5:1 | 5 raw → 1 consolidated |

### 4.2 Embedding Generation Costs

**OpenAI text-embedding-3-small pricing**: $0.02 per 1M tokens

| Scale | New memories/day | Tokens/memory | Monthly embedding cost |
|-------|------------------|---------------|------------------------|
| 1K users | 5,000 | 150 | $0.45 |
| 10K users | 50,000 | 150 | $4.50 |
| 100K users | 500,000 | 150 | $45.00 |
| 1M users | 5,000,000 | 150 | $450.00 |

*Note: This is surprisingly affordable. Embedding costs are not the bottleneck.*

### 4.3 Vector Storage Costs

**Per-user storage calculation:**
- 100 memories × 6.2 KB/memory = 620 KB/user
- With consolidation (5:1): 124 KB/user effective

**Monthly storage costs by platform:**

| Scale | Raw Storage | Pinecone | Weaviate | Qdrant Cloud | pgvector (Neon) |
|-------|-------------|----------|----------|--------------|-----------------|
| 1K users | 620 MB | $0.20 | $0.16 | ~$0 (free tier) | ~$0 (free tier) |
| 10K users | 6.2 GB | $2.05 | $1.58 | $5-10 | $2.17 |
| 100K users | 62 GB | $20.46 | $15.81 | $50-100 | $21.70 |
| 1M users | 620 GB | $204.60 | $158.10 | $500-1000 | $217.00 |

*With consolidation, multiply by 0.2 for effective costs*

### 4.4 Query/Retrieval Costs

**Assumptions**: 20% DAU, 5 retrievals per active session

| Scale | Daily queries | Pinecone (RU) | Weaviate | Qdrant | pgvector |
|-------|---------------|---------------|----------|--------|----------|
| 1K users | 1,000 | $0.02/day | Included | Included | Compute |
| 10K users | 10,000 | $0.16/day | Included | Included | Compute |
| 100K users | 100,000 | $1.60/day | Included | Included | Compute |
| 1M users | 1,000,000 | $16.00/day | Included | Included | Compute |

*Pinecone charges per Read Unit; others include in storage/compute pricing*

### 4.5 Total Monthly Cost Projections

**Scenario: 100,000 users, mature platform (500 memories/user avg)**

| Component | Pinecone | Weaviate | Qdrant Cloud | pgvector (Neon) |
|-----------|----------|----------|--------------|-----------------|
| Storage | $102.30 | $79.05 | $250 | $108.50 |
| Queries | $48.00 | Included | Included | Compute |
| Compute/Base | $50 min | $45 min | ~$100 | ~$150 |
| Embeddings | $45 | $45 | $45 | $45 |
| **Total** | **~$245** | **~$170** | **~$395** | **~$305** |
| **Per user** | **$0.00245** | **$0.0017** | **$0.00395** | **$0.00305** |

*Note: With cold storage offloading (Weaviate), costs can be reduced by 50-70% for inactive users*

### 4.6 Cost Optimization Strategies

1. **Aggressive consolidation**: 10:1 ratio reduces storage costs by 90%
2. **Cold storage tiering**: Offload users inactive >30 days (typically 60-70% of users)
3. **Quantization**: Use binary or half-precision vectors for 2-4x memory reduction
4. **Regional pricing**: Deploy in cost-effective regions (us-east-1 typically cheapest)
5. **Committed usage discounts**: Enterprise agreements offer 30-50% discounts

**Optimized cost projection (100K users with all optimizations):**
- Target: $0.01/user/month ($1,000 total)
- Achievable with: Qdrant self-hosted + aggressive consolidation + cold tiering

---

## 5. Latency Considerations

### 5.1 Latency Budget for AI Assistants

Typical end-to-end response time budget: **3-5 seconds**

| Component | Budget | Notes |
|-----------|--------|-------|
| Memory retrieval | 50-100ms | Must not block response |
| LLM inference | 2-4 seconds | Primary latency source |
| Other (routing, etc) | 100-200ms | Network, processing |

**Implication**: Memory retrieval must complete in <100ms to avoid perceptible delay.

### 5.2 Latency by Database

**Benchmark conditions**: 10M vectors, 1536 dimensions, top-10 retrieval

| Database | P50 Latency | P99 Latency | With filtering |
|----------|-------------|-------------|----------------|
| Pinecone (serverless) | 20-40ms | 80-120ms | +10-20ms |
| Weaviate (managed) | 30-60ms | 100-200ms | +20-30ms |
| Qdrant (cloud) | 15-35ms | 60-100ms | +5-15ms |
| pgvector (HNSW) | 50-100ms | 200-400ms | +30-50ms |

*Note: pgvector latency can be improved with proper index tuning and dedicated compute*

### 5.3 Strategies for Low-Latency Retrieval

1. **Prefetching**: Retrieve memories when conversation starts, cache in application layer
2. **Namespace/tenant indexing**: Ensure queries only scan relevant tenant data
3. **Approximate search tuning**: Trade small accuracy loss for 2-3x speed improvement
4. **Read replicas**: Geographic distribution for global user bases
5. **Connection pooling**: Eliminate connection setup overhead

### 5.4 Cold Storage Latency Impact

When using hot/cold tiering:
- **Hot tenant**: <100ms (in-memory or SSD)
- **Cold tenant reactivation**: 500ms-2s (first query, then cached)

**Mitigation**: Predictive warming based on user activity patterns

---

## 6. Recommendations for Amigo

### 6.1 Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Amigo Platform                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Memory    │    │   Vector    │    │   Archive   │     │
│  │  Processor  │───▶│    Store    │───▶│   Storage   │     │
│  │   (LLM)     │    │  (Qdrant)   │    │ (pgvector)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                PostgreSQL (Metadata)                 │   │
│  │  - User profiles    - Memory metadata               │   │
│  │  - Session history  - Consolidation state           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Technology Selections

| Component | Selection | Rationale |
|-----------|-----------|-----------|
| Active Vector Store | **Qdrant Cloud** | Best cost/performance, native multi-tenancy |
| Archive Storage | **pgvector (Neon)** | Cost-effective, scale-to-zero for dormant users |
| Metadata Store | **PostgreSQL** | ACID, JOINs with user data, existing expertise |
| Embedding Model | **OpenAI text-embedding-3-small** | Cost-effective, 1536 dims sufficient |
| Consolidation LLM | **GPT-4.1-nano** | Fast, cheap for summarization tasks |

### 6.3 Multi-Tenancy Strategy

1. **Primary isolation**: Qdrant payload-based partitioning with `user_id`
2. **Index optimization**: `is_tenant=true` for sequential read performance
3. **Per-tenant HNSW**: `payload_m=16, m=0` configuration for tenant-scoped graphs
4. **Tiered handling**: Large tenants (>10K memories) get dedicated shards

### 6.4 Memory Lifecycle for Amigo

```python
# Memory processing pipeline
async def process_conversation(user_id: str, messages: List[Message]):
    # 1. Extract memories from new messages
    extracted = await extract_memories(messages)
    
    # 2. Deduplicate against existing memories
    unique = await deduplicate(user_id, extracted)
    
    # 3. Generate embeddings
    embedded = await embed_memories(unique)
    
    # 4. Store in active vector store (Qdrant)
    await qdrant.upsert(user_id, embedded)
    
    # 5. Update metadata in PostgreSQL
    await postgres.update_memory_metadata(user_id, embedded)
    
# Background consolidation job (runs daily)
async def consolidate_memories():
    for user_id in get_users_for_consolidation():
        old_memories = await get_memories_older_than(user_id, days=7)
        if len(old_memories) > 20:
            reflections = await generate_reflections(old_memories)
            await archive_to_pgvector(old_memories)
            await qdrant.delete(old_memories)
            await qdrant.upsert(user_id, reflections)
```

### 6.5 Cost Projection for Amigo

**Target scale**: 100,000 users within 12 months

| Phase | Users | Monthly Cost | Per-User Cost |
|-------|-------|--------------|---------------|
| Launch (M1-3) | 1,000 | $50 | $0.05 |
| Growth (M4-6) | 10,000 | $150 | $0.015 |
| Scale (M7-12) | 100,000 | $1,200 | $0.012 |

**Cost drivers**:
- Qdrant Cloud: ~$400/month at scale
- pgvector (Neon): ~$200/month for archive
- Embeddings: ~$45/month
- Consolidation LLM: ~$100/month
- PostgreSQL metadata: ~$50/month
- Operational buffer: ~$400/month

### 6.6 Migration Path

**Phase 1 (MVP)**: Single Qdrant collection, all users
- Simple deployment
- Validate memory patterns
- <1,000 users

**Phase 2 (Scale)**: Add hot/cold tiering
- Implement consolidation pipeline
- Move to payload-based multitenancy
- Archive to pgvector
- 1,000-50,000 users

**Phase 3 (Enterprise)**: Full architecture
- Tiered multitenancy (shards for large tenants)
- Geographic distribution
- Custom retention policies
- 50,000+ users

---

## 7. References and Sources

### Academic Papers

1. Park, J. S., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." arXiv:2304.03442. Stanford University.

2. Chhikara, P., et al. (2025). "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory." arXiv:2504.19413. Mem0 AI.

3. Wei, J., et al. (2022). "Chain of Thought Prompting Elicits Reasoning in Large Language Models." NeurIPS 2022.

4. Shinn, N., & Labash, B. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." arXiv:2303.11366.

### Technical Documentation

5. Pinecone Documentation. "Implement Multitenancy." https://docs.pinecone.io/guides/indexes/implement-multitenancy

6. Weaviate Documentation. "Multi-tenancy." https://docs.weaviate.io/developers/weaviate/concepts/data#multi-tenancy

7. Qdrant Documentation. "Configure Multitenancy." https://qdrant.tech/documentation/guides/multitenancy/

8. pgvector GitHub Repository. https://github.com/pgvector/pgvector

9. Neon Documentation. "The pgvector extension." https://neon.tech/docs/extensions/pgvector

10. Mem0 Documentation. "Platform Overview." https://docs.mem0.ai/platform/overview

### Industry Resources

11. Weng, L. (2023). "LLM Powered Autonomous Agents." Lil'Log. https://lilianweng.github.io/posts/2023-06-23-agent/

12. Pinecone Pricing. https://www.pinecone.io/pricing/

13. Weaviate Pricing. https://weaviate.io/pricing

14. Qdrant Pricing. https://qdrant.tech/pricing/

15. Neon Pricing. https://neon.tech/pricing

---

## Appendix A: Memory Schema Definitions

### Qdrant Collection Configuration

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="https://your-cluster.qdrant.io")

# Create collection with tenant-optimized configuration
client.create_collection(
    collection_name="amigo_memories",
    vectors_config=models.VectorParams(
        size=1536,  # OpenAI embedding dimensions
        distance=models.Distance.COSINE
    ),
    hnsw_config=models.HnswConfigDiff(
        payload_m=16,  # Per-tenant HNSW graphs
        m=0,           # Disable global index
    ),
    optimizers_config=models.OptimizersConfigDiff(
        indexing_threshold=10000,
    )
)

# Create tenant index
client.create_payload_index(
    collection_name="amigo_memories",
    field_name="user_id",
    field_schema=models.KeywordIndexParams(
        type=models.KeywordIndexType.KEYWORD,
        is_tenant=True,
    ),
)
```

### PostgreSQL Metadata Schema

```sql
-- Memory metadata (references vectors in Qdrant)
CREATE TABLE memory_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID REFERENCES sessions(id),
    memory_type VARCHAR(20) NOT NULL, -- observation, reflection, fact
    content TEXT NOT NULL,
    importance_score FLOAT DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    categories TEXT[],
    source_message_ids UUID[],
    
    -- Indexes
    INDEX idx_user_memories (user_id, created_at DESC),
    INDEX idx_consolidation (user_id, archived_at) WHERE archived_at IS NULL
);

-- Archive table (with pgvector for semantic search)
CREATE TABLE archived_memories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    source_memory_ids UUID[],
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_archive_user (user_id)
);

-- Enable HNSW index for archive searches
CREATE INDEX ON archived_memories 
    USING hnsw (embedding vector_cosine_ops);
```

---

## Appendix B: Consolidation Algorithm

```python
import asyncio
from datetime import datetime, timedelta
from typing import List

async def run_consolidation_pipeline():
    """
    Daily consolidation job for memory optimization.
    Processes users based on activity and memory count.
    """
    
    # Get users needing consolidation
    users = await db.fetch("""
        SELECT user_id, COUNT(*) as memory_count
        FROM memory_records
        WHERE archived_at IS NULL
          AND created_at < NOW() - INTERVAL '7 days'
        GROUP BY user_id
        HAVING COUNT(*) > 20
        ORDER BY COUNT(*) DESC
        LIMIT 1000
    """)
    
    for user in users:
        await consolidate_user_memories(user['user_id'])
        await asyncio.sleep(0.1)  # Rate limit

async def consolidate_user_memories(user_id: str):
    """Consolidate old memories for a single user."""
    
    # Fetch old, unconsolidated memories
    old_memories = await db.fetch("""
        SELECT id, content, importance_score, categories
        FROM memory_records
        WHERE user_id = $1
          AND archived_at IS NULL
          AND created_at < NOW() - INTERVAL '7 days'
        ORDER BY created_at
        LIMIT 50
    """, user_id)
    
    if len(old_memories) < 10:
        return  # Not enough to consolidate
    
    # Group by category for coherent summaries
    by_category = group_by_category(old_memories)
    
    for category, memories in by_category.items():
        if len(memories) >= 5:
            # Generate reflection
            reflection = await generate_reflection(memories)
            
            # Create new reflection memory
            reflection_id = await create_reflection_memory(
                user_id=user_id,
                content=reflection,
                source_ids=[m['id'] for m in memories],
                category=category
            )
            
            # Archive originals
            await archive_memories(
                user_id=user_id,
                memory_ids=[m['id'] for m in memories],
                reflection_id=reflection_id
            )
    
    # Update Qdrant (remove archived, add reflections)
    await sync_with_qdrant(user_id)

async def generate_reflection(memories: List[dict]) -> str:
    """Use LLM to synthesize memories into a reflection."""
    
    memories_text = "\n".join([
        f"- {m['content']}" for m in memories
    ])
    
    response = await llm.generate(
        model="gpt-4.1-nano",
        messages=[{
            "role": "system",
            "content": """You are a memory consolidation system. 
            Given a list of related memories about a user, synthesize them 
            into 1-2 concise, high-level insights. Preserve important details
            but eliminate redundancy. Output only the synthesized insights."""
        }, {
            "role": "user", 
            "content": f"Memories to consolidate:\n{memories_text}"
        }]
    )
    
    return response.content
```

---

*Report prepared for Knight Ventures — Amigo AI Platform*
*Last updated: March 2026*
