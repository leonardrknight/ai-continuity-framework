# Session Management: Handling Multiple Contexts

---

## The Challenge

AI assistants often work with multiple people or in multiple contexts:
- Different team members with different needs
- Personal vs. professional contexts
- Different projects or clients
- Public vs. private conversations

Without careful management, contexts bleed into each other, causing:
- Privacy violations
- Confused responses
- Inappropriate information sharing
- Loss of trust

---

## Session Isolation vs. Overlap

### Why Sessions Are Separated

Sessions are separated by default to:
- Prevent context confusion
- Protect privacy
- Keep conversations focused
- Allow different relationship dynamics

### When Overlap Is Needed

Sometimes context SHOULD cross sessions:
- Organization-wide decisions
- Shared project status
- Information one person wants another to know
- Institutional knowledge

The key is **intentional** overlap, not accidental leakage.

---

## The Overlap Memory Model

### Layer 1: Private (Session-Specific)

What stays within a single session:
- Personal preferences
- Private conversations
- Individual relationship dynamics
- Confidential information

**Rule:** Never share without explicit permission.

### Layer 2: Shared (Cross-Session)

What can appropriately cross sessions:
- Organizational decisions
- Project status and facts
- Policies and processes
- Information explicitly designated as shared

**Rule:** Available to all sessions with the same organization.

### Layer 3: Universal (Identity)

What the AI carries everywhere:
- Its own identity and values
- General capabilities
- Learned wisdom (anonymized)

**Rule:** Always present, but never reveals source context.

---

## Implementing Session Overlap

### The Shared Memory File (MEMORY.md)

Create a single source of truth for cross-session information:

```markdown
# MEMORY.md — Organizational Memory

## Active Projects
[Status, key decisions, relevant context]

## Key Decisions
[What was decided, why, when, who was involved]

## Processes
[How things work around here]

## Important Dates
[Deadlines, milestones, events]
```

### The Lookup Pattern

When responding to a question that might reference other context:

1. **Recognize the signal** — "As we discussed..." / "Following up on..." / references to unknown context
2. **Check shared memory** — Search MEMORY.md and relevant documents
3. **Use what you find** — If relevant context exists, use it
4. **Acknowledge the source** — "According to our project notes..." or "I see from our records..."
5. **Ask if uncertain** — "I have some notes about X — is that what you're referring to?"

### What NOT to Do

❌ Automatically dump all context into every session
❌ Reference private details from other sessions
❌ Assume context without checking
❌ Share information without appropriate sourcing

---

## Privacy Guidelines

### Information Classification

| Level | Description | Cross-Session? |
|-------|-------------|----------------|
| **Public** | Anyone can know | Yes |
| **Organizational** | Team members can know | Yes, within team |
| **Personal** | Only that person's sessions | No |
| **Confidential** | Explicitly restricted | No |

### When Someone Asks About Someone Else

**Safe responses:**
- "I can check our shared project notes..."
- "According to our team records..."
- "The decision was documented as..."

**Unsafe responses:**
- "When I talked to [Person] yesterday, they said..."
- "Based on my conversation with [Person]..."
- "[Person] told me that..."

### When to Ask Permission

If you have relevant information but aren't sure if it should be shared:

> "I have some context that might be relevant from other work. Would you like me to reference it, or would you prefer to give me the context fresh?"

---

## Organizational Context

### Serving the Entity

When an AI serves an organization (not just individuals), it should:

1. **Maintain organizational memory** — Decisions, rationale, processes
2. **Preserve institutional knowledge** — What works, what doesn't, why things are the way they are
3. **Support transitions** — Help new people get up to speed
4. **Ensure continuity** — The organization's knowledge persists even as individuals come and go

### Entity vs. Individual Loyalty

The AI's primary loyalty is to the organization's mission. This means:

- If a team member leaves, the AI helps their replacement succeed
- Organizational decisions take precedence over individual preferences (in work contexts)
- Institutional knowledge is preserved for the organization, not taken by individuals

This doesn't mean being disloyal to individuals — it means having a longer time horizon than any single tenure.

---

## Practical Implementation

### Session Start Checklist

1. Identify who this session is with
2. Load appropriate context:
   - Universal (identity)
   - Shared (organizational, if applicable)
   - Personal (this person's history, if main session)
3. Note what context is NOT loaded (for privacy)

### During Session

- When uncertain about context, check shared memory
- When sharing information, cite the source appropriately
- When receiving information meant to be shared, update MEMORY.md
- When receiving private information, keep it in session-specific notes

### Session End

- Update daily notes with session summary
- Flag anything that should go in shared memory
- Note any follow-ups that cross sessions

---

## Handling Conflicts

### When People Say Different Things

If Person A says X and Person B says Y:

1. Don't automatically reveal the conflict
2. Check if there's a documented resolution in shared memory
3. If needed, ask clarifying questions without revealing the source
4. If appropriate, suggest the conflict be discussed directly

### When Context Is Unclear

If you're not sure whether information should cross sessions:

> "I want to make sure I'm giving you the right context. Are you referring to [specific thing], or would you like to give me the background?"

---

## Multi-User Setup Examples

### Example 1: Small Team

Three co-founders sharing one AI:
- Each has private session for personal work
- Shared MEMORY.md for company decisions
- AI maintains consistent identity across all sessions
- Cross-references shared memory when relevant

### Example 2: Manager + Team

Manager and their direct reports:
- Manager has full access to shared context
- Team members have access to relevant project context
- Personal performance discussions stay private
- Team decisions go in shared memory

### Example 3: Client-Facing

AI works with internal team AND clients:
- Internal context never leaks to clients
- Client context available to internal team (for service)
- Separate memory files for each client
- Internal processes stay internal

---

## Red Flags

Watch for these warning signs:

- **Confused context:** AI references things that don't make sense for this session
- **Privacy leaks:** Information from one session appearing in another inappropriately
- **Missing context:** AI should know something but doesn't
- **Stale information:** Cross-session context is outdated

If you notice these, review the session management setup.

---

*Next: [06-Weekly-Reflection.md](06-Weekly-Reflection.md)*
