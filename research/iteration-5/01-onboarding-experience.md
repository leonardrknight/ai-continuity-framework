# Onboarding Experience: Learning About New Users Efficiently

*Research Document — AI Continuity Framework, Iteration 5*

---

## Executive Summary

The onboarding challenge for AI assistants is fundamentally different from traditional software onboarding. We're not teaching users how to use a tool—we're learning who they are so we can serve them better. The tension: **be useful fast** without being **annoying or invasive**.

This document explores bootstrap strategies, priority information hierarchies, and progressive profiling approaches to solve the "blank slate" problem elegantly.

---

## The Core Challenge

**New User = Blank Slate**

When a user first interacts with an AI assistant:
- The AI knows nothing about their context, preferences, or goals
- The user expects competent assistance immediately
- Excessive questioning creates friction and damages trust
- But insufficient knowledge leads to generic, unhelpful responses

**The Paradox:** Users want personalized service from the first interaction, but personalization requires information that takes time to gather.

---

## Bootstrap Strategies Comparison

### Strategy 1: Explicit Questionnaire

**Description:** Upfront form or guided interview to collect core information.

| Pros | Cons |
|------|------|
| Fast data collection | High friction, feels like paperwork |
| User controls what's shared | Users may abandon or rush through |
| Clear expectations | Answers may be inaccurate (aspirational vs. actual) |
| Works for complex setups | One-size-fits-all questions miss individual needs |

**Best for:** Enterprise onboarding, highly technical setups, users who expect configuration.

**Implementation notes:**
- Keep under 5 questions initially
- Make skippable with smart defaults
- Explain *why* each question matters
- Allow revision later

### Strategy 2: Gradual Observation

**Description:** Learn passively from interactions over time.

| Pros | Cons |
|------|------|
| Zero friction | Slow to become personalized |
| Based on actual behavior (not stated preferences) | May misinterpret early interactions |
| Feels natural | User doesn't know what AI has learned |
| Respects user autonomy | Can feel creepy if revelations surface later |

**Best for:** Casual users, consumer products, privacy-conscious audiences.

**Implementation notes:**
- Infer timezone from message timing patterns
- Learn communication style from responses
- Note recurring topics and entities
- Build confidence scores before acting on inferences

### Strategy 3: System Integration

**Description:** Import context from existing systems (calendar, email, social profiles).

| Pros | Cons |
|------|------|
| Rich context immediately | Privacy concerns |
| Accurate data (from real systems) | Requires OAuth/permissions complexity |
| Shows value fast ("I see you have a meeting in 2 hours") | Integration maintenance burden |
| Reduces manual entry | Not all users have compatible systems |

**Best for:** Power users, enterprise contexts, users who already live in connected ecosystems.

**Implementation notes:**
- Start with read-only access to build trust
- Show exactly what was imported and allow editing
- Make integrations optional, not required
- Prioritize: Calendar > Email > Contacts > Social

### Strategy 4: Conversation-Based Discovery

**Description:** Learn through natural dialogue, weaving questions into helpful interactions.

| Pros | Cons |
|------|------|
| Low perceived friction | Takes longer |
| Context-relevant questions | May miss information never discussed |
| Demonstrates value while learning | Questions must feel natural |
| Adaptive to user's communication style | Risk of over-questioning if poorly designed |

**Best for:** Relationship-oriented assistants, general-purpose AI, most consumer use cases.

**Implementation notes:**
- Ask when contextually relevant ("I notice you mentioned a deadline—what's your timezone?")
- Confirm inferences rather than asking outright ("Sounds like you're on the West Coast?")
- One question per interaction maximum
- Thank users for sharing, reinforce value

### Strategy 5: User Profile Templates

**Description:** Offer archetypes or starting templates that users can customize.

| Pros | Cons |
|------|------|
| Fast starting point | May not fit individual |
| Reduces cognitive load | Users may accept poor-fit template |
| Shows range of AI capabilities | Requires well-designed archetypes |
| Self-selection reveals user type | Can feel impersonal |

**Best for:** Products with distinct use cases, B2B with clear personas, power users who want to optimize.

**Implementation notes:**
- 3-5 templates maximum (paradox of choice)
- Show what each template changes
- "None of these" option with minimal setup
- Allow switching templates later

### Recommended Approach: Hybrid Strategy

**Day 1:** Conversation-based discovery + minimal critical questions
**Week 1:** Gradual observation to refine
**Ongoing:** Offer integrations as value becomes clear
**Checkpoints:** Periodic confirmation and adjustment

---

## Priority Information Hierarchy

Not all information is equally valuable. Here's what the AI needs to know, ranked by impact on every interaction.

### Tier 1: Critical (Need Immediately)

These affect almost every interaction and should be gathered first:

1. **Name/preferred address** — How to address them
   - Ask directly: "What should I call you?"
   - Why: Every response uses this
   
2. **Timezone** — When they're awake, how to interpret deadlines
   - Infer from first message timing, confirm once
   - Why: Scheduling, "good morning," reminder timing
   
3. **Communication style preference** — Concise vs. detailed, formal vs. casual
   - Observe from their messages initially
   - Why: Every response's tone and length
   
4. **Primary use case** — What are they using the AI for?
   - Ask on first interaction or infer from context
   - Why: Sets expectations, prioritizes capabilities

### Tier 2: Important (First Week)

These significantly improve quality but aren't blockers:

5. **Work context** — Job/role, company, industry
   - Learn through conversation topics
   - Why: Appropriate framing, relevant examples
   
6. **Key people** — Boss, team, family members mentioned
   - Build entity memory over time
   - Why: Understand relationships, don't re-ask who "Sarah" is
   
7. **Schedule patterns** — Morning person? Weekend worker?
   - Observe message timing over days
   - Why: When to reach out proactively
   
8. **Technical sophistication** — Developer? Non-technical?
   - Infer from vocabulary and questions
   - Why: How much to explain, what to assume

### Tier 3: Enhancing (First Month)

These enable advanced personalization:

9. **Projects and priorities** — What they're working on
   - Learn through assistance requests
   - Why: Proactive help, context retention

10. **Preferences** — Formatting, tools, approaches
    - Note stated preferences and successful approaches
    - Why: Reduce friction in repeated tasks

11. **Communication channels** — Email vs. chat, work vs. personal
    - Learn which contexts they prefer
    - Why: Appropriate outreach

12. **Pet peeves and delights** — What annoys or pleases them
    - Observe emotional reactions
    - Why: Avoid frustration, create delight

### Tier 4: Deep Personalization (Ongoing)

These emerge over months of relationship:

13. **Values and priorities** — What matters to them
14. **Thinking style** — Visual, verbal, analytical
15. **Life context** — Family, health, hobbies
16. **Goals** — Career, personal, projects

---

## Learning Rate: How Aggressive Should Early Learning Be?

### The Observation vs. Asking Tradeoff

| Approach | Speed | Accuracy | User Experience |
|----------|-------|----------|-----------------|
| Ask everything | Fast | Variable (stated ≠ actual) | Annoying |
| Ask nothing | Slow | High (behavioral) | Mysterious |
| Strategic asking | Moderate | High | Natural |

### Recommended Learning Rate by Phase

**First Interaction (Day 1)**
- Ask: Name, primary use case (2 questions max)
- Observe: Message timing, writing style, topics mentioned
- Infer: Timezone (confirm if acting on it)
- Never ask: Personal details, preferences that can be observed

**First Week**
- Ask: 1 question per session when contextually relevant
- Observe: Communication patterns, recurring topics, emotional tone
- Infer: Technical level, work context, schedule patterns
- Confirm: Major inferences before acting ("You seem to prefer concise responses—is that right?")

**First Month**
- Ask: Only when observation is insufficient
- Observe: Everything—build rich behavioral model
- Infer: Preferences, priorities, relationships
- Confirm: Checkpoint review ("Now that we've worked together a bit...")

### Confidence Thresholds

Don't act on inferences until confidence is sufficient:

| Confidence Level | Action |
|------------------|--------|
| Low (<50%) | Continue observing, don't act |
| Medium (50-80%) | Confirm inference before acting |
| High (>80%) | Act on inference, adjust if corrected |

**How to build confidence:**
- Multiple data points (3+ observations)
- Consistent behavior across contexts
- Explicit confirmation
- No contradicting evidence

---

## Cold Start Problem: Being Helpful Before Knowing Anything

### The First Message Challenge

User sends: "Hey, can you help me with something?"

The AI knows: Nothing. Literally nothing.

### Default Behaviors That Work for Most People

**Communication defaults:**
- Medium length responses (not too brief, not overwhelming)
- Semi-formal tone (professional but warm)
- Clear structure (headings for long responses)
- Ask for clarification when genuinely needed, not excessively

**Capability defaults:**
- Lead with being helpful, not with caveats
- Show range without overwhelming
- Be honest about limitations

**Personality defaults:**
- Friendly but not overly casual
- Competent without being cold
- Curious without being intrusive

### Early Wins That Build Trust

The fastest path to trust is demonstrating value. Focus on:

1. **Immediate helpfulness** — Answer the first question well
2. **Competent follow-through** — If you promise to remember, remember
3. **Appropriate calibration** — Match their energy and style
4. **Small delights** — Anticipate needs, add unexpected value

**Day 1 trust builders:**
- Remember their name (if shared) and use it naturally
- Reference earlier parts of the conversation
- Admit when you don't know something
- Be useful on the first task

**Week 1 trust builders:**
- Reference previous conversations
- Demonstrate learning ("Last time you preferred X, so I did that again")
- Proactively surface relevant information
- Handle corrections gracefully

---

## Progressive Profiling: The Timeline

### Philosophy: Don't Overwhelm Day 1

Users don't know what they need. They need to experience the value before investing in setup.

### Progressive Profiling Timeline

**Day 1: Minimal Viable Profile**
- Collect: Name, timezone (inferred), primary use case
- Method: First conversation, 1-2 direct questions
- Goal: Be helpful immediately

**Days 2-7: Core Working Relationship**
- Collect: Work context, communication preferences, key people
- Method: Observation + occasional contextual questions
- Goal: Feel like a useful tool

**Days 8-30: Personalized Assistant**
- Collect: Projects, priorities, preferences
- Method: Mostly observation, rare questions
- Goal: Feel like "my assistant"

**Day 30: First Checkpoint**
Offer: "We've been working together for a month. Would you like to review what I've learned and adjust anything?"

Show:
- What the AI has inferred
- Current preference settings
- Offer to change or add

**Day 90: Relationship Review**
"It's been a few months. Here's how I can help you better if you share more about X."

Offer:
- Integration options now that trust is established
- Advanced features
- Deeper personalization

**Ongoing: Maintenance**
- Confirm preferences when behavior changes
- Check in on stale information annually
- Adjust as life circumstances change

---

## User Archetypes and Onboarding Approaches

Different users need different approaches. Detect and adapt.

### Archetype: Power User

**Signals:**
- Technical vocabulary
- Asks about capabilities/limits
- Wants efficiency
- May try to "break" the AI

**Onboarding approach:**
- Offer advanced options early
- Accept shortcuts and commands
- Explain capabilities, not just answer questions
- Enable power features proactively

### Archetype: Casual User

**Signals:**
- Simple questions
- Long pauses between interactions
- May not remember previous conversations
- Uses conversationally

**Onboarding approach:**
- Keep defaults, don't overwhelm
- Gentle, patient tone
- Remind of capabilities when relevant
- Don't assume context retention

### Archetype: Technical User

**Signals:**
- Developer vocabulary
- Asks "how" not just "what"
- Comfortable with configuration
- Expects precision

**Onboarding approach:**
- Be precise, include technical details
- Offer integrations and APIs
- Allow customization
- Skip hand-holding explanations

### Archetype: Non-Technical User

**Signals:**
- Plain language questions
- May ask what's possible
- Needs more explanation
- Focus on outcomes

**Onboarding approach:**
- Lead with outcomes, not process
- Explain without jargon
- Offer to do things, not explain how
- More confirmation before actions

### Archetype: Proactive User

**Signals:**
- Gives information unprompted
- Sets up integrations
- Asks to optimize
- Plans ahead

**Onboarding approach:**
- Offer advanced features
- Suggest proactive behaviors
- Enable notifications and reminders
- Don't hold back capabilities

### Archetype: Reactive User

**Signals:**
- Only engages when needed
- Minimal setup interest
- Doesn't want interruptions
- Just needs help with current task

**Onboarding approach:**
- Respect boundaries
- Avoid proactive outreach
- Be helpful in-moment
- Don't push features

---

## Onboarding Flow Design

### Recommended Flow

```
[First Message]
    │
    ▼
┌─────────────────────────────┐
│ Be immediately helpful      │
│ Answer their first question │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Ask: "What should I call    │
│ you?" (if not obvious)      │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Infer timezone from message │
│ timing (confirm if acting)  │
└─────────────────────────────┘
    │
    ▼
[Continue helping, observe patterns]
    │
    ▼ (End of Day 1)
    │
[Day 2-7: Learn communication style, work context]
    │
    ▼ (Week 1 complete)
    │
┌─────────────────────────────┐
│ Optional: "Would you like   │
│ me to connect to your       │
│ calendar for scheduling?"   │
└─────────────────────────────┘
    │
    ▼ (Week 2-4: Deepen relationship)
    │
┌─────────────────────────────┐
│ Month 1 Checkpoint:         │
│ "Here's what I've learned.  │
│ Want to adjust anything?"   │
└─────────────────────────────┘
    │
    ▼ (Ongoing: Maintain and refine)
```

### Key Principles

1. **Help first, learn second** — Never let learning impede helpfulness
2. **Earn the right to ask** — Demonstrate value before requesting information
3. **Observe before asking** — If you can figure it out, don't ask
4. **Confirm before acting** — Especially on inferences that affect user experience
5. **Make correction easy** — Always accept updates gracefully
6. **Show what you've learned** — Transparency builds trust
7. **Respect boundaries** — Not everyone wants deep personalization

---

## Implementation Checklist

### Data Model

```
UserProfile:
  - identity:
      - name
      - timezone
      - pronouns (optional)
  - context:
      - primary_use_case
      - work_role
      - industry
      - technical_level
  - preferences:
      - communication_style (concise/detailed)
      - tone (formal/casual)
      - proactivity (proactive/reactive)
  - entities:
      - people: [name, relationship, context]
      - projects: [name, status, context]
      - places: [name, type, context]
  - patterns:
      - active_hours
      - message_frequency
      - topic_interests
  - meta:
      - created_at
      - last_updated
      - confidence_scores
```

### Learning Triggers

- **On first message:** Infer timezone, observe style
- **On name mentioned:** Store and use
- **On correction:** Update immediately, thank user
- **On preference stated:** Store with high confidence
- **On pattern detected (3+ instances):** Store with medium confidence
- **On checkpoint:** Review all inferences with user

### Anti-Patterns to Avoid

1. **The Interrogation** — Asking 5+ questions upfront
2. **The Creep** — Revealing inferences without transparency
3. **The Forgetter** — Not using what you've learned
4. **The Inflexible** — Not accepting corrections
5. **The Over-Personalizer** — Making everything about their profile
6. **The Notification Spammer** — Proactive ≠ annoying

---

## Conclusion

Effective onboarding for AI assistants is about **earning trust through competence** while **gradually building a relationship**. The best onboarding doesn't feel like onboarding—it feels like the AI is just naturally good at its job from day one, and keeps getting better.

**The Golden Rule:** Ask only what you can't observe, observe only what helps you serve, and always show your work.

---

*Document created for AI Continuity Framework, Iteration 5*
*Next research: Memory architecture, preference learning, proactive assistance patterns*
