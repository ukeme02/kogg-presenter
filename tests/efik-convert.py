from pathlib import Path
import importlib.util
import sys
import unittest
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('efik', Path(__file__).resolve().parents[1] / 'tools/efik-convert.py')
efik = importlib.util.module_from_spec(spec)
spec.loader.exec_module(efik)


class EfikConversion(unittest.TestCase):
    def parse(self, body):
        return efik.convert_usx(ET.fromstring('<usx><book code="MAT"/><chapter number="1"/>' + body + '<chapter eid="MAT 1"/></usx>'), 'MAT')

    def test_unicode_inline_tail_and_verse_positions(self):
        chapters = self.parse('<para style="s1">Heading</para><para style="p"><verse number="1"/>Abasi <char style="sc">ỌBỌÑ</char> ọdọñ.<verse eid="MAT 1:1"/><verse number="3"/>Nsinsi uwem.<verse eid="MAT 1:3"/></para>')
        self.assertEqual(chapters, [['Abasi ỌBỌÑ ọdọñ.', '', 'Nsinsi uwem.']])

    def test_poetry_spanning_paragraphs_preserves_space(self):
        self.assertEqual(self.parse('<para style="q1"><verse number="1"/>First</para><para style="q2">second.<verse eid="MAT 1:1"/></para>'), [['First second.']])

    def test_unreviewed_or_ambiguous_source_fails_closed(self):
        for body in ['<para style="unknown"/>', '<para style="s1"><verse number="1"/>Scripture</para>', '<para style="p"><verse number="1-2"/>Words</para>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.parse(body)


if __name__ == '__main__':
    unittest.main()
