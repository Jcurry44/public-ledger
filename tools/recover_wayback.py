"""Recover missing/scanned meeting documents from the Internet Archive.

For meetings whose minutes the county's current site lacks (unposted) or serves
only as image scans, the Wayback Machine often holds an earlier, machine-
readable capture of the county's own file. This fetches those, keeps only ones
whose text layer is real, saves them as <year>_WB_*.pdf in the cache, and adds
manifest entries flagged "wb": 1 with the archived snapshot as the source URL.

Run after fetch_resolutions.py; then build_resolutions.py picks them up
(content-based minutes detection handles naming). Honest provenance: the
source link for these meetings is the archive.org capture itself.
"""
import io
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "resolutions"
MAN = CACHE / "manifest.json"

CDX = ("http://web.archive.org/cdx/search/cdx?url="
       "niagaracounty.gov/Document_center/Department/G-L/Legislature*"
       "&output=text&fl=original,timestamp&collapse=urlkey&limit=9000")

UA = {"User-Agent": "Mozilla/5.0 (public-ledger research; contact jjcurry027@gmail.com)"}


def get(url, binary=False, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


def date_variants(date):  # '2016-12-06' -> tokens found in county filenames
    y, mo, dy = date[:4], int(date[5:7]), int(date[8:10])
    yy = y[2:]
    out = set()
    for m in (str(mo), "%02d" % mo):
        for d in (str(dy), "%02d" % dy):
            for sep in ("-", "_"):
                out.add(f"{m}{sep}{d}{sep}{yy}")
                out.add(f"{m}{sep}{d}{sep}{y}")
    return out


def slug(name):
    s = re.sub(r"[^A-Za-z0-9.\-]+", "_", name)
    return re.sub(r"_+", "_", s).strip("_")


# which meetings need help? re-derive from the built data
data = json.loads((ROOT / "data" / "resolutions.json").read_text(encoding="utf-8"))
need = {d: k for d, k in data.get("mstat", {}).items() if k in ("none", "scan")}
print(f"meetings needing recovery: {len(need)} "
      f"({sum(1 for v in need.values() if v=='none')} unposted, "
      f"{sum(1 for v in need.values() if v=='scan')} scanned)")

cdx_rows = []
for ln in get(CDX).splitlines():
    parts = ln.rsplit(" ", 1)
    if len(parts) == 2:
        cdx_rows.append((parts[0], parts[1]))
print(f"cdx captures: {len(cdx_rows)}")

manifest = json.loads(MAN.read_text(encoding="utf-8"))
have_files = {m["file"] for m in manifest}
added = tried = kept = 0

for date, why in sorted(need.items()):
    year = int(date[:4])
    toks = date_variants(date)
    cands = []
    for orig, ts in cdx_rows:
        fname = urllib.parse.unquote(orig.split("/")[-1].split("?")[0])
        low = fname.lower()
        if not low.endswith(".pdf"):
            continue
        if not any(t in fname for t in toks):
            continue
        # for scanned-minutes meetings only minutes help; for unposted, take all
        if why == "scan" and not re.search(r"minut|mintue|meeting", low):
            continue
        cands.append((orig, ts, fname))
    for orig, ts, fname in cands:
        wbfile = f"{year}_WB_{slug(fname)}"
        if wbfile in have_files:
            continue
        tried += 1
        snap = f"https://web.archive.org/web/{ts}/{orig}"
        # python's TLS to archive.org is refused in this environment; curl works
        r0 = subprocess.run(["curl", "-sL", "--max-time", "180", snap.replace(" ", "%20")],
                            capture_output=True)
        blob = r0.stdout
        if r0.returncode != 0 or not blob:
            print("  miss", fname, "curl rc", r0.returncode)
            continue
        if not blob[:5].startswith(b"%PDF"):
            continue
        dest = CACHE / wbfile
        dest.write_bytes(blob)
        r = subprocess.run(["pdftotext", str(dest), str(dest.with_suffix(".txt"))],
                          capture_output=True)
        txt = dest.with_suffix(".txt")
        sz = txt.stat().st_size if txt.exists() else 0
        if sz < 3000:
            dest.unlink(missing_ok=True)
            txt.unlink(missing_ok=True)
            print(f"  {date} {fname}: archived copy also unreadable ({sz}b text)")
            continue
        kind = "minutes" if re.search(r"minut|mintue|meeting(?!.*agenda)", fname.lower()) else "packet"
        manifest.append({"year": year, "url": snap, "file": wbfile, "kind": kind, "wb": 1})
        have_files.add(wbfile)
        added += 1
        kept += 1
        print(f"  RECOVERED {date} ({why}): {fname} -> {sz//1024}KB text [{kind}]")
        time.sleep(1.0)

MAN.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
print(f"\ndone: {kept} documents recovered from the Internet Archive "
      f"({tried} candidates tried); manifest updated (+{added})")
