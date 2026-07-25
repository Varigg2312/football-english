#!/usr/bin/env node
// Regenerates sw.js's CACHE_NAME from a hash of the actual content of every
// file it precaches, so a new service-worker install/precache cycle only
// gets skipped when nothing really changed — no more remembering to bump a
// version number by hand (see the git log around 2026-07-24 for what
// happens when that's forgotten). Run automatically by the pre-commit hook
// in scripts/pre-commit; safe to run manually too, it's idempotent.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const publicDir = path.join(__dirname, '..', 'public');
const swPath = path.join(publicDir, 'sw.js');
const swSource = fs.readFileSync(swPath, 'utf8');

const listMatch = swSource.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
if (!listMatch) {
  console.error('bump-sw-cache: could not find PRECACHE_URLS in sw.js — leaving it untouched.');
  process.exit(1);
}
const urls = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

const hash = crypto.createHash('sha256');
for (const url of urls) {
  const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
  try {
    hash.update(fs.readFileSync(path.join(publicDir, rel)));
  } catch {
    // A precached file that's missing would break the SW install anyway —
    // hash its absence too so that state is still detected as "changed".
    hash.update('MISSING:' + rel);
  }
}
const newCacheName = `gaffer-pro-${hash.digest('hex').slice(0, 12)}`;

const updated = swSource.replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = '${newCacheName}';`);

if (updated !== swSource) {
  fs.writeFileSync(swPath, updated);
  console.log(`bump-sw-cache: sw.js CACHE_NAME -> ${newCacheName}`);
} else {
  console.log('bump-sw-cache: sw.js CACHE_NAME already up to date');
}
