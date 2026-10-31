/* Tests for js/bible-providers.js — live licensed Bibles (NLT + API.Bible). */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bible-providers.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(src, sandbox);
const P = sandbox.KOGGBibles;

const NLT_SAMPLE = [
  '<style>body{}</style><div class="passage">',
  '<verse_export orig="john_3_16" bk="john" ch="3" vn="16"><span class="vn">16</span><span class="red">',
  'For God loved the world in this way: He gave',
  '<a class="a-tn" href="#tn">*</a><span class="tn"><span class="tn-ref">3:16</span> Or <em>For God loved the world so much that he gave.</em></span>',
  ' his one and only Son, so that everyone who believes in him will not perish',
  ' but have eternal life.</span></verse_export>',
  '<verse_export vn="17"><span class="vn">17</span>For God did not send his Son into the world to condemn',
  ' the world, but to save the world through him.</verse_export>',
].join('');

function makeNltChapter(verseCount) {
  return Array.from({ length: verseCount }, (_, i) =>
    `<verse_export vn="${i + 1}"><span class="vn">${i + 1}</span> Verse ${i + 1} text.</verse_export>`).join('');
}

test('book tables: 66 books, matching codes and chapter counts', () => {
  assert.equal(P.NAMES.length, 66);
  assert.equal(P.USFM.length, 66);
  assert.equal(P.CHAPTERS.length, 66);
  const total = P.CHAPTERS.reduce((a, b) => a + b, 0);
  assert.equal(total, 1189);
  assert.equal(P.NAMES[18], 'Psalms');
  assert.equal(P.CHAPTERS[18], 150);
  assert.equal(P.USFM[42], 'JHN');
  assert.equal(P.CHAPTERS[42], 21);
});

test('providerOf recognises nlt: and api: values only', () => {
  assert.deepEqual(P.providerOf('nlt:NLT'), { kind: 'nlt', abbr: 'NLT' });
  assert.deepEqual(P.providerOf('api:NIV'), { kind: 'api-bible', abbr: 'NIV' });
  assert.equal(P.providerOf('kjv'), null);
  assert.equal(P.providerOf('idb:MyBible'), null);
  assert.equal(P.providerOf(5), null);
});

test('skeleton: 66 books with right chapter arity, cached per value', () => {
  const b1 = P.skeleton('api:NIV');
  const b2 = P.skeleton('api:NIV');
  assert.equal(b1, b2);
  assert.equal(b1.translation, 'NIV');
  assert.equal(b1.provider, 'api-bible');
  assert.equal(b1.connected, true);
  assert.equal(b1.books.length, 66);
  assert.equal(b1.books[18].chapters.length, 150);
  assert.deepEqual(b1.books[18].chapters[2], []);   // unfetched
  const nlt = P.skeleton('nlt:NLT');
  assert.equal(nlt.provider, 'nlt');
});

test('cleanNltFragment strips nested footnotes, refs and verse numbers', () => {
  const verses = P.parseNltHtml(NLT_SAMPLE);
  assert.equal(verses.length, 2);
  assert.equal(verses[0], 'For God loved the world in this way: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.');
  assert.ok(!/Or\b/.test(verses[0]), 'footnote wording must not leak into the verse');
  assert.ok(!/3:16|16\b/.test(verses[0].trim().split(' ')[0]), 'verse number must be stripped');
  assert.equal(verses[1], 'For God did not send his Son into the world to condemn the world, but to save the world through him.');
  assert.equal(P.parseNltHtml('<verse_export vn="1"><span class="tn">note never closed</span').length, 0, 'unterminated span must still parse without hanging');
});

test('nltRefRanges: chunks big ranges into consecutive 50s', () => {
  const r = P.nltRefRanges(18, 119, 1, 176);   // Psalm 119
  assert.deepEqual(r, ['Psalms 119:1-50', 'Psalms 119:51-100', 'Psalms 119:101-150', 'Psalms 119:151-176']);
  const single = P.nltRefRanges(42, 3, 16, 16);
  assert.deepEqual(single, ['John 3:16']);
  const small = P.nltRefRanges(42, 3, 16, 18);
  assert.deepEqual(small, ['John 3:16-18']);
  assert.throws(() => P.nltRefRanges(999, 1, 1, 2), /Unknown connected book/);
});

test('parseApiChapter flattens nested content JSON in verse order', () => {
  const data = {
    content: [
      { type: 'section', content: [{ type: 'header', content: ['John 3'] }] },
      { type: 'verse', number: '16', content: ['For God so loved ', { text: 'the world,', attribute: { style: 'x' } }, ' that he gave…'] },
      { type: 'verse', number: '17', content: [{ text: 'For God did not send', content: [] }] },
    ],
  };
  const verses = P.parseApiChapter(data);
  assert.deepEqual(verses, ['For God so loved the world, that he gave…', 'For God did not send']);
  assert.throws(() => P.parseApiChapter({}), /Unexpected API\.Bible reply/);
  assert.throws(() => P.parseApiChapter({ content: [{ type: 'header', content: ['untitled'] }] }), /no verses/);
});

function setupProviders(fetchLog) {
  const settings = {};
  P.configure({
    fetchImpl: url => { fetchLog.push(url); return fetchLog._responder(url); },
    getSettings: () => settings,
    saveSettings: () => {},
  });
  return settings;
}
function freshSkeleton(value) {
  P._skeletons.delete(value);
  return P.skeleton(value);
}

test('ensureChapter (NLT): fetches whole chapter, caches in session memory', async () => {
  const log = []; const settings = setupProviders(log);
  const bible = freshSkeleton('nlt:NLT');
  log._responder = url => Promise.resolve({ ok: true, status: 200, text: async () => makeNltChapter(36) });
  const ok = await P.ensureChapter(bible, 42, 3);
  assert.equal(ok, true);
  assert.deepEqual(bible.books[42].chapters[2], Array.from({ length: 36 }, (_, i) => `Verse ${i + 1} text.`));
  const callsAfterFirst = log.length;
  await P.ensureChapter(bible, 42, 3);   // cached — no second network call
  assert.equal(log.length, callsAfterFirst);
  log._responder = () => { throw new Error('should not refetch'); };
  await P.ensureChapter(bible, 42, 3);
  assert.equal(settings.nltKey, undefined);   // anonymous default key, nothing saved back
});

test('ensureChapter (NLT): parallel callers share one in-flight promise', async () => {
  const log = []; setupProviders(log);
  const bible = freshSkeleton('nlt:NLT');
  let resolveFetch;
  log._responder = () => new Promise(res => { resolveFetch = () => res({ ok: true, status: 200, text: async () => makeNltChapter(5) }); });
  const [a, b] = [P.ensureChapter(bible, 42, 3), P.ensureChapter(bible, 42, 3)];
  resolveFetch();
  assert.equal(await a, true);
  assert.equal(await b, true);
  assert.equal(log.length, 1);
});

test('ensureChapter (NLT): windows walk past chapters longer than 50 verses', async () => {
  const log = []; setupProviders(log);
  const bible = freshSkeleton('nlt:NLT');   // Psalms = book 18
  log._responder = url => {
    const m = /ref=([^&]+)/.exec(url)[1];
    const low = Number(/:(\d+)-/.exec(decodeURIComponent(m))[1]);
    const high = Math.min(176, low + 49);
    return Promise.resolve({ ok: true, status: 200, text: async () => makeNltChapter(high - low + 1) });
  };
  await P.ensureChapter(bible, 18, 119);
  assert.equal(bible.books[18].chapters[118].length, 176);
  assert.ok(log.length === 4, `expected 4 windows, got ${log.length}`);
});

test('ensureChapter (NLT): unreachable surfaces the provider error', async () => {
  const log = []; setupProviders(log);
  const bible = freshSkeleton('nlt:NLT');
  log._responder = () => Promise.resolve({ ok: false, status: 503, text: async () => '' });
  await assert.rejects(P.ensureChapter(bible, 42, 3), /NLT is unreachable/);
  assert.deepEqual(bible.books[42].chapters[2], []);   // stays unfetched
});

test('ensureChapter (API.Bible): needs key, resolves bibleId once, parses chapter', async () => {
  const log = []; const settings = setupProviders(log);
  const bible = P.skeleton('api:NIV');
  await assert.rejects(P.ensureChapter(bible, 42, 3), /No API\.Bible key yet/);
  settings.apiBibleKey = '  secret-key  ';
  log._responder = url => {
    if (/\/v1\/bibles$/.test(url)) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({
        data: [{ id: 'de4e12af7f28e595-01', abbreviation: 'KJV', language: { id: 'eng' } }, { id: '9879dbb7ccc39b6d-01', abbreviation: 'NIV', language: { id: 'eng' } }],
      }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({
      content: [{ type: 'verse', number: '16', content: ['For God so loved the world that he gave his one and only Son…'] }],
    }) });
  };
  await P.ensureChapter(bible, 42, 3);
  assert.deepEqual(bible.books[42].chapters[2], ['For God so loved the world that he gave his one and only Son…']);
  assert.equal(log.length, 2);   // list + chapter
  const chapterUrl = log[1];
  assert.ok(/9879dbb7ccc39b6d-01\/chapters\/JHN\.3\?content-type=json/.test(chapterUrl), chapterUrl);
  await P.ensureChapter(P.skeleton('api:NIV'), 42, 4);   // bibleId now cached
  assert.equal(log.length, 3);
  assert.ok(/JHN\.4/.test(log[2]));
});

test('ensureChapter (API.Bible): 403 explains the licensing cap', async () => {
  const log = []; const settings = setupProviders(log);
  settings.apiBibleKey = 'k'; settings.onlyOneVersion = true;
  const bible = P.skeleton('api:CSB');
  log._responder = url => url.endsWith('/v1/bibles')
    ? Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [{ id: 'x', abbreviation: 'CSB', language: { id: 'eng' } }] }) })
    : Promise.resolve({ ok: false, status: 403, text: async () => '', json: async () => ({}) });
  await assert.rejects(P.ensureChapter(bible, 42, 3), /not licensed for CSB/);
});
