"""Reproduce the Base Ibibio pack from the pinned official Biblica USX archive.
Usage: python tools/ibibio-convert.py work/ibibio/ibibio-usx.zip
Standard library only. Unknown structures fail closed for editorial review.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import sys
import xml.etree.ElementTree as ET
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('usfx', ROOT / 'tools/ebible-convert.py')
usfx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(usfx)
PARAGRAPHS = set('p m pc q1 q2 q3 qr qc qm1 qm2 li1 li2 li3 li4 lh lf pmo pm pi1 nb pr po mi pmc b'.split())
HEADINGS = set('rem h toc1 toc2 toc3 mt1 s s1 s2 cl ms ms1 mr qa sp iex'.split())
INLINE = set('nd wj tl sc it add'.split())


def convert_usx(root, code):
    def adapt(el):
        if el.tag == 'usx':
            out = ET.Element('book', {'id': code})
        elif el.tag == 'book':
            if el.get('code') != code:
                raise ValueError('Wrong source book code')
            return None
        elif el.tag == 'chapter':
            return None if el.get('eid') else ET.Element('c', {'id': el.get('number', '')})
        elif el.tag == 'verse':
            return ET.Element('ve') if el.get('eid') else ET.Element('v', {'id': el.get('number', '')})
        elif el.tag == 'note' and el.get('style') in {'f', 'fe'}:
            if el.find('.//verse') is not None:
                raise ValueError('Numbered scripture in a note needs review')
            return None
        elif el.tag == 'para':
            style = el.get('style')
            # Preserve numbered Habakkuk headings and verse continuations;
            # omit unnumbered Psalm superscriptions and editorial headings.
            if style in HEADINGS or (style == 'd' and not el.get('vid') and el.find('.//verse') is None):
                if el.find('.//verse') is not None:
                    raise ValueError('Numbered scripture in a heading needs review')
                return None
            if style not in PARAGRAPHS | {'d'}:
                raise ValueError('Unreviewed paragraph style: ' + str(style))
            out = ET.Element('q' if style.startswith('q') else 'p')
        elif el.tag == 'char' and el.get('style') in INLINE:
            out = ET.Element(el.get('style'))
        elif el.tag == 'char' and el.get('style') == 'fm':
            return None
        else:
            raise ValueError('Unreviewed USX structure: ' + el.tag)
        out.text = el.text
        for child in el:
            converted = adapt(child)
            if converted is not None:
                converted.tail = child.tail
                out.append(converted)
            elif child.tail:
                # Footnote text is excluded; words after the note must survive.
                if len(out):
                    out[-1].tail = (out[-1].tail or '') + child.tail
                else:
                    out.text = (out.text or '') + child.tail
        return out
    converted = adapt(root)
    if len(converted.findall('.//v')) != sum(e.get('number') is not None for e in root.iter('verse')):
        raise ValueError('Verse lost during conversion')
    return usfx.convert_book(converted)


def build(archive):
    source = json.loads((ROOT / 'tools/ibibio-source.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != source['archiveSha256']:
        raise ValueError('Source changed; review text and licence before updating the hash')
    canonical = json.loads((ROOT / 'data/kjv.json').read_text(encoding='utf-8'))['books']
    books = []
    with zipfile.ZipFile(archive) as z:
        names = {Path(n).stem: n for n in z.namelist() if n.endswith('.usx')}
        if set(names) != set(usfx.CODES):
            raise ValueError('Expected all 66 canonical books and no others')
        for code, base in zip(usfx.CODES, canonical):
            xml = ET.fromstring(z.read(names[code]))
            chapters = convert_usx(xml, code)
            if len(chapters) != len(base['chapters']) or any(not any(c) for c in chapters):
                raise ValueError('Incomplete chapters: ' + code)
            local_name = next(e.text for e in xml.findall('para') if e.get('style') == 'toc2')
            books.append({'name': base['name'], 'localName': local_name, 'chapters': chapters})
    metadata = {k: v for k, v in source.items() if k not in {'file', 'archiveSha256'}}
    metadata['sourceArchiveSha256'] = digest
    output = ROOT / source['file']
    output.write_text(json.dumps({'translation': source['short'], 'metadata': metadata, 'books': books}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    receipt = {'file': source['file'], 'source': source['source'], 'archiveSha256': digest,
               'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size,
               'books': len(books), 'chapters': sum(len(b['chapters']) for b in books),
               'verses': sum(bool(v) for b in books for c in b['chapters'] for v in c),
               'absentVerses': [f'{b["name"]} {ci+1}:{vi+1}' for b in books for ci,c in enumerate(b['chapters']) for vi,v in enumerate(c) if not v]}
    (ROOT / 'docs/ibibio-import-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    build(parser.parse_args().archive)
