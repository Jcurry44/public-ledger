"""Find text lines that contain a charge account but did NOT yield a parsed row,
plus rows whose parsed amount looks wrong. This is the variance decomposition."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_warrants import RE_ITEM, RE_PO, TXT_DIR  # noqa: E402

name = sys.argv[1] if len(sys.argv) > 1 else "Warrant Report 6.16.26"
path = os.path.join(TXT_DIR, name + ".txt")
lines = open(path, encoding="utf-8", errors="replace").read().split("\n")

RE_ACCT = re.compile(r"\d{3}-\d{4}-\d{4}")
RE_MONEY_ANY = re.compile(r"\$(-?[\d,]+\.\d{2})")

in_break = False
misses = 0
multi = 0
for i, line in enumerate(lines):
    if "Breakdown" in line and "Expenditure Account" in line:
        in_break = True
    if in_break:
        continue
    if not RE_ACCT.search(line):
        continue
    if RE_ITEM.match(line):
        n = len(RE_MONEY_ANY.findall(line))
        if n > 1:
            multi += 1
            if multi <= 6:
                print("MULTI-AMOUNT (%d) line %d:\n   %s\n" % (n, i, line.strip()[:190]))
        continue
    misses += 1
    if misses <= 12:
        print("NEAR-MISS line %d:\n   %s" % (i, line.strip()[:190]))
        print("   prev: %s\n" % lines[i - 1].strip()[:120])

print("=== %s: near-misses %d | multi-amount rows %d ===" % (name, misses, multi))
