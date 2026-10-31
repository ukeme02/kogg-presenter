/* KOGG Presenter — live licensed scripture providers.
   Two sources, both official and free for non-commercial (church) use:
     • "nlt:<ab>"   → Tyndale's own NLT API (api.nlt.to). Works anonymously: up to 50
                      verses per request, 500 requests per day, non-commercial.
     • "api:<ab>"   → API.Bible (American Bible Society, rest.api.bible). Needs the
                      operator's own API key entered in Tools → Licensed versions.
                      Starter plan: any three licensed translations, 5,000 calls a month.
   Nothing is downloaded to disk and nothing is hosted here: a connected version
   streams the passages you present, chapter by chapter, into session memory.
   True offline independence stays with the bundled and downloaded public-domain Bibles. */
(function (global) {
  'use strict';

  /* Canonical 66 books — names as the app's other bibles spell them. USFM codes and
     standard chapter counts keep the Books/Chapters docks working without network calls. */
  const NAMES = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
    'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
    'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
    '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
    '3 John', 'Jude', 'Revelation'];
  const USFM = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH',
    'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL',
    'AMO', 'OBA', 'JON', 'MIC', 'NAH', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT',
    'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
    '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'];
  const CHAPTERS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66,
    52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6,
    4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];

  let config = { fetchImpl: null, getSettings: () => ({}), saveSettings: () => {} };
  function configure(options) { config = Object.assign(config, options || {}); }

  /* ---- value vocabulary shared with the translation selector ---- */
  function providerOf(value) {
    if (typeof value !== 'string') return null;
    if (value.startsWith('nlt:')) return { kind: 'nlt', abbr: value.slice(4) };
    if (value.startsWith('api:')) return { kind: 'api-bible', abbr: value.slice(4) };
    return null;
  }

  const skeletons = new Map();   // "api:NIV" -> bible skeleton (session memory only)
  function skeleton(value) {
    const provider = providerOf(value);
    if (!provider) return null;
    const cached = skeletons.get(value);
    if (cached) return cached;
    const bible = {
      translation: provider.abbr,
      provider: provider.kind,
      connected: true,
      books: NAMES.map((name, i) => ({
        name,
        chapters: Array.from({ length: CHAPTERS[i] }, () => []),   // [] = not fetched yet
      })),
    };
    skeletons.set(value, bible);
    return bible;
  }

  /* ---- NLT.TO parsing ---- */
  const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
  function decodeEntities(text) {
    return text.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, entity => ENTITIES[entity] || entity);
  }
  /* NLT note/vn markup nests (tn > tn-ref), so a lazy tag strip would orphan the
     outer text. This walks spans with matching depth and removes whole subtrees. */
  function stripSpanClass(html, cls) {
    const open = new RegExp('<span\\b[^>]*\\bclass=(?:"' + cls + '"|\'' + cls + "'|" + cls + '(?=[\\s>]))[^>]*>', 'gi');
    const tags = /<span\b[^>]*>|<\/span\s*>/gi;
    let out = html;
    let match;
    while ((match = open.exec(out))) {
      const start = match.index;
      let depth = 1, end = out.length;
      tags.lastIndex = match.index + match[0].length;
      let tag;
      while ((tag = tags.exec(out))) {
        if (tag[0][1] === '/') { if (!--depth) { end = tags.lastIndex; break; } }
        else depth++;
      }
      if (end >= out.length) break;   // malformed page: never loop forever
      out = out.slice(0, start) + out.slice(end);
      open.lastIndex = start;
    }
    return out;
  }
  function cleanNltFragment(fragment) {
    let html = String(fragment || '')
      .replace(/<a\s[^>]*class="?a-tn\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
    for (const cls of ['tn', 'tn-ref', 'vn']) html = stripSpanClass(html, cls);
    return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  }
  function parseNltHtml(html) {
    const verses = [];
    const re = /<verse_export\b[^>]*\bvn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/g;
    let match;
    while ((match = re.exec(html))) verses.push(cleanNltFragment(match[2]));
    return verses;
  }
  /* One request carries at most 50 verses, so long chapters use consecutive ranges. */
  function nltRef(name, ch, vFrom, vTo) {
    return `${name} ${ch}:${vFrom === vTo ? vTo : `${vFrom}-${vTo}`}`;
  }
  function nltRefRanges(bookIdx, ch, vFrom, vTo) {
    const name = NAMES[bookIdx];
    if (!name) throw new Error('Unknown connected book');
    const first = Math.max(1, vFrom || 1);
    const last = vTo ? Math.max(first, vTo) : first;
    const ranges = [];
    for (let low = first; low <= last; low += 50) {
      const high = Math.min(last, low + 49);
      ranges.push(nltRef(name, ch, low, high));
    }
    return ranges;
  }

  /* ---- API.Bible parsing: content items carry verse markup as nested JSON ---- */
  function parseApiChapter(data) {
    if (!data || !Array.isArray(data.content)) throw new Error('Unexpected API.Bible reply');
    const flatten = nodes => nodes.flatMap(node => {
      if (node == null) return [];
      if (typeof node === 'string') return [node];
      if (typeof node === 'object' && typeof node.text === 'string') return [node.text.trim()];
      if (Array.isArray(node.content)) return flatten(node.content);
      return [];
    });
    const verses = [];
    for (const node of data.content) {
      if (node && node.type === 'verse') verses.push(flatten([node]).join('').replace(/\s+/g, ' ').trim());
    }
    if (!verses.length) throw new Error('API.Bible returned no verses for this chapter');
    return verses;
  }

  /* ---- network access ---- */
  let bibleIdCache = {};   // abbreviation -> bibleId, resolved once per page life
  async function resolveApiBibleId(abbr, headers) {
    if (bibleIdCache[abbr]) return bibleIdCache[abbr];
    const res = await config.fetchImpl('https://rest.api.bible/v1/bibles', { headers });
    if (!res.ok) throw new Error('API.Bible list failed (' + res.status + ')');
    const list = (await res.json()).data || [];
    const upper = abbr.toUpperCase();
    const hit = list.find(b => /^([A-Z0-9]+)/.test(String(b.abbreviation)) && RegExp.$1 === upper && b.language?.id === 'eng')
      || list.find(b => String(b.abbreviation).toUpperCase() === upper);
    if (!hit) throw new Error(upper + ' is not available for this API key');
    bibleIdCache[abbr] = hit.id;
    return hit.id;
  }

  const pending = new Map();   // "value|bi|ch" -> in-flight promise, so parallel callers wait once
  function ensureChapter(bible, bookIdx, ch) {
    const book = bible.books[bookIdx];
    if (!book) return Promise.resolve(false);
    if ((book.chapters[ch - 1] || []).length) return Promise.resolve(true);
    const key = `${bible.provider}:${bible.translation}|${bookIdx}|${ch}`;
    if (pending.has(key)) return pending.get(key);
    const task = fetchChapter(bible, bookIdx, ch)
      .then(verses => {
        if (!verses || !verses.length) throw new Error('No verse text came back');
        book.chapters[ch - 1] = verses.map(v => String(v));
        if (pending.get(key) === task) pending.delete(key);   // success leaves no stale entry
        return true;
      })
      .catch(err => { pending.delete(key); throw err; });
    pending.set(key, task);
    return task;
  }

  async function fetchChapter(bible, bookIdx, ch) {
    if (!config.fetchImpl) throw new Error('Connected versions are unavailable in this build');
    if (bible.provider === 'nlt') {
      const settings = config.getSettings() || {};
      const key = settings.nltKey || 'TEST';
      const name = NAMES[bookIdx];
      if (!name) throw new Error('Unknown connected book');
      const out = [];
      let low = 1;
      for (;;) {
        // verse counts are unknown locally, so walk 50-verse windows until the API runs dry
        const url = 'https://api.nlt.to/api/passages?ref='
          + encodeURIComponent(nltRef(name, ch, low, low + 49))
          + '&version=NLT&key=' + encodeURIComponent(key);
        const res = await config.fetchImpl(url);
        if (!res.ok) {
          if (out.length && low > 1) break;   // window beyond the chapter's end
          throw new Error('NLT is unreachable (' + res.status + '). Try again while online.');
        }
        const verses = parseNltHtml(await res.text());
        if (!verses.length) {
          if (out.length) break;
          throw new Error('NLT returned no verses for this chapter');
        }
        out.push(...verses);
        if (verses.length < 50) break;
        if ((low += 50) > 250) break;   // Psalm 119 (176 verses) is the longest chapter
      }
      return out;
    }
    // API.Bible: chapter ids are plain BOOKID.n (JHN.3)
    const settings = config.getSettings() || {};
    const apiKey = settings.apiBibleKey;
    if (!String(apiKey || '').trim()) throw new Error('No API.Bible key yet — Tools → Licensed versions');
    const headers = { 'api-key': String(apiKey).trim() };
    const id = await resolveApiBibleId(bible.translation, headers);
    const url = `https://rest.api.bible/v1/bibles/${id}/chapters/${USFM[bookIdx]}.${ch}?content-type=json`;
    const res = await config.fetchImpl(url, { headers });
    if (res.status === 403) throw new Error(`This key is not licensed for ${bible.translation} — choose up to three versions in the API.Bible dashboard`);
    if (!res.ok) throw new Error('API.Bible failed (' + res.status + ')');
    return parseApiChapter(await res.json());
  }

  global.KOGGBibles = {
    NAMES, USFM, CHAPTERS,
    configure, providerOf, skeleton, ensureChapter,
    parseNltHtml, parseApiChapter, nltRefRanges, cleanNltFragment,
    _skeletons: skeletons,
  };
})(typeof window !== 'undefined' ? window : globalThis);
