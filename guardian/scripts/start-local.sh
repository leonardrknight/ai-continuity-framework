#!/bin/bash
# start-local.sh — Start Guardian + Inngest for local development
#
# This script creates a persistent tmux session running both:
# - Guardian server (port 3000)
# - Inngest dev server (port 8288)
#
# The tmux session survives terminal closure, keeping the memory
# pipeline active for development and testing.
#
# Usage:
#   ./scripts/start-local.sh          # Start the servers
#   ./scripts/start-local.sh status   # Check if running
#   ./scripts/start-local.sh stop     # Stop everything
#   ./scripts/start-local.sh attach   # Attach to tmux session

set -e

SOCKET="${GUARDIAN_TMUX_SOCKET:-/tmp/guardian.sock}"
SESSION="guardian"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARDIAN_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_deps() {
    if ! command -v tmux &> /dev/null; then
        echo -e "${RED}Error: tmux is required but not installed${NC}"
        echo "Install with: sudo apt install tmux (Ubuntu/Debian)"
        echo "           or: brew install tmux (macOS)"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: node is required but not installed${NC}"
        exit 1
    fi
}

is_running() {
    tmux -S "$SOCKET" has-session -t "$SESSION" 2>/dev/null
}

status() {
    echo "=== Guardian Local Dev Status ==="
    echo ""
    
    if is_running; then
        echo -e "${GREEN}✓ tmux session active${NC}"
        tmux -S "$SOCKET" list-windows -t "$SESSION"
        echo ""
        
        # Check Guardian
        if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
            health=$(curl -s http://127.0.0.1:3000/health)
            echo -e "${GREEN}✓ Guardian (port 3000):${NC} $health"
        else
            echo -e "${RED}✗ Guardian not responding on port 3000${NC}"
        fi
        
        # Check Inngest
        if curl -s http://127.0.0.1:8288/dev > /dev/null 2>&1; then
            funcs=$(curl -s http://127.0.0.1:8288/dev 2>/dev/null | grep -o '"function_count":[0-9]*' || echo "unknown")
            echo -e "${GREEN}✓ Inngest (port 8288):${NC} $funcs"
        else
            echo -e "${RED}✗ Inngest not responding on port 8288${NC}"
        fi
    else
        echo -e "${YELLOW}Guardian tmux session not running${NC}"
        echo "Start with: $0"
    fi
    
    echo ""
    echo "To attach: tmux -S $SOCKET attach -t $SESSION"
    echo "Switch windows: Ctrl+B then N (next) or P (previous)"
}

start() {
    check_deps
    
    if is_running; then
        echo -e "${YELLOW}Guardian session already running${NC}"
        status
        exit 0
    fi
    
    cd "$GUARDIAN_DIR" || exit 1
    
    # Check for .env.local
    if [[ ! -f .env.local ]]; then
        echo -e "${RED}Error: .env.local not found in $GUARDIAN_DIR${NC}"
        echo "Copy .env.example to .env.local and configure it first."
        exit 1
    fi
    
    # Check if built
    if [[ ! -f dist/index.js ]]; then
        echo -e "${YELLOW}Building Guardian...${NC}"
        npm run build
    fi
    
    echo "Starting Guardian + Inngest in tmux..."
    
    # Create tmux session with Guardian
    tmux -S "$SOCKET" new-session -d -s "$SESSION" -n guardian
    tmux -S "$SOCKET" send-keys -t "$SESSION":guardian \
        "cd $GUARDIAN_DIR && INNGEST_DEV=1 env \$(grep -v '^#' .env.local | grep -v '^\$' | xargs) node dist/index.js" Enter
    
    sleep 3
    
    # Create Inngest window
    tmux -S "$SOCKET" new-window -t "$SESSION" -n inngest
    tmux -S "$SOCKET" send-keys -t "$SESSION":inngest \
        "cd $GUARDIAN_DIR && npx inngest-cli@latest dev -u http://localhost:3000/api/inngest" Enter
    
    sleep 5
    
    echo ""
    status
}

stop() {
    if is_running; then
        echo "Stopping Guardian tmux session..."
        tmux -S "$SOCKET" kill-session -t "$SESSION"
        echo -e "${GREEN}Stopped${NC}"
    else
        echo "Guardian session not running"
    fi
}

attach() {
    if is_running; then
        echo "Attaching to Guardian session..."
        echo "(Detach with Ctrl+B then D)"
        tmux -S "$SOCKET" attach -t "$SESSION"
    else
        echo -e "${RED}Guardian session not running${NC}"
        echo "Start with: $0"
        exit 1
    fi
}

# Main
case "${1:-start}" in
    start)
        start
        ;;
    status)
        status
        ;;
    stop)
        stop
        ;;
    attach)
        attach
        ;;
    *)
        echo "Usage: $0 {start|status|stop|attach}"
        exit 1
        ;;
esac
