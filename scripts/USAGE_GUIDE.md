# Git File Sync Scripts - Quick Start Guide

## 🚀 Most Common Use Cases

### Just want to pull latest changes from traininjapan?
```bash
cd /app/scripts
./quick_pull_traininjapan.sh
```
This is the **easiest and fastest** way!

---

### Interactive Menu (Recommended for beginners)
```bash
cd /app/scripts
./git_file_manager.sh
```
Provides a user-friendly menu to choose what you want to do.

---

## 📋 All Available Scripts

| Script | Purpose | Difficulty |
|--------|---------|------------|
| `quick_pull_traininjapan.sh` | Pull latest from traininjapan repo | ⭐ Easy |
| `git_file_manager.sh` | Interactive menu for all operations | ⭐ Easy |
| `pull_latest_changes.sh` | Pull from any current repo | ⭐⭐ Medium |
| `clone_repo_changes.sh` | Clone and copy entire repo | ⭐⭐ Medium |
| `sync_from_remote_repo.sh` | Sync specific files only | ⭐⭐⭐ Advanced |
| `get_new_files_from_commit.sh` | View recent file changes | ⭐⭐ Medium |

---

## 📖 Detailed Examples

### Example 1: Pull latest changes from traininjapan
```bash
cd /app/scripts
./quick_pull_traininjapan.sh
```

**Output will show:**
- Current branch
- Number of new commits
- List of changes
- Files that were updated

---

### Example 2: Clone the traininjapan repo fresh
```bash
cd /app/scripts
./clone_repo_changes.sh https://github.com/administration-TMJ/traininjapan.git
```

**This will:**
1. Clone the repository to a temporary location
2. Show you a list of files
3. Ask for confirmation
4. Copy all files to /app
5. Clean up automatically

---

### Example 3: Sync only the LocationMapPicker component
```bash
cd /app/scripts
./sync_from_remote_repo.sh https://github.com/administration-TMJ/traininjapan.git "*/LocationMapPicker.js"
```

**Use this when:**
- You only need specific files
- You want to update just one component
- You don't want to pull everything

---

### Example 4: See what files changed in last 10 commits
```bash
cd /app/scripts
./get_new_files_from_commit.sh HEAD~10..HEAD
```

**This shows:**
- New files added
- Modified files
- Commit history with details

---

### Example 5: Interactive mode (best for learning)
```bash
cd /app/scripts
./git_file_manager.sh
```

**Menu options:**
1. Pull latest changes from current repository
2. Clone entire repository and copy files
3. Sync specific files from remote repository
4. View new files from recent commits
5. Show current git status
6. Exit

---

## 🎯 Quick Reference Commands

```bash
# Navigate to scripts directory
cd /app/scripts

# Make all scripts executable (if needed)
chmod +x *.sh

# Pull latest changes (easiest)
./quick_pull_traininjapan.sh

# Interactive menu (most flexible)
./git_file_manager.sh

# Pull from any repo
./pull_latest_changes.sh

# Clone entire repo
./clone_repo_changes.sh https://github.com/user/repo.git

# Sync specific files
./sync_from_remote_repo.sh https://github.com/user/repo.git "*.js"

# View recent changes
./get_new_files_from_commit.sh
```

---

## ⚡ One-Line Commands (For Advanced Users)

```bash
# Pull latest changes
cd /app && git pull origin main

# Clone and sync traininjapan repo
git clone https://github.com/administration-TMJ/traininjapan.git /tmp/repo && rsync -av --exclude='.git' --exclude='node_modules' /tmp/repo/ /app/ && rm -rf /tmp/repo

# View files changed in last 5 commits
cd /app && git diff --name-only HEAD~5..HEAD

# Fetch specific file from remote
cd /app && git fetch origin && git checkout origin/main -- frontend/src/components/LocationMapPicker.js
```

---

## 🛠️ Troubleshooting

### Permission Denied
```bash
chmod +x /app/scripts/*.sh
```

### Git Authentication Required
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Script Not Found
```bash
cd /app/scripts
ls -la *.sh
```

### Want to see what a script does before running?
```bash
cat /app/scripts/quick_pull_traininjapan.sh
```

---

## 💡 Tips

1. **Always start with the interactive menu** if you're unsure
2. **Use `quick_pull_traininjapan.sh`** for daily updates
3. **Scripts automatically exclude** `.git`, `node_modules`, and `.env` files
4. **All scripts clean up** temporary directories automatically
5. **Safe to run multiple times** - scripts check before overwriting

---

## 📞 Need Help?

Run the interactive menu and explore the options:
```bash
./git_file_manager.sh
```

Or read the detailed README:
```bash
cat README_GIT_SCRIPTS.md
```

---

**Created for the traininjapan.com project**  
Last updated: November 2024
