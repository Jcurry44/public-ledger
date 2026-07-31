"""North Tonawanda City School District - the biggest line on a North
Tonawanda tax bill, profiled from the district's own annual filings.

Emits data/school-data.json (small, committed - the payload build_site.py
inlines). Outside the build.py chain: refresh the school zip and rerun
annually. Same discipline: joined on municipal code, flows only, loud
asserts, figures as filed. School fiscal years run July-June, so the
'2025' filing is FY 2024-25.
"""
import csv
import io
import json
import os
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, "data", "osc", "schooldistrict_all_years.zip")
NTSD = "290536000000"          # North Tonawanda City School District
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}


def section_of(row):
    if "ACCOUNT_CODE_SECTION" in row:
        return row["ACCOUNT_CODE_SECTION"]
    return SEGMENT_MAP.get(row.get("FINANCIAL_STATEMENT_SEGMENT", ""), "")


z = zipfile.ZipFile(ZIP)
series, cats, latest = {}, {}, None
for name in sorted(n for n in z.namelist() if n.endswith("_SchoolDistrict.csv")):
    yr = int(name.split("_")[0])
    rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
    tot = defaultdict(float)
    bycat = defaultdict(float)
    found = False
    for r in rd:
        if r["MUNICIPAL_CODE"] != NTSD:
            continue
        sec = section_of(r)
        if sec not in ("REVENUE", "EXPENDITURE"):
            continue
        found = True
        amt = float(r["AMOUNT"] or 0)
        tot[sec] += amt
        if sec == "EXPENDITURE":
            bycat[(r.get("LEVEL_1_CATEGORY") or "Unclassified").title()] += amt
    if not found:
        continue
    series[yr] = {"rev": round(tot["REVENUE"], 2), "exp": round(tot["EXPENDITURE"], 2)}
    cats[yr] = sorted(((k, round(v, 2)) for k, v in bycat.items()), key=lambda x: -x[1])
    latest = yr if latest is None else max(latest, yr)

yrs = sorted(series)
assert yrs, "NT school district not found - municode changed?"
assert yrs == list(range(yrs[0], yrs[-1] + 1)), \
    "gap in school filing years: %s" % [y for y in range(yrs[0], yrs[-1] + 1) if y not in series]
for y in yrs:
    assert series[y]["rev"] > 20_000_000 and series[y]["exp"] > 20_000_000, \
        "school year %d implausibly small" % y

out = {
    "entity": "North Tonawanda City School District",
    "municode": NTSD,
    "years": yrs,
    "rev": [series[y]["rev"] for y in yrs],
    "exp": [series[y]["exp"] for y in yrs],
    "latest": latest,
    "topCats": cats[latest][:4],
}
path = os.path.join(ROOT, "data", "school-data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))
print("wrote %s - %d filings %d-%d, latest FY%d: rev ${:,.0f} exp ${:,.0f}".format(
    series[latest]["rev"], series[latest]["exp"])
    % (path, len(yrs), yrs[0], yrs[-1], latest))
