/**
 * M1 probe: content-addressed `self_ref` for L1 section items.
 *
 * The one piece of non-trivial logic in milestone 1 is the claim that a citation
 * survives a re-parse. It only survives if the id is derived from content that a
 * better parser would reproduce, and NOT from anything a re-parse legitimately
 * changes: page numbers shift when a page is inserted, sibling ordinals shift
 * when a missed heading is recovered, and whitespace/ligature handling differs
 * between extractors.
 *
 * So the id is sha256 over (heading path + normalized title), and explicitly not
 * over page, bbox or ordinal. Those live in `prov`, which is allowed to move.
 *
 * Run: node spikes/docmodel/selfref.mjs
 */
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

/**
 * Normalize a heading for hashing. Deliberately aggressive: two extractors of
 * the same page must agree. Folds the ligatures and dash variants that pdf.js
 * and OCR disagree on, collapses whitespace, drops a leading section number
 * (a renumbered document is still the same section), and case-folds.
 */
export function normalizeTitle(raw) {
  return raw
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/^\s*\d+(\.\d+)*\.?\s*/, '') // leading "19.1 " section number
    // Every dash variant AND whitespace collapse to one space. Hyphen-vs-space is
    // not a distinction two extractors preserve: pdf.js and OCR disagree about the
    // hyphen at a line break, and a dash between words carries no identity.
    .replace(/[\s\u2010-\u2015-]+/g, ' ')
    .trim()
    .toLowerCase()
}

/** self_ref for a section: hash of its normalized heading path, ancestors first. */
export function selfRef(headingPath) {
  const key = headingPath.map(normalizeTitle).join('\u0000')
  return `#/sections/${createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 16)}`
}

// ── checks ────────────────────────────────────────────────────────────────────

// 1. Stable across the extraction differences we expect between parsers:
//    ligature/NFKC form, dash variant, curly quote, doubled spaces, case.
const a = selfRef(['Replication', '19.1 Topology comparison'])
const b = selfRef(['replication', '19.1  Topology\u2013comparison'])
assert.equal(a, b, 'self_ref must survive whitespace/dash/case extraction differences')

// 2. Stable when the document is renumbered (a chapter inserted before it).
assert.equal(
  selfRef(['Replication', '19.1 Topology comparison']),
  selfRef(['Replication', '20.1 Topology comparison']),
  'self_ref must not depend on the section number',
)

// 3. Distinct for the same title under a different parent — the case that makes
//    a flat title hash wrong. "Introduction" appears in every chapter.
assert.notEqual(
  selfRef(['Replication', 'Introduction']),
  selfRef(['Partitioning', 'Introduction']),
  'self_ref must be scoped by heading path',
)

// 4. Distinct for genuinely different sections.
assert.notEqual(
  selfRef(['Replication', '19.1 Topology comparison']),
  selfRef(['Replication', '19.2 Write conflicts']),
  'different sections must get different refs',
)

// 5. Page number is not an input: the same section on a different page is the
//    same section. This is the property the whole citation claim rests on.
const before = { ref: selfRef(['Replication', '19.1 Topology comparison']), prov: { page_no: 28 } }
const after = { ref: selfRef(['Replication', '19.1 Topology comparison']), prov: { page_no: 31 } }
assert.equal(before.ref, after.ref, 'a repaginated section keeps its ref')
assert.notEqual(before.prov.page_no, after.prov.page_no, 'prov is what moves')

console.log('ok — self_ref is stable across re-parse, scoped by path, page-independent')
console.log(`  §19.1 → ${a}`)
