#!/bin/bash

echo "🔄 Syncing from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully synced from GitHub!"
    echo "📝 Latest changes:"
    git log --oneline -3
else
    echo "❌ Failed to sync from GitHub."
fi 