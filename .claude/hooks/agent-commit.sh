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

# Smart documentation update detection
should_update_docs() {
    local staged_files="$1"
    
    # Always update docs for these patterns
    if echo "$staged_files" | grep -E "(package\.json|pnpm-lock\.yaml|CLAUDE\.md|README\.md)" > /dev/null; then
        return 0  # true
    fi
    
    # Always update for docs directory changes
    if echo "$staged_files" | grep "^docs/" > /dev/null; then
        return 0
    fi
    
    # Always update for database/schema changes
    if echo "$staged_files" | grep -E "(supabase/|\.sql$|database\.ts|types/.*\.ts)" > /dev/null; then
        return 0
    fi
    
    # Always update for major config changes
    if echo "$staged_files" | grep -E "(next\.config\.ts|tailwind\.config\.ts|tsconfig\.json)" > /dev/null; then
        return 0
    fi
    
    # Update for new components/pages (detect new files in key directories)
    local new_component_files=$(echo "$staged_files" | grep -E "src/(components|app)/.*\.(tsx|ts)$")
    if [ -n "$new_component_files" ]; then
        # Check if these are actually new files (not just modifications)
        for file in $new_component_files; do
            if [ ! -f "$file" ] || [ "$(git log --oneline -- "$file" 2>/dev/null | wc -l)" -le 1 ]; then
                return 0  # New file detected
            fi
        done
    fi
    
    return 1  # false
}

# Check if we should update documentation
STAGED_FILES=$(git diff --cached --name-only)
info "🔍 Checking staged files for documentation updates:"
echo "$STAGED_FILES" | while read file; do
    info "  - $file"
done

if should_update_docs "$STAGED_FILES"; then
    info "📚 Significant changes detected - updating documentation..."
    
    # Run the update-docs command using Claude
    if command -v claude >/dev/null 2>&1; then
        info "🤖 Running claude /update-docs..."
        if claude /update-docs 2>&1; then
            log "✅ Documentation updated successfully"
            # Stage any new documentation changes
            info "📝 Staging any new documentation changes..."
            git add -A
            info "📊 Files now staged:"
            git diff --cached --name-only | while read file; do
                info "  - $file"
            done
        else
            warn "⚠️ Documentation update failed, continuing with commit..."
        fi
    else
        warn "⚠️ Claude command not found, skipping documentation update"
    fi
else
    info "ℹ️ No significant changes detected for documentation update"
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

# Check if documentation was updated in this commit
DOCS_UPDATED=""
if echo "$STAGED_FILES" | grep -E "(CLAUDE\.md|README\.md|docs/)" > /dev/null; then
    DOCS_UPDATED=" with documentation updates"
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
- If documentation was auto-updated, mention it briefly in the body

Examples:
feat(auth): implement PIN validation with session management

- Add 4-digit PIN input component with touch optimization
- Implement session storage with 8-hour expiration
- Add authentication middleware for protected routes
- Update technical documentation to reflect new auth flow

fix(ui): resolve tablet touch responsiveness in SOP cards

- Increase touch target sizes for better accessibility
- Fix scrolling issues on tablet devices
- Update hover states for touch interfaces

docs: update installation guide and technical specifications

- Refresh dependency versions in installation guide
- Update architecture diagrams for new components
- Synchronize API documentation with current endpoints

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
    
    # Push to remote
    info "🚀 Pushing to remote repository..."
    if git push; then
        log "✅ Push successful!"
    else
        warn "⚠️ Push failed - commit was successful but push encountered an error"
        # Don't exit with error since commit was successful
    fi
else
    error "❌ Commit failed!"
    exit 1
fi

log "🎉 Agent auto-commit completed!"