#!/usr/bin/env node
/**
 * Convert SVG icons to PNG using Sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function convertSvgToPng() {
  const svgFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg'));
  
  console.log(`🔄 Converting ${svgFiles.length} SVG files to PNG...`);
  
  for (const svgFile of svgFiles) {
    const svgPath = path.join(iconsDir, svgFile);
    const pngFile = svgFile.replace('.svg', '.png');
    const pngPath = path.join(iconsDir, pngFile);
    
    try {
      // Extract size from filename or use default
      const sizeMatch = svgFile.match(/(\d+)x\d+/);
      const size = sizeMatch ? parseInt(sizeMatch[1]) : 192;
      
      await sharp(svgPath)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(pngPath);
        
      console.log(`✅ Converted ${svgFile} → ${pngFile}`);
    } catch (error) {
      console.error(`❌ Failed to convert ${svgFile}:`, error.message);
    }
  }
  
  console.log('🎉 PNG conversion completed!');
}

if (require.main === module) {
  convertSvgToPng().catch(console.error);
}

module.exports = { convertSvgToPng };