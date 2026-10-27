// Generates the social preview images (Open Graph / X cards) into faktorio-fe/public/social
// and the app icons into faktorio-fe/public/icons.
// Run from the repository root: node scripts/generate-social-images.mts
// Chromium draws them on a canvas, so no image tooling beyond Playwright is needed.
// Run it on macOS to get the same SF Pro heading font visitors see on Apple devices.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('faktorio-fe/public/social')
const iconDir = path.resolve('faktorio-fe/public/icons')

const images = [
  // Open Graph (Facebook, LinkedIn, Slack, WhatsApp, …): 1.91:1
  // JPEG fallback for crawlers that ignore WebP (reported for LinkedIn)
  { name: 'og-image', width: 1200, height: 630, formats: ['webp', 'jpeg'] },
  // X summary_large_image card: 2:1
  { name: 'twitter-card', width: 1200, height: 600, formats: ['webp'] },
  // PWA / notification icons: logo only, inside the maskable safe zone (central 80 % circle)
  { name: 'icon-192', width: 192, height: 192, formats: ['png'], icon: true },
  { name: 'icon-512', width: 512, height: 512, formats: ['png'], icon: true }
] as const

const browser = await chromium.launch()
const page = await browser.newPage()
fs.mkdirSync(outDir, { recursive: true })

for (const image of images) {
  const icon = 'icon' in image && image.icon
  const encoded = await page.evaluate(
    ({ width, height, formats, icon }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      // Brand background (--background in the dark theme) with a soft glow behind the logo
      ctx.fillStyle = '#020817'
      ctx.fillRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        0,
        width / 2,
        height * 0.4,
        height * 0.75
      )
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // Logo and name, centered so square crops still keep them
      const logoSize = icon ? width * 0.5 : 220
      const nameSize = 128
      const gap = 36
      const capHeight = nameSize * 0.72
      const logoTop = icon
        ? (height - logoSize) / 2
        : (height - (logoSize + gap + capHeight)) / 2

      // The Faktorio mountain mark (same path as MountainIcon)
      const scale = logoSize / 24
      ctx.save()
      ctx.translate(width / 2 - logoSize / 2, logoTop)
      ctx.scale(scale, scale)
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke(new Path2D('m8 3 4 8 5-5 5 15H2L8 3z'))
      ctx.restore()

      if (icon) {
        return formats.map((format) => canvas.toDataURL(`image/${format}`))
      }

      // Name styled like the landing page h1 in dark mode: Tailwind font-sans, bold,
      // tracking-tighter and a gray-100 → gray-400 gradient. font-sans is the system UI
      // font, so the result matches what the landing page shows on the machine that runs this.
      ctx.font = `700 ${nameSize}px ui-sans-serif, system-ui, sans-serif`
      ctx.letterSpacing = `${-0.05 * nameSize}px`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      const nameWidth = ctx.measureText('Faktorio').width
      const baseline = logoTop + logoSize + gap + capHeight
      const nameFill = ctx.createLinearGradient(
        width / 2 - nameWidth / 2,
        0,
        width / 2 + nameWidth / 2,
        0
      )
      nameFill.addColorStop(0, '#f3f4f6')
      nameFill.addColorStop(1, '#9ca3af')
      ctx.fillStyle = nameFill
      ctx.fillText('Faktorio', width / 2, baseline)

      return formats.map((format) => canvas.toDataURL(`image/${format}`, 0.92))
    },
    {
      width: image.width,
      height: image.height,
      formats: [...image.formats],
      icon
    }
  )

  image.formats.forEach((format, i) => {
    const extension = format === 'jpeg' ? 'jpg' : format
    const dir = icon ? iconDir : outDir
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${image.name}.${extension}`)
    fs.writeFileSync(file, Buffer.from(encoded[i].split(',')[1], 'base64'))
    console.log(
      `${path.relative(process.cwd(), file)} ${image.width}x${image.height}`
    )
  })
}

await browser.close()
