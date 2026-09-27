#!/usr/bin/env python3
"""Upload a release ZIP and submit it for Chrome Web Store review (API v2)."""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def request(url, token=None, data=None, content_type=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, headers=headers,
                                 method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # API errors contain no credentials. Do not print token request bodies.
        raise RuntimeError(f"Chrome Web Store API HTTP {error.code}: {error.read().decode()[:2000]}") from None


def main():
    values = {name: os.environ.get(name, "") for name in (
        "CWS_CLIENT_ID", "CWS_CLIENT_SECRET", "CWS_REFRESH_TOKEN", "CWS_PUBLISHER_ID", "CWS_ZIP")}
    missing = [key for key, value in values.items() if not value]
    if missing:
        raise RuntimeError(f"Missing GitHub Actions secrets/configuration: {', '.join(missing)}")
    zip_path = pathlib.Path(values["CWS_ZIP"])
    if not zip_path.is_file():
        raise RuntimeError(f"Release ZIP does not exist: {zip_path}")
    form = urllib.parse.urlencode({
        "client_id": values["CWS_CLIENT_ID"],
        "client_secret": values["CWS_CLIENT_SECRET"],
        "refresh_token": values["CWS_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    access = request("https://oauth2.googleapis.com/token", data=form,
                     content_type="application/x-www-form-urlencoded")["access_token"]
    item = f"publishers/{urllib.parse.quote(values['CWS_PUBLISHER_ID'], safe='')}/items/bigmfdkckifbkpgeanocaibckjakllca"
    api = f"https://chromewebstore.googleapis.com/v2/{item}"
    result = request(f"https://chromewebstore.googleapis.com/upload/v2/{item}:upload",
                     access, zip_path.read_bytes(), "application/zip")
    print(f"Upload state: {result.get('uploadState')}")
    for _ in range(20):
        if result.get("uploadState") == "SUCCEEDED":
            break
        if result.get("uploadState") not in ("IN_PROGRESS", "UPLOAD_IN_PROGRESS"):
            raise RuntimeError(f"Upload failed: {result}")
        time.sleep(15)
        status = request(f"{api}:fetchStatus", access)
        result = {"uploadState": status.get("lastAsyncUploadState")}
    else:
        raise RuntimeError("Upload is still processing; inspect the developer dashboard")
    published = request(f"{api}:publish", access, b"", "application/json")
    print(f"Submitted for Chrome Web Store review: {published}")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, KeyError, urllib.error.URLError) as error:
        print(f"Store publication failed: {error}", file=sys.stderr)
        sys.exit(1)
