"""Emit the compact JSON the dashboard reads.

Columnar / index-encoded: the row table is the only thing that scales, so
vendor names, account codes and descriptions are dictionaries and each row
carries integer references.
"""
import json
import os
import re
import urllib.parse
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "https://www.northtonawanda.gov/documents/Warrant%20of%20Claims/2026/"
SRC_BY_YEAR = {
    "2026": SRC,
    "2025": "https://www.northtonawanda.gov/documents/Warrant%20of%20Claims/2025/",
}

d = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))
tie = {t["file"]: t for t in d["tie_out"]}

vendors, accounts, acct_desc = [], [], {}
vidx, aidx = {}, {}
fund_names = {}
capital_funds = set()
rows_out, docs_out = [], []


def vi(name):
    if name not in vidx:
        vidx[name] = len(vendors)
        vendors.append(name)
    return vidx[name]


def ai(code):
    if code not in aidx:
        aidx[code] = len(accounts)
        accounts.append(code)
    return aidx[code]


# Account description: the report truncates to ~30 chars and the truncation
# point varies by page width, so take the LONGEST observed spelling per code.
# Column alignment also leaves ragged internal spacing ('MAINTENANCE    OF
# STREETS'), which splits one account into several distinct strings - collapse
# it. This is a display normalisation of a description field only; payee names
# are never touched (see tools/test_fidelity.py).
def norm_desc(s):
    return re.sub(r"\s+", " ", s or "").strip()


best_desc = {}
for doc in d["docs"]:
    for r in doc["rows"]:
        c, s = r["account"], norm_desc(r["acct_desc"])
        if len(s) > len(best_desc.get(c, "")):
            best_desc[c] = s

def fund_rows(breakdown, parsed_by_fund):
    """Published-vs-parsed per fund, aggregated by BARE fund code.

    The breakdown page prints one row per year-SEGMENT: a warrant that spans
    fiscal years lists '4-001' and '5-001' - both fund 001 - as separate rows.
    parsed_by_fund aggregates by bare code, so comparing each segment against
    the whole fund painted false red variance markers on 5 warrants (and
    duplicated 'General Fund' rows) inside the very section that promises
    exact reconciliation. Segments for one code always sum to the fund total.
    """
    agg = {}                                    # bare code -> [name, published_sum]
    for f in breakdown:
        code = f["code"].split("-")[1]
        if code not in agg:
            agg[code] = [f["name"], 0.0]
        agg[code][1] += f["amount"]
        if f["name"] and not agg[code][0]:
            agg[code][0] = f["name"]
    return [[code, name, round(pub, 2), parsed_by_fund.get(code, 0.0)]
            for code, (name, pub) in agg.items()]


for doc in d["docs"]:
    if not doc["rows"]:
        # Image-only scan: no rows to parse. Carried through so the tie-out can
        # declare it rather than quietly shipping a shorter document list.
        if not doc["has_text_layer"]:
            docs_out.append({
                "f": doc["file"], "d": doc["report_date"], "isScan": True,
                "u": SRC_BY_YEAR.get(doc.get("year"), SRC) + urllib.parse.quote(doc["file"]),
                "year": doc.get("year"), "n": 0, "funds": [],
                "ctl": None, "sumE": 0, "var": None, "status": "NO_TEXT_LAYER",
                "pubItems": None, "pubAmt": None, "sumAll": 0, "isCard": False, "range": "",
            })
        continue
    di = len(docs_out)
    for f in doc["funds"]:
        # Codes read '6-001' (annual/operating) or 'X-618' (capital project fund).
        # That prefix is the city's own classification - keep it rather than
        # hard-coding which fund numbers happen to be capital this year.
        prefix, code = f["code"].split("-")[0], f["code"].split("-")[1]
        if prefix.upper() == "X":
            capital_funds.add(code)
        if f["name"] and code not in fund_names:
            fund_names[code] = f["name"]

    parsed_by_fund = defaultdict(float)
    for r in doc["rows"]:
        if r["acct_type"] == "E":
            parsed_by_fund[r["fund"]] = round(parsed_by_fund[r["fund"]] + r["amount"], 2)
        rows_out.append([
            di, vi(r["vendor_name"]), ai(r["account"]), round(r["amount"], 2),
            r["page"], r["po"], r["item"], r["invoice"], 1 if r.get("is_credit") else 0,
            r["acct_type"],
        ])

    t = tie[doc["file"]]
    docs_out.append({
        "f": doc["file"],
        "d": doc["report_date"],
        "year": doc.get("year"),
        "isScan": False,
        "u": SRC_BY_YEAR.get(doc.get("year"), SRC) + urllib.parse.quote(doc["file"]),
        "range": doc["po_range"],
        "ctl": doc["control_total"],
        "sumE": t["sum_expenditure"],
        "var": t["variance"],
        "status": t["status"],
        "pubItems": doc["pub_line_items"],
        "pubAmt": doc["pub_list_amount"],
        "n": len(doc["rows"]),
        "sumAll": round(sum(r["amount"] for r in doc["rows"]), 2),
        "isCard": "VISA" in doc["file"].upper(),
        "funds": fund_rows(doc["funds"], parsed_by_fund),
    })

# Department label = the segment before ' - ' in the account description,
# taken as the most common spelling across that fund-department.
dept_votes = defaultdict(Counter)
for code, desc in best_desc.items():
    fund, dept = code.split("-")[0], code.split("-")[1]
    parts = [p.strip() for p in desc.split(" - ")] if " - " in desc else [desc.strip()]
    label = parts[0]
    # Capital projects are filed as '8397 - Generator Repacement_WTP', where the
    # segment before the dash is the department number, not a name. Taking the
    # prefix blindly renders the department as a bare number.
    if re.fullmatch(r"\d+", label) and len(parts) > 1:
        label = parts[1]
    if label and not re.fullmatch(r"\d+", label):
        dept_votes[(fund, dept)][label] += 1
depts = {f + "-" + dp: c.most_common(1)[0][0] for (f, dp), c in dept_votes.items()}

# Vendor-record hygiene: one payee name carrying several vendor master codes.
# Computed here because vendor_code is deliberately not in the compact row table.
codes_by_name = defaultdict(set)
stats_by_name = defaultdict(lambda: [0, 0.0])
for doc in d["docs"]:
    for r in doc["rows"]:
        codes_by_name[r["vendor_name"]].add(r["vendor_code"])
        s = stats_by_name[r["vendor_name"]]
        s[0] += 1
        s[1] = round(s[1] + r["amount"], 2)

hygiene = [
    {"v": vidx[n], "codes": sorted(c), "n": stats_by_name[n][0], "sum": stats_by_name[n][1]}
    for n, c in codes_by_name.items() if len(c) > 1
]
hygiene.sort(key=lambda h: (-len(h["codes"]), -h["sum"]))

out = {
    "hygiene": hygiene,
    "meta": {
        "docs": len(docs_out),
        "rows": len(rows_out),
        "pos": len(set(r[5] for r in rows_out)),
        "vendors": len(vendors),
        "accounts": len(accounts),
        "funds": len(set(a.split("-")[0] for a in accounts)),
        "totalAll": round(sum(r[3] for r in rows_out), 2),
        "totalE": round(sum(r[3] for r in rows_out if r[9] == "E"), 2),
        "credits": sum(1 for r in rows_out if r[8]),
        "creditAmt": round(-sum(r[3] for r in rows_out if r[8]), 2),
        "exact": sum(1 for x in docs_out if x["status"] == "EXACT"),
        # Sort on Y-M-D, not the printed MM/DD/YYYY string: '12/02/2025' compares
        # greater than '07/21/2026' as text and back-dates the whole page.
        "throughDate": max((x["d"] for x in docs_out if x["d"]),
                           key=lambda s: (s[6:10], s[0:2], s[3:5])),
        "scans": sum(1 for x in docs_out if x.get("isScan")),
        "superseded": d.get("superseded", []),
        "source": "https://www.northtonawanda.gov/accounting",
    },
    "vendors": vendors,
    "accounts": accounts,
    "acctDesc": [best_desc.get(c, "") for c in accounts],
    "fundNames": fund_names,
    "capitalFunds": sorted(capital_funds),
    "depts": depts,
    "docs": docs_out,
    "rows": rows_out,
}

path = os.path.join(ROOT, "data", "site-data.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"))
print("wrote %s  (%.0f KB)" % (path, os.path.getsize(path) / 1024))
print(json.dumps(out["meta"], indent=2))
