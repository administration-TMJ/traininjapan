#!/bin/bash
# Script to clone a repository and copy all files to /app

REPO_URL="$1"
TARGET_DIR="${2:-/app}"

if [ -z "$REPO_URL" ]; then
    echo "Usage: ./clone_repo_changes.sh <repository-url> [target-directory]"
    echo "Example: ./clone_repo_changes.sh https://github.com/administration-TMJ/traininjapan.git"
    exit 1
fi

echo "================================================"
echo "   Cloning Repository and Copying Files"
echo "================================================"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Cloning to temporary directory: $TEMP_DIR"

# Clone the repository
git clone "$REPO_URL" "$TEMP_DIR"

if [ $? -ne 0 ]; then
    echo "Error: Failed to clone repository"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ""
echo "Repository cloned successfully!"
echo ""

# Show what will be copied
echo "Files to be copied:"
cd "$TEMP_DIR"
find . -type f ! -path "./.git/*" ! -path "./node_modules/*" | head -50

echo ""
read -p "Do you want to copy these files to $TARGET_DIR? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Copy files (excluding .git and node_modules)
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='.env' "$TEMP_DIR/" "$TARGET_DIR/"
    echo ""
    echo "================================================"
    echo "   Files copied successfully!"
    echo "================================================"
else
    echo "Copy cancelled."
fi

# Cleanup
rm -rf "$TEMP_DIR"
echo "Temporary directory cleaned up."
