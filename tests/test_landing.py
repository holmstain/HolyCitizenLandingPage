"""Structural checks for the dependency-free landing page."""

import json
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


class Elements(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []

    def handle_starttag(self, tag, attrs):
        self.items.append((tag, dict(attrs)))


def elements():
    parsed = Elements()
    parsed.feed(HTML)
    return parsed.items


class LandingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.elements = elements()
        cls.ids = [attrs["id"] for _, attrs in cls.elements if "id" in attrs]

    def test_locales_cover_visible_copy_and_match(self):
        locales = {
            lang: json.loads((ROOT / "locales" / f"{lang}.json").read_text(encoding="utf-8"))
            for lang in ("tr", "en")
        }
        used = {attrs["data-lang-key"] for _, attrs in self.elements if "data-lang-key" in attrs}
        self.assertTrue(used)
        self.assertEqual(set(locales["tr"]), set(locales["en"]))
        for lang, dictionary in locales.items():
            with self.subTest(lang=lang):
                self.assertFalse(used - dictionary.keys())
                self.assertTrue(all(isinstance(dictionary[key], str) and dictionary[key].strip() for key in used))

    def test_links_resolve_and_assets_exist(self):
        self.assertEqual(len(self.ids), len(set(self.ids)), "HTML IDs must be unique")
        ids = set(self.ids)
        for tag, attrs in self.elements:
            if tag == "a":
                href = attrs.get("href", "")
                self.assertTrue(href and href != "#", "Links need a real destination")
                url = urlsplit(href)
                if url.fragment and not url.netloc and not url.path:
                    self.assertIn(url.fragment, ids, href)
            if tag in {"img", "script"} or (tag == "link" and attrs.get("rel") in {"stylesheet", "icon"}):
                source = attrs.get("src") or attrs.get("href")
                if source and not urlsplit(source).scheme:
                    self.assertTrue((ROOT / source).is_file(), source)

    def test_language_selector_offers_only_supported_locales(self):
        start = HTML.index('<select id="lang-select"')
        end = HTML.index("</select>", start)
        selector = HTML[start:end]
        parsed = Elements()
        parsed.feed(selector)
        values = [attrs.get("value") for tag, attrs in parsed.items if tag == "option"]
        self.assertEqual(set(values), {"tr", "en"})
        self.assertEqual(len(values), len(set(values)))

    def test_tabs_reference_operable_panels(self):
        by_id = {attrs["id"]: attrs for _, attrs in self.elements if "id" in attrs}
        tabs = [attrs for _, attrs in self.elements if attrs.get("role") == "tab"]
        panels = [attrs for _, attrs in self.elements if attrs.get("role") == "tabpanel"]
        self.assertGreaterEqual(len(tabs), 2)
        self.assertEqual(len(tabs), len(panels))
        self.assertEqual(sum(tab.get("aria-selected") == "true" for tab in tabs), 1)
        for tab in tabs:
            panel = by_id[tab["aria-controls"]]
            self.assertEqual(panel.get("role"), "tabpanel")
            self.assertEqual(panel.get("aria-labelledby"), tab["id"])
            self.assertEqual("hidden" in panel, tab.get("aria-selected") != "true")

    def test_kick_table_lists_chat_commands_only(self):
        start = HTML.index('id="panel-kick-commands"')
        end = HTML.index("</table>", start)
        table = HTML[start:end]
        self.assertNotIn("!komut-ekle", table)
        self.assertNotIn("!ifade-engelle", table)


if __name__ == "__main__":
    unittest.main()
