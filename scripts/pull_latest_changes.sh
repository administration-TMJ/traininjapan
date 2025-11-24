#!/bin/bash
# Script to pull latest changes from Git repository

echo "================================================"
echo "   Pulling Latest Changes from Git Repository"
echo "================================================"

cd /app

# Check current branch
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
echo ""

# Fetch latest changes from remote
echo "Fetching latest changes from remote..."
git fetch origin

# Show what will be pulled
echo ""
echo "Changes to be pulled:"
git log HEAD..origin/$BRANCH --oneline
echo ""

# Pull the changes
echo "Pulling changes..."
git pull origin $BRANCH

# Show summary
echo ""
echo "================================================"
echo "   Pull Complete!"
echo "================================================"
echo ""
echo "Changed files:"
git diff --name-status HEAD@{1} HEAD

echo ""
echo "Done! Repository is now up to date."
