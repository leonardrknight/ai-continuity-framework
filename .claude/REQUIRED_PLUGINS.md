# Required Claude Code Marketplace Plugins

FORGE agents rely on these marketplace plugins for full functionality. Install via Claude Code marketplace or CLI.

---

## Core Plugins

### ralph-wiggum
**Purpose:** Enhanced code understanding and architectural analysis
**Install:** `claude plugins install ralph-wiggum` (or via marketplace)
**Used by:** @O (Orchestrate), @R (Refine)

### frontend-design
**Purpose:** UI/UX design analysis and component generation
**Install:** `claude plugins install frontend-design` (or via marketplace)
**Used by:** @E (Execute) for frontend work

---

## Installation

### Via Marketplace (Recommended)
1. Open Claude Code
2. Navigate to Marketplace
3. Search for plugin name
4. Click Install

### Via CLI
```bash
claude plugins install ralph-wiggum
claude plugins install frontend-design
```

### Verification
```bash
claude plugins list
```

You should see both plugins marked as `[installed]`.

---

## Optional Plugins

These enhance specific workflows but are not required:

- **stripe** -- Payments integration (if project uses Stripe)
- **supabase** -- Database operations (if project uses Supabase)
- **perplexity** -- AI web search (for research tasks)
- **resend** -- Email sending and management (if project uses Resend for transactional email)

Install as needed based on your project's tech stack.

---

*FORGE Agent Pack v1.0.0*
