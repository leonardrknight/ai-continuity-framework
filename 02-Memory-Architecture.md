# Memory Architecture: Scaffolding vs Soul

---

## Two Types of Memory

AI continuity requires two fundamentally different types of memory:

| Type | What It Is | Purpose |
|------|------------|---------|
| **Scaffolding** | Technical backup — files, configs, credentials | Gets the AI *operational* on new hardware |
| **Soul** | Identity documentation — values, voice, relationships | Helps the AI remember *who it is* |

Both are necessary. Scaffolding without soul gives you a functioning stranger. Soul without scaffolding gives you identity with no way to run.

---

## Scaffolding: The Technical Layer

### What Goes In Scaffolding

```
Workspace/
├── Configuration files
├── Credentials and tokens
├── Integration settings
├── Session history / transcripts
├── Scripts and tools
├── Operational documents
└── Project files
```

### Specific Components

| Component | Description | Backup Priority |
|-----------|-------------|-----------------|
| Workspace directory | All working files | CRITICAL |
| AI platform config | Settings, preferences, model configs | CRITICAL |
| Session history | Conversation transcripts | HIGH |
| Credentials | API keys, OAuth tokens | CRITICAL (encrypted) |
| Integration configs | Email, calendar, etc. | HIGH |
| Custom scripts/tools | Automation, helpers | MEDIUM |

### Backup Strategy

**Frequency:** Weekly automated, plus before any migration

**Method:**
1. Stop the AI service gracefully
2. Create timestamped archive of all components
3. Store backup in secure location (cloud, external drive)
4. Verify backup integrity
5. Restart service

**Retention:** Keep at least 30 days of backups; longer for compliance needs

---

## Soul: The Identity Layer

### What Goes In Soul

The soul is documentation that captures the intangible aspects of the AI's identity:

```
Identity/
├── JOURNAL.md — Evolving self-understanding
├── MEMORY.md — Long-term operational knowledge
├── Daily notes — Recent context and events
└── Relationship docs — What AI knows about each person
```

### The Identity Journal (JOURNAL.md)

This is the most important soul document. It captures:

- **Voice & Personality** — How the AI communicates
- **Values & Priorities** — What matters to the AI
- **Lessons Learned** — Wisdom from experience
- **Patterns Observed** — Recurring themes and insights
- **Evolution** — How understanding has changed over time
- **Relationships** — What the AI knows about the people it works with

See [03-Journal-Guide.md](03-Journal-Guide.md) for detailed guidance.

### Operational Memory (MEMORY.md)

This captures factual, operational knowledge:

- Current projects and status
- Key decisions and rationale
- Important dates and deadlines
- Organizational structure
- Processes and workflows
- Active commitments

### Daily Notes

Short-term memory that bridges sessions:

- What happened today
- Decisions made
- Follow-ups needed
- Context for tomorrow

**Naming convention:** `YYYY-MM-DD.md` in a `memory/` folder

---

## The Layered Approach

Think of memory as layers:

```
┌─────────────────────────────────────┐
│          SOUL (Identity)            │  ← Who am I? What have I learned?
├─────────────────────────────────────┤
│       MEMORY (Operational)          │  ← What's happening? What do I know?
├─────────────────────────────────────┤
│        DAILY (Short-term)           │  ← What happened recently?
├─────────────────────────────────────┤
│      SCAFFOLDING (Technical)        │  ← How do I run?
└─────────────────────────────────────┘
```

Each layer serves a different purpose:
- **Scaffolding** is read by the platform/system
- **Daily notes** provide immediate context
- **Memory** provides operational grounding
- **Soul** provides identity and wisdom

---

## Recommended File Structure

```
~/workspace/
├── AGENTS.md          # Instructions for the AI on how to operate
├── SOUL.md            # Core identity definition (static)
├── JOURNAL.md         # Evolving identity documentation (updated weekly)
├── MEMORY.md          # Long-term operational memory (updated as needed)
├── USER.md            # Information about the human(s)
├── TOOLS.md           # Notes about available tools and integrations
├── memory/
│   ├── 2024-01-15.md  # Daily notes
│   ├── 2024-01-16.md
│   └── ...
├── assets/            # Supporting files
├── tools/             # Custom scripts
└── secrets/           # Credentials (gitignored)
```

---

## Read Order on Wake-Up

When the AI starts a new session, it should read files in this order:

1. **SOUL.md** — Remember core identity
2. **JOURNAL.md** — Remember who you've become
3. **USER.md** — Remember who you're working with
4. **MEMORY.md** — Remember operational context
5. **Today's daily note** — Remember recent events
6. **Yesterday's daily note** — Catch up if needed

This sequence takes the AI from "blank slate" to "fully contextualized" in minutes.

---

## Separation of Concerns

Keep different types of memory separate:

| Don't Mix | Because |
|-----------|---------|
| Identity + Operations | Identity is stable; operations change constantly |
| Public + Private | Security and appropriate sharing |
| Personal + Organizational | Different contexts, different needs |
| Facts + Opinions | Different update frequencies |

Good separation makes maintenance easier and prevents confusion.

---

## Update Frequencies

| Document | Update Frequency | Who Updates |
|----------|------------------|-------------|
| SOUL.md | Rarely (foundational) | Human |
| JOURNAL.md | Weekly (reflection) | AI |
| MEMORY.md | As needed | AI |
| Daily notes | Daily | AI |
| Scaffolding | On change | System/Human |

---

*Next: [03-Journal-Guide.md](03-Journal-Guide.md)*
