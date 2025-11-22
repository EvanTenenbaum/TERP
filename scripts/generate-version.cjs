#!/usr/bin/env node

/**
 * Generate version.json from git information
 * This script should be run during the build process to ensure
 * the version displayed in the app matches the deployed commit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get current commit SHA (short form)
  const commit = execSync('git rev-parse --short HEAD')
    .toString()
    .trim();

  // Get current commit date
  const date = execSync('git log -1 --format=%cd --date=short')
    .toString()
    .trim();

  // Get current branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD')
    .toString()
    .trim();

  // Determine version based on branch or use package.json version
  let version = '1.0.0';
  try {
    const packageJson = require('../package.json');
    version = packageJson.version || version;
  } catch (e) {
    console.warn('Could not read package.json version, using default');
  }

  // Determine phase based on commit message or branch
  let phase = 'Development';
  try {
    const commitMessage = execSync('git log -1 --pretty=%B')
      .toString()
      .trim();
    
    if (commitMessage.includes('P2') || commitMessage.includes('Performance')) {
      phase = 'P2 Performance & Operational Excellence';
    } else if (commitMessage.includes('P3')) {
      phase = 'P3 Advanced Features';
    } else if (branch === 'main' || branch === 'master') {
      phase = 'Production';
    }
  } catch (e) {
    console.warn('Could not determine phase from commit message');
  }

  // Create version object
  const versionInfo = {
    version,
    commit,
    date,
    branch,
    phase,
    buildTime: new Date().toISOString()
  };

  // Write to client/version.json
  const outputPath = path.join(__dirname, '../client/version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2) + '\n');

  // Also write to client/public/version.json for runtime version checking
  const publicOutputPath = path.join(__dirname, '../client/public/version.json');
  // Ensure public directory exists
  const publicDir = path.dirname(publicOutputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(publicOutputPath, JSON.stringify(versionInfo, null, 2) + '\n');

  console.log('✅ Generated version.json:');
  console.log(JSON.stringify(versionInfo, null, 2));
  console.log('✅ Also generated public/version.json for version checking');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error generating version.json:', error.message);
  
  // Fallback: create a basic version.json
  const fallbackVersion = {
    version: '1.0.0',
    commit: 'unknown',
    date: new Date().toISOString().split('T')[0],
    branch: 'unknown',
    phase: 'Development',
    buildTime: new Date().toISOString()
  };
  
  const outputPath = path.join(__dirname, '../client/version.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2) + '\n');
  
  // Also write to client/public/version.json
  const publicOutputPath = path.join(__dirname, '../client/public/version.json');
  const publicDir = path.dirname(publicOutputPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(publicOutputPath, JSON.stringify(fallbackVersion, null, 2) + '\n');
  
  console.log('⚠️  Created fallback version.json (both locations)');
  process.exit(0);
}
