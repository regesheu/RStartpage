#!/usr/bin/env python3
"""Static UI contract checks for extension pages."""

from __future__ import annotations

import json
import pathlib
import re
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[1]
FULL_PAGES = (
    "newtab.html",
    "proxy.html",
    "proxy-help.html",
    "sessions.html",
    "tools.html",
    "settings.html",
    "data.html",
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.local_assets: list[str] = []
        self.forms: list[dict[str, str | None]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(str(values["id"]))
        if tag == "form":
            self.forms.append(values)
        if tag in {"script", "link", "img"}:
            source = values.get("src") or values.get("href")
            if source and not re.match(r"^(?:[a-z]+:|//|#)", source):
                self.local_assets.append(source.split("?", 1)[0])


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def parse_page(name: str) -> tuple[str, PageParser]:
    source = (ROOT / name).read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(source)
    require(len(parser.ids) == len(set(parser.ids)), f"{name}: duplicate id")
    for form in parser.forms:
        require("novalidate" in form, f"{name}: every form must opt into app-owned validation")
    for asset in parser.local_assets:
        require((ROOT / asset).is_file(), f"{name}: missing asset {asset}")
    return source, parser


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["options_ui"]["page"] == "settings.html", "manifest: settings must be the options page")
    require(manifest["version"] == "1.5.0", "manifest: unexpected version")

    for page in FULL_PAGES:
        source, parser = parse_page(page)
        require("app-navigation-shell" in source and "appNavigation" in parser.ids, f"{page}: shared navigation missing")
        require("data-app-favicon" in source, f"{page}: controllable favicon missing")

    popup, popup_parser = parse_page("popup.html")
    require("manageButton" not in popup_parser.ids and "manageSessionsButton" not in popup_parser.ids, "popup: management links must be removed")
    require("popup-credit" not in popup and "mailto:" not in popup, "popup: author/contact content must be removed")
    require({"homeButton", "addLinkToggle", "addLinkForm"}.issubset(set(popup_parser.ids)), "popup: Home or Add Link controls missing")

    tools, tools_parser = parse_page("tools.html")
    require("sessionsSection" not in tools_parser.ids and "sessionDialog" not in tools_parser.ids, "tools: sessions must live on their own page")
    require("checkAllDuplicatesButton" in tools_parser.ids, "tools: duplicate batch check missing")

    proxy, proxy_parser = parse_page("proxy.html")
    require({"exportProxyButton", "importProxyButton", "proxyHelpButton"}.issubset(set(proxy_parser.ids)), "proxy: import/export/help controls missing")
    require("proxy-footnote" not in proxy and "app-author-footer" not in proxy, "proxy: extra explanatory footer remains")

    settings, settings_parser = parse_page("settings.html")
    required_settings = {"productNameInput", "showProxyNavInput", "showSessionsNavInput", "showToolsNavInput", "showTabIconInput"}
    require(required_settings.issubset(set(settings_parser.ids)), "settings: required navigation/name/favicon settings missing")

    all_js = "\n".join(path.read_text(encoding="utf-8") for path in ROOT.glob("*.js"))
    require(not re.search(r"(?<![A-Za-z])confirm\s*\(", all_js), "JavaScript: native confirm() remains")
    require("updateBookmarkEntry" in all_js and "checkDuplicateItems" in all_js, "duplicates: inline edit/check implementation missing")
    require("Extention made by" not in all_js and "mailto:me@regesh.ru" not in all_js, "author/contact content must be removed")

    print(f"Validated {len(FULL_PAGES) + 1} pages and UI contracts")


if __name__ == "__main__":
    main()
