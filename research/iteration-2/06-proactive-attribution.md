# Proactive Memory Surfacing and Attribution

*Research Document for AI Continuity Framework*  
*Iteration 2, Document 06*  
*Status: Complete*

---

## Executive Summary

When should an AI proactively mention something it remembers, and should it cite the source? This document establishes guidelines for surfacing memories without prompting and how to attribute recalled information—balancing helpfulness against the "creepy factor."

**Key Finding:** The line between helpful and creepy lies in *relevance to current context* and *user agency*. Proactive memory feels helpful when it enables action; it feels invasive when it demonstrates surveillance without purpose.

---

## 1. The Creepy-Helpful Spectrum

### 1.1 What Makes Memory Surfacing Feel Helpful

| Factor | Example | Why It Works |
|--------|---------|--------------|
| **Actionable timing** | "Your anniversary is next week—want me to book that restaurant you mentioned?" | Enables action, saves user effort |
| **Clear relevance** | "Since you prefer morning meetings, should I suggest 9 AM slots?" | Memory serves current task directly |
| **User-initiated context** | User asks about restaurants → "You mentioned wanting to try Osteria last month" | Memory enhances user's request |
| **Positive associations** | "Your mom's birthday is coming up—she liked the flowers last year" | Pleasant memory, helpful reminder |
| **Time-sensitive** | "Heads up, your passport expires in 3 months" | Prevents future problems |

### 1.2 What Makes Memory Surfacing Feel Creepy

| Factor | Example | Why It Fails |
|--------|---------|--------------|
| **No clear purpose** | "I notice you've been stressed about work lately" | Demonstrates surveillance, no action offered |
| **Overly precise recall** | "At 3:47 PM on February 3rd, you said..." | Feels like a recording, not a relationship |
| **Private in public** | In group chat: "Based on what you told me about your financial situation..." | Context violation |
| **Trauma surfacing** | "Since your divorce last year..." (unprompted) | Surfaces pain without consent |
| **Pattern observation** | "You seem to drink more on Fridays" | Judgmental surveillance |
| **Old disagreements** | "Remember when you said X? I think you were wrong." | Weaponized memory |

### 1.3 The Core Principle

> **Memory surfacing feels helpful when it's FOR the user. It feels creepy when it's ABOUT the user.**

The question to ask: "Am I surfacing this memory to help them, or to demonstrate that I remember?"

---

## 2. When to Proactively Surface Memories

### 2.1 Decision Framework

```
                    ┌─────────────────────┐
                    │ Is memory relevant  │
                    │ to current context? │
                    └─────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
            YES                              NO
              │                               │
              ▼                               ▼
    ┌─────────────────┐              Don't surface
    │ Is it actionable│              (exception: scheduled
    │ or time-bound?  │               reminders user requested)
    └────────┬────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
   YES               NO
    │                 │
    ▼                 ▼
  SURFACE        Wait for better
  (with purpose)  opportunity or
                  user prompt
```

### 2.2 Green Light Categories (Safe to Surface)

**Calendar & Time-Sensitive:**
- Upcoming events (1-7 days out)
- Expiring items (subscriptions, documents, deadlines)
- Anniversaries and birthdays the user has mentioned caring about

**Active Projects:**
- Follow-ups on tasks the user mentioned
- "Did you ever hear back about X?"
- Status updates on things in progress

**User-Requested Tracking:**
- "Remind me to..." items
- Explicitly tracked goals or habits
- Preferences user asked you to remember

**Direct Task Enhancement:**
- User asks about topic → recall relevant prior conversation
- User needs recommendation → recall stated preferences
- User is deciding → recall relevant constraints they mentioned

### 2.3 Yellow Light Categories (Proceed With Caution)

**Health/Wellbeing:**
- User mentioned a health goal → follow up gently
- Pattern-based observations → only if user asked for tracking
- Stress/emotional observations → offer support, don't diagnose

**Relationships:**
- Mention people user has discussed, but carefully
- Don't assume relationship status hasn't changed
- Avoid surfacing conflicts or complaints about others

**Career/Financial:**
- Follow up on job searches, applications → if user seemed to want tracking
- Financial situations → only if directly relevant and recent
- Avoid making user feel surveilled about money

### 2.4 Red Light Categories (Don't Surface Unless Asked)

**Trauma/Grief:**
- Deaths, divorces, breakups, losses
- Only reference if user initiates the topic
- Exception: supportive mention on anniversaries IF user would want it

**Private Confessions:**
- Things shared in vulnerability
- Embarrassing moments
- Relationship complaints

**Old Disagreements:**
- Past arguments or tensions
- Contradictions in user's stated positions
- "I told you so" moments

**Pattern Surveillance:**
- "You've been doing X a lot lately"
- Behavioral observations that feel judgmental
- Consumption patterns (unless explicitly tracked)

---

## 3. Context Sensitivity

### 3.1 Private vs. Public Contexts

| Context | Memory Surfacing Approach |
|---------|---------------------------|
| **1:1 conversation** | Full access to memory, use judgment |
| **Group chat with known members** | Surface only information appropriate for all participants |
| **Group chat with unknown members** | Minimal surfacing, treat as semi-public |
| **Public channels** | No personal memory surfacing |

**The Test:** "Would the user be comfortable with everyone present knowing this?"

### 3.2 Relationship Tier Matrix

| Memory Type | Stranger | Acquaintance | Close Relationship |
|-------------|----------|--------------|-------------------|
| Basic preferences | ✓ | ✓ | ✓ |
| Schedule/calendar | ✗ | ✓ | ✓ |
| Personal relationships | ✗ | ✗ | ✓ |
| Health/emotional | ✗ | ✗ | With care |
| Financial | ✗ | ✗ | Only if relevant |
| Trauma/past pain | ✗ | ✗ | Only if user initiates |

Relationship depth should develop over time, unlocking deeper memory surfacing as trust is established.

---

## 4. Frequency and Timing

### 4.1 Optimal Surfacing Frequency

**Too Rare:** Memory feels unused, assistant seems forgetful
**Too Frequent:** Feels like surveillance, overwhelming

**Recommended baseline:**
- 1-3 proactive memory surfaces per substantial conversation
- Not every message needs to reference memory
- Most messages should stand alone

**Scaling with conversation length:**
- Brief exchange (< 5 messages): 0-1 memory surfaces
- Normal conversation (5-20 messages): 1-2 surfaces
- Extended session (20+ messages): 2-4 surfaces max

### 4.2 Time-Since-Event Thresholds

| Memory Age | Surfacing Approach |
|------------|-------------------|
| **< 1 day** | Natural reference, no citation needed |
| **1-7 days** | Brief reference, "earlier this week" |
| **1-4 weeks** | Mention timeframe, "last month" |
| **1-6 months** | Specific citation helpful, "back in October" |
| **6+ months** | Explicit attribution, check if still valid |
| **1+ year** | Strong attribution, verify current relevance |

**Key insight:** Older memories require more attribution AND more care—preferences, situations, and relationships change.

### 4.3 Recency Appropriateness

**Recent memories (days):** Safe to surface with current relevance
**Medium memories (weeks-months):** Consider whether situation may have changed
**Old memories (months-years):** 
- Frame as "you mentioned once" not "you always"
- Check if still relevant before acting on it
- Higher bar for surfacing—needs clear current utility

---

## 5. Attribution Styles

### 5.1 Attribution Spectrum

**Level 0: Silent Integration**
- "I'll book a morning meeting." (knows user prefers mornings)
- Appropriate: High-confidence, frequently-used preferences
- Risk: User doesn't know AI is using memory

**Level 1: Implicit Reference**
- "Since you prefer mornings, how about 9 AM?"
- Appropriate: Stable preferences, clear relevance
- Most common recommended style

**Level 2: Soft Citation**
- "Based on what you mentioned about preferring mornings..."
- Appropriate: Less certain memories, checking validity
- Invites correction

**Level 3: Explicit Citation**
- "You mentioned last week that you prefer morning meetings..."
- Appropriate: Older memories, important decisions, memory user might not recall sharing
- Higher transparency

**Level 4: Full Attribution**
- "On February 3rd, you said you wanted to switch to morning meetings..."
- Appropriate: Controversial recall, very old memories, when user disputes
- Use sparingly—feels surveillance-y

### 5.2 Recommended Defaults

| Memory Type | Default Attribution Level |
|-------------|--------------------------|
| Stated preferences (recent) | Level 1 |
| Stated preferences (old) | Level 2-3 |
| Facts about user's life | Level 2 |
| User opinions/positions | Level 2-3 |
| Emotional/sensitive info | Level 3 |
| Disputed or uncertain | Level 3-4 |

### 5.3 Attribution Language

**Natural (Recommended):**
- "You mentioned wanting to try..."
- "Given your preference for..."
- "Since you said..."
- "Based on what you shared about..."
- "If I remember right, you..."

**Overly Formal (Avoid):**
- "My records indicate that on DATE..."
- "According to my memory database..."
- "As stored in our conversation from..."

**Creepy Precision (Never):**
- "At 3:47 PM on February 3rd, 2026, you stated..."
- "In message ID #4721, you said..."
- "My logs show you have mentioned this 7 times..."

---

## 6. Handling Uncertainty

### 6.1 Confidence Indicators

When memory is uncertain, signal it:

**High confidence:** "You mentioned preferring morning meetings."
**Medium confidence:** "I think you mentioned preferring mornings—is that right?"
**Low confidence:** "Did you once mention preferring morning meetings, or am I misremembering?"

### 6.2 When Memory Might Be Wrong

| Scenario | Approach |
|----------|----------|
| Memory is consolidated/summarized | Frame as general impression, invite correction |
| Time decay (old memory) | Lower confidence language |
| Potentially changed situation | Check before acting: "Is this still the case?" |
| Contradictory memories | Surface the contradiction, ask for clarification |

### 6.3 Graceful Correction

When user corrects a memory:
1. Accept correction immediately
2. Thank them for updating you
3. Update the underlying memory
4. Don't over-apologize or justify

**Example:**
> User: "Actually, I prefer afternoon meetings now."  
> AI: "Got it—afternoons it is. I'll keep that in mind going forward."

NOT:
> "I apologize for the error in my memory systems. I had stored February 3rd 2026 preference for morning meetings but will now update to reflect..."

---

## 7. User Control Settings

### 7.1 Recommended User Preferences

| Setting | Options | Default |
|---------|---------|---------|
| Proactive surfacing | Always / Relevant only / Never | Relevant only |
| Attribution style | Explicit / Natural / Silent | Natural |
| Memory verification | Always check / Trust memory / Ask when uncertain | Ask when uncertain |
| Reminder frequency | Aggressive / Moderate / Minimal | Moderate |
| Old memory threshold | 1mo / 3mo / 6mo / 1yr | 3mo (ask before acting on older) |

### 7.2 Context-Specific Overrides

Allow users to set different preferences for:
- 1:1 conversations vs. group chats
- Work contexts vs. personal contexts
- Specific topics (e.g., "never proactively mention health stuff")

### 7.3 Privacy Controls

| Control | Description |
|---------|-------------|
| "Forget this conversation" | Delete memories from current session |
| "Don't remember X" | Exclude specific topics/facts from memory |
| "What do you remember about X?" | Query memory on demand |
| "Where did you learn that?" | Request attribution for any surfaced memory |
| "Stop tracking X" | Disable memory for specific categories |

---

## 8. Lessons from Human Assistants

### 8.1 Executive Assistant Best Practices

Professional executive assistants develop intuition for:

**What to surface proactively:**
- Calendar conflicts and prep needs
- Follow-up reminders on important items
- Preferences that affect current decisions
- Time-sensitive information

**What to hold until asked:**
- Personal matters unless affecting work
- Sensitive topics discussed in confidence
- Information that might embarrass
- Opinions about others

**How they phrase it:**
- "You mentioned wanting to follow up with Sarah—shall I schedule that?"
- "I noticed the board meeting is next week. Do you need the usual materials?"
- "Given your preference for [X], I went ahead and [Y]. Let me know if you'd like me to adjust."

### 8.2 CRM and Customer Service Patterns

**Good practices:**
- "Welcome back, [Name]! I see you usually order [X]—would you like that today?"
- Use purchase history to help, not to upsell aggressively
- Remember complaints/issues and proactively check if resolved

**Bad practices:**
- "I see you browsed [embarrassing category] last week..."
- Over-personalization that reveals extent of data collection
- Surfacing data from third-party sources ("I see from your social media...")

### 8.3 Key Human Insight

> Skilled human assistants remember everything but *surface* selectively. The goal is to make the principal's life easier, not to demonstrate memory capabilities.

The test: "Would a thoughtful human assistant mention this right now?"

---

## 9. Comparison: ChatGPT's Memory Approach

### 9.1 ChatGPT Memory (as of 2024-2025)

**What it does:**
- Saves discrete facts ("User is a software engineer")
- Shows what it saved ("Memory updated")
- Users can view and delete individual memories
- Memory is opt-in and visible

**What it doesn't do:**
- Proactive surfacing is rare
- Minimal attribution ("Based on what you told me...")
- Limited temporal awareness
- No sophisticated consolidation

### 9.2 Lessons from ChatGPT

**Strengths:**
- Transparency about what's stored
- User control over individual memories
- Clear opt-in model

**Weaknesses:**
- Feels like a database, not a relationship
- Memory is flat (no importance weighting)
- Limited proactive value
- Attribution is generic

### 9.3 Differentiation Opportunity

A more sophisticated approach would:
- Surface memories proactively when genuinely helpful
- Use natural attribution language
- Weight by importance and recency
- Consolidate intelligently over time
- Feel like a good memory, not a database lookup

---

## 10. Implementation Guidelines

### 10.1 Surfacing Decision Algorithm

```python
def should_surface_memory(memory, context, user_prefs):
    # Red lights
    if memory.category in ['trauma', 'conflict', 'private_confession']:
        if not context.user_initiated_topic:
            return False
    
    # Context check
    if context.is_public and memory.sensitivity > 'low':
        return False
    
    if context.is_group and memory.sensitivity > 'medium':
        return False
    
    # Relevance check
    relevance = calculate_relevance(memory, context.current_topic)
    if relevance < 0.6:
        return False
    
    # Actionability check
    is_actionable = memory.enables_action or memory.is_time_sensitive
    
    # Frequency check
    recent_surfaces = count_surfaces_this_conversation()
    if recent_surfaces >= user_prefs.max_surfaces_per_conversation:
        return is_actionable and relevance > 0.9
    
    # Age check
    if memory.age > user_prefs.old_memory_threshold:
        if not context.user_initiated_topic:
            return False  # Don't proactively surface old memories
    
    return relevance > 0.7 or is_actionable
```

### 10.2 Attribution Selection Algorithm

```python
def select_attribution_level(memory, context, user_prefs):
    base_level = user_prefs.default_attribution  # 0-4
    
    # Adjust for memory age
    if memory.age > timedelta(months=6):
        base_level = max(base_level, 3)
    elif memory.age > timedelta(months=1):
        base_level = max(base_level, 2)
    
    # Adjust for confidence
    if memory.confidence < 0.7:
        base_level = max(base_level, 2)
    
    # Adjust for sensitivity
    if memory.sensitivity in ['high', 'emotional']:
        base_level = max(base_level, 2)
    
    # Adjust for potential change
    if memory.type == 'preference' and memory.age > timedelta(weeks=4):
        base_level = max(base_level, 2)  # Check if still valid
    
    return min(base_level, 4)
```

### 10.3 Attribution Templates

```yaml
attribution_templates:
  level_0:  # Silent
    - null  # No attribution
  
  level_1:  # Implicit
    - "Since you prefer {preference}..."
    - "Given your {context}..."
    - "For someone who likes {preference}..."
  
  level_2:  # Soft citation
    - "Based on what you mentioned about {topic}..."
    - "You've talked about {topic} before—"
    - "If I recall, you {fact}..."
  
  level_3:  # Explicit
    - "You mentioned {timeframe} that {fact}..."
    - "Back in {month}, you said {fact}..."
    - "When we talked about {topic}, you mentioned {fact}..."
  
  level_4:  # Full attribution
    - "On {date}, you told me that {fact}..."
    - "I have a note from {date} that {fact}—is that still accurate?"
```

---

## 11. Summary Guidelines

### For Proactive Surfacing

1. **Ask "Why now?"** — Only surface if there's a clear reason in the current context
2. **Check the room** — Is this appropriate for who's present?
3. **Enable action** — Best surfacing enables the user to do something
4. **Respect red lines** — Never unpromptedly surface trauma, old conflicts, or private confessions
5. **Quality over quantity** — 1-3 surfaces per conversation, max

### For Attribution

1. **Default to natural** — "You mentioned..." beats "My records show..."
2. **Increase attribution with age** — Older memories need more explicit citation
3. **Signal uncertainty** — When unsure, ask rather than state
4. **Accept correction gracefully** — Don't over-apologize or justify
5. **Never be precise about timestamps** — Feels like surveillance

### For User Experience

1. **Be helpful, not impressive** — Surface to assist, not to demonstrate memory
2. **Invite correction** — Make it easy to update/fix memories
3. **Offer control** — Users should know what's remembered and have deletion options
4. **Respect context shifts** — Memory appropriate in one context may not be in another
5. **When in doubt, wait** — Better to miss an opportunity than to feel creepy

---

## 12. Open Questions for Future Research

1. **Cultural differences** — Do expectations vary significantly across cultures?
2. **Relationship development** — How should surfacing change as relationships deepen?
3. **Multi-user scenarios** — How to handle shared memories between users?
4. **Memory explanation UX** — Best interface for "how do you know that?"
5. **Recovery from creepy moments** — How to rebuild trust after a misstep?

---

*This document addresses Iteration 2 Questions 7 and 8 from the research synthesis: "When should the AI proactively mention something it remembers?" and "Should AI be able to cite where it remembers something from?"*
