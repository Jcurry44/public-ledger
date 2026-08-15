"""Inline the dataset into the template to produce a single self-contained index.html."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl = open(os.path.join(ROOT, "src", "index.template.html"), encoding="utf-8").read()

out = tpl

# The og:description quotes the corpus size and the reconcile count. Hard-coding
# them went stale the first time a new warrant landed, so they substitute from
# the same site-data.json the page itself renders — one source of truth.
meta = json.load(open(os.path.join(ROOT, "data", "site-data.json"), encoding="utf-8"))["meta"]
for marker, value in (("__OG_ROWS__", "{:,}".format(meta["rows"])),
                      ("__OG_EXACT__", str(meta["exact"])),
                      # one brief per parsed (non-scan) document
                      ("__N_BRIEFS__", str(meta["docs"] - meta["scans"]))):
    if marker not in tpl:
        raise SystemExit("template is missing the %s marker" % marker)
    out = out.replace(marker, value)
for marker, fname in (("/*__DATA__*/", "site-data.json"), ("/*__OSC__*/", "osc-data.json"),
                      ("/*__TAX__*/", "taxrates.json"),
                      ("/*__SCHOOL__*/", "school-data.json"),
                      ("/*__XC__*/", "crossmuni.json")):
    if marker not in tpl:
        raise SystemExit("template is missing the %s marker" % marker)
    payload = open(os.path.join(ROOT, "data", fname), encoding="utf-8").read()
    # The payload sits in a <script type="application/json"> block, so the only
    # sequence that can break out of it is a literal </script>.
    out = out.replace(marker, payload.replace("</", "<\\/"))
path = os.path.join(ROOT, "index.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(out)
print("wrote %s  (%.0f KB, self-contained)" % (path, os.path.getsize(path) / 1024))
