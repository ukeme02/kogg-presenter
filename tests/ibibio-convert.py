from pathlib import Path
import importlib.util
import sys
import unittest
import xml.etree.ElementTree as ET

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('ibibio', Path(__file__).resolve().parents[1] / 'tools/ibibio-convert.py')
ibibio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ibibio)


class IbibioConversion(unittest.TestCase):
    def parse(self, body):
        return ibibio.convert_usx(ET.fromstring('<usx><book code="HAB"/><chapter number="1"/>' + body + '<chapter eid="HAB 1"/></usx>'), 'HAB')

    def test_notes_removed_without_losing_following_words(self):
        self.assertEqual(self.parse('<para style="p"><verse number="1"/>Abasi <note style="f"><char style="ft">Footnote</char></note>ọdọñ <char style="nd">ỌBỌÑ</char>.<verse eid="HAB 1:1"/></para>'), [['Abasi ọdọñ ỌBỌÑ.']])

    def test_numbered_headings_and_continuations_survive(self):
        self.assertEqual(self.parse('<para style="d">Unnumbered heading</para><para style="d"><verse number="1"/>Akam<verse eid="HAB 1:1"/></para><para style="q1"><verse number="3"/>First</para><para style="d" vid="HAB 1:3">second.<verse eid="HAB 1:3"/></para>'), [['Akam', '', 'First second.']])

    def test_ambiguous_source_is_rejected(self):
        for body in ['<para style="unknown"/>', '<para style="s1"><verse number="1"/>Words</para>', '<para style="p"><verse number="1-2"/>Words</para>']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.parse(body)


if __name__ == '__main__':
    unittest.main()
