#!/bin/bash
# Script to get all new files added in recent commits

COMMIT_RANGE="${1:-HEAD~5..HEAD}"

echo "================================================"
echo "   Getting New Files from Git Commits"
echo "================================================"
echo "Commit range: $COMMIT_RANGE"
echo ""

cd /app

# Get list of new files
echo "New files added in recent commits:"
echo "================================================"
git diff --name-only --diff-filter=A $COMMIT_RANGE

echo ""
echo "================================================"
echo "   Modified files in recent commits:"
echo "================================================"
git diff --name-only --diff-filter=M $COMMIT_RANGE

echo ""
echo "================================================"
echo "   Detailed Changes:"
echo "================================================"
git log --oneline --name-status $COMMIT_RANGE

echo ""
echo "To copy these files, they are already in your /app directory!"
