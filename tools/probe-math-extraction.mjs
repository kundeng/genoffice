#!/usr/bin/env node
/**
 * Measure what the product's PDF text layer recovers from a math-heavy document.
 *
 * Reads through the same pdfjs-dist path apps/pdf uses, so the numbers describe
 * the shipped behavior rather than a separate tool's. Reports mathematical glyph
 * recovery (did the symbols survive) alongside structural markers (did the layout
 * survive) — the two fail independently, and the second is the one that bites.
 *
 * Usage:
 *   env -u ELECTRON_RUN_AS_NODE node tools/probe-math-extraction.mjs <pdf> [first] [last]
 *
 * ELECTRON_RUN_AS_NODE must be unset: with it set, the electron binary runs as
 * plain node and unrelated tooling in this repo misbehaves. See
 * docs/research/2026-09-13-codebase-walk.md §1.1.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const MATH_GLYPHS = '⊗∑∏∫√±×÷≤≥≠≈∈∉⊂⊆∪∩∀∃∂∇αβγδελμσθπφψωΛΜΣΩ′″†‡∞↦→⇒'

const [, , pdfPath, firstArg, lastArg] = process.argv
if (!pdfPath) {
  console.error('usage: probe-math-extraction.mjs <pdf> [first-page] [last-page]')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const pdfjs = resolve(here, '../node_modules/pdfjs-dist/legacy/build/pdf.mjs')
const { getDocument } = await import(pdfjs)

// Empty password covers the common "restricted permissions, no user password"
// case (e.g. /P -3388: extraction allowed, modification denied).
const doc = await getDocument({ url: pdfPath, password: '' }).promise

const first = Number(firstArg) || 1
const last = Math.min(Number(lastArg) || doc.numPages, doc.numPages)

let text = ''
for (let p = first; p <= last; p++) {
  const page = await doc.getPage(p)
  const content = await page.getTextContent()
  text += content.items.map((i) => i.str).join('')
}

const chars = [...text]
const glyphs = new Map()
for (const c of chars) if (MATH_GLYPHS.includes(c)) glyphs.set(c, (glyphs.get(c) ?? 0) + 1)

const occurrences = [...glyphs.values()].reduce((a, b) => a + b, 0)
const ranked = [...glyphs.entries()].sort((a, b) => b[1] - a[1])

console.log(`document       ${pdfPath}`)
console.log(`pages          ${first}-${last} of ${doc.numPages}`)
console.log(`characters     ${chars.length}`)
console.log('')
console.log('-- symbol recovery --')
console.log(`distinct math glyphs   ${glyphs.size}`)
console.log(`total occurrences      ${occurrences}`)
console.log(
  `replacement chars      ${(text.match(/�/g) ?? []).length}  (U+FFFD; >0 means decoding failed)`,
)
console.log(`by glyph               ${ranked.map(([g, n]) => `${g}:${n}`).join(' ')}`)
console.log('')
console.log('-- structure recovery --')
console.log(
  `newlines               ${(text.match(/\n/g) ?? []).length}  (0 means no line structure at all)`,
)
console.log(
  `space ratio            ${((text.match(/ /g) ?? []).length / chars.length || 0).toFixed(3)}`,
)
// Words fused across a layout boundary: lowercase immediately followed by uppercase.
// A high count means line/column breaks are being dropped rather than spaced.
console.log(
  `fused word joins       ${(text.match(/[a-z][A-Z]/g) ?? []).length}  (e.g. "vecoperator", "theMoore-Penrose")`,
)
