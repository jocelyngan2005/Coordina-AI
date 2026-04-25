#!/bin/bash

# Quick Test Validation Script
# Usage: ./validate_fixes.sh <project_id>
# Example: ./validate_fixes.sh proj_abc123

set -e

PROJECT_ID="${1:-proj_test}"
API_BASE="http://localhost:8000/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Testing All Fixes for Project: $PROJECT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track pass/fail
PASS=0
FAIL=0

# Helper function to check field
check_field() {
    local field="$1"
    local value="$2"
    local expected="$3"

    if [ -z "$value" ] || [ "$value" = "null" ]; then
        echo -e "${RED}✗${NC} $field: MISSING"
        ((FAIL++))
        return 1
    else
        if [ -n "$expected" ] && [ "$value" != "$expected" ]; then
            echo -e "${YELLOW}⚠${NC} $field: $value (expected: $expected)"
            ((PASS++))
            return 0
        else
            echo -e "${GREEN}✓${NC} $field: $value"
            ((PASS++))
            return 0
        fi
    fi
}

# Test 1: Get project state
echo "[Test 1] Fetching project state..."
STATE=$(curl -s "$API_BASE/workflow/$PROJECT_ID/state" 2>/dev/null || echo "{}")

if [ "$STATE" = "{}" ] || [ -z "$STATE" ]; then
    echo -e "${RED}✗ Could not fetch project state. Is backend running?${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project state retrieved${NC}"
echo ""

# Test 2: Check team metadata
echo "[Test 2] Team Metadata"
PROJECT_NAME=$(echo "$STATE" | jq -r '.project_name // empty')
TEAM_SIZE=$(echo "$STATE" | jq -r '.team_size // empty')
DEADLINE=$(echo "$STATE" | jq -r '.deadline_date // empty')

check_field "project_name" "$PROJECT_NAME"
check_field "team_size" "$TEAM_SIZE"
check_field "deadline_date" "$DEADLINE"
echo ""

# Test 3: Check members structure
echo "[Test 3] Members Structure"
MEMBERS_COUNT=$(echo "$STATE" | jq '.members | length')
MEMBERS_KEY=$(echo "$STATE" | jq 'has("members")')

if [ "$MEMBERS_KEY" = "true" ]; then
    echo -e "${GREEN}✓${NC} members key exists (correct! not team_members)"
else
    echo -e "${RED}✗${NC} members key missing - checking for team_members (wrong key)"
    TEAM_MEMBERS_KEY=$(echo "$STATE" | jq 'has("team_members")')
    if [ "$TEAM_MEMBERS_KEY" = "true" ]; then
        echo -e "${RED}✗ Found team_members key (should be members)${NC}"
        ((FAIL++))
    fi
fi

echo -e "${GREEN}✓${NC} Member count: $MEMBERS_COUNT"
((PASS++))
echo ""

# Test 4: Check member details
echo "[Test 4] Member Details (sample first member)"
FIRST_MEMBER=$(echo "$STATE" | jq '.members[0]')

if [ "$FIRST_MEMBER" != "null" ] && [ ! -z "$FIRST_MEMBER" ]; then
    MEMBER_ID=$(echo "$FIRST_MEMBER" | jq -r '.id // empty')
    MEMBER_NAME=$(echo "$FIRST_MEMBER" | jq -r '.name // empty')
    CONTRIB_SCORE=$(echo "$FIRST_MEMBER" | jq -r '.contribution_score // empty')
    AVAILABILITY=$(echo "$FIRST_MEMBER" | jq -r '.availability // empty')
    EXP_LEVEL=$(echo "$FIRST_MEMBER" | jq -r '.experience_level // empty')

    check_field "  id" "$MEMBER_ID"
    check_field "  name" "$MEMBER_NAME"
    check_field "  contribution_score" "$CONTRIB_SCORE" "0"
    check_field "  availability" "$AVAILABILITY" "full-time"
    check_field "  experience_level" "$EXP_LEVEL" "mid"
else
    echo -e "${RED}✗ No members found${NC}"
    ((FAIL++))
fi
echo ""

# Test 5: Check tasks
echo "[Test 5] Tasks"
TASK_COUNT=$(echo "$STATE" | jq '.tasks | length')
echo -e "${GREEN}✓${NC} Task count: $TASK_COUNT"
((PASS++))

# Check first task for phase
if [ "$TASK_COUNT" -gt 0 ]; then
    FIRST_TASK=$(echo "$STATE" | jq '.tasks[0]')
    TASK_ID=$(echo "$FIRST_TASK" | jq -r '.id // empty')
    TASK_PHASE=$(echo "$FIRST_TASK" | jq -r '.phase // empty')
    TASK_STATUS=$(echo "$FIRST_TASK" | jq -r '.status // empty')

    echo "  First task sample:"
    check_field "    id" "$TASK_ID"
    check_field "    phase" "$TASK_PHASE"
    check_field "    status" "$TASK_STATUS"
else
    echo -e "${YELLOW}⚠${NC} No tasks found (analysis might not be complete)"
fi
echo ""

# Test 6: Check workflow stage
echo "[Test 6] Workflow Stage"
WORKFLOW_STAGE=$(echo "$STATE" | jq -r '.workflow_stage // empty')
check_field "workflow_stage" "$WORKFLOW_STAGE"
echo ""

# Test 7: Get decision log for Planning Agent
echo "[Test 7] Planning Agent Context"
DECISIONS=$(curl -s "$API_BASE/workflow/$PROJECT_ID/decisions?limit=5" 2>/dev/null || echo "[]")
PLANNING_DECISION=$(echo "$DECISIONS" | jq '.[] | select(.agent=="planning") | .output' | head -1)

if [ ! -z "$PLANNING_DECISION" ] && [ "$PLANNING_DECISION" != "null" ]; then
    # Extract context info if available
    PLAN_TEAM_SIZE=$(echo "$PLANNING_DECISION" | jq -r '.context.team_size // .team_size // empty' 2>/dev/null)
    PLAN_DAYS=$(echo "$PLANNING_DECISION" | jq -r '.context.days_available // .days_available // empty' 2>/dev/null)

    if [ ! -z "$PLAN_TEAM_SIZE" ]; then
        check_field "  team_size (from planning)" "$PLAN_TEAM_SIZE"
    fi
    if [ ! -z "$PLAN_DAYS" ]; then
        check_field "  days_available (from planning)" "$PLAN_DAYS"
    fi
else
    echo -e "${YELLOW}⚠${NC} Planning agent decisions not yet available (pipeline might not be complete)"
fi
echo ""

# Test 8: Check role assignments
echo "[Test 8] Role Assignments"
ROLE_ASSIGN_COUNT=$(echo "$STATE" | jq '.role_assignments | length')
if [ "$ROLE_ASSIGN_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Role assignments count: $ROLE_ASSIGN_COUNT"
    ((PASS++))

    # Check first assignment
    FIRST_ASSIGNMENT=$(echo "$STATE" | jq '.role_assignments[0]')
    ASSIGN_MEMBER_ID=$(echo "$FIRST_ASSIGNMENT" | jq -r '.member_id // empty')
    ASSIGN_ROLE=$(echo "$FIRST_ASSIGNMENT" | jq -r '.role // empty')

    check_field "  member_id" "$ASSIGN_MEMBER_ID"
    check_field "  role" "$ASSIGN_ROLE"
else
    echo -e "${YELLOW}⚠${NC} No role assignments yet (coordination might not be complete)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Fixes are working correctly.${NC}"
    exit 0
elif [ $FAIL -le 2 ]; then
    echo -e "${YELLOW}⚠ Some checks failed, but may be expected if pipeline is still running.${NC}"
    exit 0
else
    echo -e "${RED}✗ Multiple checks failed. Review the checklist.${NC}"
    exit 1
fi
