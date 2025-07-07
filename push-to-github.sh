#!/bin/bash

echo "🚀 Pushing changes to GitHub..."

# Add all changes
git add .

# Commit with timestamp
git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to GitHub
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Failed to push. You may need to pull first."
    echo "💡 Run: ./pull-from-github.sh"
fi 