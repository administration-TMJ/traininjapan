#!/bin/bash
# Complete sync script to pull from traininjapan GitHub and replace files on live

echo "=============================================="
echo "  Train in Japan - Live Sync Script"
echo "=============================================="
echo ""
echo "This will:"
echo "  1. Pull latest code from GitHub"
echo "  2. Replace files on live (/app)"
echo "  3. Install dependencies if needed"
echo "  4. Restart services"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting sync process..."
echo ""

# Step 1: Navigate to /app
cd /app

# Step 2: Check current status
echo "📊 Current repository status:"
git status --short
echo ""

# Step 3: Fetch latest changes
echo "📥 Fetching latest from GitHub (traininjapan)..."
git fetch origin

# Step 4: Show what will change
CURRENT_BRANCH=$(git branch --show-current)
BEHIND=$(git rev-list HEAD..origin/$CURRENT_BRANCH --count)

if [ "$BEHIND" -gt 0 ]; then
    echo ""
    echo "📋 $BEHIND new commit(s) available:"
    git log HEAD..origin/$CURRENT_BRANCH --oneline
    echo ""
    echo "📁 Files that will be updated:"
    git diff --name-status HEAD..origin/$CURRENT_BRANCH
    echo ""
    read -p "Pull these changes? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Sync cancelled."
        exit 1
    fi
    
    # Step 5: Pull changes
    echo ""
    echo "⬇️ Pulling changes..."
    git pull origin $CURRENT_BRANCH
    
    if [ $? -ne 0 ]; then
        echo "❌ Git pull failed!"
        echo "You may have local changes. Run: git stash"
        exit 1
    fi
    
    echo ""
    echo "✅ Code updated successfully!"
    
    # Step 6: Check if package.json changed
    if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
        echo ""
        echo "📦 package.json changed. Installing dependencies..."
        cd /app/frontend
        yarn install
        cd /app
    fi
    
    # Step 7: Check if requirements.txt changed  
    if git diff --name-only HEAD@{1} HEAD | grep -q "requirements.txt"; then
        echo ""
        echo "🐍 requirements.txt changed. Installing Python dependencies..."
        cd /app/backend
        pip install -q -r requirements.txt
        cd /app
    fi
    
    # Step 8: Restart services
    echo ""
    echo "🔄 Restarting services..."
    sudo supervisorctl restart all
    sleep 3
    
    echo ""
    echo "📊 Service status:"
    sudo supervisorctl status
    
    echo ""
    echo "=============================================="
    echo "  ✅ Sync Complete!"
    echo "=============================================="
    echo ""
    echo "📝 Summary of changes:"
    git diff --name-status HEAD@{1} HEAD
    echo ""
    echo "🌐 Your site should now be updated!"
    
else
    echo ""
    echo "✅ Already up to date! No changes to pull."
fi

echo ""
echo "Done! 🎉"
