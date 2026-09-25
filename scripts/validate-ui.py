#!/usr/bin/env python3
"""Static UI contract checks for extension pages."""

from __future__ import annotations

import json
import pathlib
import re
import struct
import zlib
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[1]
FULL_PAGES = (
    "newtab.html",
    "proxy.html",
    "proxy-help.html",
    "sessions.html",
    "notes.html",
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


def validate_wallpaper() -> None:
    path = ROOT / "assets" / "alpine-night.png"
    data = path.read_bytes()
    require(data.startswith(b"\x89PNG\r\n\x1a\n"), "wallpaper: invalid PNG signature")

    offset = 8
    chunk_index = 0
    idat = bytearray()
    header: tuple[int, int, int, int, int, int, int] | None = None
    saw_iend = False
    while offset < len(data):
        require(offset + 12 <= len(data), "wallpaper: truncated PNG chunk header")
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        payload_start = offset + 8
        payload_end = payload_start + length
        chunk_end = payload_end + 4
        require(chunk_end <= len(data), f"wallpaper: truncated {chunk_type.decode('ascii', 'replace')} chunk")
        payload = data[payload_start:payload_end]
        stored_crc = struct.unpack(">I", data[payload_end:chunk_end])[0]
        require((zlib.crc32(chunk_type + payload) & 0xFFFFFFFF) == stored_crc, f"wallpaper: bad {chunk_type.decode('ascii', 'replace')} CRC")
        if chunk_type == b"IHDR":
            require(chunk_index == 0 and length == 13 and header is None, "wallpaper: invalid IHDR")
            header = struct.unpack(">IIBBBBB", payload)
        elif chunk_type == b"IDAT":
            idat.extend(payload)
        elif chunk_type == b"IEND":
            require(length == 0, "wallpaper: invalid IEND")
            saw_iend = True
        offset = chunk_end
        chunk_index += 1
        if saw_iend:
            break

    require(saw_iend and offset == len(data), "wallpaper: incomplete PNG or trailing data")
    require(header is not None and idat, "wallpaper: IHDR or IDAT missing")
    width, height, depth, color_type, compression, filter_method, interlace = header
    require((width, height) == (1536, 1024), "wallpaper: expected 1536x1024")
    require((depth, color_type, compression, filter_method, interlace) == (8, 2, 0, 0, 0), "wallpaper: expected non-interlaced 8-bit RGB")
    try:
        scanlines = zlib.decompress(bytes(idat))
    except zlib.error as error:
        raise SystemExit(f"wallpaper: IDAT cannot be fully decompressed: {error}") from error
    row_size = width * 3 + 1
    require(len(scanlines) == row_size * height, "wallpaper: incomplete decoded pixel payload")
    require(all(scanlines[row * row_size] <= 4 for row in range(height)), "wallpaper: invalid PNG row filter")


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["options_ui"]["page"] == "settings.html", "manifest: settings must be the options page")
    require(manifest["version"] == "1.8.3", "manifest: unexpected version")
    validate_wallpaper()

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
    require("data-transfer-link" not in tools, "tools: redundant data shortcut remains")

    proxy, proxy_parser = parse_page("proxy.html")
    require("proxyHelpButton" in proxy_parser.ids and "data-transfer-link" in proxy and "module-icon-button" in proxy, "proxy: data shortcut/help missing")
    require("proxy-footnote" not in proxy and "app-author-footer" not in proxy, "proxy: extra explanatory footer remains")

    settings, settings_parser = parse_page("settings.html")
    required_settings = {"productNameInput", "showProxyNavInput", "showNotesNavInput", "showSessionsNavInput", "showToolsNavInput", "showTabIconInput"}
    require(required_settings.issubset(set(settings_parser.ids)), "settings: required navigation/name/favicon settings missing")

    require({"settingsData", "dataHelpDialog"}.issubset(set(settings_parser.ids)), "settings: data hub/help missing")
    for page in ("newtab.html", "notes.html", "sessions.html", "proxy.html"):
        source, parser = parse_page(page)
        require("data-transfer-link" in source and "module-icon-button" in source, f"{page}: icon settings shortcut missing")
        require(not any(re.match(r"(export|import)(Notes|Sessions|Proxy|Rules)Button", id) for id in parser.ids), f"{page}: legacy transfer controls remain")

    sessions, sessions_parser = parse_page("sessions.html")
    require({"sessionsHelpButton", "sessionsHelpDialog"}.issubset(set(sessions_parser.ids)), "sessions: help dialog missing")
    notes, notes_parser = parse_page("notes.html")
    require({"notesHelpButton", "notesHelpDialog", "notesHelpTitle"}.issubset(set(notes_parser.ids)), "notes: help dialog missing")

    settings_data = (ROOT / "settings-data.js").read_text(encoding="utf-8")
    require(all(token in settings_data for token in ("dataHelpButton", "Smart Proxy Rules", "transferPasswords", "transfer-subitems")), "settings: Data help or Proxy subitems missing")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    require("function getQuickLinks()" in app and "state.workspaces.flatMap" in app and "quickWorkspace" in app, "home: Quick Access is not global")
    current_ui = "\n".join((ROOT / name).read_text(encoding="utf-8") for name in ("data.html", "settings.html", "settings.js", "settings-data.js", "shared.js"))
    require("Data and sections" not in current_ui and "Данные и разделы" not in current_ui, "settings: legacy Data and sections label remains")

    all_js = "\n".join(path.read_text(encoding="utf-8") for path in ROOT.glob("*.js"))
    require(not re.search(r"(?<![A-Za-z])confirm\s*\(", all_js), "JavaScript: native confirm() remains")
    require("updateBookmarkEntry" in all_js and "checkDuplicateItems" in all_js, "duplicates: inline edit/check implementation missing")
    require("Extention made by" not in all_js and "mailto:me@regesh.ru" not in all_js, "author/contact content must be removed")

    print(f"Validated {len(FULL_PAGES) + 1} pages and UI contracts")


if __name__ == "__main__":
    main()
