# Memory Debugging: Why Did AI Remember Something Wrong?

*Research Document — AI Continuity Framework*  
*Iteration 3, Document 04*  
*Date: 2026-02-17*  
*Focus: Understanding and debugging AI memory errors for user trust and traceability*

---

## Executive Summary

AI memory systems will make mistakes. Users will encounter AI that "remembers" things they never said, infers incorrect preferences, or applies context from one situation to another. The difference between a trustworthy AI and a creepy one lies not in whether errors occur, but in whether users can understand, trace, and correct those errors.

**Core thesis:** Memory debugging isn't just a developer tool—it's a user-facing trust feature. When users can ask "why do you think that?" and get a coherent answer, AI memory transforms from opaque magic into transparent partnership.

**Key findings:**
- Every memory requires provenance metadata (source, timestamp, confidence, inference chain)
- Users need three debugging modes: casual ("why?"), detailed ("show me"), and forensic ("trace history")
- The distinction between *stated* vs *inferred* memories is critical for trust
- Contradiction detection should be proactive, not just reactive
- Explanation generation must match the user's mental model, not the system's internals

---

## 1. The Error Taxonomy

Before we can debug memory errors, we need to understand their types. Each error class requires different detection strategies and explanation approaches.

### 1.1 Factual Errors (Wrong Data)

**Examples:**
- AI thinks user lives in NYC (they moved to Austin 6 months ago)
- AI has partner's name as "Michael" (it's "Mitchell")
- AI thinks user is vegetarian (they eat fish)

**Root causes:**
- Outdated information (circumstances changed)
- Misheard/misread original input
- Conflation of similar-sounding names/places
- User was hypothetical ("If I lived in NYC...")

**Detection signals:**
- User explicit correction: "No, I live in Austin now"
- Temporal staleness: Memory hasn't been reinforced in X months
- Conflict with recent statements

**Explanation pattern:**
```
"I believe you live in NYC because on [date], you said 'my apartment in NYC...'
However, I now see you mentioned Austin recently. Would you like me to update this?"
```

### 1.2 Inference Errors (Wrong Conclusion)

**Examples:**
- AI inferred "user likes jazz" from one mention of a Miles Davis album
- AI thinks user is introverted based on work-from-home preference
- AI believes user dislikes their manager (misread venting as pattern)

**Root causes:**
- Overgeneralization from single data point
- Correlation assumed as preference (mentioned ≠ enjoyed)
- Sentiment misattribution
- Sarcasm/irony not detected

**Detection signals:**
- Low confidence in original inference
- No reinforcing data points
- User surprise when memory surfaces

**Explanation pattern:**
```
"I inferred you like jazz because on [date], you mentioned listening to 
Miles Davis's Kind of Blue. This was an inference (confidence: 60%), not 
something you directly stated. Is this accurate?"
```

### 1.3 Context Errors (Wrong Scope)

**Examples:**
- Memory from work Slack applied to personal conversation
- Role-play dialogue stored as factual preference
- Hypothetical discussion ("If I were to start a business...") stored as intent

**Root causes:**
- Context boundaries not preserved
- Hypothetical vs actual not distinguished
- Persona/role-play leaked into main memory
- Multi-user context conflation (in shared spaces)

**Detection signals:**
- Memory metadata shows different context than current session
- "What if" / conditional language in source
- Third-party references (talking about someone else)

**Explanation pattern:**
```
"I have a note that you're considering starting a coffee shop. Looking at the source, 
this came from a hypothetical discussion on [date]: 'What if I opened a coffee shop...'
Should I mark this as hypothetical rather than a current plan?"
```

### 1.4 Attribution Errors (Wrong Source)

**Examples:**
- AI thinks user said something their friend said
- Memory attributed to wrong conversation
- Conflation of two different people named "Sarah"

**Root causes:**
- Entity resolution failure
- Conversation participant confusion
- Similar-name collision
- Memory merge error during consolidation

**Detection signals:**
- User denial: "I never said that"
- Source trace shows third-party speaker
- Entity disambiguation clues present

**Explanation pattern:**
```
"Tracing this back: The statement 'I'm allergic to shellfish' appeared in your 
conversation on [date], but reviewing the context, it seems your friend David 
said this, not you. I incorrectly attributed it to you. Removing this from your profile."
```

---

## 2. The Provenance Data Model

Every memory needs rich metadata to enable debugging. Without provenance, errors are unfixable.

### 2.1 Core Memory Schema

```yaml
memory:
  id: "mem_abc123"
  content: "User prefers email over Slack for work communication"
  
  # What type of memory is this?
  type: "preference"  # fact | preference | event | relationship | belief | skill
  
  # How did we get this?
  source:
    type: "stated"  # stated | inferred | observed | imported | third_party
    confidence: 0.95  # 0.0 to 1.0
    inference_chain: null  # Only for inferred memories
    
  # Where did it come from?
  provenance:
    conversation_id: "conv_xyz789"
    message_id: "msg_def456"
    timestamp: "2026-01-15T14:32:00Z"
    context: "work"  # work | personal | project:xyz | role_play
    speaker: "user"  # user | system | third_party:name
    original_text: "Just send me an email, I don't check Slack during deep work"
    
  # How has it changed?
  history:
    - action: "created"
      timestamp: "2026-01-15T14:32:00Z"
      actor: "memory_agent"
    - action: "reinforced"
      timestamp: "2026-02-01T09:15:00Z"
      evidence: "msg_ghi789"
      
  # What's its current state?
  status:
    active: true
    superseded_by: null  # ID of newer conflicting memory
    last_accessed: "2026-02-10T16:00:00Z"
    access_count: 7
    decay_score: 0.85  # Ebbinghaus-style decay
```

### 2.2 Inference Chain Schema

When a memory is inferred (not directly stated), we need to preserve the reasoning:

```yaml
inference_chain:
  conclusion: "User is health-conscious"
  confidence: 0.72
  
  evidence:
    - memory_id: "mem_001"
      content: "User mentioned going to the gym 3x/week"
      weight: 0.4
      contribution: "behavioral_pattern"
      
    - memory_id: "mem_002"
      content: "User asked about calorie counts at restaurant"
      weight: 0.3
      contribution: "explicit_interest"
      
    - memory_id: "mem_003"
      content: "User mentioned meal prepping on Sundays"
      weight: 0.3
      contribution: "behavioral_pattern"
      
  reasoning: "Multiple indicators of health-focused behavior observed over 3-month period"
  
  alternative_interpretations:
    - interpretation: "User is dieting for specific event"
      confidence: 0.15
    - interpretation: "User has medical dietary requirements"
      confidence: 0.13
```

### 2.3 Context Boundary Schema

Memories need explicit context boundaries to prevent leakage:

```yaml
context_scope:
  # Where this memory applies
  valid_contexts:
    - type: "all"  # all | workspace | project | session | persona
      
  # Where this memory does NOT apply
  excluded_contexts:
    - type: "persona"
      id: "dungeon_master_character"
      
  # Conditions for application
  conditions:
    - type: "time_range"
      valid_after: "2026-01-01"
      valid_until: null  # permanent unless superseded
      
  # Hypothetical flag
  hypothetical: false
  hypothetical_framing: null  # "If I were to...", "What if..."
```

---

## 3. Debugging UI Concepts

Memory debugging needs multiple interface layers: in-conversation, dedicated dashboard, and deep forensics.

### 3.1 In-Conversation Debugging (Casual Mode)

**Trigger patterns:**
- "Why do you think that?"
- "Where did you get that idea?"
- "When did I tell you that?"
- "I never said that"
- "That's not right"

**Response structure:**

```
[Quick Explanation]
I believe [memory content] because [simple reason].
Source: [conversation date] — "[quoted snippet]"
Confidence: [high/medium/low]

[Quick Actions]
• ✓ That's correct
• ✗ That's wrong, [suggest correction]
• 🔍 Show me more details
• 🗑️ Forget this
```

**Example interaction:**

> **User:** Why do you think I like coffee?
> 
> **AI:** I believe you prefer coffee because on February 3rd, you said "I can't function without my morning coffee." This was a direct statement (high confidence).
> 
> *[✓ Correct] [✗ Not quite] [Show details] [Forget this]*

### 3.2 Memory Dashboard (Review Mode)

A dedicated interface for exploring and managing memories:

```
┌────────────────────────────────────────────────────────────────┐
│  🧠 Memory Explorer                              [Search...]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Filter: [All ▼] [Stated ▼] [High Confidence ▼] [Date Range]  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📌 PREFERENCES                                     (23)   │ │
│  │                                                           │ │
│  │   ☕ Prefers coffee in the morning                       │ │
│  │      Stated • High confidence • Feb 3                    │ │
│  │      [View source] [Edit] [Delete]                       │ │
│  │                                                           │ │
│  │   📧 Prefers email over Slack for work                   │ │
│  │      Stated • High confidence • Jan 15                   │ │
│  │      [View source] [Edit] [Delete]                       │ │
│  │                                                           │ │
│  │   🥗 Health-conscious about food choices                 │ │
│  │      ⚠️ Inferred • Medium confidence • Multiple sources  │ │
│  │      [Why?] [View sources] [Edit] [Delete]               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📍 FACTS                                           (45)   │ │
│  │                                                           │ │
│  │   🏠 Lives in Austin, TX                                 │ │
│  │      Stated • High confidence • Dec 2025                 │ │
│  │      ⚠️ Superseded: Previously "NYC" (Jan 2025)         │ │
│  │      [View history] [Edit] [Delete]                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ⚠️ 2 POTENTIAL CONFLICTS DETECTED                           │
│     [Review conflicts]                                         │
└────────────────────────────────────────────────────────────────┘
```

**Key features:**

1. **Category grouping:** Preferences, Facts, Events, Relationships, Skills
2. **Type badges:** "Stated" (checkmark) vs "Inferred" (lightbulb icon)
3. **Confidence indicators:** Visual confidence bars or high/medium/low labels
4. **Supersession chains:** Show when memories were updated
5. **Conflict alerts:** Proactive flags for inconsistencies
6. **One-click source viewing:** Jump to original conversation

### 3.3 Memory Detail View (Forensic Mode)

Deep dive into a single memory:

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Memory Detail: "Prefers morning meetings"                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📝 CONTENT                                                    │
│  "You prefer scheduling meetings in the morning (9-11 AM)"     │
│                                                                │
│  📊 METADATA                                                   │
│  Type: Preference                                              │
│  Source: Inferred (from 3 observations)                        │
│  Confidence: 78%                                               │
│  Context: Work                                                 │
│  Created: January 20, 2026                                     │
│  Last Reinforced: February 10, 2026                            │
│  Times Used: 5                                                 │
│                                                                │
│  🧪 INFERENCE CHAIN                                            │
│  This preference was inferred from:                            │
│                                                                │
│  1. [Jan 12] "Let's do 9 AM, I'm sharper in the morning"      │
│     Conversation: Planning call with Carlos                    │
│     Contribution: 45%                                          │
│                                                                │
│  2. [Jan 18] "Morning works better for me"                    │
│     Conversation: Scheduling dentist appointment               │
│     Contribution: 30%                                          │
│                                                                │
│  3. [Feb 5] Declined afternoon meeting, suggested morning     │
│     Conversation: Team standup reschedule                      │
│     Contribution: 25%                                          │
│                                                                │
│  📜 HISTORY                                                    │
│  • Feb 10: Used in response (meeting scheduling)              │
│  • Feb 5: Reinforced (new evidence)                           │
│  • Jan 20: Created (initial inference)                        │
│                                                                │
│  ⚡ ACTIONS                                                    │
│  [✓ Confirm] [✗ Incorrect] [📝 Edit] [🗑️ Delete] [↩️ Undo]   │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 Conflict Resolution View

When contradictions are detected:

```
┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Memory Conflict Detected                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  These memories may contradict each other:                     │
│                                                                │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐ │
│  │ A) "Lives in NYC"          │  │ B) "Lives in Austin"     │ │
│  │                            │  │                          │ │
│  │ Jan 2025 • Stated         │  │ Dec 2025 • Stated        │ │
│  │ "My NYC apartment..."      │  │ "Since moving to Austin" │ │
│  │ [View full context]        │  │ [View full context]      │ │
│  └─────────────────────────────┘  └─────────────────────────┘ │
│                                                                │
│  🤔 My best guess: You moved from NYC to Austin in late 2025  │
│                                                                │
│  What would you like to do?                                    │
│                                                                │
│  [✓ Yes, I moved — keep Austin as current]                    │
│  [↔️ Both true — I have homes in both]                        │
│  [❌ Neither — let me explain]                                 │
│  [🗑️ Forget both]                                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Explanation Generation Approaches

Different users need different explanation styles. The system should adapt.

### 4.1 Casual Explanations (Default)

For most users, most of the time:

```
"I remember you mentioning [topic] back in [timeframe]. You said [brief quote]."
```

**Principles:**
- Human-like phrasing ("I remember" not "Database query returned")
- Approximate timestamps ("last month" not "2026-01-15T14:32:00Z")
- Brief quotes, not wall of text
- One sentence if possible

### 4.2 Detailed Explanations (On Request)

When user asks "show me more":

```
"This memory came from our conversation on January 15th about work communication.

You said: 'Just send me an email, I don't check Slack during deep work.'

From this, I stored: 'User prefers email over Slack for work communication'

Type: Direct statement (not inferred)
Confidence: 95%
Context: Work communications
Last updated: January 15, 2026"
```

### 4.3 Technical Explanations (Power Users)

For debugging or advanced users:

```yaml
memory_id: mem_abc123
content: "Prefers email over Slack for work communication"
source:
  type: stated
  confidence: 0.95
  conversation_id: conv_xyz789
  message_id: msg_def456
  timestamp: 2026-01-15T14:32:00Z
  original_text: "Just send me an email, I don't check Slack during deep work"
extraction_model: memory-extract-v3
embedding_distance: 0.23
last_access: 2026-02-10T16:00:00Z
access_count: 7
```

### 4.4 Inference Explanations

Special handling for inferred memories:

```
"I didn't directly ask you about this—I inferred it from patterns.

Here's my reasoning:
• You've mentioned going to the gym 3x/week
• You asked about calorie counts at that restaurant
• You talked about meal prepping on Sundays

Together, these suggested you're health-conscious.

My confidence: 72% (medium)

Is this accurate, or did I misread the situation?"
```

**Key elements:**
- Explicit "I inferred" language
- Itemized evidence
- Confidence level
- Invitation to correct

---

## 5. Trust-Building Patterns

Memory debugging isn't just functional—it's about building user trust.

### 5.1 Proactive Transparency

**Don't wait for users to ask.** Surface provenance naturally:

> **Bad:** "I know you prefer morning meetings."
>
> **Good:** "Based on our past scheduling conversations, I think you prefer morning meetings. Should I look for 9-10 AM slots?"

The second version:
- Acknowledges source ("past scheduling conversations")
- Uses hedging language ("I think")
- Invites correction ("Should I...")

### 5.2 Confidence Calibration

Express uncertainty when it exists:

| Confidence | Language |
|------------|----------|
| 90%+ | "You mentioned..." / "You said..." |
| 70-90% | "I believe..." / "I think..." |
| 50-70% | "If I remember correctly..." / "I'm not certain, but..." |
| <50% | "I may be misremembering, but..." / Don't surface without prompting |

### 5.3 The "I Might Be Wrong" Pattern

When surfacing uncertain memories:

```
"I have a note that you're vegetarian, but I'm not 100% sure about this. 
Does that sound right, or should I update this?"
```

This:
- Admits fallibility
- Gives user control
- Prevents embarrassing misstatements

### 5.4 Graceful Correction Acceptance

When user corrects a memory:

> **User:** No, I actually eat fish. I'm pescatarian.
>
> **Good:** "Got it—updating from vegetarian to pescatarian. Thanks for the correction!"
>
> **Bad:** "My records indicated vegetarian based on your statement on January 5th where you said..."

The good response:
- Acknowledges immediately
- Confirms the update
- Doesn't argue or explain defensively
- Doesn't make user feel surveilled

### 5.5 Never Weaponize Memory

Memory should help users, never corner them:

> **Never:** "But you said on February 3rd that you wanted to exercise more. Why haven't you been to the gym?"

> **Never:** "You told me you were going to quit smoking. I see you just mentioned buying cigarettes."

Memory is for service, not surveillance or judgment.

---

## 6. Contradiction Detection System

Proactive conflict detection builds trust by catching errors before users do.

### 6.1 Contradiction Types

| Type | Example | Detection Method |
|------|---------|------------------|
| **Temporal supersession** | "Lives in NYC" → "Lives in Austin" | Same attribute, different value, later timestamp |
| **Logical conflict** | "Vegetarian" + "Loves steak" | Semantic incompatibility check |
| **Scope conflict** | "Hates meetings" (work) + "Loves team gatherings" (personal) | Context mismatch |
| **Source conflict** | User says X, third party says not-X | Speaker attribution comparison |

### 6.2 Detection Triggers

Check for contradictions:
- On new memory creation (compare against existing)
- On memory retrieval (flag if context mismatches)
- Periodic sweep (batch conflict detection)
- On explicit user review

### 6.3 Resolution Flow

```
┌─────────────────┐
│  New memory M   │
│  created        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Semantic search │
│ for related     │
│ existing mems   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     No conflict
│ Check for       │─────────────────────► Store M
│ contradiction   │
└────────┬────────┘
         │ Conflict found
         ▼
┌─────────────────┐
│ Classify        │
│ conflict type   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Temporal    Other
    │           │
    ▼           ▼
 Auto-       Queue for
 supersede   user review
```

### 6.4 Auto-Resolution Rules

Some conflicts can resolve automatically:

| Conflict Type | Auto-Resolution |
|---------------|-----------------|
| Temporal supersession with explicit "now" | Newer wins, older marked superseded |
| Moving/relocation language | Update location, preserve history |
| Explicit correction ("Actually...") | Correction wins, mark old as corrected |
| Different contexts | No conflict—store both with context tags |

### 6.5 User Resolution Required

Some conflicts need human input:

- Logical conflicts with no temporal signal
- Both memories high confidence
- User preference areas (where both could be true)
- Third-party vs first-party conflicts

Surface these gently:
```
"I noticed something that might need your input: I have you down as both 
'coffee lover' and 'doesn't drink caffeine.' Could you help me sort this out?"
```

---

## 7. Implementation Recommendations

### 7.1 Storage Requirements

Every memory must include:
- `id`: Unique identifier
- `content`: The memory text
- `source_type`: stated | inferred | observed | imported
- `confidence`: 0.0-1.0
- `created_at`: Timestamp
- `conversation_id`: Link to source
- `message_id`: Specific message reference
- `original_text`: Quoted source material
- `context`: Scope tags
- `status`: active | superseded | deleted
- `history`: Array of changes

### 7.2 Explanation Generation Pipeline

```
User asks "why do you think X?"
         │
         ▼
┌────────────────────┐
│ Identify memory M  │
│ related to X       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Retrieve M's       │
│ provenance data    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Generate natural   │
│ language explan.   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Adjust complexity  │
│ to user context    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Include quick      │
│ action options     │
└────────────────────┘
```

### 7.3 Debugging API

```typescript
// Get explanation for a memory
memorySystem.explain(memoryId: string): {
  casual: string,       // One-liner
  detailed: string,     // Full explanation
  technical: object,    // Raw metadata
  sources: Source[],    // Contributing evidence
  confidence: number,
  inferenceChain?: InferenceStep[]
}

// Get conflicts for a user
memorySystem.getConflicts(userId: string): Conflict[]

// Get memory history
memorySystem.getHistory(memoryId: string): HistoryEntry[]

// Trace memory origin
memorySystem.trace(memoryId: string): {
  conversationId: string,
  messageId: string,
  timestamp: Date,
  originalText: string,
  context: string
}
```

### 7.4 UI Integration Points

| Interface | Debugging Feature |
|-----------|-------------------|
| Chat | "Why do you think that?" natural language queries |
| Settings | Memory dashboard with search and filters |
| Notifications | Proactive conflict alerts |
| Memory hover | Quick info tooltips with source dates |
| Memory list | Type badges (stated/inferred) |
| Memory detail | Full forensic view |

---

## 8. Key Takeaways

### For Architecture
1. **Provenance is mandatory.** Every memory needs source tracking from day one. Retrofitting is painful.
2. **Stated vs inferred is a first-class distinction.** Users trust stated memories; they're skeptical of inferences.
3. **History is audit trail.** Never delete—mark as superseded. Support rollback.
4. **Context scope prevents leakage.** Tag memories with their valid contexts; don't apply work memories to personal.

### For UX
5. **Three-tier debugging.** Casual (in-chat), Review (dashboard), Forensic (deep dive). Most users use casual; power users want forensic.
6. **Express uncertainty naturally.** "I think..." and "If I remember correctly..." build more trust than false confidence.
7. **Make correction easy.** One-click fixes. Don't make users argue with the AI.
8. **Proactive conflict detection.** Catch errors before users do. "I noticed an inconsistency..."

### For Trust
9. **Admit fallibility.** "I might be wrong about this" is a trust-builder.
10. **Never weaponize.** Memory is for service, not surveillance or judgment.
11. **Transparency by default.** Include source hints even when not asked.
12. **Graceful correction.** Thank users for corrections; don't defend errors.

---

## 9. Open Questions

1. **Inference depth limits:** How many hops of inference should be traceable? (A → B → C → conclusion)

2. **Explanation verbosity calibration:** How do we learn what level of detail each user prefers?

3. **Forgetting explanations:** When a user deletes a memory, should we explain why we had it first?

4. **Third-party memory disputes:** If user says "I never said that about Sarah," but we have a record, how do we handle?

5. **Model-generated explanations:** Should explanations be live-generated or pre-computed and stored?

---

## 10. Connection to Framework Documents

This research informs:

- **02-Memory-Architecture.md:** Add provenance schema requirements
- **08-Multi-Agent-Memory.md:** Debugging agent role
- **12-User-Control.md:** Correction UX patterns
- **Iteration 2/01-Conflict-Resolution.md:** Extends with user-facing resolution UI

Proposed new documents:
- **14-Debugging-API.md:** Technical specification for debugging interfaces
- **guidelines/explanation-style.md:** Tone and verbosity guidelines

---

*Research complete. Memory debugging is fundamentally about making the invisible visible—letting users peek behind the curtain while maintaining the conversational magic.*
