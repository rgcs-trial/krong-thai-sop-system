#!/usr/bin/env node
/**
 * Icon Generation Script for Restaurant Krong Thai SOP Management System
 * Generates PWA icons with proper branding and sizes
 */

const fs = require('fs');
const path = require('path');

// Restaurant Krong Thai brand colors
const BRAND_COLORS = {
  primary: '#E31B23',    // Red
  black: '#231F20',      // Black
  white: '#FCFCFC',      // White
  saffron: '#D4AF37',    // Saffron
  jade: '#008B8B',       // Jade
  beige: '#D2B48C'       // Beige
};

// Icon sizes needed for PWA
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  
  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 167, name: 'apple-touch-icon-ipad.png' },
  
  // Microsoft tiles
  { size: 144, name: 'ms-tile-144x144.png' },
  { size: 150, name: 'ms-tile-150x150.png' },
  { size: 310, name: 'ms-tile-310x310.png' },
  
  // Additional icons
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
  
  // Badge and notification icons
  { size: 72, name: 'badge-72x72.png' },
  { size: 96, name: 'notification-icon.png' },
  
  // Shortcut icons
  { size: 96, name: 'shortcut-food-safety.png' },
  { size: 96, name: 'shortcut-emergency.png' },
  { size: 96, name: 'shortcut-progress.png' },
  
  // Action icons
  { size: 24, name: 'action-view.png' },
  { size: 24, name: 'action-dismiss.png' },
  
  // Emergency icons
  { size: 192, name: 'emergency-icon.png' },
  { size: 72, name: 'emergency-badge.png' }
];

// SVG template for the main app icon
const createMainIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .primary { fill: ${BRAND_COLORS.primary}; }
      .white { fill: ${BRAND_COLORS.white}; }
      .black { fill: ${BRAND_COLORS.black}; }
      .saffron { fill: ${BRAND_COLORS.saffron}; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" class="white"/>
  
  <!-- Main Red Circle -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}" class="primary"/>
  
  <!-- Inner White Circle -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.25}" class="white"/>
  
  <!-- Thai Pattern/Symbol -->
  <g transform="translate(${size * 0.5}, ${size * 0.5})">
    <!-- Simple Thai-inspired geometric pattern -->
    <path d="M-${size * 0.1},-${size * 0.1} L${size * 0.1},-${size * 0.1} L0,${size * 0.1} Z" class="primary"/>
    <path d="M-${size * 0.05},${size * 0.02} L${size * 0.05},${size * 0.02} L0,${size * 0.08} Z" class="saffron"/>
  </g>
  
  <!-- Text/Logo area -->
  <text x="${size * 0.5}" y="${size * 0.85}" text-anchor="middle" 
        font-family="serif" font-size="${size * 0.08}" class="black" font-weight="bold">
    KRONG THAI
  </text>
</svg>
`;

// SVG template for emergency icon
const createEmergencyIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .emergency { fill: #FF4444; }
      .white { fill: #FFFFFF; }
      .black { fill: #000000; }
    </style>
  </defs>
  
  <!-- Emergency background -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" class="emergency"/>
  
  <!-- Warning triangle -->
  <path d="M${size * 0.5},${size * 0.2} L${size * 0.8},${size * 0.7} L${size * 0.2},${size * 0.7} Z" 
        class="white" stroke="#000" stroke-width="2"/>
  
  <!-- Exclamation mark -->
  <rect x="${size * 0.47}" y="${size * 0.35}" width="${size * 0.06}" height="${size * 0.25}" class="black"/>
  <circle cx="${size * 0.5}" cy="${size * 0.65}" r="${size * 0.03}" class="black"/>
</svg>
`;

// SVG template for food safety icon
const createFoodSafetyIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .primary { fill: ${BRAND_COLORS.primary}; }
      .white { fill: ${BRAND_COLORS.white}; }
      .jade { fill: ${BRAND_COLORS.jade}; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" class="white"/>
  
  <!-- Plate/Bowl -->
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.3}" class="jade"/>
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.25}" class="white"/>
  
  <!-- Checkmark -->
  <path d="M${size * 0.35},${size * 0.5} L${size * 0.45},${size * 0.6} L${size * 0.65},${size * 0.4}" 
        stroke="${BRAND_COLORS.jade}" stroke-width="${size * 0.03}" fill="none" stroke-linecap="round"/>
</svg>
`;

// Generate icon placeholders and SVG sources
const generateIcons = () => {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Generate main app icons
  ICON_SIZES.forEach(({ size, name }) => {
    const iconPath = path.join(iconsDir, name);
    
    if (name.includes('emergency')) {
      // Generate emergency icon SVG
      const svgContent = createEmergencyIconSVG(size);
      fs.writeFileSync(iconPath.replace('.png', '.svg'), svgContent);
    } else if (name.includes('food-safety')) {
      // Generate food safety icon SVG
      const svgContent = createFoodSafetyIconSVG(size);
      fs.writeFileSync(iconPath.replace('.png', '.svg'), svgContent);
    } else {
      // Generate main app icon SVG
      const svgContent = createMainIconSVG(size);
      fs.writeFileSync(iconPath.replace('.png', '.svg'), svgContent);
    }
    
    console.log(`Generated SVG source for ${name} (${size}x${size})`);
  });

  // Generate favicon.ico placeholder
  const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  const faviconSVG = createMainIconSVG(32);
  fs.writeFileSync(faviconPath.replace('.ico', '.svg'), faviconSVG);

  console.log('✅ Icon generation completed!');
  console.log('📝 Note: SVG files have been generated. To create PNG files:');
  console.log('   1. Use a tool like ImageMagick: convert icon.svg icon.png');
  console.log('   2. Or use an online SVG to PNG converter');
  console.log('   3. Or use a Node.js library like sharp or puppeteer');
};

// Instructions for converting SVG to PNG
const generateConversionScript = () => {
  const scriptContent = `#!/bin/bash
# Convert SVG icons to PNG using ImageMagick
# Usage: ./convert-icons.sh

echo "Converting SVG icons to PNG..."

cd "$(dirname "$0")/../public/icons"

for svg_file in *.svg; do
    if [ -f "$svg_file" ]; then
        png_file="\${svg_file%.svg}.png"
        echo "Converting $svg_file to $png_file"
        convert "$svg_file" "$png_file"
    fi
done

echo "✅ Icon conversion completed!"
`;

  const scriptPath = path.join(__dirname, 'convert-icons.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  
  console.log('📋 Created conversion script: scripts/convert-icons.sh');
};

// Generate browserconfig.xml for Windows tiles
const generateBrowserConfig = () => {
  const browserConfigContent = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="/icons/ms-tile-70x70.png"/>
            <square150x150logo src="/icons/ms-tile-150x150.png"/>
            <square310x310logo src="/icons/ms-tile-310x310.png"/>
            <wide310x150logo src="/icons/ms-tile-310x150.png"/>
            <TileColor>${BRAND_COLORS.primary}</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;

  const configPath = path.join(__dirname, '..', 'public', 'browserconfig.xml');
  fs.writeFileSync(configPath, browserConfigContent);
  
  console.log('📋 Updated browserconfig.xml');
};

// Main execution
if (require.main === module) {
  console.log('🎨 Generating Restaurant Krong Thai PWA Icons...');
  generateIcons();
  generateConversionScript();
  generateBrowserConfig();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Run: npm install sharp (for programmatic PNG conversion)');
  console.log('2. Or run: ./scripts/convert-icons.sh (requires ImageMagick)');
  console.log('3. Or manually convert SVG files to PNG using your preferred tool');
}

module.exports = {
  generateIcons,
  BRAND_COLORS,
  ICON_SIZES
};