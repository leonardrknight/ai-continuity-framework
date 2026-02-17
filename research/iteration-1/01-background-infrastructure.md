# Background Agent Infrastructure for AI Memory Systems

**Research Date:** February 2026  
**Objective:** Identify best patterns for running persistent background agents that monitor conversations, maintain state, respond to events, and scale efficiently.

---

## Executive Summary

This research evaluates 8 technologies for building a "Memory Agent Swarm" — multiple specialized background agents processing conversations without blocking the main agent. The key tension is between **always-running systems** (high cost, low latency) vs **event-triggered systems** (cost-efficient, slightly higher latency).

**TL;DR Recommendation:** Inngest + LangGraph hybrid, with Redis for hot state.

---

## Technology Evaluations

### 1. CrewAI Flows

**What it is:** Python framework for AI agent orchestration with built-in state management and event-driven patterns.

#### Persistent State
- **`@persist` decorator** — automatically saves flow state to SQLite (default) or custom backends
- State includes auto-generated UUID for tracking across restarts
- Supports both **unstructured** (flexible dict) and **structured** (Pydantic BaseModel) state
- State recovery after crashes or restarts is automatic

```python
@persist  # Class-level persistence for all methods
class MemoryFlow(Flow[MemoryState]):
    @start()
    def process_conversation(self):
        self.state.message_count += 1
        # State automatically saved to SQLite
```

#### Event Triggering
- **`@listen(method)`** — triggers when specified method completes
- **`@start()`** — marks entry points
- **`or_`** — trigger when ANY of multiple methods complete
- **`and_`** — trigger when ALL specified methods complete
- **`@router()`** — conditional branching based on output

#### Cost Model
- **Per invocation** — only burns API calls when flows execute
- No always-running overhead
- Cost depends on LLM calls within flows

#### Scalability Pattern
- Designed for single-process workflows
- Can spawn multiple Flow instances
- Not built for distributed multi-user scaling
- Better suited for complex single-user pipelines

#### Integration Complexity
- **Medium** — Python-native, easy to start
- Tightly coupled to CrewAI ecosystem
- Limited to Python codebases
- Good for prototyping, may need replacement at scale

**Verdict:** ✅ Good for rapid prototyping agent workflows. ❌ Limited distributed scaling.

---

### 2. LangGraph

**What it is:** Low-level orchestration framework for building stateful, long-running agents with graph-based control flow.

#### Persistent State
- **Checkpointers** — pluggable persistence backends (SQLite, Postgres, Redis, custom)
- **StateGraph** — defines state schema and transitions
- **Durable execution** — workflows survive crashes, resume from checkpoints
- Built for "long-running, stateful agents"

```python
from langgraph.graph import StateGraph, MessagesState
from langgraph.checkpoint.sqlite import SqliteSaver

checkpointer = SqliteSaver.from_conn_string("memory.db")

graph = StateGraph(MessagesState)
graph.add_node("process", process_message)
graph.add_edge(START, "process")
compiled = graph.compile(checkpointer=checkpointer)
```

#### Event Triggering
- Not event-driven by default — pull-based invocation
- Requires external trigger (webhook, cron, message queue)
- Can be combined with external event systems
- Human-in-the-loop interrupts supported natively

#### Cost Model
- **Per invocation** — executes when called
- Checkpointing adds minimal storage overhead
- Primary cost is LLM calls within nodes

#### Scalability Pattern
- Horizontal scaling via LangGraph Platform (managed)
- State isolated per "thread_id"
- Multi-tenant by design (separate threads per user)
- Can run workers that process graph invocations

#### Integration Complexity
- **Medium-High** — powerful but requires understanding graph concepts
- Integrates with LangChain ecosystem
- Production deployment via LangGraph Platform or self-hosted
- Good debugging via LangSmith

**Verdict:** ✅ Excellent for complex agent state machines. ✅ Production-ready scaling. ⚠️ Needs external event layer.

---

### 3. Temporal.io

**What it is:** Enterprise-grade workflow orchestration platform with guaranteed execution and built-in state management.

#### Persistent State
- **Event sourcing** — complete history of all workflow events
- **Workflow state** survives process crashes, network failures, even data center outages
- State automatically distributed across Temporal cluster
- **Deterministic replay** — can reconstruct state from event history

```python
@workflow.defn(name="MemoryWorkflow")
class MemoryWorkflow:
    @workflow.run
    async def run(self, conversation_id: str) -> str:
        # Workflow state persists across failures
        result = await workflow.execute_activity(
            analyze_memory,
            start_to_close_timeout=timedelta(seconds=30),
        )
        return result
```

#### Event Triggering
- **Signals** — send events to running workflows
- **Scheduled workflows** — cron-style timing
- **Child workflows** — spawn sub-workflows
- **Continue-as-new** — long-running workflow pattern
- External triggers via API or CLI

#### Cost Model
- **Self-hosted:** Infrastructure costs (requires cluster)
- **Temporal Cloud:** Per-action pricing (~$25/million actions)
- Always-running workers consume compute
- High reliability justifies cost for critical workloads

#### Scalability Pattern
- **Highly scalable** — designed for millions of concurrent workflows
- Horizontal scaling of workers
- Multi-tenant via namespaces
- Battle-tested at companies like Netflix, Snap, Stripe

#### Integration Complexity
- **High** — steep learning curve
- Requires running Temporal cluster (self-hosted) or Cloud subscription
- Strong typing, deterministic constraints
- Excellent for mission-critical workflows

**Verdict:** ✅ Best-in-class durability and scale. ❌ Overkill for most AI memory use cases. ❌ Complexity overhead.

---

### 4. Inngest

**What it is:** Event-driven serverless function platform with durable execution and flow control.

#### Persistent State
- **Durable execution engine** — steps are automatically checkpointed
- State persists between steps within a function
- **Step functions** — each `step.run()` is retried independently
- No external database needed for workflow state

```typescript
inngest.createFunction(
  { id: "process-memory", throttle: { limit: 3, period: "1min" } },
  { event: "memory/conversation.new" },
  async ({ step }) => {
    // Each step is durable and retryable
    const analysis = await step.run("analyze", async () => {
      return await analyzeConversation();
    });
    
    await step.run("store", async () => {
      return await storeMemory(analysis);
    });
  }
);
```

#### Event Triggering
- **Events** — `{ event: "my/event.name" }` triggers function
- **Cron** — `{ cron: "0 * * * *" }` for scheduled runs
- **Webhooks** — built-in webhook endpoint generation
- **Flow control** — throttling, debouncing, prioritization
- **Fan-out** — one event can trigger multiple functions

#### Cost Model
- **Free tier:** 5,000 steps/month
- **Pay-per-use:** $0.000005 per step (~$5/million steps)
- No always-running compute
- Serverless cold starts (usually <100ms)

#### Scalability Pattern
- **Serverless scaling** — automatic, scales to demand
- Multi-tenant by default (user isolation via event data)
- Concurrency controls built-in
- Geographic distribution available

#### Integration Complexity
- **Low** — simple SDK, works with existing frameworks
- First-class Next.js, Node.js, Python support
- **AgentKit** — specific library for AI agents
- Self-hostable (open source core)

**Verdict:** ✅ Perfect balance of simplicity and power. ✅ Cost-efficient. ✅ Built for AI/agent workloads.

---

### 5. Trigger.dev

**What it is:** Open-source background jobs framework for long-running tasks with TypeScript-first design.

#### Persistent State
- **Run state** — tracked in Trigger.dev infrastructure
- **Context object** — access run metadata, attempt number
- No built-in persistent memory between runs
- Integrates with external databases for state

```typescript
export const processMemory = task({
  id: "process-memory",
  queue: { concurrencyLimit: 5 },
  retry: { maxAttempts: 3 },
  run: async (payload: { conversationId: string }, { ctx }) => {
    // Long-running task, no timeouts
    const memories = await extractMemories(payload.conversationId);
    return memories;
  },
});
```

#### Event Triggering
- **Programmatic triggers** — call `task.trigger()` from code
- **Scheduled tasks** — cron expressions
- **Webhooks** — via integrations
- **Lifecycle hooks** — onStart, onSuccess, onFailure, onWait, onResume

#### Cost Model
- **Free tier:** 1,000 task runs/month
- **Hobby:** $20/mo for 10,000 runs
- **Pro:** $50/mo + usage
- Self-hosted option available

#### Scalability Pattern
- **Elastic scaling** — workers scale automatically
- Concurrency controls per task
- Real-time API for frontend integration
- React hooks for status updates

#### Integration Complexity
- **Low-Medium** — TypeScript-native, clear patterns
- Dashboard for observability
- Playwright/Puppeteer extensions for browser automation
- Python execution via extension

**Verdict:** ✅ Great for TypeScript teams. ✅ Good observability. ⚠️ Less event-driven than Inngest.

---

### 6. Supabase Edge Functions + Realtime

**What it is:** Serverless TypeScript functions at the edge + real-time database subscriptions.

#### Persistent State
- **No built-in workflow state** — functions are stateless
- State stored in **Supabase Postgres** database
- Real-time subscriptions for state changes
- Row-level security for multi-tenant isolation

```typescript
// Edge Function (Deno)
Deno.serve(async (req) => {
  const { conversation_id } = await req.json();
  
  // Store state in Postgres
  const { data } = await supabase
    .from('memories')
    .insert({ conversation_id, processed: true });
    
  return new Response(JSON.stringify(data));
});
```

#### Event Triggering
- **Postgres Changes** — listen to INSERT/UPDATE/DELETE
- **Webhooks** — external triggers via HTTP
- **Broadcast** — low-latency pub/sub messaging
- **Presence** — track online users

```typescript
// Listen to new conversations
supabase
  .channel('conversations')
  .on('postgres_changes', { event: 'INSERT', schema: 'public' }, 
    (payload) => processConversation(payload))
  .subscribe();
```

#### Cost Model
- **Edge Functions:** $2/million invocations
- **Database:** Pay for storage + compute
- **Realtime:** Included in database plan
- Cold starts possible (~50-100ms)

#### Scalability Pattern
- **Edge distribution** — globally deployed
- Database handles state scaling
- Realtime scales with connection count
- Multi-tenant via Row-Level Security

#### Integration Complexity
- **Low** — if already using Supabase
- Deno runtime (not Node.js)
- Limited execution time (default 60s, up to 150s)
- Not designed for complex orchestration

**Verdict:** ✅ Great for simple triggers off database changes. ❌ Not suited for complex agent orchestration.

---

### 7. Redis + BullMQ

**What it is:** Redis-backed job queue for Node.js with robust reliability features.

#### Persistent State
- **Redis persistence** — jobs survive restarts
- **Job data** — JSON payload stored with each job
- State management is DIY (store in Redis or external DB)
- Exactly-once semantics (at-least-once in worst case)

```typescript
import { Queue, Worker } from 'bullmq';

const memoryQueue = new Queue('memory-processing');

// Add job with state
await memoryQueue.add('process', { 
  conversationId: '123',
  userId: 'user_abc'
});

// Worker processes jobs
new Worker('memory-processing', async (job) => {
  const { conversationId } = job.data;
  await processMemory(conversationId);
});
```

#### Event Triggering
- **Job events** — completed, failed, progress
- **Repeatable jobs** — cron-like scheduling
- **Delayed jobs** — trigger after delay
- **Parent-child dependencies** — DAG workflows
- External triggering via `queue.add()`

#### Cost Model
- **Infrastructure-only** — pay for Redis + compute
- Redis Cloud or self-hosted
- Workers run continuously (compute cost)
- Very cost-efficient at scale

#### Scalability Pattern
- **Horizontal scaling** — add workers
- Redis handles job distribution
- Concurrency per worker configurable
- Sharding for massive scale

#### Integration Complexity
- **Medium** — requires Redis infrastructure
- Node.js ecosystem (TypeScript support)
- No built-in dashboard (use Arena or Bull Board)
- Battle-tested, widely used

**Verdict:** ✅ Excellent for self-hosted, high-throughput queues. ⚠️ Requires infrastructure management.

---

### 8. AutoGPT Continuous Agent Pattern

**What it is:** Long-running autonomous agent that continuously monitors and acts.

#### Persistent State
- File-based memory (JSON, vector stores)
- Plugin-based storage backends
- Agent "workspace" concept
- Memory across conversation sessions

#### Event Triggering
- **Polling-based** — checks for new tasks on interval
- Webhook integrations via plugins
- Human approval gates
- Internal goal/task queue

#### Cost Model
- **Always-running** — continuous LLM calls
- High token consumption
- Most expensive pattern by far
- Suitable only for high-value autonomous tasks

#### Scalability Pattern
- One agent per instance
- Multiple agents require orchestration layer
- Not designed for multi-user SaaS
- More suited for single-purpose autonomous bots

#### Integration Complexity
- **High** — complex configuration
- Plugin ecosystem for extensions
- Requires careful prompt engineering
- Less reliable than orchestrated approaches

**Verdict:** ❌ Too expensive for background monitoring. ❌ Not designed for event-driven multi-user systems.

---

## Comparison Matrix

| Technology | State Persistence | Event Triggers | Cost Model | Multi-User Scale | Complexity | AI Focus |
|------------|------------------|----------------|------------|------------------|------------|----------|
| CrewAI Flows | ✅ Built-in | ✅ @listen | Per-invoke | ⚠️ Limited | Low | ✅ |
| LangGraph | ✅ Checkpointers | ⚠️ External | Per-invoke | ✅ Yes | Medium | ✅ |
| Temporal.io | ✅ Event-sourced | ✅ Signals | Per-action | ✅ Excellent | High | ⚠️ |
| Inngest | ✅ Durable steps | ✅ Native | Per-step | ✅ Yes | Low | ✅ |
| Trigger.dev | ⚠️ Run state | ✅ Triggers | Per-run | ✅ Yes | Low | ✅ |
| Supabase | ❌ DIY | ✅ Realtime | Per-invoke | ✅ Yes | Low | ⚠️ |
| BullMQ | ⚠️ Job data | ✅ Queue | Infra-only | ✅ Yes | Medium | ⚠️ |
| AutoGPT | ⚠️ Files | ⚠️ Polling | Always-on | ❌ No | High | ✅ |

---

## RECOMMENDATION: Memory Agent Swarm Architecture

For running **6+ specialized agents** processing conversations in the background, I recommend a **hybrid architecture**:

### Primary Stack: Inngest + LangGraph + Redis

```
┌─────────────────────────────────────────────────────────┐
│                    Event Sources                         │
│  (Webhooks, Postgres Changes, Cron, Manual Triggers)    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Inngest (Event Router)               │
│  - Receives all events                                  │
│  - Routes to appropriate agent functions                │
│  - Handles throttling, debouncing, retries              │
│  - Cost-efficient (pay per step)                        │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Summarizer   │  │ Entity       │  │ Sentiment    │
│ Agent        │  │ Extractor    │  │ Analyzer     │
│ (LangGraph)  │  │ (LangGraph)  │  │ (LangGraph)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Redis (Hot State)                    │
│  - Recent conversation context                          │
│  - Agent coordination state                             │
│  - Rate limiting / deduplication                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL (Cold State)              │
│  - Long-term memories                                   │
│  - User preferences                                     │
│  - Agent outputs                                        │
└─────────────────────────────────────────────────────────┘
```

### Why This Stack?

1. **Inngest for Event Orchestration**
   - Perfect event-driven model (events trigger agents)
   - Built-in flow control (don't overwhelm LLM APIs)
   - AgentKit library specifically for AI agents
   - Pay-per-step is cost-efficient for sporadic traffic
   - Simple integration with existing frameworks

2. **LangGraph for Agent Logic**
   - Best-in-class state machine for complex agent reasoning
   - Checkpointers ensure durability
   - Human-in-the-loop when needed
   - Thread-based isolation per user/conversation

3. **Redis for Hot State**
   - Fast access to recent context
   - Pub/sub for inter-agent communication
   - Rate limiting and deduplication
   - Session state that doesn't need long-term persistence

4. **PostgreSQL for Cold State**
   - Long-term memory storage
   - Queryable, structured data
   - Works with Supabase for realtime triggers

### The 6 Specialized Agents

| Agent | Trigger | Purpose |
|-------|---------|---------|
| **Summarizer** | New conversation batch | Creates concise summaries of conversations |
| **Entity Extractor** | New message | Identifies people, places, projects, dates |
| **Sentiment Analyzer** | New conversation | Tracks emotional tone over time |
| **Action Detector** | New message | Identifies commitments, TODOs, questions |
| **Pattern Finder** | Daily cron | Finds recurring themes across conversations |
| **Memory Curator** | Weekly cron | Consolidates and prunes memories |

### Cost Estimate (1000 conversations/day)

| Component | Units | Cost |
|-----------|-------|------|
| Inngest | ~30,000 steps/day | ~$5/month |
| LLM calls | ~6,000 calls/day | ~$30/month (GPT-4o-mini) |
| Redis | Hosted (1GB) | ~$15/month |
| PostgreSQL | Supabase Pro | ~$25/month |
| **Total** | | **~$75/month** |

Much cheaper than always-running agents polling continuously.

### Alternative Stacks by Use Case

| If you need... | Use |
|----------------|-----|
| Maximum simplicity | **Trigger.dev** alone (skip LangGraph complexity) |
| Self-hosted everything | **BullMQ + LangGraph + Postgres** |
| Enterprise guarantees | **Temporal.io + LangGraph** |
| Already on Supabase | **Edge Functions + Realtime + LangGraph** |
| Rapid prototyping | **CrewAI Flows** (switch later) |

---

## Implementation Notes

### Event Patterns to Implement

1. **New Message Event**
   ```typescript
   await inngest.send({
     name: "memory/message.new",
     data: { userId, conversationId, message, timestamp }
   });
   ```

2. **Batch Processing** (debounce rapid messages)
   ```typescript
   createFunction(
     { id: "batch-process", debounce: { period: "30s" } },
     { event: "memory/message.new" },
     async ({ events, step }) => {
       // events contains all messages in 30s window
       await step.run("process-batch", () => processBatch(events));
     }
   );
   ```

3. **Inter-Agent Coordination**
   ```typescript
   // Summarizer waits for entity extraction
   await step.waitForEvent("memory/entities.extracted", {
     match: "data.conversationId",
     timeout: "5m"
   });
   ```

### State Design

```typescript
// Redis: Hot state (TTL 24h)
interface ConversationContext {
  recentMessages: Message[];
  activeEntities: Entity[];
  pendingActions: Action[];
}

// Postgres: Cold state (permanent)
interface UserMemory {
  id: string;
  userId: string;
  type: 'summary' | 'entity' | 'pattern' | 'preference';
  content: JSONValue;
  confidence: number;
  createdAt: Date;
  expiresAt?: Date;
}
```

---

## Conclusion

For a Memory Agent Swarm, **avoid always-running architectures** (AutoGPT-style) — they're expensive and inefficient for sporadic conversational data.

Instead, embrace **event-driven orchestration** with:
- **Inngest** for routing and flow control
- **LangGraph** for complex agent reasoning
- **Redis** for coordination state
- **PostgreSQL** for permanent memory

This architecture supports multiple specialized agents, scales across users efficiently, and only costs money when actually processing conversations.
