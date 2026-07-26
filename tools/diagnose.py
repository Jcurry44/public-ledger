"""Decompose the tie-out variance: which rows does the parse see that the
publisher's own control total does not (or vice versa)?

Three independent published controls per document:
  1. Total Of All Funds        (expenditure only)
  2. Total List Amount         (every line item, expenditure + G/L)
  3. Total P.O. Line Items     (row count)
"""
import json
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))

target = sys.argv[1] if len(sys.argv) > 1 else None

print("%-42s %6s %6s %14s %14s %10s" %
      ("FILE", "ROWS", "PUB", "SUM(ALL)", "PUB LIST AMT", "DIFF"))
bad = []
for doc in d["docs"]:
    if target and target not in doc["file"]:
        continue
    rows = doc["rows"]
    all_sum = round(sum(r["amount"] for r in rows), 2)
    pub_amt = doc.get("pub_list_amount")
    pub_n = doc.get("pub_line_items")
    diff = round(all_sum - pub_amt, 2) if pub_amt is not None else None
    print("%-42s %6d %6s %14s %14s %10s" % (
        doc["file"][:42], len(rows),
        pub_n if pub_n is not None else "-",
        "{:,.2f}".format(all_sum),
        "{:,.2f}".format(pub_amt) if pub_amt is not None else "-",
        "{:,.2f}".format(diff) if diff is not None else "-"))
    if diff and abs(diff) > 0.005:
        bad.append(doc)

if target and bad:
    doc = bad[0]
    print("\n--- acct_type mix ---")
    print(Counter(r["acct_type"] for r in doc["rows"]))
    print("\n--- per (fund, acct_type) ---")
    agg = {}
    for r in doc["rows"]:
        k = (r["fund"], r["acct_type"])
        agg[k] = round(agg.get(k, 0) + r["amount"], 2)
    for k in sorted(agg):
        print("  %-4s %s  %14s" % (k[0], k[1], "{:,.2f}".format(agg[k])))
