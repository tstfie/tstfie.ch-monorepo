#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

// Common locations we expect the bundled server entry to exist after build
const candidates = [
  path.join(root, 'dist', 'server', 'entry.mjs'), // direct dist
  path.join(root, '.vercel', 'output', 'functions', '_render.func', 'apps', 'main', 'dist', 'server', 'entry.mjs'), // function package
];

let found = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    found = c;
    break;
  }
}

if (!found) {
  console.error('Astro server entry not found in any expected location.');
  try {
    const dist = path.join(root, 'dist');
    if (fs.existsSync(dist)) {
      console.error('dist contents:', fs.readdirSync(dist));
    }
    const vercelFunc = path.join(root, '.vercel', 'output', 'functions', '_render.func');
    if (fs.existsSync(vercelFunc)) {
      console.error('_render.func contents:', fs.readdirSync(vercelFunc));
    }
  } catch (err) {
    console.error('Could not list debug dirs:', err);
  }
  fail('Astro server entry not produced; deployment will fail');
}

// Copy the entry into the function root so the handler path is reliable
const funcRoot = path.join(root, '.vercel', 'output', 'functions', '_render.func');
if (!fs.existsSync(funcRoot)) {
  fs.mkdirSync(funcRoot, { recursive: true });
}

const target = path.join(funcRoot, 'entry.mjs');
fs.copyFileSync(found, target);
console.log('verify-server-entry: copied', found, '->', target);

// Update .vc-config.json handler to point to the function-root entry
const vcConfigPath = path.join(funcRoot, '.vc-config.json');
if (fs.existsSync(vcConfigPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(vcConfigPath, 'utf8'));
    cfg.handler = 'entry.mjs';
    fs.writeFileSync(vcConfigPath, JSON.stringify(cfg, null, 2));
    console.log('verify-server-entry: updated .vc-config.json handler -> entry.mjs');
  } catch (err) {
    console.error('Could not update .vc-config.json:', err);
    // Not fatal — copied entry is still present
  }
}

process.exit(0);
