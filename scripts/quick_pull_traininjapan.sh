#!/bin/bash
# Quick script to pull latest changes from traininjapan repository

echo "🚀 Pulling latest changes from traininjapan repository..."
echo ""

cd /app

# Check if we're in the right repo
REMOTE_URL=$(git config --get remote.origin.url)

if [[ $REMOTE_URL == *"traininjapan"* ]]; then
    echo "✓ Confirmed: traininjapan repository"
    echo ""
    
    # Show current status
    echo "Current branch: $(git branch --show-current)"
    echo ""
    
    # Fetch and show what's new
    echo "Fetching latest changes..."
    git fetch origin
    
    CURRENT_BRANCH=$(git branch --show-current)
    BEHIND=$(git rev-list HEAD..origin/$CURRENT_BRANCH --count)
    
    if [ "$BEHIND" -gt 0 ]; then
        echo ""
        echo "📥 $BEHIND new commit(s) available:"
        git log HEAD..origin/$CURRENT_BRANCH --oneline
        echo ""
        
        # Pull the changes
        echo "Pulling changes..."
        git pull origin $CURRENT_BRANCH
        
        echo ""
        echo "✅ Repository updated successfully!"
        echo ""
        echo "Changed files:"
        git diff --name-status HEAD@{1} HEAD
    else
        echo ""
        echo "✅ Already up to date!"
    fi
else
    echo "⚠️  Warning: This doesn't appear to be the traininjapan repository"
    echo "Current remote: $REMOTE_URL"
    echo ""
    read -p "Do you want to pull anyway? (y/n): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        git pull origin $(git branch --show-current)
    else
        echo "Cancelled."
        exit 1
    fi
fi

echo ""
echo "Done! 🎉"
