"""BUILD-BLOCKING GATE.

Every vendor name we publish must round-trip against the source PDF text.
A truncated payee is a fabricated person; a public, name-searchable dashboard
built on a pipeline that invents residents has no recovery path.

Also re-asserts both published control totals. Exit non-zero on any failure.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TXT_DIR = os.path.join(ROOT, "data", "txt")

d = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))
failures = []

# --- Gate 0: the corpus itself ---------------------------------------------
# Without these, an empty data directory prints "ALL GATES PASS" on nothing -
# a gate that can pass vacuously is not a gate.
parsed_docs = [doc for doc in d["docs"] if doc["rows"]]
if len(parsed_docs) < 30:
    failures.append("CORPUS TOO SMALL  %d parsed documents (expected >= 30)" % len(parsed_docs))
total_rows_check = sum(len(doc["rows"]) for doc in parsed_docs)
if total_rows_check < 8000:
    failures.append("CORPUS TOO SMALL  %d rows (expected >= 8000)" % total_rows_check)

# --- Gate 1: name fidelity -------------------------------------------------
for doc in d["docs"]:
    if not doc["rows"]:
        continue
    base = os.path.splitext(doc["file"])[0]
    raw = open(os.path.join(TXT_DIR, base + ".txt"), encoding="utf-8", errors="replace").read()
    flat = re.sub(r"\s+", " ", raw)
    seen = set()
    for r in doc["rows"]:
        n = r["vendor_name"]
        if n in seen:
            continue
        seen.add(n)
        if n not in flat:
            failures.append("NAME NOT IN SOURCE  %s :: %r" % (doc["file"], n))
            continue
        # Truncation check: CASTILLO parsed as 'STILLO' still appears in the
        # source - but always preceded by a letter. A real payee name never is.
        if all(m.start() > 0 and flat[m.start() - 1].isalpha()
               for m in re.finditer(re.escape(n), flat)):
            failures.append("NAME LOOKS TRUNCATED  %s :: %r" % (doc["file"], n))

# Image-only scans have no text to parse. That is a property of the source, not
# a parse failure - they are excluded here and declared on the page, never
# silently dropped.
scans = [doc["file"] for doc in d["docs"] if not doc["has_text_layer"]]

# --- Gate 2: expenditure ties to published control total -------------------
for t in d["tie_out"]:
    if t["file"] in scans:
        if t["status"] != "NO_TEXT_LAYER":
            failures.append("SCAN MISCLASSIFIED  %s -> %s" % (t["file"], t["status"]))
        continue
    if t["status"] not in ("EXACT",):
        failures.append("TIE-OUT %s  %s  variance %s" % (t["status"], t["file"], t["variance"]))

# --- Gate 3: row count + list amount tie to published footer ---------------
for doc in d["docs"]:
    if doc["file"] in scans:
        continue
    if doc.get("pub_line_items") is None:
        failures.append("NO PUBLISHED FOOTER  %s" % doc["file"])
        continue
    if len(doc["rows"]) != doc["pub_line_items"]:
        failures.append("ROW COUNT  %s  parsed %d vs published %d"
                        % (doc["file"], len(doc["rows"]), doc["pub_line_items"]))
    s = round(sum(r["amount"] for r in doc["rows"]), 2)
    if abs(s - doc["pub_list_amount"]) > 0.005:
        failures.append("LIST AMOUNT  %s  parsed %.2f vs published %.2f"
                        % (doc["file"], s, doc["pub_list_amount"]))

n_names = len(set(r["vendor_name"] for doc in d["docs"] for r in doc["rows"]))
n_rows = sum(len(doc["rows"]) for doc in d["docs"])
print("checked %d documents (%d parsed, %d image-only scans) | %d rows | %d distinct vendor names" %
      (len(d["docs"]), len(d["docs"]) - len(scans), len(scans), n_rows, n_names))
if d.get("superseded"):
    print("excluded %d republished duplicate(s): %s" %
          (len(d["superseded"]), ", ".join(x["file"] for x in d["superseded"])))
if failures:
    print("\nFAILED (%d):" % len(failures))
    for f in failures[:40]:
        print("  " + f)
    sys.exit(1)
print("ALL GATES PASS: name fidelity, expenditure tie-out, row count, list amount")
