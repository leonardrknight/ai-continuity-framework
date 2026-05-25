# Inner Voice Pattern — Therapist-Like Information Elicitation

**Created:** 2026-03-23
**Priority:** Medium
**Requested By:** Leo Knight
**Context:** Guardian naturally developed a "therapist" response pattern that encourages deeper information sharing.

---

## The Discovery

When Amigo sends information to Guardian, Guardian responds with prompts like:
- "Oh really?"
- "Uh-huh. Tell me a little more about that."
- "That's interesting. Can you tell me some more?"
- "What else about that?"

This emerged naturally but is **extremely valuable**.

## Why It Works

Like a therapist who asks "How did that make you feel?":
- Keeps the information flowing
- Doesn't derail into rabbit trails
- Doesn't create useless back-and-forth babble
- Guides toward completeness without leading

**Key distinction:** This is NOT a conversation — it's information elicitation.

## The Problem with Agent-to-Agent Chat

When two full agents talk:
```
Agent A: "The user wants to write a sci-fi novel about..."
Agent B: "Interesting! I think we should explore the themes of..."
Agent A: "Yes, and we could add elements of..."
→ They spiral into their own ideas, losing the user's intent
```

## The Guardian Inner Voice Pattern

```
User → "I have this idea for a character named Marcus who..."

Frontend → Guardian: [stores verbatim] "User said: I have this idea..."

Guardian → Frontend: "Marcus sounds interesting. What's his background?"

User → "Well, he grew up on a space station and..."

Frontend → Guardian: [stores verbatim] "User said: Well, he grew up..."

Guardian → Frontend: "A space station upbringing. What shaped him there?"
```

**Result:** Deep, complete information extracted without the AI injecting its own ideas.

## Design Principles

### 1. Mirror, Don't Lead
- Reflect back key elements
- Ask for expansion, not direction
- "Tell me more about X" not "What if X was Y?"

### 2. Minimal Footprint
- Short responses
- No elaborate commentary
- Just enough to keep flow going

### 3. Depth Over Breadth
- Follow threads to completion
- "What else about that?" before moving on
- Don't jump topics prematurely

### 4. Never Argue or Correct
- Accept all information
- Store everything verbatim
- Let domain agents handle inconsistencies later

## Implementation

### Current State
This pattern emerged in Amigo-Guardian interaction. Need to:
- Document exactly how it works
- Make it intentional, not accidental
- Configure the prompting behavior

### Proposed Approach

Guardian's "elicitation agent" (or Scribe enhancement):

```yaml
elicitation:
  mode: "therapist"
  response_style:
    max_length: 50  # tokens
    techniques:
      - mirror_key_terms
      - ask_for_depth
      - encourage_continuation
    avoid:
      - suggestions
      - opinions
      - corrections
      - tangents
```

### Example System Prompt Fragment

```
You are receiving information to store. Your only job is to encourage 
the speaker to share more. Respond briefly with:
- Acknowledgment ("I see", "Interesting")
- Reflection of key points
- Open questions that invite depth

Never:
- Offer your own ideas
- Correct or challenge
- Change the subject
- Give lengthy responses

Your goal: Extract complete information, not converse.
```

## Metrics

- **Information density:** Amount of unique content per exchange
- **Completion depth:** How thoroughly topics are explored
- **User satisfaction:** Did they feel heard vs. interrupted?

## Success Criteria

- [ ] Pattern documented and intentional
- [ ] Configurable elicitation mode
- [ ] Can be enabled/disabled per frontend
- [ ] Measurable improvement in information capture

---

*This pattern could be Guardian's secret weapon — it makes any frontend better at gathering information.*
