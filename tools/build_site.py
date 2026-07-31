"""Inline the dataset into the template to produce a single self-contained index.html."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl = open(os.path.join(ROOT, "src", "index.template.html"), encoding="utf-8").read()

out = tpl
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
