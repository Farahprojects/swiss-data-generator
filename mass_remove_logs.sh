#!/bin/bash

# Find all TypeScript/TSX files and remove logToSupabase calls
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Processing $file"
  
  # Use sed to remove logToSupabase calls (single line and multiline)
  # This removes lines that start with logToSupabase( and continues until the closing );
  sed -i '/logToSupabase(/,/);/d' "$file"
  
  # Also remove any standalone logToSupabase calls without proper closing
  sed -i '/logToSupabase(/d' "$file"
  
  echo "Cleaned $file"
done

echo "Mass log removal complete!"