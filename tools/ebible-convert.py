"""Convert reviewed eBible USFX archives to optional KOGG text packs.

Usage: python tools/ebible-convert.py work/ebible
Download each manifest source with curl first. No runtime dependency is added.
Verse IDs, not encounter order, determine positions; absent verses stay empty.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CODES = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
SKIP = {'id', 'h', 'toc', 'cl', 's', 'f', 'fm', 'x', 'rem', 'periph'}
INLINE = {'nd', 'wj', 'w', 'it', 'tl', 'qs', 'add', 'bd', 'bdit', 'em', 'sc', 'sup'}
BLOCK = {'book', 'p', 'q', 'b', 'd', 'table', 'tr', 'tc'}


def convert_book(node):
    chapters, chapter, verse, parts, seen = [], None, None, [], []

    def finish():
        nonlocal verse, parts
        if verse is not None:
            text = re.sub(r'\s+', ' ', ''.join(parts)).strip()
            # Some sources explicitly encode omitted verses as empty milestones.
            # Preserve the empty slot, never shift the next verse into its place.
            chapter[verse - 1] = text
        verse, parts = None, []

    def walk(el):
        nonlocal chapter, verse
        tag = el.tag
        # Psalm superscriptions are unnumbered; Habakkuk 3:1 is a numbered d.
        if tag == 'd' and el.find('.//v') is None:
            return
        if tag in SKIP or (tag == 'p' and el.get('sfm', '').startswith(('mt', 'i'))):
            return
        if tag == 'c':
            finish()
            if el.get('id') != str(len(chapters) + 1):
                raise ValueError('Nonsequential chapter: ' + str(el.attrib))
            chapter = []
            chapters.append(chapter)
            return
        if tag == 'v':
            finish()
            raw = el.get('id', '')
            if not re.fullmatch(r'[1-9][0-9]*', raw) or chapter is None:
                raise ValueError('Unsupported verse milestone: ' + str(el.attrib))
            verse = int(raw)
            seen.append((len(chapters), verse))
            if verse <= len(chapter):
                raise ValueError('Duplicate/out-of-order verse: ' + raw)
            chapter.extend([''] * (verse - len(chapter)))
            return
        if tag == 've':
            finish()
            return
        if tag not in INLINE | BLOCK:
            raise ValueError('Unreviewed USFX tag: ' + tag)
        if verse is not None and tag in BLOCK:
            parts.append(' ')
        if verse is not None and el.text:
            parts.append(el.text)
        for child in el:
            walk(child)
            if verse is not None and child.tail:
                parts.append(child.tail)
        if verse is not None and tag in BLOCK:
            parts.append(' ')

    walk(node)
    finish()
    if len(seen) != len(node.findall('.//v')):
        raise ValueError('A verse milestone was hidden inside excluded content')
    return chapters


def build(directory):
    manifest = json.loads((ROOT / 'tools/ebible-sources.json').read_text(encoding='utf-8'))
    canonical = json.loads((ROOT / 'data/kjv.json').read_text(encoding='utf-8'))['books']
    receipts = []
    for source in manifest:
        archive = directory / (source['id'] + '_usfx.zip')
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        if digest != source['archiveSha256']:
            raise ValueError('Source changed; review its text and licence before updating: ' + source['id'])
        with zipfile.ZipFile(archive) as z:
            xml_names = [n for n in z.namelist() if n.lower().endswith('_usfx.xml')]
            if len(xml_names) != 1:
                raise ValueError('Expected one USFX file')
            root = ET.fromstring(z.read(xml_names[0]))
        nodes = root.findall('book')
        if [b.get('id') for b in nodes] != CODES:
            raise ValueError('Expected 66 canonical books in order')
        books = []
        for node, base in zip(nodes, canonical):
            chapters = convert_book(node)
            if len(chapters) != len(base['chapters']) or any(not any(c) for c in chapters):
                raise ValueError('Incomplete chapters in ' + base['name'])
            books.append({'name': base['name'], 'chapters': chapters})
        metadata = {k: v for k, v in source.items() if k not in {'file', 'archiveSha256'}}
        metadata['sourceArchiveSha256'] = digest
        result = {'translation': source['short'], 'metadata': metadata, 'books': books}
        out = ROOT / source['file']
        out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
        receipt = {'id': source['id'], 'file': source['file'], 'bytes': out.stat().st_size,
                   'books': len(books), 'chapters': sum(len(b['chapters']) for b in books),
                   'verses': sum(bool(v) for b in books for c in b['chapters'] for v in c),
                   'absentVerses': [f'{b["name"]} {ci+1}:{vi+1}' for b in books for ci, c in enumerate(b['chapters']) for vi, v in enumerate(c) if not v],
                   'archiveSha256': digest, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest()}
        receipts.append(receipt)
        print(source['id'], receipt['bytes'], 'bytes;', receipt['verses'], 'verses;', len(receipt['absentVerses']), 'numbering gaps')
    (ROOT / 'docs/ebible-import-receipts.json').write_text(json.dumps(receipts, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    build(parser.parse_args().directory)
