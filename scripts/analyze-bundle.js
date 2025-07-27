#!/usr/bin/env node

/**
 * Bundle Analyzer Script for Krong Thai SOP System
 * Analyzes and reports on bundle size and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

function analyzeDirectory(dirPath, extensions = ['.js', '.ts', '.tsx', '.jsx']) {
  let totalSize = 0;
  let fileCount = 0;
  const results = {};

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          totalSize += stat.size;
          fileCount++;
          
          const category = currentPath.replace(process.cwd(), '').split('/')[1] || 'root';
          if (!results[category]) {
            results[category] = { size: 0, files: 0 };
          }
          results[category].size += stat.size;
          results[category].files++;
        }
      }
    });
  }

  try {
    traverse(dirPath);
  } catch (error) {
    console.warn(`Cannot analyze ${dirPath}: ${error.message}`);
  }

  return { totalSize, fileCount, breakdown: results };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeImports(dirPath) {
  const importAnalysis = {
    dynamicImports: 0,
    staticImports: 0,
    largeLibraries: new Set(),
    unusedImports: new Set()
  };

  function analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count dynamic imports
      const dynamicMatches = content.match(/import\s*\(/g);
      if (dynamicMatches) {
        importAnalysis.dynamicImports += dynamicMatches.length;
      }
      
      // Count static imports
      const staticMatches = content.match(/^import\s+/gm);
      if (staticMatches) {
        importAnalysis.staticImports += staticMatches.length;
      }
      
      // Detect large libraries
      if (content.includes('framer-motion')) importAnalysis.largeLibraries.add('framer-motion');
      if (content.includes('@radix-ui')) importAnalysis.largeLibraries.add('@radix-ui');
      if (content.includes('lucide-react')) importAnalysis.largeLibraries.add('lucide-react');
      
      // Check for specific import patterns that could be optimized
      if (content.includes("import * as")) {
        console.warn(`Wildcard import found in ${filePath} - consider specific imports`);
      }
      
    } catch (error) {
      // Ignore unreadable files
    }
  }

  function traverse(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(itemPath);
        } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
          analyzeFile(itemPath);
        }
      });
    } catch (error) {
      // Ignore permission errors
    }
  }

  traverse(dirPath);
  return importAnalysis;
}

console.log('🔍 Analyzing bundle and project structure...\n');

// Analyze source code
const srcAnalysis = analyzeDirectory('./src');
console.log('📁 Source Code Analysis:');
console.log(`Total size: ${formatBytes(srcAnalysis.totalSize)}`);
console.log(`Total files: ${srcAnalysis.fileCount}`);
console.log('\nBreakdown by directory:');
Object.entries(srcAnalysis.breakdown)
  .sort(([,a], [,b]) => b.size - a.size)
  .forEach(([dir, stats]) => {
    console.log(`  ${dir}: ${formatBytes(stats.size)} (${stats.files} files)`);
  });

// Analyze imports
console.log('\n📦 Import Analysis:');
const importAnalysis = analyzeImports('./src');
console.log(`Static imports: ${importAnalysis.staticImports}`);
console.log(`Dynamic imports: ${importAnalysis.dynamicImports}`);
console.log(`Large libraries detected: ${Array.from(importAnalysis.largeLibraries).join(', ') || 'None'}`);

// Check for optimization opportunities
console.log('\n🎯 Optimization Opportunities:');

if (importAnalysis.dynamicImports < 5) {
  console.log('⚠️  Consider adding more dynamic imports for code splitting');
}

if (importAnalysis.largeLibraries.size > 0) {
  console.log('⚠️  Large libraries detected - ensure they are tree-shaken properly');
}

// Check package.json for heavy dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const heavyDeps = ['@playwright/test', 'workbox-webpack-plugin', 'framer-motion'];
  const foundHeavy = Object.keys({...packageJson.dependencies, ...packageJson.devDependencies})
    .filter(dep => heavyDeps.some(heavy => dep.includes(heavy)));
  
  if (foundHeavy.length > 0) {
    console.log(`📋 Heavy dependencies found: ${foundHeavy.join(', ')}`);
  }
} catch (error) {
  console.warn('Could not analyze package.json');
}

console.log('\n✅ Analysis complete!');