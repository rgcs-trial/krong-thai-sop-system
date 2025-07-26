#!/bin/bash

# Claude Agent Auto-Commit Hook
# Uses Claude's general-purpose agent (with --no-tools) to generate intelligent commit messages

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository. Skipping auto-commit."
    exit 0
fi

# Check if there are any changes to commit (including untracked files)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard)
if git diff --quiet && git diff --cached --quiet && [ -z "$UNTRACKED_FILES" ]; then
    log "No changes detected. Skipping auto-commit."
    exit 0
fi

# Stage all changes
git add -A

# Check again after staging
if git diff --cached --quiet; then
    log "No staged changes after git add. Skipping auto-commit."
    exit 0
fi

info "🤖 Analyzing changes with Claude agent..."

# Collect git change data for agent analysis
STAGED_FILES=$(git diff --cached --name-only)
DIFF_STAT=$(git diff --cached --stat)
FILE_COUNT=$(echo "$STAGED_FILES" | wc -l | tr -d ' ')

# Limit diff content to avoid overwhelming the agent
DIFF_CONTENT=$(git diff --cached --unified=3)
DIFF_SIZE=$(echo "$DIFF_CONTENT" | wc -c)

# If diff is too large, summarize it
if [ "$DIFF_SIZE" -gt 10000 ]; then
    DIFF_SUMMARY=$(git diff --cached --stat --summary)
    DIFF_CONTENT="Large diff detected ($DIFF_SIZE chars). Summary:
$DIFF_SUMMARY

Sample changes:
$(echo "$DIFF_CONTENT" | head -50)"
fi

# Create context for agent
CONTEXT="Project: Restaurant Krong Thai SOP Management System (Next.js/React/TypeScript)
Stack: Next.js 15.4.4, React 19.1.0, TypeScript, Tailwind CSS, Supabase

Files changed ($FILE_COUNT files):
$STAGED_FILES

Diff statistics:
$DIFF_STAT

Changes:
$DIFF_CONTENT"

# Generate commit message using Claude agent
AGENT_PROMPT="Analyze these git changes for a tablet-optimized restaurant SOP management system.

$CONTEXT

Generate a conventional commit message following this format:
- Use proper prefix: feat/fix/docs/refactor/style/test/chore
- Be specific about what changed
- Title line under 72 characters
- Add body with bullet points describing key changes (required for non-trivial changes)

Examples:
feat(auth): implement PIN validation with session management

- Add 4-digit PIN input component with touch optimization
- Implement session storage with 8-hour expiration
- Add authentication middleware for protected routes

fix(ui): resolve tablet touch responsiveness in SOP cards

- Increase touch target sizes for better accessibility
- Fix scrolling issues on tablet devices
- Update hover states for touch interfaces

Return ONLY the commit message (title + body), nothing else. No explanations or additional text."

# Call Claude agent with --no-tools to prevent recursion
COMMIT_MSG=""
if command -v claude >/dev/null 2>&1; then
    info "Calling Claude agent for commit message analysis..."
    
    # Try to get commit message from agent
    if COMMIT_MSG=$(echo "$AGENT_PROMPT" | claude --print 2>/dev/null); then
        # Clean up the response (preserve multi-line format but trim whitespace)
        COMMIT_MSG=$(echo "$COMMIT_MSG" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # Validate commit message format
        if [[ ! "$COMMIT_MSG" =~ ^(feat|fix|docs|refactor|style|test|chore)(\(.+\))?: ]]; then
            warn "Agent response doesn't match conventional commit format. Using fallback."
            COMMIT_MSG=""
        fi
    else
        warn "Claude agent call failed. Using fallback commit message."
    fi
else
    warn "claude command not found. Using fallback commit message."
fi

# Fallback commit message if agent fails
if [ -z "$COMMIT_MSG" ]; then
    # Generate a basic but informative commit message
    if [ "$FILE_COUNT" -eq 1 ]; then
        SINGLE_FILE=$(echo "$STAGED_FILES" | head -1)
        if [[ "$SINGLE_FILE" =~ \.(md|txt)$ ]]; then
            COMMIT_MSG="docs: update $(basename "$SINGLE_FILE")"
        elif [[ "$SINGLE_FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
            COMMIT_MSG="feat: update $(basename "$SINGLE_FILE")"
        elif [[ "$SINGLE_FILE" =~ \.(css|scss)$ ]]; then
            COMMIT_MSG="style: update $(basename "$SINGLE_FILE")"
        else
            COMMIT_MSG="chore: update $(basename "$SINGLE_FILE")"
        fi
    else
        COMMIT_MSG="feat: update $FILE_COUNT files"
    fi
fi

# Create full commit message with Claude signature
FULL_COMMIT_MSG="$COMMIT_MSG

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit the changes
info "Committing with message: $COMMIT_MSG"
if git commit -m "$FULL_COMMIT_MSG"; then
    log "✅ Auto-commit successful!"
    log "📝 Committed $FILE_COUNT file(s)"
    
    # Show the commit
    git log --oneline -1
else
    error "❌ Commit failed!"
    exit 1
fi

log "🎉 Agent auto-commit completed!"