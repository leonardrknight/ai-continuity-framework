# Background Agents Research: Multi-Agent Architectures for Continuous Processing

**Author:** Jordan (AI Research Assistant)  
**Date:** 2026-02-07  
**Purpose:** Research on AI multi-agent architectures for "subconscious" agents that run alongside a main conversation agent

---

## Executive Summary

This document explores multi-agent AI architectures suitable for continuous background processing—often referred to as "subconscious" agents. These are autonomous agents that operate alongside a main conversational agent, handling tasks like monitoring, memory management, and proactive information gathering without requiring direct user interaction.

Key frameworks analyzed:
- **LangGraph** — Low-level orchestration with durable execution
- **CrewAI** — High-level multi-agent crews and flows
- **AutoGPT** — Autonomous agent platform with continuous operation

---

## 1. Core Concepts: What Are "Subconscious" Background Agents?

### Definition

"Subconscious" agents are autonomous AI processes that:
- Run **continuously or periodically** in the background
- Operate **independently** from the main conversation thread
- Handle **monitoring, maintenance, and preparatory** tasks
- Can **surface information proactively** when relevant
- Maintain **persistent memory** across sessions

### Architectural Distinction (from Anthropic)

Anthropic distinguishes between:

| Type | Definition | Control |
|------|------------|---------|
| **Workflows** | LLMs and tools orchestrated through predefined code paths | Developer-defined |
| **Agents** | LLMs dynamically direct their own processes and tool usage | Model-directed |

For background processing, **workflows** are often preferable for predictable, scheduled tasks, while **agents** excel at flexible, context-dependent decisions.

---

## 2. LangGraph: Low-Level Orchestration for Durable Agents

### Overview

LangGraph is a low-level orchestration framework focused on:
- **Durable execution** — Persist through failures, resume from checkpoints
- **Stateful workflows** — Comprehensive memory (short-term and long-term)
- **Human-in-the-loop** — Interrupt, inspect, and modify at any point
- **Graph-based architecture** — Nodes (agents) + edges (transitions)

### Key Features for Background Agents

#### Durable Execution
```python
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import InMemorySaver

# Enable persistence with a checkpointer
checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# Execute with thread ID for state tracking
config = {"configurable": {"thread_id": thread_id}}
graph.invoke({"messages": [...]}, config)
```

#### Durability Modes
| Mode | Description | Use Case |
|------|-------------|----------|
| `"exit"` | Persist only on graph exit | Best performance, no mid-run recovery |
| `"async"` | Persist asynchronously | Good balance of performance/durability |
| `"sync"` | Persist synchronously before each step | Maximum durability |

#### Multi-Agent Patterns

1. **Multi-Agent Collaboration** — Shared scratchpad, all work visible to all agents
2. **Agent Supervisor** — Central agent routes to specialized agents with independent scratchpads
3. **Hierarchical Agent Teams** — Nested LangGraph objects as sub-agents

### Pros
- Fine-grained control over agent behavior
- Built-in persistence and resumption
- Strong integration with LangChain ecosystem
- Production-ready with LangSmith observability

### Cons
- Lower-level abstraction = more code to write
- Steeper learning curve
- Requires explicit graph definition

### Best For
- Long-running workflows requiring checkpoints
- Complex state machines with conditional routing
- Systems needing human-in-the-loop at specific points

---

## 3. CrewAI: High-Level Multi-Agent Crews

### Overview

CrewAI provides a higher-level abstraction for multi-agent systems with:
- **Crews** — Collaborative groups of agents working on task sets
- **Flows** — Event-driven workflow orchestration
- **Built-in memory** — Short-term, long-term, and entity memory

### Crew Architecture

```python
from crewai import Crew, Agent, Task, Process

crew = Crew(
    agents=[researcher, analyst],
    tasks=[research_task, analysis_task],
    process=Process.sequential,  # or Process.hierarchical
    memory=True,  # Enable memory system
    verbose=True
)

result = crew.kickoff()
```

### Process Types

| Process | Description | Manager Required |
|---------|-------------|------------------|
| **Sequential** | Tasks execute in order, output flows to next | No |
| **Hierarchical** | Manager agent delegates and validates | Yes (`manager_llm`) |
| **Consensual** (Planned) | Democratic decision-making | TBD |

### CrewAI Flows for Background Processing

Flows enable event-driven, persistent workflows:

```python
from crewai.flow.flow import Flow, listen, start
from crewai.flow.persistence import persist

@persist  # Automatic state persistence
class BackgroundMonitorFlow(Flow):
    
    @start()
    def initialize(self):
        print(f"Flow ID: {self.state['id']}")
        return {"status": "initialized"}
    
    @listen(initialize)
    def monitor_cycle(self, init_result):
        # Background monitoring logic
        return {"checked": True}
```

#### Key Flow Features
- **@start()** — Entry points for flow execution
- **@listen()** — React to method outputs
- **@router()** — Conditional branching
- **@persist** — Automatic state persistence (SQLite by default)
- **and_/or_** — Conditional logic operators
- **Human-in-the-loop** — @human_feedback decorator

### Memory System

| Component | Description | Storage |
|-----------|-------------|---------|
| **Short-Term** | Recent interactions via RAG | ChromaDB |
| **Long-Term** | Valuable insights across sessions | SQLite |
| **Entity** | People, places, concepts tracking | RAG-based |
| **External** | Custom providers (Mem0, etc.) | Configurable |

### Pros
- Higher-level abstraction = faster development
- Built-in memory and persistence
- Excellent for team-based task decomposition
- Good documentation and examples

### Cons
- Less fine-grained control than LangGraph
- Opinionated architecture may not fit all use cases
- Newer framework with evolving API

### Best For
- Rapid prototyping of multi-agent systems
- Task-focused workflows with clear role divisions
- Systems needing built-in memory without custom implementation

---

## 4. AutoGPT: Autonomous Agent Platform

### Overview

AutoGPT is a platform for building, deploying, and running **continuous AI agents** that automate complex workflows.

### Architecture Components

1. **AutoGPT Frontend** — Agent builder, workflow management, deployment controls
2. **AutoGPT Server** — Agent runtime, source code, marketplace
3. **Block-based Workflow** — Visual, low-code agent construction

### Key Characteristics

```bash
# Quick setup
curl -fsSL https://setup.agpt.co/install.sh -o install.sh && bash install.sh
```

- **Continuous operation** — Agents run persistently
- **External triggers** — Agents can be triggered by outside events
- **Block architecture** — Each block performs a single action
- **Marketplace** — Pre-built agents and components

### Example Use Cases

1. **Viral Video Generation**
   - Monitors Reddit for trending topics
   - Automatically creates short-form videos
   
2. **Social Media Quote Extraction**
   - Subscribes to YouTube channels
   - Transcribes, extracts quotes, publishes to social media

### Pros
- Built for continuous, autonomous operation
- Visual workflow builder for low-code development
- Strong community and marketplace
- Self-hostable with Docker

### Cons
- Heavy infrastructure requirements
- Complex setup for self-hosting
- Less flexible than code-first approaches
- Platform lock-in concerns

### Best For
- Fully autonomous, long-running agents
- Non-developer users via visual builder
- Pre-built agent workflows from marketplace

---

## 5. Architectural Patterns for Background Agents

### Pattern 1: Supervisor-Worker (LangGraph/CrewAI)

```
┌─────────────────┐
│   Supervisor    │
│     Agent       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│Worker │ │Worker │
│Agent 1│ │Agent 2│
└───────┘ └───────┘
```

**Characteristics:**
- Supervisor routes tasks to specialized workers
- Workers have independent scratchpads
- Final results aggregated by supervisor

### Pattern 2: Orchestrator-Workers (Anthropic)

```
┌──────────────────┐
│   Orchestrator   │──── Dynamically breaks down tasks
└────────┬─────────┘
         │
   ┌─────┼─────┐
   │     │     │
┌──▼──┐ ┌▼──┐ ┌▼──┐
│Work │ │W2 │ │W3 │  ← Number of workers determined at runtime
└─────┘ └───┘ └───┘
```

**Characteristics:**
- Orchestrator decides subtasks dynamically
- Workers allocated based on task complexity
- Ideal when task decomposition is unpredictable

### Pattern 3: Evaluator-Optimizer Loop

```
┌──────────┐
│Generator │──────┐
└──────────┘      │
     ▲            │
     │            ▼
     │     ┌────────────┐
     └─────│ Evaluator  │
           └────────────┘
```

**Characteristics:**
- Generator creates output
- Evaluator provides feedback
- Loop until quality threshold met
- Good for refinement tasks

### Pattern 4: Event-Driven Background Processing (CrewAI Flows)

```
┌─────────────────────────────────────┐
│          Event Bus                   │
└──┬──────────┬──────────┬───────────┘
   │          │          │
   ▼          ▼          ▼
┌─────┐   ┌─────┐   ┌─────┐
│Mon. │   │Mem. │   │Alert│
│Agent│   │Agent│   │Agent│
└─────┘   └─────┘   └─────┘
```

**Characteristics:**
- Agents listen to events
- Independent execution
- Can broadcast results to trigger other agents

---

## 6. Implementation Considerations

### State Management

| Framework | State Approach | Persistence |
|-----------|---------------|-------------|
| LangGraph | StateGraph with TypedDict | Checkpointers (Memory, SQLite, Postgres) |
| CrewAI | Pydantic BaseModel or dict | SQLite, custom adapters |
| AutoGPT | Platform-managed | Built into platform |

### Memory Strategies for Background Agents

1. **Working Memory** — Current context, recent interactions
2. **Long-term Memory** — Accumulated knowledge, user preferences
3. **Entity Memory** — Relationships, people, concepts
4. **Episodic Memory** — Past execution history for learning

### Error Handling & Recovery

```python
# LangGraph: Resume from failure
graph.invoke(None, config)  # Pass None to resume from checkpoint

# CrewAI: Flow persistence
@persist
class ResilientFlow(Flow):
    # State automatically saved, can resume on restart
```

### Scheduling Background Tasks

| Approach | Use Case |
|----------|----------|
| **Heartbeat polling** | Batch multiple checks together |
| **Cron jobs** | Exact timing, isolated context |
| **Event triggers** | Reactive processing |
| **Continuous loop** | Always-on monitoring (AutoGPT style) |

---

## 7. Comparison Matrix

| Feature | LangGraph | CrewAI | AutoGPT |
|---------|-----------|--------|---------|
| **Abstraction Level** | Low | High | Platform |
| **Learning Curve** | Steep | Moderate | Easy (visual) |
| **Persistence** | ✅ Checkpointers | ✅ @persist | ✅ Built-in |
| **Memory System** | Manual | ✅ Built-in | ✅ Built-in |
| **Multi-Agent** | ✅ Graph-based | ✅ Crews | ✅ Block-based |
| **Background/Continuous** | ✅ With setup | ✅ Flows | ✅ Native |
| **Human-in-loop** | ✅ Interrupts | ✅ @human_feedback | ✅ Checkpoints |
| **Production Ready** | ✅ | ✅ | ✅ (self-host) |
| **Visual Builder** | ❌ | ❌ | ✅ |

---

## 8. Recommendations for "Subconscious" Agent Architecture

### For Main + Background Agent Pattern

**Recommended: CrewAI Flows + Persistent State**

```python
from crewai.flow.flow import Flow, listen, start
from crewai.flow.persistence import persist

# Background "subconscious" flow
@persist
class SubconsciousFlow(Flow):
    
    @start()
    def heartbeat_check(self):
        """Periodic monitoring cycle"""
        return self._check_all_sources()
    
    @listen(heartbeat_check)
    def process_findings(self, findings):
        """Process and store important findings"""
        if findings.get("urgent"):
            self._notify_main_agent(findings)
        return {"processed": True}
    
    @listen(process_findings)
    def memory_maintenance(self, result):
        """Curate long-term memory"""
        return self._consolidate_memories()
```

**Why This Works:**
- Event-driven architecture matches background processing needs
- Built-in persistence survives restarts
- Memory system handles context across sessions
- Can trigger main agent when needed

### For Complex State Machines

**Recommended: LangGraph with Custom Checkpointer**

- Use when you need fine-grained control over state transitions
- Ideal for workflows with complex conditional logic
- Better for debugging with explicit graph visualization

### For Fully Autonomous Operation

**Recommended: AutoGPT Platform**

- When you need always-on, continuous operation
- When visual workflow building is preferred
- When leveraging marketplace components speeds development

---

## 9. Key Takeaways

1. **Start Simple** — Per Anthropic's guidance, begin with simple patterns and add complexity only when needed.

2. **Persistence is Critical** — Background agents must survive restarts; use checkpointers or @persist decorators.

3. **Memory Separation** — Keep working memory (current context) separate from long-term memory (accumulated knowledge).

4. **Event-Driven > Polling** — Where possible, use event-driven patterns rather than constant polling.

5. **Human-in-the-Loop** — Even autonomous agents should have checkpoints for human oversight.

6. **Idempotent Operations** — Background tasks that might retry should be idempotent to avoid duplicate effects.

---

## 10. Next Steps

1. **Prototype** a simple background agent using CrewAI Flows with persistence
2. **Define** the specific tasks for the "subconscious" agent (monitoring, memory, etc.)
3. **Design** the communication interface between main and background agents
4. **Implement** state persistence strategy for cross-session continuity
5. **Test** failure recovery and resumption scenarios

---

## References

- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
- [CrewAI Documentation](https://docs.crewai.com/)
- [AutoGPT GitHub](https://github.com/Significant-Gravitas/AutoGPT)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LangChain Blog: Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/)
