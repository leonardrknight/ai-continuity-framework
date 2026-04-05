# JORDAN-PLAN.md — Guardian Perfection Roadmap

**Created:** 2026-04-05
**Goal:** Perfect Amigo's memory — instant recall, total recall, never loses context
**Test Case:** Amigo (Linux box at 100.119.167.118)

---

## 🎯 Success Criteria

- [ ] All bugs closed
- [ ] Amigo's Guardian shows "available" (not "unavailable")
- [ ] Memory capture works 100% (no null content, no constraint violations)
- [ ] Cross-session continuity works (Amigo feels like "one mind")
- [ ] Active memory management keeps relevant context top-of-mind
- [ ] Leo can deploy this to Jordan with confidence

---

## 📋 Issue Tracker

### Phase 1: Fix Bugs (Blocking)

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 54 | Curator profile parse fails for null learned_profile | ⬜ TODO | |
| 48 | Null content in extracted memories from Telegram | ⬜ TODO | |
| 47 | Invalid model name in query rewrite config | ⬜ TODO | |
| 46 | chk_source_xor constraint violation | ⬜ TODO | |

### Phase 2: Core Features (Making it Work)

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 49 | Cross-session context continuity | ⬜ TODO | Key for "one mind" feel |
| 45 | Guardian as Universal Memory Layer | ⬜ TODO | Multi-agent architecture |

### Phase 3: Research & Insights

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 53 | Channel Memory Disparity | ⬜ TODO | Terminal vs Telegram |
| 7 | AI-assisted development velocity | ⬜ TODO | Planning patterns |
| 5 | Soul Capture architecture | ⬜ TODO | Subconscious agents |
| 4 | Real-world memory patterns | ⬜ TODO | What's working/failing |

---

## 🔧 Amigo Health Check

**Current Status (check each heartbeat):**
```bash
ssh leo@amigo "clawdbot status | grep -A5 memory-guardian"
```

**Known Issue:** Status shows "unavailable" but plugin works. Need to fix health check.

---

## 📝 Session Log

### 2026-04-05 — Plan Created
- Created this plan per Leo's directive
- 10 open issues identified
- Prioritized: Bugs → Features → Research
- Next: Start with #54 (Curator profile parse)

---

## 🔄 Heartbeat Checklist

Every heartbeat, check:
1. [ ] OpenClaw Mobile FORGE status (tmux/artifacts)
2. [ ] This plan — what's next?
3. [ ] Pick an issue, do work, close it
4. [ ] Test on Amigo
5. [ ] Update this log

---

*Keep iterating until perfect. Doesn't matter how long it takes.*
