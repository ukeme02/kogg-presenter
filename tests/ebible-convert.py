import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET
import sys

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location('converter', Path(__file__).resolve().parents[1] / 'tools/ebible-convert.py')
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)


class Conversion(unittest.TestCase):
    def parse(self, body):
        return converter.convert_book(ET.fromstring('<book id="GEN"><c id="1"/>' + body + '</book>'))

    def test_inline_tails_notes_and_numbering(self):
        chapters = self.parse('<p><v id="1"/>Ọlọ́run <nd>ỌLỌ́RUN</nd><f><ft>NOT VERSE TEXT</ft></f> said.<ve/><v id="3"/>Next verse.<ve/></p>')
        self.assertEqual(chapters, [['Ọlọ́run ỌLỌ́RUN said.', '', 'Next verse.']])

    def test_numbered_heading_is_scripture(self):
        self.assertEqual(self.parse('<d>Unnumbered heading</d><d><v id="1"/>Prayer <it>song</it>.<ve/></d>'), [['Prayer song.']])

    def test_poetry_crosses_blocks_and_keeps_words(self):
        self.assertEqual(self.parse('<q><v id="1"/>First line</q><q>Second <w s="H1">line</w>.<ve/></q>'), [['First line Second line.']])

    def test_explicit_empty_verse_keeps_position(self):
        self.assertEqual(self.parse('<p><v id="1"/><ve/><v id="2"/>Two<ve/></p>'), [['', 'Two']])

    def test_unreviewed_format_fails_closed(self):
        for body in ['<v id="1-2"/>', '<v id="1"/>one<ve/><v id="1"/>duplicate', '<v id="1"/><unknown>word</unknown>', '<s><v id="1"/>hidden<ve/></s>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.parse(body)


if __name__ == '__main__':
    unittest.main()
