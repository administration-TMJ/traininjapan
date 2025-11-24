#!/bin/bash
# Script to sync specific files from a remote Git repository

REPO_URL="$1"
FILES_PATTERN="$2"

if [ -z "$REPO_URL" ]; then
    echo "Usage: ./sync_from_remote_repo.sh <repository-url> [files-pattern]"
    echo ""
    echo "Examples:"
    echo "  ./sync_from_remote_repo.sh https://github.com/user/repo.git"
    echo "  ./sync_from_remote_repo.sh https://github.com/user/repo.git 'frontend/src/*'"
    echo "  ./sync_from_remote_repo.sh https://github.com/user/repo.git '*.js'"
    exit 1
fi

echo "================================================"
echo "   Syncing Files from Remote Repository"
echo "================================================"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Cloning to temporary directory..."

# Clone the repository
git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>&1 | grep -v "Receiving objects"

if [ $? -ne 0 ]; then
    echo "Error: Failed to clone repository"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "Repository cloned successfully!"
echo ""

# If files pattern is specified
if [ -n "$FILES_PATTERN" ]; then
    echo "Copying files matching pattern: $FILES_PATTERN"
    cd "$TEMP_DIR"
    find . -path "./.git" -prune -o -path "./node_modules" -prune -o -name "$FILES_PATTERN" -type f -print | while read file; do
        # Create directory structure
        dir=$(dirname "$file")
        mkdir -p "/app/$dir"
        # Copy file
        cp "$file" "/app/$file"
        echo "Copied: $file"
    done
else
    # Copy all files
    echo "Copying all files to /app..."
    rsync -av --exclude='.git' --exclude='node_modules' "$TEMP_DIR/" "/app/"
fi

echo ""
echo "================================================"
echo "   Sync Complete!"
echo "================================================"

# Show what was copied
echo ""
echo "Files in /app now:"
cd /app
git status --short 2>/dev/null || ls -lah

# Cleanup
rm -rf "$TEMP_DIR"
echo ""
echo "Temporary directory cleaned up."
