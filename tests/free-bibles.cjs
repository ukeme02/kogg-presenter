const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');

// The three freely sourced additions must satisfy the same KOGG Bible shape as
// the bundled translations: 66 canonical books, non-empty chapters, no padding.
const NAMES = JSON.parse(fs.readFileSync('data/kjv.json', 'utf8')).books.map(b => b.name);

for (const [file, translation, wording] of [
  ['data/lsv.json', 'LSV', /loved/],
  ['data/bbe.json', 'BBE', /love/],
  ['data/erv.json', 'ERV', /loved/],
]) {
  test(`${translation} bundle is a complete 66-book KOGG Bible`, () => {
    const bible = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(bible.translation, translation);
    assert.equal(bible.books.length, 66);
    assert.deepEqual(bible.books.map(b => b.name), NAMES);
    for (const book of bible.books) {
      assert.ok(book.chapters.length > 0, `${book.name} has chapters`);
      for (const chapter of book.chapters) {
        assert.ok(chapter.length > 0, `${book.name} has verse text`);
        for (const verse of chapter) assert.ok(typeof verse === 'string' && verse.trim());
      }
    }
  });
  test(`${translation} John 3:16 contains the love wording`, () => {
    const bible = JSON.parse(fs.readFileSync(file, 'utf8'));
    const verse = bible.books.find(b => b.name === 'John').chapters[2][15];
    assert.match(verse, wording);
  });
}
test('content-catalog registers the free downloads and honest requested statuses', () => {
  const catalogue = JSON.parse(fs.readFileSync('data/content-catalog.json', 'utf8'));
  const files = catalogue.bibles.map(b => b.file);
  for (const file of ['data/lsv.json', 'data/bbe.json', 'data/erv.json']) assert.ok(files.includes(file), `${file} registered`);
  for (const requested of catalogue.requestedBibles) {
    assert.ok(typeof requested.status === 'string' && requested.status.length > 3, `${requested.name} has a status`);
  }
  assert.match(catalogue.requestedBibles.find(b => b.name === 'Efik').status, /scans/);
});
