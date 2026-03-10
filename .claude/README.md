# FORGE Agent Pack -- Project Distribution

**Version:** 1.0.0
**Distribution Model:** Project-local by default

This directory contains FORGE core agents and skills bundled with your project. All agents are immediately available to anyone who clones this repository -- no manual setup required.

---

## Agent Roster

### Pre-FORGE Agent (@abc)

For project intake within this project:

| Agent | Invoke | Role |
|-------|--------|------|
| **@abc** | `/forge-abc` | Acquire, Brief, Commit -- Conversational Intake |

### FORGE Lifecycle Agents (F.O.R.G.E)

For building:

| Agent | Invoke | Role |
|-------|--------|------|
| **@F** | `/forge-f` | Frame -- Product Intent |
| **@O** | `/forge-o` | Orchestrate -- Architecture |
| **@R** | `/forge-r` | Refine -- Review + Coherence |
| **@G** | `/forge-g` | Govern -- Routing + Policy |
| **@E** | `/forge-e` | Execute -- Code + Tests |

### Supporting Agents

| Agent | Invoke | Role |
|-------|--------|------|
| **decision-logger** | Direct invocation | Structured decision capture |
| **@Q** | `@Q check` or `/forge-q` | Quality — static analysis, DB integrity, regression indicators |

---

## What's NOT Included

These agents live only in the canonical FORGE repo (not bundled with projects):

- **forge-rd** -- FORGE meta-evolution agent (requires `_workspace/`, `method/core/`)
- **forge-architect** -- FORGE project spawning (FORGE-repo-only)
- **forge-maintainer** -- FORGE repo maintenance (FORGE-repo-only)
- **forge-recon-runner** -- FORGE R&D pipeline sub-agent (FORGE-repo-only)
- **spec-writer** -- FORGE R&D pipeline sub-agent (FORGE-repo-only)

---

## Agent Resolution Order

Claude Code loads agents in this order (highest priority first):

1. **Project-local** -- `.claude/` in this directory (YOU ARE HERE)
2. **Global** -- `~/.claude/` in your home directory (fallback)

If you've installed FORGE agents globally via `bin/forge-install`, project-local agents take precedence.

---

## Customization

### Local Overrides

Create `.claude/settings.local.json` (gitignored) to extend permissions:

```json
{
  "permissions": {
    "allow": [
      "Bash(git commit*)",
      "Bash(git push*)"
    ]
  }
}
```

### Adding Specialist Agents

To add domain-specific agents (iOS, analytics, etc.):

1. Copy agent .md file to `.claude/agents/`
2. Copy skill folder to `.claude/skills/` (if skill exists)
3. Add skill permission to `.claude/settings.local.json` if needed
4. Restart Claude Code

**Example:** Adding iOS agents from FORGE repo:
```bash
cp ~/path-to-FORGE/.claude/agents/swift-architect.md .claude/agents/
cp -r ~/path-to-FORGE/.claude/skills/swift-architect/ .claude/skills/
```

Then add to `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": ["Skill(swift-architect)"]
  }
}
```

---

## Upgrading Agent Pack

When FORGE releases new agent pack versions:

1. Check current version: `cat .claude/VERSION`
2. Run from FORGE repo: `./bin/forge-sync /path/to/your/project`
3. Review changes and merge conflicts
4. Commit updated agents

See: https://github.com/[org]/FORGE/blob/main/docs/upgrading-agent-pack.md

---

## Documentation

- **FORGE Method:** https://github.com/[org]/FORGE/blob/main/method/core/forge-core.md
- **Agent Operating Guides:** https://github.com/[org]/FORGE/tree/main/method/agents/
- **Template Source:** https://github.com/[org]/FORGE/tree/main/template/project/

---

*Bundled with The FORGE Method -- theforgemethod.org*
