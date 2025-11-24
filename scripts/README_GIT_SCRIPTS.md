# Git File Sync Scripts

Collection of scripts to grab files from Git repositories.

## Available Scripts

### 1. **pull_latest_changes.sh**
Pull the latest changes from the remote repository to your current /app directory.

**Usage:**
```bash
cd /app/scripts
./pull_latest_changes.sh
```

**What it does:**
- Fetches latest changes from remote
- Shows what will be pulled
- Pulls and updates your local repository
- Displays summary of changed files

---

### 2. **clone_repo_changes.sh**
Clone a repository to a temporary location and copy all files to a target directory.

**Usage:**
```bash
cd /app/scripts
./clone_repo_changes.sh <repository-url> [target-directory]
```

**Examples:**
```bash
# Clone and copy to /app (default)
./clone_repo_changes.sh https://github.com/administration-TMJ/traininjapan.git

# Clone and copy to specific directory
./clone_repo_changes.sh https://github.com/user/repo.git /app/backup
```

**What it does:**
- Clones repository to temporary directory
- Shows list of files to be copied
- Asks for confirmation
- Copies files (excludes .git, node_modules, .env)
- Cleans up temporary directory

---

### 3. **get_new_files_from_commit.sh**
List all new and modified files from recent commits in your current repository.

**Usage:**
```bash
cd /app/scripts
./get_new_files_from_commit.sh [commit-range]
```

**Examples:**
```bash
# Get files from last 5 commits (default)
./get_new_files_from_commit.sh

# Get files from last 10 commits
./get_new_files_from_commit.sh HEAD~10..HEAD

# Get files between specific commits
./get_new_files_from_commit.sh abc123..def456
```

**What it does:**
- Lists all newly added files
- Lists all modified files
- Shows detailed commit log with file changes

---

### 4. **sync_from_remote_repo.sh**
Sync specific files or all files from a remote repository.

**Usage:**
```bash
cd /app/scripts
./sync_from_remote_repo.sh <repository-url> [files-pattern]
```

**Examples:**
```bash
# Sync all files
./sync_from_remote_repo.sh https://github.com/administration-TMJ/traininjapan.git

# Sync only JavaScript files
./sync_from_remote_repo.sh https://github.com/user/repo.git "*.js"

# Sync only frontend src files
./sync_from_remote_repo.sh https://github.com/user/repo.git "frontend/src/*"

# Sync only specific component
./sync_from_remote_repo.sh https://github.com/user/repo.git "*/LocationMapPicker.js"
```

**What it does:**
- Clones repository to temporary directory (shallow clone for speed)
- Copies files matching pattern (or all files if no pattern)
- Shows sync summary
- Cleans up temporary directory

---

## Quick Reference

| Task | Script | Command |
|------|--------|---------|
| Pull latest from current repo | pull_latest_changes.sh | `./pull_latest_changes.sh` |
| Clone entire repo | clone_repo_changes.sh | `./clone_repo_changes.sh <url>` |
| See recent file changes | get_new_files_from_commit.sh | `./get_new_files_from_commit.sh` |
| Sync specific files | sync_from_remote_repo.sh | `./sync_from_remote_repo.sh <url> "*.js"` |

---

## Common Use Cases

### 1. Update current project with latest changes
```bash
./pull_latest_changes.sh
```

### 2. Get fresh copy of entire repository
```bash
./clone_repo_changes.sh https://github.com/administration-TMJ/traininjapan.git
```

### 3. Sync only LocationMapPicker component
```bash
./sync_from_remote_repo.sh https://github.com/administration-TMJ/traininjapan.git "*/LocationMapPicker.js"
```

### 4. See what files changed in last 3 commits
```bash
./get_new_files_from_commit.sh HEAD~3..HEAD
```

---

## Notes

- All scripts exclude `.git`, `node_modules`, and `.env` files when copying
- Scripts create temporary directories that are automatically cleaned up
- Always review the file list before confirming copy operations
- Make sure you have proper Git credentials configured for private repositories

## Troubleshooting

**Permission denied:**
```bash
chmod +x /app/scripts/*.sh
```

**Git authentication required:**
```bash
# Configure Git credentials
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```
