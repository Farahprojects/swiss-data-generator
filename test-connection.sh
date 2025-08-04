#!/bin/bash
echo "Testing basic connectivity..."
echo "Current directory: $(pwd)"
echo "Git status:"
git status --porcelain
echo "Git remote:"
git remote -v
echo "Network test:"
ping -c 1 github.com 