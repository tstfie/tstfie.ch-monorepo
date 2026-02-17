#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const entry = path.join(root, 'dist', 'server', 'entry.mjs');

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

if (!fs.existsSync(entry)) {
  console.error('Build missing:', entry);
  try {
    const dist = path.join(root, 'dist');
    if (fs.existsSync(dist)) {
      console.error('dist contents:', fs.readdirSync(dist));
    } else {
      console.error('No dist directory found');
    }
  } catch (err) {
    console.error('Could not list dist:', err);
  }
  fail('Astro server entry not produced (dist/server/entry.mjs)');
}

const destBase = path.join(root, '.vercel', 'output', 'functions', '_render.func', 'apps', 'main', 'dist', 'server');
fs.mkdirSync(destBase, { recursive: true });

const files = fs.readdirSync(path.join(root, 'dist', 'server'));
for (const f of files) {
  const src = path.join(root, 'dist', 'server', f);
  const dst = path.join(destBase, f);
  fs.copyFileSync(src, dst);
}

console.log('verify-server-entry: entry exists and copied to', destBase);
process.exit(0);
