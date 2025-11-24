#!/bin/bash
# Interactive Git File Manager - One script to rule them all!

echo "================================================"
echo "       Git File Manager - Interactive Menu"
echo "================================================"
echo ""
echo "What would you like to do?"
echo ""
echo "1) Pull latest changes from current repository"
echo "2) Clone entire repository and copy files"
echo "3) Sync specific files from remote repository"
echo "4) View new files from recent commits"
echo "5) Show current git status"
echo "6) Exit"
echo ""
read -p "Enter your choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "Pulling latest changes..."
        cd /app
        git pull origin $(git branch --show-current)
        ;;
    
    2)
        echo ""
        read -p "Enter repository URL: " repo_url
        if [ -z "$repo_url" ]; then
            echo "Error: Repository URL is required"
            exit 1
        fi
        
        TEMP_DIR=$(mktemp -d)
        echo "Cloning repository..."
        git clone "$repo_url" "$TEMP_DIR"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "Files in repository:"
            cd "$TEMP_DIR"
            find . -type f ! -path "./.git/*" ! -path "./node_modules/*" | head -20
            echo "... (showing first 20 files)"
            echo ""
            read -p "Copy all files to /app? (y/n): " confirm
            
            if [[ $confirm =~ ^[Yy]$ ]]; then
                rsync -av --exclude='.git' --exclude='node_modules' --exclude='.env' "$TEMP_DIR/" "/app/"
                echo "Files copied successfully!"
            fi
        fi
        
        rm -rf "$TEMP_DIR"
        ;;
    
    3)
        echo ""
        read -p "Enter repository URL: " repo_url
        read -p "Enter file pattern (e.g., *.js or leave empty for all): " pattern
        
        if [ -z "$repo_url" ]; then
            echo "Error: Repository URL is required"
            exit 1
        fi
        
        TEMP_DIR=$(mktemp -d)
        echo "Cloning repository..."
        git clone --depth 1 "$repo_url" "$TEMP_DIR" 2>&1 | grep -v "Receiving objects"
        
        if [ $? -eq 0 ]; then
            cd "$TEMP_DIR"
            
            if [ -n "$pattern" ]; then
                echo ""
                echo "Files matching '$pattern':"
                find . -path "./.git" -prune -o -path "./node_modules" -prune -o -name "$pattern" -type f -print
                echo ""
                read -p "Copy these files to /app? (y/n): " confirm
                
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    find . -path "./.git" -prune -o -path "./node_modules" -prune -o -name "$pattern" -type f -print | while read file; do
                        dir=$(dirname "$file")
                        mkdir -p "/app/$dir"
                        cp "$file" "/app/$file"
                        echo "Copied: $file"
                    done
                    echo "Files copied successfully!"
                fi
            else
                echo "Copying all files..."
                rsync -av --exclude='.git' --exclude='node_modules' "$TEMP_DIR/" "/app/"
                echo "Files copied successfully!"
            fi
        fi
        
        rm -rf "$TEMP_DIR"
        ;;
    
    4)
        echo ""
        read -p "How many commits to check? (default: 5): " num_commits
        num_commits=${num_commits:-5}
        
        cd /app
        echo ""
        echo "New files added in last $num_commits commits:"
        echo "================================================"
        git diff --name-only --diff-filter=A HEAD~$num_commits..HEAD
        
        echo ""
        echo "Modified files in last $num_commits commits:"
        echo "================================================"
        git diff --name-only --diff-filter=M HEAD~$num_commits..HEAD
        
        echo ""
        echo "Commit history:"
        echo "================================================"
        git log --oneline -$num_commits
        ;;
    
    5)
        echo ""
        cd /app
        echo "Current branch: $(git branch --show-current)"
        echo ""
        echo "Git status:"
        echo "================================================"
        git status
        echo ""
        echo "Recent commits:"
        echo "================================================"
        git log --oneline -5
        ;;
    
    6)
        echo "Goodbye!"
        exit 0
        ;;
    
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "Operation completed!"
echo "================================================"
