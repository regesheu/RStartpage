#!/usr/bin/env python3
"""Rebuild the repository's deterministic, chunked source archive."""

from __future__ import annotations

import base64
import gzip
import io
import pathlib
import tarfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_FILES = (
    "app.js",
    "background.js",
    "proxy-shared.js",
    "proxy.css",
    "proxy.js",
    "shared.js",
    "styles.css",
    "tools-shared.js",
    "tools.css",
    "tools.js",
    "drive-shared.js",
)
PART_FILES = (
    "part00a",
    "part00b1",
    "part00b2",
    "part01",
    "part02",
    "part03",
    "part04a",
    "part04b",
    "part05",
    "part06",
)


def archive_bytes() -> bytes:
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode="wb", mtime=0, filename="") as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as tar:
            for relative in SOURCE_FILES:
                source = ROOT / relative
                payload = source.read_bytes()
                info = tarfile.TarInfo(relative)
                info.size = len(payload)
                info.mode = 0o644
                info.uid = 0
                info.gid = 0
                info.uname = ""
                info.gname = ""
                info.mtime = 0
                tar.addfile(info, io.BytesIO(payload))
    return compressed.getvalue()


def main() -> None:
    encoded = base64.b64encode(archive_bytes()).decode("ascii")
    part_dir = ROOT / "source-bundle"
    chunk_size = (len(encoded) + len(PART_FILES) - 1) // len(PART_FILES)
    for index, name in enumerate(PART_FILES):
        chunk = encoded[index * chunk_size : (index + 1) * chunk_size]
        (part_dir / name).write_text(chunk + "\n", encoding="utf-8")
    print(f"Wrote {len(encoded)} encoded bytes across {len(PART_FILES)} source bundle parts")


if __name__ == "__main__":
    main()
