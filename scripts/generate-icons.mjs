// Regenerates the PWA icon set + favicon from a simple inline SVG. Rerun
// with `npm run icons` whenever the brand mark changes.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const ICONS_DIR = 'public/icons'
const BACKGROUND_COLOR = '#0f172a' // slate-900, matches the scanner/sheet chrome
const FOREGROUND_COLOR = '#34d399' // emerald-400, the app's accent color

mkdirSync(ICONS_DIR, { recursive: true })

function markSvg({ size, padding = 0 }) {
  const innerSize = size - padding * 2
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND_COLOR}" />
  <text x="50%" y="50%" dy="${innerSize * 0.14}" font-family="system-ui, sans-serif" font-weight="700"
    font-size="${innerSize * 0.55}" fill="${FOREGROUND_COLOR}" text-anchor="middle" dominant-baseline="middle">K</text>
</svg>`
}

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  // Maskable icons get cropped to a circle/rounded-square by the OS, so the
  // mark needs extra padding to stay inside that safe zone.
  { file: 'pwa-maskable-512x512.png', size: 512, padding: 64 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const target of targets) {
  const outputPath = `${ICONS_DIR}/${target.file}`
  await sharp(Buffer.from(markSvg(target))).resize(target.size, target.size).png().toFile(outputPath)
  console.log(`Generated ${outputPath}`)
}

// The browser-tab favicon can stay a plain SVG - no rasterization needed.
const fs = await import('node:fs/promises')
await fs.writeFile('public/favicon.svg', markSvg({ size: 64 }).trim())
console.log('Generated public/favicon.svg')
