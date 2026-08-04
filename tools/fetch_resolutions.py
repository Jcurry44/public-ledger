"""Download Niagara County Legislature meeting PDFs (2015-2026) into data/resolutions/.

Resumable: files already on disk are skipped. Run manually (outside build.py),
like build_county.py. Sources: the county's public year pages at
niagaracounty.gov/government/legislature/agendas_legislative_meetings/.
"""
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "resolutions"
CACHE.mkdir(parents=True, exist_ok=True)

BASE = "https://www.niagaracounty.gov"
YEAR_PAGE = BASE + "/government/legislature/agendas_legislative_meetings/{}_agendas___minutes.php"
YEARS = range(2015, 2027)

UA = {"User-Agent": "Mozilla/5.0 (public-ledger research; contact jjcurry027@gmail.com)"}


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


def slug(name):
    s = re.sub(r"[^A-Za-z0-9.\-]+", "_", name)
    return re.sub(r"_+", "_", s).strip("_")


manifest = []
for year in YEARS:
    html = get(YEAR_PAGE.format(year))
    links = re.findall(r'href="([^"]*\.pdf[^"]*)"', html, re.I)
    seen = set()
    for href in links:
        # hrefs like "Document_center/..." resolve against the SITE ROOT, not
        # the year page's directory (the CMS uses a base of /)
        h = href.replace(" ", "%20")
        url = h if h.startswith("http") else BASE + ("" if h.startswith("/") else "/") + h
        fname = urllib.parse.unquote(url.split("/")[-1].split("?")[0])
        key = (year, fname)
        if key in seen:
            continue
        seen.add(key)
        low = fname.lower()
        if "minute" in low:
            kind = "minutes"
        elif "resolution" in low or "agenda" in low or re.match(r"\d{1,2}-\d{1,2}-\d{2}", fname):
            kind = "packet"   # agenda and/or resolution texts
        else:
            kind = "other"    # budget books, misc - keep for the record, skip parse
        manifest.append({"year": year, "url": url, "file": f"{year}_{slug(fname)}", "kind": kind})
    print(f"{year}: {len(seen)} PDFs listed")
    time.sleep(0.4)

# preserve Internet Archive recoveries (tools/recover_wayback.py) across rebuilds
old_path = CACHE / "manifest.json"
if old_path.exists():
    try:
        for m0 in json.loads(old_path.read_text(encoding="utf-8")):
            if m0.get("wb"):
                manifest.append(m0)
    except Exception:
        pass
(CACHE / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
print(f"\nmanifest: {len(manifest)} PDFs "
      f"({sum(1 for m in manifest if m['kind']=='packet')} packets, "
      f"{sum(1 for m in manifest if m['kind']=='minutes')} minutes, "
      f"{sum(1 for m in manifest if m['kind']=='other')} other)")

got = skipped = failed = 0
for m in manifest:
    dest = CACHE / m["file"]
    if dest.exists() and dest.stat().st_size > 500:
        skipped += 1
        continue
    try:
        data = get(m["url"], binary=True)
        dest.write_bytes(data)
        got += 1
        time.sleep(0.3)
    except Exception as e:
        failed += 1
        print("  FAIL", m["file"], e)
    if (got + failed) % 25 == 0 and (got + failed):
        print(f"  ...{got} downloaded, {skipped} cached, {failed} failed")

print(f"\ndone: {got} downloaded, {skipped} already cached, {failed} failed")
