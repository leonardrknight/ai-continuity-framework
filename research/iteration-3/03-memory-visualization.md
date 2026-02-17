# Memory Visualization Research

How users explore, understand, and manage what their AI remembers about them.

## Executive Summary

Memory visualization is a critical trust-building feature. Users need transparency into what an AI "knows" about them, but the interface must balance power with simplicity. Our research found that **tiered complexity** works best: simple list views for casual users, with progressive disclosure to graph/timeline views for power users.

Key insight: Most users check memories reactively (after a surprising response) rather than proactively. The visualization should support quick "what does it know?" queries and targeted deletions.

---

## Current State: ChatGPT's Approach

OpenAI's implementation (analyzed February 2026) provides a reference baseline:

**What they do:**
- Simple list view in Settings > Personalization > Manage Memories
- Each memory as a discrete text item (e.g., "User is vegetarian")
- Delete individual memories or clear all
- Search and sort (Plus/Pro only)
- "Automatic memory management" prioritizes relevant memories
- Gray styling for deprioritized memories
- Version history with restore capability

**What they don't do:**
- No visualization of connections between memories
- No timeline of when memories were formed
- No source attribution (which conversation created this)
- No clustering or categorization
- No graph view

**User interactions supported:**
- Ask ChatGPT "What do you remember about me?"
- Manually browse/delete in settings
- Say "remember that..." or "forget that..."
- Use Temporary Chat to avoid memory

**Gaps in their approach:**
1. No way to see *when* something was learned
2. No way to see *which conversation* taught it
3. No relationship between memories (isolated facts)
4. No sense of memory "evolution" over time

---

## Visualization Approach Analysis

### 1. List/Table View

**Strengths:**
- Familiar, low cognitive load
- Fast scanning for specific items
- Easy bulk operations (select, delete)
- Mobile-friendly
- Works for any memory count

**Weaknesses:**
- No relationship visibility
- No temporal context
- Flat—doesn't reflect how memory *feels*
- Boring; doesn't inspire trust or engagement

**Best for:**
- Primary interface for most users
- Quick audits and deletions
- "What does it know?" queries

**Implementation notes:**
```
┌─────────────────────────────────────────────────────┐
│ 🔍 Search memories...                    [Sort ▼]   │
├─────────────────────────────────────────────────────┤
│ ○ Prefers vegetarian recipes                        │
│   📅 Dec 12, 2025  •  From: "Meal planning chat"   │
│   🏷️ preferences, food                             │
├─────────────────────────────────────────────────────┤
│ ○ Works at Knight Ventures as CEO                   │
│   📅 Nov 3, 2025  •  From: "Email drafting"        │
│   🏷️ work, identity                                │
├─────────────────────────────────────────────────────┤
│ ○ Has two kids: Emma (8) and Jake (5)              │
│   📅 Oct 15, 2025  •  From: "Family trip planning" │
│   🏷️ family, personal                              │
└─────────────────────────────────────────────────────┘
```

**Key additions beyond ChatGPT:**
- Source attribution (clickable → original conversation)
- Timestamp of creation
- Auto-generated tags for filtering
- Confidence indicator (how certain is this memory?)

---

### 2. Timeline View

**Strengths:**
- Shows relationship evolution over time
- Highlights "key moments" in the relationship
- Natural narrative feel
- Great for understanding *how* AI learned you

**Weaknesses:**
- Requires meaningful timestamps
- Can be overwhelming with many memories
- Less useful for targeted searches
- Harder on mobile

**Best for:**
- "Story of our relationship" exploration
- Understanding when preferences changed
- Power users who want full context

**Implementation notes:**
```
2025 ─────────────────────────────────────────────────

October
  │
  ├─● First mentioned working at Knight Ventures
  │   "I'm the CEO of Knight Ventures..."
  │
  ├─● Learned about family: Emma (8), Jake (5)
  │   "Planning a trip for my kids..."
  │
November  
  │
  ├─● Discovered preference for concise responses
  │   [Updated 3 times]
  │
  ├─● Technical: Uses TypeScript, prefers Cursor IDE
  │
December
  │
  ├─● Food: Vegetarian (strong preference)
  │   "Remember I'm vegetarian..."
  │
  └─● Communication: Prefers direct tone

2026 ─────────────────────────────────────────────────

January
  │
  ├─● Updated: Kids ages (Emma now 9, Jake 6)
  │
  └─● New project: AI Continuity Framework
```

**Key features:**
- Memory clustering by time period
- "Updated X times" for evolving memories
- Drill-down to source conversations
- Highlight milestones (first mention of family, first project, etc.)

---

### 3. Graph/Network View

**Strengths:**
- Shows *connections* between concepts
- Natural fit for how memory actually works
- Powerful for understanding patterns
- Visually impressive; builds trust

**Weaknesses:**
- High cognitive load
- Requires good clustering algorithm
- Performance concerns with many nodes
- Usability challenges (panning, zooming, selection)

**Best for:**
- Exploration-mode users
- Understanding topic clusters
- Power users and developers
- "Wow factor" demos

**Implementation notes:**
```
                    ┌──────────┐
                    │   LEO    │
                    │ (center) │
                    └────┬─────┘
            ┌────────────┼────────────┐
            │            │            │
       ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
       │  WORK   │  │  FAMILY │  │  PREFS  │
       └────┬────┘  └────┬────┘  └────┬────┘
            │            │            │
    ┌───────┼───────┐    │      ┌─────┼─────┐
    │       │       │    │      │     │     │
┌───▼───┐ ┌─▼─┐ ┌───▼───┐│  ┌───▼──┐┌─▼─┐┌──▼──┐
│Knight │ │AI │ │Neigh- ││  │Vege- ││Con││Direct│
│Venture│ │Pro│ │borhood││  │tarian││cise││ Tone │
└───────┘ └───┘ │Nerds  ││  └──────┘└───┘└──────┘
                └───────┘│
                         │
                   ┌─────┼─────┐
                   │     │     │
               ┌───▼──┐┌─▼─┐┌──▼──┐
               │ Emma ││Jake│Carlos│
               │ (9)  ││(6) │      │
               └──────┘└───┘└──────┘
```

**Technical implementation (Neo4j-style):**
```cypher
// Memory nodes
CREATE (m:Memory {
  id: uuid(),
  content: "Prefers vegetarian recipes",
  created: datetime(),
  source_conversation: "abc123",
  confidence: 0.95
})

// Topic clustering
CREATE (t:Topic {name: "Food Preferences"})
CREATE (m)-[:BELONGS_TO]->(t)

// Entity connections
CREATE (e:Entity {name: "Leo", type: "person"})
CREATE (m)-[:ABOUT]->(e)

// Memory relationships
MATCH (m1:Memory), (m2:Memory)
WHERE m1.content CONTAINS "vegetarian" AND m2.content CONTAINS "recipes"
CREATE (m1)-[:RELATED_TO {strength: 0.8}]->(m2)
```

**Visualization libraries:**
- **Neo4j Bloom**: Native graph exploration, no-code
- **NVL (Neo4j Visualization Library)**: Custom React components
- **3d-force-graph**: Stunning 3D visualization, VR support
- **D3.js**: Flexible but requires more development
- **Cytoscape.js**: Good for biological/network graphs

---

### 4. Spatial/Map View ("Memory Palace")

**Strengths:**
- Intuitive spatial metaphor
- Allows user-defined organization
- Memorable (literally—uses spatial memory)
- Unique differentiator

**Weaknesses:**
- High development cost
- Unfamiliar interaction patterns
- Requires user investment to organize
- May feel gimmicky

**Best for:**
- Users who want deep customization
- "Digital twin" of mental model
- Premium/pro features

**Implementation concept:**
```
┌─────────────────────────────────────────────────────┐
│                  MY MEMORY PALACE                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│    ┌─────────┐              ┌─────────┐            │
│    │  WORK   │              │  HOME   │            │
│    │  ROOM   │──────────────│  ROOM   │            │
│    │ ⬡⬡⬡⬡⬡  │              │ ⬡⬡⬡    │            │
│    └────┬────┘              └────┬────┘            │
│         │                        │                  │
│         │    ┌─────────┐        │                  │
│         └────│ CONNECT │────────┘                  │
│              │  HALL   │                           │
│              │ ⬡⬡      │                           │
│              └────┬────┘                           │
│                   │                                 │
│              ┌────▼────┐                           │
│              │ HOBBIES │                           │
│              │  GARDEN │                           │
│              │ ⬡⬡⬡⬡   │                           │
│              └─────────┘                           │
│                                                     │
│  ⬡ = memory node (drag to organize)               │
└─────────────────────────────────────────────────────┘
```

**Challenges:**
- Default layout algorithm needed
- State persistence across sessions
- Mobile interaction patterns
- Accessibility concerns

---

### 5. Conversation-Centric View

**Strengths:**
- Clear provenance ("this came from that chat")
- Natural for understanding context
- Supports "undo" at conversation level
- Builds accountability

**Weaknesses:**
- Requires conversation storage
- May expose sensitive conversation content
- Harder to see cross-conversation patterns

**Best for:**
- Debugging unexpected memories
- "Why does it think this?" questions
- Audit trails

**Implementation notes:**
```
┌─────────────────────────────────────────────────────┐
│ CONVERSATION: "Planning Jake's birthday party"     │
│ 📅 January 15, 2026                                │
├─────────────────────────────────────────────────────┤
│ MEMORIES CREATED (3):                              │
│                                                     │
│ ✓ Jake turns 6 in January                         │
│ ✓ Leo prefers outdoor activities for kids         │
│ ✓ Budget for events: flexible                     │
│                                                     │
│ MEMORIES REFERENCED (2):                           │
│                                                     │
│ → Leo has two kids (Emma, Jake)                   │
│ → Leo's location: Knoxville, TN                   │
│                                                     │
│ [View Conversation] [Delete Conversation Memories] │
└─────────────────────────────────────────────────────┘
```

---

## User Research Synthesis

### Who explores memory and why?

Based on behavioral patterns from ChatGPT's deployment and analogous systems (Obsidian, Roam, personal knowledge management tools):

**User Segments:**

| Segment | % of users | Behavior | Needs |
|---------|------------|----------|-------|
| **Never looks** | ~50% | Trust by default, don't care | Nothing—don't overwhelm them |
| **Reactive checkers** | ~35% | Check after surprising response | Quick search, easy deletion |
| **Periodic auditors** | ~10% | Monthly/quarterly review | List view, bulk operations |
| **Power explorers** | ~5% | Deep engagement, customization | Graph/timeline, export, API |

### When do users explore?

1. **After a surprising response** — "Wait, how did it know that?"
2. **Privacy anxiety moments** — News story, conversation with friend about AI
3. **Switching contexts** — "I use this for work now, not just personal"
4. **Debugging behavior** — "Why does it keep suggesting X?"
5. **Curiosity/delight** — "I wonder what it thinks of me"

### What actions do they take?

| Action | Frequency | UI Need |
|--------|-----------|---------|
| **View all memories** | Common | List view |
| **Search for specific** | Common | Good search |
| **Delete one memory** | Common | One-click delete |
| **Delete all memories** | Rare | Confirm dialog |
| **Understand a memory** | Moderate | Source attribution |
| **Edit a memory** | Rare | Inline edit |
| **Export memories** | Rare | CSV/JSON export |

### Key insight: Read >> Write

Most users are **readers, not editors**. They want to see and occasionally delete—not curate. Design for scanning and surgical removal, not for rich editing.

---

## Technical Implementation Notes

### Data Model

```typescript
interface Memory {
  id: string;
  content: string;                    // The actual memory
  type: 'fact' | 'preference' | 'context' | 'relationship';
  confidence: number;                 // 0-1, how certain
  created_at: Date;
  updated_at: Date;
  source_conversations: string[];     // Conversation IDs
  entities: Entity[];                 // People, places, things mentioned
  topics: string[];                   // Auto-categorized
  embedding: number[];                // For similarity/clustering
  priority: 'active' | 'background';  // For memory management
  user_pinned: boolean;               // User explicitly preserved
}

interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'project' | 'place' | 'concept';
  mentions: number;
  first_mentioned: Date;
  related_memories: string[];
}
```

### Storage Options

| Option | Best for | Pros | Cons |
|--------|----------|------|------|
| **PostgreSQL + JSONB** | Simple deployments | Familiar, reliable, good search | No native graph queries |
| **PostgreSQL + pgvector** | Embedding similarity | Vector search built-in | Still no graph |
| **Neo4j** | Graph-heavy visualization | Native relationships, Bloom viz | Another database to manage |
| **SQLite + FTS5** | Edge/local deployment | Simple, fast, portable | Limited at scale |
| **Hybrid** | Production systems | Best of both worlds | Complexity |

### Visualization Tech Stack

**Recommended approach:**

1. **Simple views (List, Timeline):**
   - React + TailwindCSS
   - TanStack Table for list operations
   - Basic CSS for timeline

2. **Graph view:**
   - React Flow (simple, well-documented)
   - Or: Cytoscape.js (more powerful)
   - Or: Neo4j NVL (if using Neo4j backend)

3. **Embedding visualization (advanced):**
   - UMAP or t-SNE for dimensionality reduction
   - Observable Plot or D3 for rendering
   - Regl-scatterplot for large datasets

### Performance Considerations

- **Pagination**: Never load all memories at once
- **Virtual scrolling**: For large lists (react-virtual)
- **Lazy graph loading**: Load nodes on demand
- **Server-side search**: Don't ship full index to client
- **Caching**: Aggressive caching for repeat views
- **Embedding precomputation**: Don't compute embeddings on view

---

## Recommended Implementation

### Phase 1: Foundation (MVP)

**List view with source attribution**

Essential features:
- Searchable memory list
- Filter by type/topic
- Sort by date/relevance
- One-click delete
- "Where did this come from?" link to conversation
- Timestamp display

This covers 95% of user needs and sets the foundation.

### Phase 2: Context (Quick Win)

**Timeline addition**

- Add timeline as alternative view (tab toggle)
- Cluster memories by time period
- Show memory "density" over time
- Highlight first mentions of entities

### Phase 3: Power Users (Differentiation)

**Graph view for exploration**

- Simple force-directed graph
- Topic clusters
- Entity relationships
- Click to drill down
- Export capabilities

### Phase 4: Delight (Future)

**Spatial/Memory Palace**

- Only if user research validates demand
- Consider as premium feature
- Requires significant UX investment

---

## Wireframe Concepts

### List View (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Settings     MEMORY                         [?] [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What I remember about you                                  │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔍 Search...                      [All ▼] [Newest ▼]      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💼 WORK                                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ CEO of Knight Ventures                       [🗑️] │  │
│  │   Dec 2025 • "Email drafting session"               │  │
│  │                                                      │  │
│  │ ○ Working on AI Continuity Framework           [🗑️] │  │
│  │   Jan 2026 • "Project planning"                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👨‍👩‍👧‍👦 FAMILY                                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ Two kids: Emma (9) and Jake (6)              [🗑️] │  │
│  │   Oct 2025 • "Family trip planning"                 │  │
│  │                                                      │  │
│  │ ○ Wife's name is Sarah                         [🗑️] │  │
│  │   Nov 2025 • "Anniversary gift ideas"               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚙️ PREFERENCES                                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ○ Prefers concise, direct responses            [🗑️] │  │
│  │   Multiple conversations                            │  │
│  │                                                      │  │
│  │ ○ Uses TypeScript, Cursor IDE, Clawdbot        [🗑️] │  │
│  │   Jan 2026 • "Development setup"                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  23 memories • Last updated 2 hours ago                    │
│                                                             │
│  [Clear All Memories]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Timeline View (Secondary)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Settings     MEMORY                         [?] [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [📋 List]  [📅 Timeline]  [🕸️ Graph]                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  JANUARY 2026                                    ●●●●○○    │
│  ├─────────────────────────────────────────────────────     │
│  │                                                          │
│  │  📍 Jan 15 — First discussed AI Continuity Framework    │
│  │     "This is going to be a big project..."             │
│  │                                                          │
│  │  📍 Jan 8 — Updated kids' ages                          │
│  │     Emma is now 9, Jake is 6                            │
│  │                                                          │
│                                                             │
│  DECEMBER 2025                                   ●●○○○○    │
│  ├─────────────────────────────────────────────────────     │
│  │                                                          │
│  │  📍 Dec 20 — Learned about vegetarian preference        │
│  │     "Remember I'm vegetarian..."                        │
│  │                                                          │
│  │  📍 Dec 12 — Started meal planning assistance           │
│  │     First food-related conversation                     │
│  │                                                          │
│                                                             │
│  NOVEMBER 2025                                   ●●●○○○    │
│  ├─────────────────────────────────────────────────────     │
│  │                                                          │
│  │  📍 Nov 18 — Discovered communication preference        │
│  │     Concise, direct, no fluff                           │
│  │                                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🏁 OCTOBER 2025 — Our relationship began                  │
│     First conversation: "Help me draft an email..."        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Graph View (Power Users)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Settings     MEMORY                         [?] [⚙️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [📋 List]  [📅 Timeline]  [🕸️ Graph]                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│                        ┌─────┐                              │
│                        │ YOU │                              │
│                        └──┬──┘                              │
│            ┌──────────────┼──────────────┐                 │
│            │              │              │                  │
│         ┌──▼──┐        ┌──▼──┐        ┌──▼──┐              │
│         │WORK │        │FAMILY│       │PREFS │             │
│         └──┬──┘        └──┬──┘        └──┬──┘              │
│            │              │              │                  │
│     ┌──────┼──────┐    ┌──┼──┐     ┌─────┼─────┐           │
│     │      │      │    │     │     │     │     │           │
│   ┌─▼─┐  ┌─▼─┐  ┌─▼─┐ ┌▼┐   ┌▼┐  ┌─▼─┐ ┌─▼─┐ ┌─▼─┐        │
│   │KV │  │AI │  │NN │ │E│   │J│  │Veg│ │Dir│ │TS │        │
│   └───┘  └───┘  └───┘ └─┘   └─┘  └───┘ └───┘ └───┘        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Selected: WORK cluster                                    │
│  • Knight Ventures — CEO role                              │
│  • AI Continuity — Current project                         │
│  • Neighborhood Nerds — Related business                   │
│                                                             │
│  [Zoom In] [Zoom Out] [Reset] [Export]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Open Questions for Future Research

1. **How do users feel about memory "strength" indicators?**
   - Would showing confidence scores help or cause anxiety?

2. **Should users be able to "pin" or protect memories?**
   - Explicit "never forget this" vs. "forget this"

3. **How should memory conflicts be surfaced?**
   - "You previously said X, but recently said Y"

4. **Is there value in a "memory summary" AI-generated view?**
   - "Here's what I know about you in 3 paragraphs"

5. **Export formats and portability**
   - Can users take their memories to another AI?

---

## Summary

Start simple, expand based on demand:

| Phase | View | Effort | Value |
|-------|------|--------|-------|
| 1 | List + search + delete | Low | High |
| 2 | Timeline | Medium | Medium |
| 3 | Graph | High | Medium-High |
| 4 | Spatial | Very High | Low-Medium |

The key differentiator isn't fancy visualization—it's **source attribution** and **transparency**. Users trust systems they can audit.

---

*Research compiled: February 2026*
*Related: [01-memory-types.md](./01-memory-types.md), [02-user-consent.md](./02-user-consent.md)*
