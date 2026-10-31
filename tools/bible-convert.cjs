/* Converts a line-per-verse plain-text Bible (optionally with <br> markup) into
   the KOGG Bible JSON shape. Usage:
     node tools/bible-convert.cjs <input.txt> <output.json> "<Translation name>"
   Input lines are expected as "Book Chapter:Verse<space or tab>Text"; short
   non-matching header lines are ignored and reported. "Psalm" is normalised to
   the canonical "Psalms" name used by the bundled Bibles. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CANONICAL = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];
const ALIASES = new Map([['Psalm', 'Psalms']]);

const [, , input, output, translation] = process.argv;
if (!input || !output || !translation) {
  console.error('Usage: node tools/bible-convert.cjs <input.txt> <output.json> "<Translation name>"');
  process.exit(1);
}

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/);
const buckets = new Map(); // canonical name -> Map(chapter -> [verses])
const skipped = [];

for (const line of lines) {
  if (!line.trim()) continue;
  const m = /^(.+?)\s+(\d+):(\d+)\s*(.*)$/.exec(line);
  if (!m || !m[4].trim()) { skipped.push(line.trim()); continue; }
  const name = ALIASES.get(m[1]) || m[1];
  if (!CANONICAL.includes(name)) { skipped.push(line.trim()); continue; }
  const ch = +m[2];
  if (!ch) { skipped.push(line.trim()); continue; }
  const verses = buckets.get(name) || new Map();
  verses.set(ch, [...(verses.get(ch) || []), m[4].replace(/<br[^>]*>/gi, ' ').replace(/\s+/g, ' ').trim()]);
  buckets.set(name, verses);
}

if (skipped.length) console.log(`Skipped ${skipped.length} line(s):`, skipped.slice(0, 5).map(l => l.slice(0, 80)));

const missing = CANONICAL.filter(name => !buckets.get(name));
if (missing.length) throw new Error(`${input}: missing books: ${missing.join(', ')} — not a complete 66-book text`);

const data = {
  translation,
  books: CANONICAL.map(name => {
    const chapters = [...buckets.get(name)].sort((a, b) => a[0] - b[0]).map(([, verses]) => verses);
    for (const chapter of chapters) if (!chapter.length) throw new Error(`${input}: ${name} has an empty chapter`);
    for (const chapter of chapters) if (chapter.some(v => typeof v !== 'string' || !v.trim())) throw new Error(`${input}: ${name} has an empty verse text`);
    return { name, chapters };
  }),
};
for (const book of data.books) {
  const contiguous = book.chapters.every((_, i) => true) && book.chapters[book.chapters.length - 1];
  if (!contiguous) throw new Error(`${input}: ${book.name} chapter gap`);
}
for (let i = 0; i < data.books.length; i++) {
  const nums = [...buckets.get(data.books[i].name).keys()].sort((a, b) => a - b);
  if (nums.length !== data.books[i].chapters.length) throw new Error(`${input}: ${data.books[i].name} chapter gap`);
  if (!nums.every((n, i) => n === i + 1)) throw new Error(`${input}: ${data.books[i].name} chapter gap`);
}

fs.writeFileSync(path.resolve(output), JSON.stringify(data));
const total = data.books.reduce((n, b) => n + b.chapters.flat().length, 0);
console.log(`Wrote ${path.basename(output)}: ${data.books.length} books, ${total} verses.`);
