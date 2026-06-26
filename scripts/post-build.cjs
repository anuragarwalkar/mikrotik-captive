'use strict'
/**
 * post-build.cjs
 *
 * Runs after `vite build`. Responsibilities:
 *  1. Rename dist/index.html → dist/login.html  (MikroTik expects login.html)
 *  2. Copy reference-only hotspot support files from hotspot/ into dist/
 *     (md5.js, redirect.html, rlogin.html, radvert.html, api.json, errors.txt,
 *      xml/, img/)  — these are the unchanged MikroTik defaults.
 *
 * Custom-styled pages (alogin, logout, status, error, css/) are already
 * handled by Vite's public/ directory and need no extra copying.
 */

const fs   = require('fs')
const path = require('path')

const ROOT    = path.join(__dirname, '..')
const HOTSPOT = path.join(ROOT, 'hotspot')
const DIST    = path.join(ROOT, 'dist')

// ── helpers ──────────────────────────────────────────────────────────────────

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry)
    const d = path.join(dst, entry)
    fs.statSync(s).isDirectory() ? copyDir(s, d) : copyFile(s, d)
  }
}

// ── 1. Create login.html from React build output ─────────────────────────────

const indexSrc  = path.join(DIST, 'index.html')
const loginDst  = path.join(DIST, 'login.html')

if (!fs.existsSync(indexSrc)) {
  console.error('ERROR: dist/index.html not found. Run vite build first.')
  process.exit(1)
}
fs.copyFileSync(indexSrc, loginDst)
console.log('  ✓  index.html → login.html')

// ── 2. Copy unchanged MikroTik support files from hotspot/ reference ─────────

/** Files/folders to copy straight from hotspot/ → dist/ */
const REFERENCE_FILES = [
  'md5.js',
  'redirect.html',
  'rlogin.html',
  'radvert.html',
  'api.json',
  'errors.txt',
  'img',
  'xml',
]

for (const item of REFERENCE_FILES) {
  const src = path.join(HOTSPOT, item)
  const dst = path.join(DIST, item)
  if (!fs.existsSync(src)) {
    // These files are the unchanged MikroTik defaults already on the router.
    // They only need copying if you have a local hotspot/ reference folder.
    continue
  }
  if (fs.statSync(src).isDirectory()) {
    copyDir(src, dst)
  } else {
    copyFile(src, dst)
  }
  console.log(`  ✓  hotspot/${item} → dist/${item}`)
}

// ── done ─────────────────────────────────────────────────────────────────────

console.log('\n  📁  dist/ is ready to upload to /flash/hotspot/ on the router\n')
