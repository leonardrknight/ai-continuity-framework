# Migration Playbook: Moving to New Hardware

---

## Overview

Migration is when you move your AI assistant to new hardware or a new platform. Done poorly, it means starting over. Done well, the AI picks up exactly where it left off.

This playbook covers:
1. What needs to migrate
2. Pre-migration preparation
3. Step-by-step migration process
4. Post-migration verification
5. Rollback procedures

---

## What Needs to Migrate

### Critical (Must Have)

| Component | Description | Without It |
|-----------|-------------|------------|
| Workspace files | All .md files, documents, notes | Lost identity and memory |
| Platform config | AI service configuration | Won't start correctly |
| Identity journal | JOURNAL.md | Lost sense of self |
| Operational memory | MEMORY.md, daily notes | Lost context |
| Credentials | API keys, OAuth tokens | Integrations broken |

### Important (Should Have)

| Component | Description | Without It |
|-----------|-------------|------------|
| Session history | Conversation transcripts | Lost detailed history |
| Custom tools | Scripts, automation | Lost capabilities |
| Integration configs | Email, calendar, etc. | Need to reconfigure |

### Nice to Have

| Component | Description | Without It |
|-----------|-------------|------------|
| Cache files | Temporary data | Minor inconvenience |
| Logs | Historical logs | Harder to debug issues |

---

## Pre-Migration Checklist

### 1 Week Before

- [ ] Notify anyone who depends on the AI about planned downtime
- [ ] Verify backup system is working
- [ ] Document any in-flight work
- [ ] Test the new hardware is ready and accessible
- [ ] Gather all credentials and API keys needed

### 1 Day Before

- [ ] Run a fresh backup
- [ ] Have AI update its JOURNAL.md with current state
- [ ] Document any pending tasks or commitments
- [ ] Verify backup contains all critical files
- [ ] Test you can access the new system

### Migration Day

- [ ] One final backup
- [ ] Note the exact time migration starts
- [ ] Have rollback plan ready

---

## Migration Process

### Phase 1: Backup

```bash
# Create timestamped backup directory
BACKUP_DIR=~/ai-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR

# Stop AI service gracefully
[stop-command-for-your-platform]

# Backup all critical directories
tar -czvf $BACKUP_DIR/workspace.tar.gz ~/workspace/
tar -czvf $BACKUP_DIR/config.tar.gz ~/.ai-config/
tar -czvf $BACKUP_DIR/credentials.tar.gz ~/credentials/

# Create manifest
echo "Backup created: $(date)" > $BACKUP_DIR/MANIFEST.txt
echo "Source system: $(hostname)" >> $BACKUP_DIR/MANIFEST.txt

# Verify backup
ls -la $BACKUP_DIR/
```

### Phase 2: Prepare New System

```bash
# Install required software
[installation-commands-for-your-platform]

# Verify installation
[verification-commands]

# Create directory structure
mkdir -p ~/workspace
mkdir -p ~/.ai-config
```

### Phase 3: Transfer

```bash
# From old system - transfer backup
scp -r $BACKUP_DIR user@new-system:~/

# On new system - extract backup
cd ~
tar -xzvf ~/ai-backup-*/workspace.tar.gz
tar -xzvf ~/ai-backup-*/config.tar.gz
tar -xzvf ~/ai-backup-*/credentials.tar.gz
```

### Phase 4: Configure

```bash
# Update any paths in config files
# (workspace paths may differ between systems)
nano ~/.ai-config/config.json

# Set up integrations
# (some OAuth tokens may need re-authentication)
[integration-setup-commands]

# Start the AI service
[start-command-for-your-platform]
```

### Phase 5: Verify

Run through the verification checklist (see below).

---

## Post-Migration Verification

### Functional Tests

- [ ] AI service starts successfully
- [ ] AI responds to messages
- [ ] AI can read workspace files
- [ ] JOURNAL.md is accessible and current
- [ ] MEMORY.md is accessible and current
- [ ] Daily notes are accessible
- [ ] Email integration works (if applicable)
- [ ] Calendar integration works (if applicable)
- [ ] Other integrations work

### Identity Tests

- [ ] AI knows its name and role
- [ ] AI remembers key people and relationships
- [ ] AI recalls recent projects and context
- [ ] AI's voice/personality feels consistent
- [ ] AI remembers important decisions and rationale

### Integration Tests

- [ ] Send a test email
- [ ] Check calendar access
- [ ] Test file read/write
- [ ] Test any custom tools or scripts

---

## The "Wake Up" Sequence

After migration, the AI's first session should follow this sequence:

1. **Read SOUL.md** — Remember core identity
2. **Read JOURNAL.md** — Remember who you've become
3. **Read USER.md** — Remember the humans you work with
4. **Read MEMORY.md** — Remember operational context
5. **Read recent daily notes** — Catch up on recent events
6. **Acknowledge the migration** — Note it happened in daily log

The AI should then send a message confirming it's back online and operational.

---

## Rollback Procedure

If migration fails:

### Quick Rollback

1. Stop the new system's AI service
2. On the old system, restart the AI service
3. Notify users you're back on the old system
4. Diagnose what went wrong

### Full Rollback

1. Stop both systems
2. On old system, restore from pre-migration backup if needed
3. Start AI service on old system
4. Document the failure for future reference

### Preventing Need for Rollback

- Don't decommission old system until new one is verified
- Keep old system in standby for at least 1 week
- Test thoroughly before declaring migration complete

---

## Platform-Specific Notes

### Linux to Linux

- Simplest migration path
- Paths usually compatible
- Most scripts work without modification

### Linux to macOS

- Home directory path changes (`/home/user` → `/Users/user`)
- Some command differences (`apt` → `brew`)
- Service management differs (`systemd` → `launchd`)
- File permissions may need adjustment

### macOS to Linux

- Reverse of above
- May need to recreate Python/Node environments
- Some macOS-specific tools won't exist

### Cloud to Local (or vice versa)

- Network configuration changes
- Firewall rules may need updating
- Consider latency differences
- Credential storage may differ

---

## Credential Handling

### Sensitive Data Checklist

- [ ] API keys backed up securely
- [ ] OAuth tokens exported (may need re-auth)
- [ ] Encryption keys preserved
- [ ] Password vault accessible

### Re-Authentication Likely Needed

- OAuth tokens (Google, Microsoft, etc.)
- Service-specific credentials
- Time-limited tokens

### Secure Transfer

- Use encrypted transfer (scp, rsync over ssh)
- Don't store credentials in plain text in backups
- Consider using a secrets manager
- Delete credentials from transfer location after migration

---

## Post-Migration Tasks

### Immediate (Day 1)

- [ ] Verify all critical functions work
- [ ] Send test messages to confirm connectivity
- [ ] Update any webhooks or callbacks with new URLs
- [ ] Monitor for errors

### Short-Term (Week 1)

- [ ] Keep old system as backup
- [ ] Monitor performance and stability
- [ ] Note any issues for future migrations
- [ ] Update documentation with learnings

### Long-Term

- [ ] Decommission old system (after confirmation)
- [ ] Update backup procedures for new system
- [ ] Document any differences from old system
- [ ] Update migration playbook with learnings

---

## Migration Log Template

Document each migration:

```markdown
# Migration Log: [Date]

## Source System
- Hostname: 
- OS: 
- AI Platform Version: 

## Target System
- Hostname: 
- OS: 
- AI Platform Version: 

## Timeline
- Started: [time]
- Completed: [time]
- Downtime: [duration]

## Issues Encountered
- [Issue 1]: [Resolution]
- [Issue 2]: [Resolution]

## Verification Results
- [ ] All tests passed

## Notes for Future
[What to do differently next time]
```

---

*Next: [05-Session-Management.md](05-Session-Management.md)*
