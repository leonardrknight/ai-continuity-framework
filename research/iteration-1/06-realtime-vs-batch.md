# Real-Time vs Batch Processing for Memory Extraction

Research into timing strategies for extracting and processing memories in AI continuity systems.

## Executive Summary

Memory extraction timing is a fundamental architectural decision that impacts user experience, cost, and system reliability. This research examines three primary approaches—real-time, batch, and hybrid—along with how commercial memory systems implement them.

**Key Finding:** Most production systems use a hybrid approach: lightweight capture in real-time with heavier processing (graph construction, summarization, deduplication) handled asynchronously or in batch.

---

## 1. Real-Time Processing

### Definition
Processing memories during or immediately after each message exchange, typically within the request-response cycle or immediately following it.

### Techniques

**Async extraction during response streaming**
- Fire-and-forget calls to memory service while streaming response
- User sees response immediately; memory extraction happens in parallel
- Risk: extraction may fail silently; need retry logic

**Post-response triggers**
- After response is sent, trigger memory extraction
- Slightly delayed but doesn't block user experience
- Can use message queues for reliability

**Parallel model calls**
- Run primary LLM and memory extraction LLM simultaneously
- Requires careful orchestration
- Example: Use fast model (GPT-4o-mini) for extraction while slower model generates response

### Advantages
- Immediate context capture—nothing lost between messages
- User's emotional state, conversation flow preserved
- Memory available for next turn if needed
- Natural "episode" boundaries (each exchange is atomic)

### Disadvantages
- **Token/cost implications**: Running 2+ model calls per exchange doubles or triples costs
- **Latency**: Even async processing adds system load
- **Cold start penalty**: Memory retrieval at conversation start takes same time regardless of extraction timing
- **Redundant processing**: Many messages contain no memorable information

### Cost Analysis
| Approach | Cost Multiplier | Notes |
|----------|-----------------|-------|
| Every message | 2-3x | Memory LLM call per exchange |
| Every N messages | 1.2-1.5x | Amortized extraction |
| Importance-filtered | 1.3-1.8x | Classifier + occasional extraction |

---

## 2. Batch Processing

### Definition
Processing memories at scheduled intervals or session boundaries rather than per-message.

### Techniques

**End-of-session consolidation**
- Process entire conversation when session ends
- Challenge: Defining "session end" (timeout? explicit close? app backgrounded?)
- Works well for discrete sessions (support tickets, scheduled meetings)

**Scheduled processing (cron)**
- Hourly, daily, or weekly memory consolidation
- Process accumulated transcripts in bulk
- Lower per-unit cost via batched API calls

**Queue-based processing**
- Messages added to queue during conversation
- Background workers process queue continuously
- Natural backpressure handling

### Advantages
- **Cost efficiency**: Batch API calls often 50% cheaper (OpenAI batch API)
- **Better context**: Full conversation available for extraction
- **Deduplication**: Can identify redundant memories before storage
- **Resource smoothing**: Process during low-traffic periods

### Disadvantages
- **Session boundary problem**: Long-running conversations have no clear "end"
- **Context loss**: Emotional nuance, conversation flow may be harder to capture
- **Delayed availability**: Memories not available until batch runs
- **Failure risk**: Batch job failure loses entire session

### Session Boundary Strategies
| Strategy | Description | Best For |
|----------|-------------|----------|
| Explicit close | User clicks "end session" | Support tickets, forms |
| Timeout | No activity for N minutes | Mobile apps |
| Time-based | Fixed intervals (hourly) | Continuous assistants |
| Length-based | Every N messages | High-volume conversations |
| Hybrid | Whichever comes first | General use |

---

## 3. Hybrid Approaches

### Light Tagging + Heavy Batch

**Real-time phase:**
- Quick classification: "Is this memorable?" (yes/no/maybe)
- Extract key entities (names, dates, preferences)
- Tag message with importance score
- ~100 tokens of extraction per message

**Batch phase:**
- Process tagged messages only
- Build relationships between entities
- Deduplicate against existing memories
- Generate summaries and consolidations

### Importance-Based Routing

```
┌─────────────────┐
│  New Message    │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Classify │  (Fast, cheap model)
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼───┐           ┌─────▼─────┐
│ HIGH  │           │ LOW/MED   │
│ URGENCY│          │ IMPORTANCE│
└───┬───┘           └─────┬─────┘
    │                     │
┌───▼────────┐      ┌─────▼─────┐
│ Real-Time  │      │  Queue    │
│ Extraction │      │ for Batch │
└────────────┘      └───────────┘
```

**Triggers for immediate processing:**
- Emotional intensity detected (anger, joy, fear)
- Explicit user request ("Remember this")
- Critical preference stated ("I'm allergic to...")
- Contradiction with existing memory
- First mention of new entity (person, place, project)

**Triggers for batch:**
- Routine information
- Confirmatory statements
- Casual conversation
- Already-known information restated

### Event-Driven Processing

Events that warrant immediate memory extraction:
- User explicitly asks to remember something
- Strong sentiment detected (emotional moment)
- Decision made or commitment stated
- New relationship or entity introduced
- Contradiction with stored fact
- Error correction ("Actually, I meant...")

---

## 4. Infrastructure Patterns

### Message Queues

**Redis Streams / Lists**
- Low latency, simple setup
- Good for single-region deployments
- Message persistence with AOF

**Amazon SQS**
- Managed, scalable
- Dead letter queues for failed processing
- FIFO mode for ordering guarantees

**Apache Kafka**
- High throughput, replay capability
- Complex but powerful
- Good for multi-consumer scenarios

### Event Streaming Architecture

```
┌──────────┐    ┌──────────┐    ┌─────────────┐
│ Message  │───▶│ Event    │───▶│ Memory      │
│ Handler  │    │ Bus      │    │ Extractor   │
└──────────┘    └────┬─────┘    └──────┬──────┘
                     │                 │
                     │           ┌─────▼──────┐
                     │           │ Vector DB  │
                     │           └────────────┘
                     │
                ┌────▼─────┐
                │ Analytics│
                └──────────┘
```

### Serverless Function Chains

**AWS Lambda / Google Cloud Functions:**
1. Message received → trigger function
2. Function classifies importance
3. High-importance → invoke extraction function
4. Low-importance → write to batch queue
5. Batch queue → scheduled batch function

**Benefits:**
- Pay only for what you use
- Auto-scaling
- No server management

**Challenges:**
- Cold starts add latency
- 15-minute timeout limits
- Complex debugging

### Webhook Patterns

Both Zep and Mem0 support webhooks for event-driven processing:

**Zep webhook events:**
- `episode.processed` - Episode finished processing
- `ingest.batch.completed` - Batch ingestion complete

**Mem0 webhook events:**
- `memory_add` - Memory created
- `memory_update` - Memory modified
- `memory_delete` - Memory removed

---

## 5. Case Studies

### MemGPT / Letta

**Architecture:** Agent-centric, inspired by OS memory management

**Memory timing approach:**
- **Real-time memory writes**: Agent can write to "core memory" (fast, limited) during conversation
- **Background archival**: Agent moves information to "archival memory" as needed
- **Compaction**: Background process compresses conversation history
- **Sleep-time agents**: Experimental feature for offline memory processing

**Key insight:** Memory management is part of agent behavior, not infrastructure. The LLM decides when to save memories via tool calls.

**From the MemGPT paper:**
> "MemGPT utilizes interrupts to manage control flow between itself and the user... intelligently manages different memory tiers in order to effectively provide extended context."

### Zep

**Architecture:** Temporal knowledge graph with async processing

**Memory timing approach:**
- **Synchronous message ingestion**: Messages added via `thread.add_messages()`
- **Asynchronous graph construction**: Graph processing happens in background
- **Webhook notification**: `episode.processed` event when complete
- **Sub-200ms retrieval**: Optimized for fast context retrieval, not instant storage

**Processing flow:**
1. Add messages (sync, fast)
2. Zep processes asynchronously (seconds to minutes)
3. Poll `episode.processed` or use webhooks
4. Context available via `thread.get_user_context()`

**Key insight:** Decouple ingestion from processing. Accept messages fast, process thoroughly in background.

### Mem0

**Architecture:** Managed memory platform with async client support

**Memory timing approach:**
- **Synchronous add**: `client.add(messages, user_id=...)` 
- **Background extraction**: Mem0 extracts and stores memories
- **Async client available**: `AsyncMemoryClient` for non-blocking operations
- **Webhook notifications**: Events for add/update/delete

**Key insight:** Simple API hides complexity. Users add messages; platform handles extraction timing.

### ChatGPT Memory

**Architecture:** Integrated with conversation flow (proprietary)

**Memory timing approach (inferred from announcements):**
- **In-conversation capture**: "Memory updated" notification appears during chat
- **Selective extraction**: Model decides what's worth remembering
- **User-controlled**: Can ask to remember/forget specific things
- **Cross-conversation retrieval**: References past conversations automatically

**April 2025 update:** Memory now references "all past conversations" in addition to explicit saves—suggesting batch processing of chat history.

**Key insight:** Make memory visible to users. "Memory updated" notification sets expectations and builds trust.

---

## 6. Cost Comparison

| Approach | API Calls/Message | Storage Writes/Message | Estimated Cost |
|----------|-------------------|------------------------|----------------|
| Real-time extraction | 2.0 | 0.3 | $$$$ |
| Batch (hourly) | 0.1 | 0.1 | $ |
| Batch (end of session) | 0.05 | 0.2 | $ |
| Hybrid (tag + batch) | 1.2 | 0.15 | $$ |
| Importance-filtered | 1.4 | 0.2 | $$ |

*Assumes average conversation of 20 messages, 30% containing memorable content*

### OpenAI Batch API Savings
- 50% discount on batch API calls
- 24-hour completion window
- Perfect for non-urgent extraction

### Cost Optimization Strategies
1. **Use smaller models for classification** (GPT-4o-mini for importance tagging)
2. **Batch where possible** (OpenAI batch API, off-peak processing)
3. **Cache embeddings** (don't re-embed unchanged content)
4. **Prune aggressively** (delete low-value memories)

---

## 7. Latency Considerations

### User-Perceived Latency

| Operation | Acceptable Latency | Strategy |
|-----------|-------------------|----------|
| Response generation | <3s first token | Don't block on memory |
| Memory retrieval | <200ms | Pre-fetch, cache |
| Memory storage | Invisible | Async, fire-and-forget |

### Memory Availability Windows

| Approach | Memory Available For... |
|----------|------------------------|
| Real-time | Next message |
| Post-response async | Following conversation (if fast enough) |
| Session-end batch | Next session |
| Nightly batch | Next day |

---

## 8. Failure Handling

### Real-Time Failures
- **Circuit breaker**: After N failures, skip extraction temporarily
- **Retry with backoff**: Exponential backoff for transient failures
- **Fallback**: Store raw message for later reprocessing

### Batch Failures
- **Dead letter queue**: Failed extractions go to separate queue
- **Partial success**: Process what's possible, flag rest
- **Idempotency**: Ensure reprocessing doesn't duplicate memories

### Recovery Patterns
```
┌───────────────┐    ┌──────────────┐    ┌────────────────┐
│ Primary Queue │───▶│ Processor    │───▶│ Success        │
└───────────────┘    └──────┬───────┘    └────────────────┘
                            │
                      (on failure)
                            │
                     ┌──────▼───────┐
                     │ Retry Queue  │
                     │ (with delay) │
                     └──────┬───────┘
                            │
                      (after 3 retries)
                            │
                     ┌──────▼───────┐
                     │ Dead Letter  │
                     │ Queue        │
                     └──────────────┘
```

---

## RECOMMENDATION

### For a Natural, Cost-Efficient Memory System

**Recommended: Hybrid approach with importance-based routing**

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REAL-TIME LAYER                      │
│  • Fast importance classifier (100ms, cheap model)      │
│  • Extract key entities (names, dates, preferences)     │
│  • Tag with importance score                            │
│  • Store raw message with tags                          │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
    ┌─────▼─────┐                  ┌──────▼──────┐
    │ HIGH      │                  │ NORMAL      │
    │ IMPORTANCE│                  │ IMPORTANCE  │
    └─────┬─────┘                  └──────┬──────┘
          │                               │
    ┌─────▼─────────────┐          ┌──────▼──────┐
    │ Immediate Async   │          │ Batch Queue │
    │ Extraction        │          │             │
    │ (fire-and-forget) │          └──────┬──────┘
    └───────────────────┘                 │
                                    ┌─────▼──────┐
                                    │ Scheduled  │
                                    │ Processing │
                                    │ (hourly)   │
                                    └────────────┘
```

### Why This Works

1. **Feels natural**: Important moments captured immediately; user sees "Memory updated" for significant events
2. **Cost-efficient**: Most messages go to cheap batch processing
3. **Resilient**: Batch queue handles spikes; failures recoverable
4. **Flexible**: Thresholds tunable based on usage patterns

### Implementation Priorities

**Phase 1: Baseline (Week 1-2)**
- Simple post-response extraction for all messages
- Basic importance classifier (few-shot prompt)
- Single processing path

**Phase 2: Routing (Week 3-4)**
- Importance-based routing
- Batch queue for normal messages
- Immediate processing for high-importance

**Phase 3: Optimization (Week 5-6)**
- Webhook integration for async confirmation
- Deduplication in batch processing
- Cost monitoring and threshold tuning

### Specific Recommendations

| Decision Point | Recommendation | Rationale |
|---------------|----------------|-----------|
| Classification model | GPT-4o-mini or local classifier | Fast, cheap, good enough |
| Batch interval | Hourly | Balance between freshness and cost |
| High-importance threshold | Top 15% of messages | Keeps real-time load manageable |
| Queue technology | Redis Streams | Simple, fast, good enough |
| Failure handling | 3 retries → dead letter | Standard pattern |

### Triggers for Immediate Processing

Configure these as "high importance":
- User says "remember" or "don't forget"
- Strong sentiment words detected
- New named entity introduced
- Contradiction with stored fact
- Preference statement ("I prefer...", "I always...", "I hate...")
- Time-sensitive information ("my flight is tomorrow")

### Metrics to Track

- **Classification accuracy**: % of correctly routed messages
- **Batch queue depth**: Should stay near zero
- **Processing latency**: Time from message to memory availability
- **Cost per memory**: Total cost / memories stored
- **Memory retrieval relevance**: User feedback or implicit signals

---

## Summary

The optimal timing strategy depends on your specific constraints:

| Priority | Recommended Approach |
|----------|---------------------|
| Minimize cost | Batch with nightly processing |
| Maximize context | Real-time everything |
| Balance (recommended) | Hybrid with importance routing |
| Simplicity | Post-response async for all |

Most production systems—Zep, Mem0, ChatGPT—use hybrid approaches. They accept data synchronously, process asynchronously, and optimize for retrieval speed rather than storage speed.

**The insight:** Users notice retrieval latency (memory feels "smart" or "dumb"), not storage latency (invisible). Optimize for fast, relevant retrieval; let storage happen in the background.
