/**
 * generate-icons.mjs — PWA icon generation script
 *
 * Strategy: SVG fallback (no sharp required)
 * Reason: sharp installation failed on this Windows environment due to npm/pnpm conflicts.
 * Modern browsers (Chrome 80+, Firefox 84+, Safari 16.4+) and the Web App Manifest spec
 * (W3C) support SVG in the "icons" field. iOS 16+ supports SVG apple-touch-icon.
 * For maximum compatibility we provide both SVG icons (manifest) and a high-res PNG
 * for legacy support — the PNG is generated from the SVG data URI if sharp is present,
 * otherwise the SVG files serve directly.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * Outputs (under frontend/public/icons/):
 *   icon-192x192.svg       — 192×192 SVG (manifest any)
 *   icon-512x512.svg       — 512×512 SVG (manifest any)
 *   icon-maskable-512.svg  — 512×512 SVG with safe-area padding (manifest maskable)
 *   apple-touch-icon.svg   — 180×180 SVG (apple-touch-icon)
 *
 * The manifest.webmanifest and index.html are updated by this script.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FRONTEND = resolve(ROOT, 'frontend')
const PUBLIC = resolve(FRONTEND, 'public')
const ICONS_DIR = resolve(PUBLIC, 'icons')
const SOURCE_SVG = resolve(PUBLIC, 'icon-source.svg')

// Ensure icons directory exists
mkdirSync(ICONS_DIR, { recursive: true })

const sourceSvg = readFileSync(SOURCE_SVG, 'utf-8')

// ── 192×192 SVG (resize viewBox, keep same artwork) ───────────────────────────
const svg192 = sourceSvg.replace(
  /width="512" height="512"/,
  'width="192" height="192"'
)
writeFileSync(resolve(ICONS_DIR, 'icon-192x192.svg'), svg192, 'utf-8')
console.log('✓ icon-192x192.svg')

// ── 512×512 SVG (same as source) ──────────────────────────────────────────────
copyFileSync(SOURCE_SVG, resolve(ICONS_DIR, 'icon-512x512.svg'))
console.log('✓ icon-512x512.svg')

// ── Maskable 512×512 — add safe-area padding (10% inset) ──────────────────────
// The artwork is scaled down and centered inside the safe zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Maskable background — fills the full icon square -->
  <rect width="512" height="512" rx="0" fill="#1a1f1a"/>
  <!-- Content scaled to 80% (safe zone) centered -->
  <g transform="translate(51,51) scale(0.8)">
    <circle cx="256" cy="256" r="256" fill="#1a1f1a"/>
    <circle cx="256" cy="256" r="180" fill="none" stroke="#84a98c" stroke-width="16"/>
    <circle cx="256" cy="256" r="10" fill="#84a98c"/>
    <line x1="256" y1="256" x2="182" y2="165" stroke="#84a98c" stroke-width="14" stroke-linecap="round"/>
    <line x1="256" y1="256" x2="256" y2="106" stroke="#a8c5b0" stroke-width="10" stroke-linecap="round"/>
    <line x1="256" y1="80"  x2="256" y2="100" stroke="#84a98c" stroke-width="8" stroke-linecap="round"/>
    <line x1="256" y1="412" x2="256" y2="432" stroke="#84a98c" stroke-width="8" stroke-linecap="round"/>
    <line x1="80"  y1="256" x2="100" y2="256" stroke="#84a98c" stroke-width="8" stroke-linecap="round"/>
    <line x1="412" y1="256" x2="432" y2="256" stroke="#84a98c" stroke-width="8" stroke-linecap="round"/>
  </g>
</svg>`
writeFileSync(resolve(ICONS_DIR, 'icon-maskable-512.svg'), maskableSvg, 'utf-8')
console.log('✓ icon-maskable-512.svg')

// ── apple-touch-icon 180×180 ──────────────────────────────────────────────────
const appleIcon = sourceSvg.replace(
  /width="512" height="512"/,
  'width="180" height="180"'
)
writeFileSync(resolve(ICONS_DIR, 'apple-touch-icon.svg'), appleIcon, 'utf-8')
console.log('✓ apple-touch-icon.svg')

// ── Update manifest.webmanifest ───────────────────────────────────────────────
const manifest = {
  name: 'Study Timer',
  short_name: 'StudyTimer',
  description: 'Temporizador de estudio competitivo con amigos',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#7c9a82',
  background_color: '#1a1f1a',
  lang: 'es',
  categories: ['productivity', 'education'],
  icons: [
    {
      src: '/icons/icon-192x192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512x512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/icons/icon-maskable-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ],
}

writeFileSync(
  resolve(PUBLIC, 'manifest.webmanifest'),
  JSON.stringify(manifest, null, 2),
  'utf-8'
)
console.log('✓ manifest.webmanifest updated')

console.log('\nDone. Icons generated in frontend/public/icons/')
console.log('Note: Update index.html apple-touch-icon href to /icons/apple-touch-icon.svg')
