"""Extract North Tonawanda's revenue and expenditure history from the NYS
Office of the State Comptroller statewide city filings (1995-2024).

Two traps, both silent:
  - ACCOUNT_CODE_SECTION also contains GL and FBNP rows - balance-sheet
    positions, not flows. Summing them next to revenue/expenditure mixes
    stocks with flows and roughly doubles every total.
  - Join on MUNICIPAL_CODE, never ENTITY_NAME. 'City of Tonawanda' and
    'City of North Tonawanda' are different municipalities in the same county.
"""
import csv
import io
import json
import os
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, "data", "osc", "city_all_years.zip")
NT = "290236000000"
FLOWS = ("REVENUE", "EXPENDITURE")

# OSC changed the schema in 2013. BOTH eras have exactly 15 columns, so a
# positional read mismatches silently. Resolve by column NAME, per era:
#   1995-2012  FINANCIAL_STATEMENT_SEGMENT = REVENUES / EXPENDITURES
#   2013-      ACCOUNT_CODE_SECTION        = REVENUE  / EXPENDITURE
# Mapping chosen empirically, not by inspection: at the 2012/2013 boundary the
# segment-level mapping is continuous for revenue (48.49M -> 48.45M, 0.07%),
# while the statement-level one (which folds in OTHER SOURCES) steps 4.7%.
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
SCHEMA_BREAK = 2013

z = zipfile.ZipFile(ZIP)
years = sorted(n for n in z.namelist() if n.endswith("_City.csv"))


def section_of(row):
    if "ACCOUNT_CODE_SECTION" in row:
        return row["ACCOUNT_CODE_SECTION"]
    return SEGMENT_MAP.get(row.get("FINANCIAL_STATEMENT_SEGMENT", ""), "")

# OSC switched category labels from UPPERCASE to Title Case at the 2013 schema
# change. Same categories, different casing - normalise for display only, so
# switching years doesn't look like a rendering glitch. Defined before the parse
# loop because di() calls it (Python executes defs in order; no hoisting).
SMALL = {"and", "of", "for", "the", "to", "in", "on", "or", "a"}


def title_label(s):
    """Canonicalise a category label so the two eras converge on one spelling.

    The small-word rule must apply to EVERY label, not just all-caps ones:
    OSC files 'HOMELAND SECURITY AND CIVIL DEFENSE' before 2013 and
    'Homeland Security And Civil Defense' after. Title-casing only the former
    yields '...and...' vs '...And...' - two dictionary entries for one category,
    which silently doubles the sub-category count in any multi-year view.
    """
    if not s:
        return s
    words = (s.title() if s == s.upper() else s).split()
    return " ".join(w if i == 0 or w.lower() not in SMALL else w.lower()
                    for i, w in enumerate(words))


series = {}                                   # year -> {rev, exp}
cats = {"REVENUE": {}, "EXPENDITURE": {}}     # year -> {category: amount}
latest = None

# Full account-level flow table, dictionary-encoded. Emitting the rows rather
# than a pre-baked summary means every drill-down (category -> sub-category ->
# object of expenditure -> account) is computed client-side from one source.
dicts = {"l1": [], "l2": [], "obj": [], "narr": []}
didx = {k: {} for k in dicts}
flows = []


def di(kind, val):
    val = title_label((val or "").strip()) or "Unclassified"
    m = didx[kind]
    if val not in m:
        m[val] = len(dicts[kind])
        dicts[kind].append(val)
    return m[val]

for name in years:
    yr = int(name.split("_")[0])
    rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
    tot = defaultdict(float)
    bycat = {"REVENUE": defaultdict(float), "EXPENDITURE": defaultdict(float)}
    found = False
    for r in rd:
        if r["MUNICIPAL_CODE"] != NT:
            continue
        sec = section_of(r)
        if sec not in FLOWS:
            continue
        found = True
        amt = float(r["AMOUNT"] or 0)
        tot[sec] += amt
        bycat[sec][r["LEVEL_1_CATEGORY"] or "Unclassified"] += amt
        flows.append([
            yr,
            0 if sec == "REVENUE" else 1,
            di("l1", r.get("LEVEL_1_CATEGORY")),
            di("l2", r.get("LEVEL_2_CATEGORY")),
            di("obj", r.get("OBJECT_OF_EXPENDITURE")),
            di("narr", r.get("ACCOUNT_CODE_NARRATIVE")),
            (r.get("ACCOUNT_CODE") or "").strip(),
            round(amt, 2),
        ])
    if not found:
        continue
    series[yr] = {"rev": round(tot["REVENUE"], 2), "exp": round(tot["EXPENDITURE"], 2)}
    for sec in FLOWS:
        cats[sec][yr] = {k: round(v, 2) for k, v in bycat[sec].items()}
    latest = yr if latest is None else max(latest, yr)

yrs = sorted(series)

# Fail LOUD on schema drift. A third OSC schema era would make section_of()
# return '' for every row, silently shrinking the 30-year chart with exit 0.
assert yrs, "no North Tonawanda rows found in any year - OSC schema changed?"
assert yrs[0] == 1995, "series no longer starts at 1995 (starts %s)" % yrs[0]
assert yrs == list(range(yrs[0], yrs[-1] + 1)), \
    "gap in year coverage: %s" % [y for y in range(yrs[0], yrs[-1] + 1) if y not in series]
for y in yrs:
    assert series[y]["rev"] > 10_000_000 and series[y]["exp"] > 10_000_000, \
        "year %d totals implausibly small (rev %s, exp %s) - schema drift?" \
        % (y, series[y]["rev"], series[y]["exp"])


def top_cats(sec, yr, n=8):
    d = sorted(cats[sec][yr].items(), key=lambda x: -x[1])
    head = [[title_label(k), v] for k, v in d[:n]]
    tail = sum(v for _, v in d[n:])
    if tail > 0:
        head.append(["All other", round(tail, 2)])
    return head


# ---- peer cities, latest year ------------------------------------------------
# Per-resident comparison against nearby small NY cities plus Jamestown (the
# closest population peer). Populations are the 2020 Census (P1), retrieved
# 2026-07-26; the OSC figures are each city's own filing for the latest year.
PEERS = {
    "City of North Tonawanda": 30496,
    "City of Tonawanda": 15129,
    "City of Lockport": 20876,
    "City of Lackawanna": 19949,
    "City of Niagara Falls": 48671,
    "City of Batavia": 15600,
    "City of Jamestown": 28712,
    "City of Dunkirk": 12743,
    "City of Olean": 13937,
}
PROP_TAX = "Real Property Taxes and Assessments"

peer_rows = {n: {"rev": 0.0, "exp": 0.0, "tax": 0.0} for n in PEERS}
rd = csv.DictReader(io.StringIO(z.read("%d_City.csv" % latest).decode("utf-8", errors="replace")))
for r in rd:
    name = r["ENTITY_NAME"]
    if name not in peer_rows:
        continue
    sec = section_of(r)
    if sec not in FLOWS:
        continue
    amt = float(r["AMOUNT"] or 0)
    p = peer_rows[name]
    if sec == "REVENUE":
        p["rev"] += amt
        if title_label(r["LEVEL_1_CATEGORY"] or "") == PROP_TAX:
            p["tax"] += amt
    else:
        p["exp"] += amt

missing = [n for n, p in peer_rows.items() if p["rev"] == 0 and p["exp"] == 0]
assert not missing, "peer cities absent from the %d filing: %s" % (latest, missing)

peers = [{
    "name": n.replace("City of ", ""),
    "pop": PEERS[n],
    "rev": round(p["rev"], 2),
    "exp": round(p["exp"], 2),
    "tax": round(p["tax"], 2),
    "self": n == "City of North Tonawanda",
} for n, p in peer_rows.items()]

out = {
    "years": yrs,
    "peers": peers,
    "peerYear": latest,
    "rev": [series[y]["rev"] for y in yrs],
    "exp": [series[y]["exp"] for y in yrs],
    "latest": latest,
    "revCats": top_cats("REVENUE", latest),
    "expCats": top_cats("EXPENDITURE", latest),
    # Every year's category split, so the panels can be filtered by year rather
    # than frozen at the latest filing.
    "revByYear": {str(y): top_cats("REVENUE", y) for y in yrs},
    "expByYear": {str(y): top_cats("EXPENDITURE", y) for y in yrs},
    "dict": dicts,
    "flows": flows,
    "source": "https://www.osc.ny.gov/local-government/data",
    "entity": "City of North Tonawanda",
    "municode": NT,
    "schemaBreak": SCHEMA_BREAK,
}

path = os.path.join(ROOT, "data", "osc-data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))

print("years %d-%d (%d filings)" % (yrs[0], yrs[-1], len(yrs)))
print("latest %d:  revenue $%s   expenditure $%s   net $%s" % (
    latest, "{:,.0f}".format(series[latest]["rev"]),
    "{:,.0f}".format(series[latest]["exp"]),
    "{:,.0f}".format(series[latest]["rev"] - series[latest]["exp"])))
print("\nrevenue categories %d:" % latest)
for k, v in out["revCats"]:
    print("   %-42s %14s" % (k[:42], "{:,.0f}".format(v)))
print("\nexpenditure categories %d:" % latest)
for k, v in out["expCats"]:
    print("   %-42s %14s" % (k[:42], "{:,.0f}".format(v)))
print("\nwrote %s (%.0f KB)" % (path, os.path.getsize(path) / 1024))
