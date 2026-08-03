"""Parse Niagara County Legislature meeting PDFs -> data/resolutions.json.

Reads the cache laid down by fetch_resolutions.py (data/resolutions/, gitignored),
extracts every resolution (id, committee, title), matches each to its vote in the
meeting minutes, and pulls authorization amounts from the resolution texts.

Gates (fail loud, printed):
  - a year that parses zero resolutions halts the build (format drift)
  - full-text ids must be a subset of that meeting's agenda ids (extras reported)
  - global sanity floor on total resolutions
  - per-year coverage table printed (meetings / resolutions / votes matched / amounts)

Run manually after fetch_resolutions.py; then tools/build_decisions.py renders the page.
"""
import io
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "resolutions"
OUT = ROOT / "data" / "resolutions.json"

COMMITTEES = {
    "AD": "Administration",
    "CS": "Community Services",
    "CSS": "Community Safety & Security",
    "IF": "Infrastructure & Facilities",
    "ED": "Economic Development",
    "IL": "Individual legislator",
    "CW": "Committee of the Whole",
    "B": "Budget session",
    "PW": "Public Works",
}

ID_RE = re.compile(r"\b([A-Z]{1,4})\s?-\s?(\d{2,4})\s?-\s?(\d{2})\b")
MONEY_RE = re.compile(r"\$\s*([\d][\d,\. ]{2,14}\d)")
CAP_RE = re.compile(
    r"(?:not\s+to\s+exceed|shall\s+not\s+exceed|amount\s+not\s+to\s+exceed|an?\s+amount\s+up\s+to|up\s+to\s+the\s+amount\s+of)"
    r"[^$\n]{0,40}\$\s*([\d][\d,\. ]{2,14}\d)", re.I)
VOTE_RE = re.compile(
    r"(\d{1,2}|I)\s*Ayes?[,.]?\s*(\d{1,2}|I|O)\s*Noes?"
    r"(?:\s*[-–]\s*([A-Za-z .,&'\-]+?))?"
    r"(?:\s*[,.]\s*(\d{1,2}|I)\s*Ab(?:sent|s)[.\s]*[-–]?\s*([A-Za-z .,&'\-]+?))?"
    r"\s*[.\n]")
MOVED_RE = re.compile(r"Moved\s+by\s+([A-Z][A-Za-z.'\-]+)\s*,?\s+seconded\s+by\s+([A-Z][A-Za-z.'\-]+)")
OUTCOME_RE = re.compile(r"\b(Adopted|Carried|CmTied|Defeated|Failed|Tabled|Referred|Withdrawn|Laid\s+over)\b")


def num(tok):
    return {"I": 1, "O": 0, "l": 1}.get(tok, None) if tok in ("I", "O", "l") else int(tok)


def clean_money(tok):
    t = tok.replace(" ", "").replace(",", "")
    t = t.split(".")[0]
    if not t.isdigit() or len(t) > 11:
        return None
    v = int(t)
    return v if 100 <= v < 5_000_000_000 else None


def norm_id(m):
    pref = m.group(1)
    # the agenda's consent asterisk (*IF-...) is read as "A" by some PDFs'
    # text layers; AD itself is a real committee, so only strip when the
    # full prefix is unknown and the remainder is known
    if pref not in COMMITTEES and len(pref) > 1 and pref[0] == "A" and pref[1:] in COMMITTEES:
        pref = pref[1:]
    return "%s-%03d-%s" % (pref, int(m.group(2)), m.group(3))


NOT_NAMES = {"resolution", "no", "total", "expense", "supplies", "board",
             "legislator", "legislature", "committee", "chairman", "county",
             "moved", "seconded", "adjourn", "adjourned", "meeting", "whole",
             "position", "equipment", "appt", "ent", "gen", "the", "that",
             "was", "will", "which", "vehicle", "maintenance", "inventory",
             "niagara", "empower", "equip", "virtue"}


def name_shaped(tok):
    """A plausible surname: one word, letters (Mc/internal caps ok), 3-14 chars."""
    t = tok.strip(" .")
    if not (3 <= len(t) <= 14) or not t[0].isupper():
        return False
    if t.lower() in NOT_NAMES:
        return False
    return all(c.isalpha() or c in ".'-" for c in t)


def name_loose(tok):
    """Capture-side filter: 2+ chars so truncations (Vi, McK) survive to the
    canonicalizer, which either maps them to a unique roster name or drops them."""
    t = tok.strip(" .")
    if not (2 <= len(t) <= 14) or not t[0].isupper():
        return False
    if t.lower() in NOT_NAMES:
        return False
    return all(c.isalpha() or c in ".'-" for c in t)


def names_list(seg):
    if not seg:
        return []
    seg = re.sub(r"\s+", " ", seg).strip(" .,&-")
    parts = re.split(r"\s*(?:,|&|\band\b)\s*", seg)
    out = []
    for part in parts:
        part = part.strip(" .")
        if not part:
            continue
        words = part.split()
        # "Gooch Myers" = two names with a dropped separator; a phrase is junk
        if all(name_loose(w) for w in words) and 1 <= len(words) <= 2:
            out.extend(w.strip(" .") for w in words)
    return out[:16]


BOILER = ("RESOLUTION", "LEGISLAT", "COMMITTEE", "APPROVED", "REVIEWED",
          "WHEREAS", "RESOLVED", "COUNTY OF NIAGARA", "STATE OF NEW YORK",
          "ATTORNEY", "MANAGER", "PAGE ", "AYES", "NOES", "DATED")


def block_title(block):
    """First substantially-uppercase line of a resolution's text = its heading."""
    for ln in block.splitlines()[:60]:
        t = ln.strip()
        if not (12 <= len(t) <= 160):
            continue
        letters = [c for c in t if c.isalpha()]
        if not letters or sum(c.isupper() for c in letters) / len(letters) < 0.7:
            continue
        if any(bw in t.upper() for bw in BOILER):
            continue
        return re.sub(r"\s+", " ", t)
    return None


def txt_of(pdf: Path) -> str:
    tf = pdf.with_suffix(".txt")
    if tf.exists() and tf.stat().st_size > 0:
        return tf.read_text(encoding="utf-8", errors="replace")
    r = subprocess.run(["pdftotext", str(pdf), str(tf)], capture_output=True)
    if r.returncode != 0 or not tf.exists():
        return ""
    return tf.read_text(encoding="utf-8", errors="replace")


def meeting_date(fname, year):
    # (?<![0-9]) / (?![0-9]) rather than \b: filenames wrap dates in
    # underscores, and _ is a word character, so \b never fires there
    # Variants seen: 12-8-15, 03_22_2016, 10-17 (year implied), MAY_16.
    m = re.search(r"(?<![0-9])(\d{1,2})[-_](\d{1,2})[-_](\d{2,4})(?![0-9])", fname)
    if m:
        mo, dy, yy = int(m.group(1)), int(m.group(2)), int(m.group(3))
        yy = yy if yy > 100 else 2000 + yy
        if yy == year and 1 <= mo <= 12 and 1 <= dy <= 31:
            return "%d-%02d-%02d" % (year, mo, dy)
    m = re.search(r"(?<![0-9])(\d{1,2})[-_](\d{1,2})(?![0-9])", fname)
    if m:
        mo, dy = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12 and 1 <= dy <= 31:
            return "%d-%02d-%02d" % (year, mo, dy)
    m = re.search(r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[-_ ]+(\d{1,2})(?![0-9])",
                  fname.upper())
    if m:
        mo = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG",
              "SEP","OCT","NOV","DEC"].index(m.group(1)) + 1
        dy = int(m.group(2))
        if 1 <= dy <= 31:
            return "%d-%02d-%02d" % (year, mo, dy)
    return None


manifest = json.loads((CACHE / "manifest.json").read_text(encoding="utf-8"))

# ---- group files by meeting date ------------------------------------------
meetings = defaultdict(lambda: {"packets": [], "minutes": []})
undated = []
for m in manifest:
    if m["kind"] == "other":
        continue
    d = meeting_date(m["file"].split("_", 1)[1], m["year"])
    if not d:
        undated.append(m["file"])
        continue
    meetings[d][m["kind"] + "s" if m["kind"] == "packet" else "minutes"].append(m)
if undated:
    print("undated files skipped:", len(undated), undated[:6])

# ---- parse ----------------------------------------------------------------
resolutions = {}          # id -> record
meeting_src = {}          # date -> source PDF url (once per meeting, not per row)
text_titles = {}          # ids listed only in resolution texts
unknown_prefix = Counter()
per_year = defaultdict(lambda: Counter())
gate_extras = []

for date in sorted(meetings):
    year = int(date[:4])
    mt = meetings[date]
    agenda_ids = {}
    body_text = ""
    src_urls = []

    for pk in mt["packets"]:
        pdf = CACHE / pk["file"]
        if not pdf.exists():
            continue
        text = txt_of(pdf)
        if not text.strip():
            continue
        src_urls.append(pk["url"])
        body_text += "\n" + text
        # agenda lines: *ID <Committee prose>, re <Title...>
        for line_m in re.finditer(
                r"^[ \t*]*([A-Z]{1,4}\s?-\s?\d{2,4}\s?-\s?\d{2})\s+(.{3,240})$",
                text, re.M):
            idm = ID_RE.search(line_m.group(1))
            if not idm or idm.group(3) != str(year)[2:]:
                continue
            rid = norm_id(idm)
            rest = line_m.group(2).strip()
            if rid in agenda_ids and ", re" not in rest:
                continue
            agenda_ids[rid] = rest

    if not agenda_ids:
        continue

    # full-text blocks for amounts: RESOLUTION# ID ... (until next header)
    blocks = {}
    hdr = list(re.finditer(r"^[ \t]*RESOLUTION\s*(?:#|No\.?)\s*([A-Z]{1,4}\s?-\s?\d{2,4}\s?-\s?\d{2})", body_text, re.I | re.M))
    for i, h in enumerate(hdr):
        idm = ID_RE.search(h.group(1))
        if not idm:
            continue
        rid = norm_id(idm)
        end = hdr[i + 1].start() if i + 1 < len(hdr) else min(len(body_text), h.end() + 20000)
        blocks.setdefault(rid, "")
        blocks[rid] += body_text[h.end():end]
    for rid in blocks:
        if rid not in agenda_ids and rid.rsplit("-", 1)[1] == str(year)[2:]:
            t = block_title(blocks[rid])
            if t:
                agenda_ids[rid] = None  # sentinel: from text, title separate
                text_titles[rid] = t
                gate_extras.append((date, rid))

    # minutes: vote per id
    min_text = ""
    for mn in mt["minutes"]:
        pdf = CACHE / mn["file"]
        if pdf.exists():
            min_text += "\n" + txt_of(pdf)

    id_pos = []
    for im in ID_RE.finditer(min_text):
        if im.group(3) == str(year)[2:]:
            id_pos.append((im.start(), norm_id(im)))
    votes = {}
    for i, (pos, rid) in enumerate(id_pos):
        end = id_pos[i + 1][0] if i + 1 < len(id_pos) else min(len(min_text), pos + 12000)
        window = min_text[pos:end]
        vms = list(VOTE_RE.finditer(window))
        if not vms:
            continue
        v = vms[-1]
        pre = window[:v.start()]
        mv = MOVED_RE.findall(pre)
        oc = OUTCOME_RE.findall(pre)
        ayes, noes = num(v.group(1)), num(v.group(2))
        if ayes is None or noes is None:
            continue
        rec = {"ayes": ayes, "noes": noes}
        if noes and v.group(3):
            rec["no_names"] = names_list(v.group(3))
        if v.group(4) is not None:
            rec["absent"] = num(v.group(4))
            if v.group(5):
                rec["abs_names"] = names_list(v.group(5))
        if mv:
            rec["mover"], rec["second"] = mv[-1][0].rstrip("."), mv[-1][1].rstrip(".")
        out = (oc[-1] if oc else ("Adopted" if ayes > noes else "Not adopted"))
        rec["out"] = {"CmTied": "Carried"}.get(out, out)
        # keep the best vote per id (first seen wins unless replacement has names)
        if rid not in votes:
            votes[rid] = rec

    # assemble records
    for rid, rest in agenda_ids.items():
        pref = rid.split("-")[0]
        if pref not in COMMITTEES:
            unknown_prefix[pref] += 1
        cm_prose = ""
        if rest is None:
            title = text_titles.get(rid, rid)
        else:
            title = rest
            m2 = re.match(r"(.{2,120}?),\s*re[:.\s]\s*(.+)$", rest)
            if m2:
                cm_prose, title = m2.group(1).strip(), m2.group(2).strip()
        title = re.sub(r"\s+", " ", title).strip(" .")[:240]
        rec = {"id": rid, "date": date, "cm": pref, "title": title}
        if rest is None:
            rec["ft"] = 1  # listed from the resolution text, not the agenda list
        if cm_prose and " and " in cm_prose.lower():
            rec["cm2"] = 1  # co-sponsored across committees
        blk = blocks.get(rid, "")
        caps = [clean_money(c) for c in CAP_RE.findall(blk)]
        caps = [c for c in caps if c]
        if caps:
            rec["cap"] = max(caps)
        else:
            ments = [clean_money(c) for c in MONEY_RE.findall(blk)]
            ments = sorted({c for c in ments if c}, reverse=True)
            if ments:
                rec["amt"] = ments[0]
                rec["amtn"] = len(ments)
        if rid in votes:
            rec["vote"] = votes[rid]
        if src_urls:
            meeting_src[date] = src_urls[0]
        resolutions[rid] = rec
        per_year[year]["res"] += 1
        per_year[year]["vote"] += 1 if rid in votes else 0
        per_year[year]["cap"] += 1 if "cap" in rec else 0
        per_year[year]["amt"] += 1 if ("cap" in rec or "amt" in rec) else 0
    per_year[year]["meet"] += 1

# ---- legislator-name canonicalization (name fidelity is a gate) -----------
def _editk(a, b, k=2):
    """True if levenshtein(a,b) <= k (small strings only)."""
    la, lb = len(a), len(b)
    if abs(la - lb) > k:
        return False
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        for j in range(1, lb + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1,
                         prev[j - 1] + (a[i - 1] != b[j - 1]))
        if min(cur) > k:
            return False
        prev = cur
    return prev[lb] <= k


def _edit2(a, b):
    return _editk(a, b, 2)


def canonicalize(resolutions):
    """Greedy, descending-frequency merge. The most frequent spelling of each
    legislator wins; anything that reads as a close spelling, a truncation, or
    a one-off typo of a bigger name is folded into it. Genuinely rare but
    distinct names survive untouched."""
    freq = Counter()

    def each_name(rec, fn):
        v = rec.get("vote")
        if not v:
            return
        for k in ("no_names", "abs_names"):
            if k in v:
                v[k] = [x for x in (fn(i) for i in v[k]) if x]
                if not v[k]:
                    del v[k]
        for k in ("mover", "second"):
            if k in v:
                f = fn(v[k])
                if f:
                    v[k] = f
                else:
                    del v[k]

    for r in resolutions.values():
        each_name(r, lambda x: (freq.update([x.strip(" .")]), x)[1])

    def key(n):                       # dots vanish for comparison (McK.imrnie)
        return n.replace(".", "").lower()

    canon, fixes = [], {}
    for n in sorted(freq, key=lambda x: -freq[x]):
        c0 = freq[n]
        # closest canonical name wins (NemL is 1 edit from Nemi but 3 from
        # Hill - first-match order must never decide this)
        cands = []
        for cn in canon:
            for d in (1, 2, 3):
                if _editk(key(n), key(cn), d):
                    break
            else:
                d = 99
            ok = (d <= 2 and freq[cn] >= 4 * c0)                  or (d == 3 and c0 <= 6 and freq[cn] >= 20 * c0)                  or (d <= 2 and c0 <= 2 and freq[cn] >= 3
                     and abs(len(key(n)) - len(key(cn))) <= 1)                  or (freq[cn] >= 5 * c0 and len(n) >= 2 and key(cn).startswith(key(n))
                     and sum(1 for x in canon if key(x).startswith(key(n))) == 1)
            if ok:
                cands.append((d, -freq[cn], cn))
        hit = min(cands)[2] if cands else None
        if hit:
            fixes[n] = hit
        elif name_shaped(n):
            canon.append(n)
        else:
            fixes[n] = None
    # leftover micro-fragments that mapped nowhere are debris, not people
    for n in list(canon):
        if freq[n] <= 2 and len(n) <= 4:
            canon.remove(n)
            fixes[n] = None

    HAND = {"McK": "McKimmie"}
    for h, target in HAND.items():
        if h in canon and target in canon:
            canon.remove(h)
            fixes[h] = target
    # resolve chains (X -> Y where Y itself was later fixed)
    for k2 in list(fixes):
        seen = set()
        while fixes.get(k2) in fixes and fixes[k2] not in seen:
            seen.add(fixes[k2])
            fixes[k2] = fixes[fixes[k2]]

    applied = {k: v for k, v in fixes.items() if v}
    dropped = [k for k, v in fixes.items() if v is None]
    if applied:
        print("name fixes:", dict(sorted(applied.items(), key=lambda kv: -freq[kv[0]])[:14]),
              "(%d total)" % len(applied))
    if dropped:
        print("junk name tokens dropped: %d (e.g. %s)" % (len(dropped), dropped[:5]))

    def fix(x):
        x2 = x.strip(" .")
        if x2 in fixes:
            return fixes[x2]
        return x2 if name_shaped(x2) else None

    for r in resolutions.values():
        each_name(r, fix)


canonicalize(resolutions)

# ---- gates ----------------------------------------------------------------
print("\nyear  meetings  resolutions  votes-matched  with-amounts")
total = 0
for y in sorted(per_year):
    c = per_year[y]
    total += c["res"]
    pct = 100 * c["vote"] // max(1, c["res"])
    apct = 100 * c["amt"] // max(1, c["res"])
    print(f"{y}   {c['meet']:>5}     {c['res']:>6}        {pct:>3}%           {apct:>3}%")
    assert c["res"] > 0, f"GATE: {y} parsed zero resolutions - format drift"
assert total > 1200, f"GATE: only {total} resolutions total (floor 1200)"
if gate_extras:
    print(f"note: {len(gate_extras)} resolutions listed from their text only (not on an agenda list)", gate_extras[:5])
if unknown_prefix:
    print("UNKNOWN committee prefixes:", dict(unknown_prefix))

# ---- summary + write ------------------------------------------------------
recs = sorted(resolutions.values(), key=lambda r: (r["date"], r["id"]))
n_vote = sum(1 for r in recs if "vote" in r)
n_unan = sum(1 for r in recs if r.get("vote", {}).get("noes") == 0 and "vote" in r)
noes_by = Counter()
for r in recs:
    for nm in r.get("vote", {}).get("no_names", []):
        noes_by[nm] += 1
summary = {
    "total": len(recs),
    "meetings": sum(per_year[y]["meet"] for y in per_year),
    "years": [min(per_year), max(per_year)],
    "vote_matched": n_vote,
    "unanimous": n_unan,
    "dissent": noes_by.most_common(12),
    "committees": COMMITTEES,
}
OUT.write_text(json.dumps({"summary": summary, "sources": meeting_src, "resolutions": recs},
                          separators=(",", ":")), encoding="utf-8")
kb = OUT.stat().st_size // 1024
print(f"\nwrote {OUT} ({kb} KB) - {len(recs)} resolutions, {summary['meetings']} meetings, "
      f"{n_vote} votes matched ({100*n_vote//max(1,len(recs))}%), "
      f"{n_unan} unanimous of voted ({100*n_unan//max(1,n_vote)}%)")
print("top dissenters:", noes_by.most_common(5))
