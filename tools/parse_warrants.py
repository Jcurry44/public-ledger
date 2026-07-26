"""Parse North Tonawanda 'Purchase Order Listing By P.O. Number' warrant PDFs.

Extraction contract:
  - pdftotext -table ONLY.  -layout silently reassigns account descriptions at a
    2:1 stride and loses ~30% of dollars while row counts stay plausible.
  - Every warrant embeds its own per-fund control totals on the final
    'Breakdown of Expenditure Account' page.  That is the tie-out target.
  - Acct Type E == expenditure (in the control total).  Type G == general/trust
    (fund 007 etc., NOT in the control total).  Sum E only when tying out.

Usage:
  python tools/parse_warrants.py            # parse all, write data/warrants.json + tie-out report
  python tools/parse_warrants.py --tie      # tie-out report only
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 2026 warrants are linked from the city's accounting page; the 2025 folder is
# unlinked (the directory 403s) but the files resolve, and the Wayback CDX index
# enumerates their exact - and irregular - filenames.
PDF_DIRS = [("2026", os.path.join(ROOT, "data", "pdf")),
            ("2025", os.path.join(ROOT, "data", "pdf2025"))]
TXT_DIR = os.path.join(ROOT, "data", "txt")

MONEY = r"\$(-?[\d,]+\.\d{2})"

# V6-01681  06/15/26  1818B005  1818 BAR & GRILL     (regular warrants)
# 26-00251  04/01/26  ADOBE005  ADOBE INC            (P-card / VISA warrants)
RE_PO = re.compile(r"^(V\d-\d{5}|\d{2}-\d{5})\s+(\d{2}/\d{2}/\d{2})\s+(\S+)\s+(.+?)\s*$")

# 1  PO#R06723  $2,180.00  007-0000-0091  G  RECREATION TRUST  R  06/15/26  06/15/26   50
RE_ITEM = re.compile(
    r"^(\d+)\s+(.*?)\s+" + MONEY + r"\s+(\d{3}-\d{4}-\d{4})\s+([A-Z])\s+(.*)$"
)
# Vendor credits / discounts print with a TRAILING minus and NO currency symbol:
#   3  PO#D2026-121D/E   96.13 -  001-5110-0420  E  MAINTENANCE OF STREETS - REPA R ...
# Missing these was the entire residual tie-out drift - it over-states spend.
RE_ITEM_CREDIT = re.compile(
    r"^(\d+)\s+(.*?)\s+([\d,]+\.\d{2})\s+-\s+(\d{3}-\d{4}-\d{4})\s+([A-Z])\s+(.*)$"
)

# 4.21.26 renders this as 'Total  Of All Funds:' (double space) - never hard-code the spacing.
RE_TOTAL_ALL = re.compile(r"Total\s+Of\s+All\s+Funds:\s+" + MONEY)
# General Fund   6-001   $625,285.11   $0.00 ...
RE_FUND = re.compile(r"^\s*(.*?)\s{2,}([0-9X]-\d{3})\s+" + MONEY)
RE_DATE = re.compile(r"\d{2}/\d{2}/\d{2}")
RE_PAGE = re.compile(r"^Page:\s+(\d+)")
# Total Purchase Orders: 194  Total P.O. Line Items: 370  Total List Amount: $895,846.01
RE_DOC_TOTALS = re.compile(
    r"Total\s+Purchase\s+Orders:\s+(\d+)\s+Total\s+P\.O\.\s+Line\s+Items:\s+(\d+)\s+"
    r"Total\s+List\s+Amount:\s+" + MONEY
)
RE_RANGE = re.compile(r"Range:\s+(V\d-\d{5})\s+to\s+(V\d-\d{5})")
RE_HEADER_DATE = re.compile(r"North Tonawanda City\s+(\d{2}/\d{2}/\d{4})")


def money(s):
    return float(s.replace(",", ""))


# The vendor cell bleeds two neighbouring artifacts into the name:
#   - the 'PO Type' column value (only ever PC<n> in this corpus)
#   - a literal 'Account Continued' marker when a vendor spans a page break
# Cleaning is strictly subtractive at the EDGES plus whitespace normalisation.
# It must never shorten the name itself - a truncated payee is a fabricated
# person (CASTILLO -> 'STILLO'), which is the one unrecoverable failure here.
RE_CONTINUED = re.compile(r"\s*Account\s+Continued\s*$", re.I)
RE_POTYPE = re.compile(r"\s{2,}PC\d+\s*$")


def clean_vendor(name):
    prev = None
    while prev != name:
        prev = name
        name = RE_CONTINUED.sub("", name)
        name = RE_POTYPE.sub("", name)
    return re.sub(r"\s+", " ", name).strip()


def extract_text(pdf_path):
    """pdftotext -table.  Returns (text, has_text_layer)."""
    base = os.path.splitext(os.path.basename(pdf_path))[0]
    txt_path = os.path.join(TXT_DIR, base + ".txt")
    if not os.path.exists(txt_path) or os.path.getmtime(txt_path) < os.path.getmtime(pdf_path):
        subprocess.run(
            ["pdftotext", "-table", "-nopgbrk", pdf_path, txt_path],
            check=True, capture_output=True,
        )
    text = open(txt_path, encoding="utf-8", errors="replace").read()
    # A scanned page yields whitespace-only output for its share of the doc.
    return text, len(re.sub(r"\s", "", text)) > 500


def parse_tail(rest):
    """Split the post-acct-type remainder into description / stat / dates / invoice."""
    dates = RE_DATE.findall(rest)
    invoice = ""
    tokens = rest.split()
    if tokens and not RE_DATE.match(tokens[-1]):
        invoice = tokens[-1]
    # Account description is everything before the first date or the stat flag.
    first_date_pos = rest.find(dates[0]) if dates else len(rest)
    head = rest[:first_date_pos].rstrip()
    stat = ""
    # The Stat/Chk flag sits right of the fixed-width description column. When the
    # description is truncated to the column edge only ONE space separates them, so
    # a 2+ space rule leaves it stuck on the text ('...MEDICAL IN R'). Strip a lone
    # trailing status letter; no real account description ends in a bare capital.
    m = re.search(r"\s{2,}([A-Z])\s*$", head) or re.search(r"\s+([ROHAVPB])\s*$", head)
    if m:
        stat = m.group(1)
        head = head[: m.start()].rstrip()
    return {
        "acct_desc": head.strip(),
        "stat": stat,
        "first_enc": dates[0] if len(dates) > 0 else "",
        "rcvd": dates[1] if len(dates) > 1 else "",
        "chk_void": dates[2] if len(dates) > 2 else "",
        "invoice": invoice,
    }


def parse_pdf(pdf_path):
    text, has_text = extract_text(pdf_path)
    name = os.path.basename(pdf_path)
    doc = {
        "file": name,
        "has_text_layer": has_text,
        "report_date": "",
        "po_range": "",
        "rows": [],
        "funds": [],
        "control_total": None,
        "pub_po_count": None,
        "pub_line_items": None,
        "pub_list_amount": None,
        "orphan_amount_lines": 0,
    }
    if not has_text:
        # No text to read a date from, so recover it from the filename
        # ('1-21-25', '3.4.25', '5.6.25.b') - otherwise every scan sorts to the
        # top of the tie-out instead of sitting in the gap it actually leaves.
        m = re.search(r"(\d{1,2})[.\-](\d{1,2})[.\-](\d{2})(?!\d)", name)
        if m:
            doc["report_date"] = "%02d/%02d/20%s" % (int(m.group(1)), int(m.group(2)), m.group(3))
            doc["date_from_filename"] = True
        return doc

    m = RE_HEADER_DATE.search(text)
    if m:
        doc["report_date"] = m.group(1)
    m = RE_RANGE.search(text)
    if m:
        doc["po_range"] = m.group(1) + " to " + m.group(2)
    m = RE_DOC_TOTALS.search(text)
    if m:
        doc["pub_po_count"] = int(m.group(1))
        doc["pub_line_items"] = int(m.group(2))
        doc["pub_list_amount"] = money(m.group(3))

    cur = None
    in_breakdown = False
    page = 1
    for line in text.split("\n"):
        mpg = RE_PAGE.match(line)
        if mpg:
            page = int(mpg.group(1))
        if "Breakdown" in line and "Expenditure Account" in line:
            in_breakdown = True

        if in_breakdown:
            mt = RE_TOTAL_ALL.search(line)
            if mt:
                doc["control_total"] = money(mt.group(1))
                continue
            mf = RE_FUND.match(line)
            if mf and "Year Total" not in line:
                doc["funds"].append(
                    {"name": mf.group(1).strip(), "code": mf.group(2), "amount": money(mf.group(3))}
                )
            continue

        mp = RE_PO.match(line)
        if mp:
            cur = {"po": mp.group(1), "po_date": mp.group(2),
                   "vendor_code": mp.group(3),
                   "vendor_name": clean_vendor(mp.group(4)),
                   "vendor_name_raw": mp.group(4).strip()}
            continue

        mi = RE_ITEM.match(line)
        sign = 1
        if not mi:
            mi = RE_ITEM_CREDIT.match(line)
            sign = -1
        if mi and cur:
            tail = parse_tail(mi.group(6))
            row = dict(cur)
            row.update({
                "item": int(mi.group(1)),
                "description": mi.group(2).strip(),
                "amount": round(sign * money(mi.group(3)), 2),
                "is_credit": sign < 0,
                "account": mi.group(4),
                "acct_type": mi.group(5),
                "page": page,
            })
            row.update(tail)
            row["fund"] = mi.group(4).split("-")[0]
            row["dept"] = mi.group(4).split("-")[1]
            row["object"] = mi.group(4).split("-")[2]
            doc["rows"].append(row)
        elif "$" in line and re.match(r"^\s*\d+\s", line) and not mi:
            doc["orphan_amount_lines"] += 1

    return doc


def tie_out(doc):
    """Sum expenditure rows against the document's own published control total."""
    e_sum = round(sum(r["amount"] for r in doc["rows"] if r["acct_type"] == "E"), 2)
    all_sum = round(sum(r["amount"] for r in doc["rows"]), 2)
    fund_sum = round(sum(f["amount"] for f in doc["funds"]), 2)
    ctl = doc["control_total"]
    out = {
        "file": doc["file"],
        "has_text_layer": doc["has_text_layer"],
        "rows": len(doc["rows"]),
        "sum_expenditure": e_sum,
        "sum_all_rows": all_sum,
        "sum_fund_breakdown": fund_sum,
        "control_total": ctl,
        "variance": None,
        "variance_pct": None,
        "status": "NO_TEXT_LAYER" if not doc["has_text_layer"] else "NO_CONTROL_TOTAL",
        "orphan_amount_lines": doc["orphan_amount_lines"],
    }
    if ctl is not None:
        v = round(e_sum - ctl, 2)
        out["variance"] = v
        out["variance_pct"] = round(abs(v) / ctl * 100, 4) if ctl else None
        if abs(v) < 0.005:
            out["status"] = "EXACT"
        elif out["variance_pct"] <= 1.0:
            out["status"] = "WITHIN_1PCT"
        else:
            out["status"] = "FAIL"
    return out


def dedupe(docs):
    """Drop republished copies of the same warrant.

    The 2025 folder holds a literal re-upload ('... charges.pdf' and '..._2.pdf'
    are the same warrant twice). Each copy ties to its own control totals, so
    nothing catches a duplicate except an explicit identity check: same P.O.
    range + same control total + same line count = same warrant. Keeping both
    would double real money.

    NOT a duplicate: '1.7 (005).25 pre issue.pdf' looks like a draft of
    '1.7 (004).25.pdf' but is a genuinely distinct 1-line, $73.75 warrant
    (different P.O. range) - filename heuristics would wrongly delete a real
    record, which is why identity is checked on content, never on names.

    P-card/VISA warrants use the '26-00251' P.O. format, which RE_RANGE does
    not always capture, leaving po_range empty. An empty range must NOT exempt
    a document from the check - a republished VISA warrant (up to ~$108k here)
    would silently double-count - so those fall back to a
    (report_date, control_total, line_count) identity.
    """
    seen, kept = {}, []
    for d in docs:
        if not d["rows"]:
            kept.append(d)
            continue
        if d["po_range"]:
            key = ("range", d["po_range"], d["control_total"], d["pub_line_items"])
        else:
            key = ("date", d["report_date"], d["control_total"], d["pub_line_items"])
        if key in seen:
            prior = seen[key]
            loser = d
            # prefer the file that does NOT look like a draft
            if "pre issue" in prior["file"].lower() and "pre issue" not in d["file"].lower():
                kept[kept.index(prior)] = d
                seen[key] = d
                loser = prior
            loser["superseded_by"] = seen[key]["file"]
            SUPERSEDED.append(loser)
            continue
        seen[key] = d
        kept.append(d)
    return kept


SUPERSEDED = []


def main():
    pdfs = []
    for year, d in PDF_DIRS:
        if not os.path.isdir(d):
            continue
        pdfs += [(year, os.path.join(d, f)) for f in sorted(os.listdir(d))
                 if f.lower().endswith(".pdf")]

    docs = []
    for year, p in pdfs:
        d = parse_pdf(p)
        d["year"] = year
        docs.append(d)

    docs = dedupe(docs)
    docs.sort(key=lambda d: (d["report_date"][-4:], d["report_date"][:5], d["file"]))
    ties = [tie_out(d) for d in docs]

    exact = sum(1 for t in ties if t["status"] == "EXACT")
    within = sum(1 for t in ties if t["status"] == "WITHIN_1PCT")
    fail = sum(1 for t in ties if t["status"] == "FAIL")
    notext = sum(1 for t in ties if t["status"] == "NO_TEXT_LAYER")

    print("%-42s %6s %14s %14s %12s %10s  %s" %
          ("FILE", "ROWS", "SUM(E)", "CONTROL", "VARIANCE", "PCT", "STATUS"))
    for t in ties:
        print("%-42s %6d %14s %14s %12s %10s  %s" % (
            t["file"][:42], t["rows"],
            "%,.2f".replace(",", "") % t["sum_expenditure"] if False else "{:,.2f}".format(t["sum_expenditure"]),
            "{:,.2f}".format(t["control_total"]) if t["control_total"] is not None else "-",
            "{:,.2f}".format(t["variance"]) if t["variance"] is not None else "-",
            "{:.4f}%".format(t["variance_pct"]) if t["variance_pct"] is not None else "-",
            t["status"]))

    total_rows = sum(len(d["rows"]) for d in docs)
    total_e = sum(r["amount"] for d in docs for r in d["rows"] if r["acct_type"] == "E")
    print("\nDOCS %d | EXACT %d | WITHIN_1PCT %d | FAIL %d | NO_TEXT %d" %
          (len(docs), exact, within, fail, notext))
    print("ROWS %d | SUM(E) $%s" % (total_rows, "{:,.2f}".format(total_e)))
    if SUPERSEDED:
        print("\nSUPERSEDED / DUPLICATE (excluded, %d):" % len(SUPERSEDED))
        for d in SUPERSEDED:
            print("   %-46s -> same warrant as %s" % (d["file"][:46], d["superseded_by"]))
    scans = [d for d in docs if not d["has_text_layer"]]
    if scans:
        print("\nSCANNED, NO TEXT LAYER (cannot be parsed, %d):" % len(scans))
        for d in scans:
            print("   %s" % d["file"])

    with open(os.path.join(ROOT, "data", "warrants.json"), "w", encoding="utf-8") as f:
        json.dump({"docs": docs, "tie_out": ties,
                   "superseded": [{"file": d["file"], "by": d["superseded_by"]} for d in SUPERSEDED]}, f)
    print("wrote data/warrants.json")


if __name__ == "__main__":
    main()
