#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Deployment Debug Information');
console.log('================================');
console.log('Node Version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('VERCEL:', process.env.VERCEL || 'undefined');
console.log('VERCEL_ENV:', process.env.VERCEL_ENV || 'undefined');
console.log('Base Path Logic:');
console.log('  VERCEL detected:', !!process.env.VERCEL);
console.log('  NODE_ENV === production:', process.env.NODE_ENV === 'production');
console.log('  Calculated base:', process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/tgAI/' : '/'));

// Check if built files exist
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('\n📁 Build Files Check:');
console.log('  dist/ exists:', fs.existsSync(distPath));
console.log('  index.html exists:', fs.existsSync(indexPath));

if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  const baseMatch = content.match(/href="([^"]*\/assets\/)/);
  const scriptMatch = content.match(/src="([^"]*\/assets\/)/);
  console.log('  Asset paths in HTML:');
  console.log('    CSS base:', baseMatch ? baseMatch[1] : 'not found');
  console.log('    JS base:', scriptMatch ? scriptMatch[1] : 'not found');
}

console.log('\n✅ Run this on both local and Vercel to compare!');