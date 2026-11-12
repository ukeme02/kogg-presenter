"""Reproduce the optional Efik NT pack from the pinned official USX archive.
Usage: python tools/efik-convert.py work/efik/efik-usx.zip
Only the standard library is required; nothing is added to the browser runtime.
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
PARAGRAPHS = {'p', 'm', 'pc', 'q1', 'q2', 'li1', 'lh', 'lf', 'pmo', 'pm'}
HEADINGS = {'rem', 'h', 'toc1', 'toc2', 'toc3', 'mt1', 's', 's1'}


def convert_usx(root, code):
    """Translate known USX structures into the existing milestone converter."""
    def adapt(el):
        tag = el.tag
        if tag == 'usx':
            out = ET.Element('book', {'id': code})
        elif tag == 'book':
            if el.get('code') != code:
                raise ValueError('Wrong source book code')
            return None
        elif tag == 'chapter':
            if el.get('eid'):
                return None
            return ET.Element('c', {'id': el.get('number', '')})
        elif tag == 'verse':
            return ET.Element('ve') if el.get('eid') else ET.Element('v', {'id': el.get('number', '')})
        elif tag == 'para':
            style = el.get('style')
            if style in HEADINGS:
                if el.find('.//verse') is not None:
                    raise ValueError('Numbered scripture in a heading needs review')
                return None
            if style not in PARAGRAPHS:
                raise ValueError('Unreviewed paragraph style: ' + str(style))
            out = ET.Element('q' if style.startswith('q') else 'p')
        elif tag == 'char' and el.get('style') == 'sc':
            out = ET.Element('sc')
        else:
            raise ValueError('Unreviewed USX structure: ' + tag)
        out.text = el.text
        for child in el:
            converted = adapt(child)
            if converted is not None:
                converted.tail = child.tail
                out.append(converted)
        return out
    converted = adapt(root)
    if len(converted.findall('.//v')) != sum(e.get('number') is not None for e in root.iter('verse')):
        raise ValueError('Verse lost during conversion')
    return usfx.convert_book(converted)


def build(archive):
    source = json.loads((ROOT / 'tools/efik-source.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != source['archiveSha256']:
        raise ValueError('Source changed; review text and licence before updating the hash')
    canonical = json.loads((ROOT / 'data/kjv.json').read_text(encoding='utf-8'))['books']
    books = [{'name': b['name'], 'chapters': []} for b in canonical]
    with zipfile.ZipFile(archive) as z:
        names = {Path(n).stem: n for n in z.namelist() if n.endswith('.usx')}
        if set(names) != set(usfx.CODES[39:]):
            raise ValueError('Expected all 27 New Testament books and no others')
        for i in range(39, 66):
            xml = ET.fromstring(z.read(names[usfx.CODES[i]]))
            chapters = convert_usx(xml, usfx.CODES[i])
            if len(chapters) != len(canonical[i]['chapters']) or any(not any(c) for c in chapters):
                raise ValueError('Incomplete chapters: ' + usfx.CODES[i])
            books[i]['chapters'] = chapters
            books[i]['localName'] = next(e.text for e in xml.findall('para') if e.get('style') == 'toc2')
    metadata = {k: v for k, v in source.items() if k not in {'file', 'archiveSha256'}}
    metadata['sourceArchiveSha256'] = digest
    output = ROOT / source['file']
    output.write_text(json.dumps({'translation': 'ELNT', 'metadata': metadata, 'books': books}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    receipt = {'file': source['file'], 'source': source['source'], 'archiveSha256': digest,
               'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size,
               'scope': 'NT', 'populatedBooks': 27, 'chapters': sum(len(b['chapters']) for b in books),
               'verses': sum(bool(v) for b in books for c in b['chapters'] for v in c),
               'absentVerses': [f'{b["name"]} {ci+1}:{vi+1}' for b in books for ci,c in enumerate(b['chapters']) for vi,v in enumerate(c) if not v]}
    (ROOT / 'docs/efik-import-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    build(parser.parse_args().archive)
