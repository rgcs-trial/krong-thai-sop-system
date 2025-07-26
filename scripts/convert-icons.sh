#!/bin/bash
# Convert SVG icons to PNG using ImageMagick
# Usage: ./convert-icons.sh

echo "Converting SVG icons to PNG..."

cd "$(dirname "$0")/../public/icons"

for svg_file in *.svg; do
    if [ -f "$svg_file" ]; then
        png_file="${svg_file%.svg}.png"
        echo "Converting $svg_file to $png_file"
        convert "$svg_file" "$png_file"
    fi
done

echo "✅ Icon conversion completed!"
