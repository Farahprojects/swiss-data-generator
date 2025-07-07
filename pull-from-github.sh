#!/bin/bash

echo "🔄 Pulling changes from GitHub..."

# Pull from GitHub
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled from GitHub!"
    echo "📝 Latest changes:"
    git log --oneline -3
else
    echo "❌ Failed to pull from GitHub."
fi 