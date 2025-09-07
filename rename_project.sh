#!/bin/bash

# Script to rename DeSciChain to DeSciFi throughout the project
echo "🚀 Starting project rename from DeSciChain to DeSciFi..."

# List of files to update (excluding node_modules, .git, and dist directories)
files=$(find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.md" -o -name "*.sh" -o -name "*.sql" \) -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./backend/dist/*" -not -path "./frontend/dist/*")

# Counter for files processed
count=0

# Process each file
for file in $files; do
    # Skip this script itself
    if [[ "$file" == "./rename_project.sh" ]]; then
        continue
    fi
    
    # Check if file contains "DeSciChain"
    if grep -q "DeSciChain" "$file"; then
        echo "📝 Updating: $file"
        # Use sed to replace all instances
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version
            sed -i '' 's/DeSciChain/DeSciFi/g' "$file"
        else
            # Linux version
            sed -i 's/DeSciChain/DeSciFi/g' "$file"
        fi
        ((count++))
    fi
done

echo "✅ Project rename complete! Updated $count files."
echo "🎉 DeSciChain is now DeSciFi!"
