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

TOPIC_RULES = [
    ("s", "Symbolic & advocacy",
     r"in support|memorial|urg(?:e|ing)|proclaim|recogni|honor|commend|opposi|opposed"),
    ("c", "Contracts & bids",
     r"accept bid|reject bid|award|contract|change order|agreement|rfp|purchase|lease|procure"),
    ("p", "People & positions",
     r"appoint|hire|salary|position|reclassif|residency|retain|personnel|vacan"),
    ("g", "Grants & aid accepted",
     r"grant|accept.{0,24}fund|donation|stipend|\baid\b"),
    ("b", "Budget moves",
     r"budget|transfer|approp|amend.{0,20}fund|capital plan|fund balance"),
    ("l", "Legal & claims",
     r"settle|litigation|claim|lawsuit|stipulat|certiorari"),
    ("x", "Property & taxes",
     r"\btax\b|taxes|assess|foreclos|surplus|convey|easement|acquisition|in rem"),
]


def topic_of(title):
    t = title.lower()
    for code, _, pat in TOPIC_RULES:
        if re.search(pat, t):
            return code
    return "o"


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


# chart-of-account tokens inside resolution texts, e.g. A.07.9950.000.79010.10
# or CM.21.4322.415.74550.06 or bare A4310. OCR reads 1 as l inside codes.
CODE_RE = re.compile(r"\b([A-Z]{1,3})[.\s]?((?:[0-9l]{1,5}[.\s]){0,2}[0-9l]{4}(?:[.\s][0-9l.\s]{0,14})?)")

AMKIND = [
    ("cap", r"not\s+to\s+exceed|shall\s+not\s+exceed|up\s+to\s+the\s+amount|an?\s+amount\s+up\s+to"),
    ("inc", r"increase\s+(?:anticipated\s+)?(?:appropriat|revenue)"),
    ("dec", r"decrease\s+(?:anticipated\s+)?(?:appropriat|revenue)"),
    ("awd", r"award|lowest\s+responsible|successful\s+bidder"),
    ("bid", r"\bbid|proposal\s+received"),
    ("ret", r"return|reserve|refund"),
    ("rev", r"grant|reimburs|state\s+share|federal\s+share|county\s+share|revenue"),
]
AMKIND_RE = [(k, re.compile(pat, re.I)) for k, pat in AMKIND]


def acct_codes(block):
    """Unique fund+function codes cited in a resolution's text, first-seen order."""
    out, seen = [], set()
    FUNDS = {"A", "B", "CD", "CM", "CS", "D", "DM", "E", "EL", "F", "G", "H",
             "K", "L", "M", "MS", "S", "SF", "SL", "SS", "SW", "T", "V", "W"}
    for m in CODE_RE.finditer(block):
        fund = m.group(1)
        if fund not in FUNDS and not (fund[0] == "H" and len(fund) <= 3):
            continue   # H-prefixed capital funds carry suffixes (H661 etc.)
        digits = re.sub(r"[^0-9l]", " ", m.group(2)).replace("l", "1").split()
        fn = next((d for d in digits if len(d) == 4 and 1000 <= int(d) <= 9999), None)
        if not fn:
            # glued form like A4310 / A40599: first 4 digits of the first run
            run = digits[0] if digits else ""
            if len(run) >= 4 and 1000 <= int(run[:4]) <= 9999:
                fn = run[:4]
        if not fn:
            continue
        # years masquerade as functions: accept 1990-2029 only when the code
        # has real dotted structure (A.16.1680.000...), never from bare tokens
        if 1990 <= int(fn) <= 2029 and len(digits) < 2:
            continue
        code = fund + fn
        if code not in seen:
            seen.add(code)
            out.append(code)
        if len(out) >= 8:
            break
    return out


def amounts_ctx(block):
    """Every dollar figure with its classified clause and a short snippet."""
    rows = []
    for m in MONEY_RE.finditer(block):
        v = clean_money(m.group(1))
        if v is None:
            continue
        pre = block[max(0, m.start() - 220):m.start()]
        kind = "m"
        for k, kre in AMKIND_RE:
            if kre.search(pre[-90:] if k in ("cap", "awd", "bid", "ret") else pre):
                kind = k
                break
        snip = re.sub(r"\s+", " ", pre[-64:]).strip()
        snip = re.sub(r"^\S{1,8}\s", "", snip) if len(snip) > 40 else snip
        rows.append([v, kind, snip])
    # de-dupe identical value+kind (bid tables repeat); keep first snippet
    seen, out = set(), []
    for r in rows:
        key = (r[0], r[1])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    prio = {"cap": 0, "inc": 1, "dec": 1, "awd": 2, "ret": 3, "rev": 4, "bid": 5, "m": 6}
    out.sort(key=lambda r: (prio.get(r[1], 9), -r[0]))
    # the same table cell often reads under several kinds - keep one, except
    # inc/dec pairs, whose matching values ARE the story of a transfer
    seen_v, final = set(), []
    for r in out:
        if r[1] in ("inc", "dec") or r[0] not in seen_v:
            seen_v.add(r[0])
            final.append(r)
    return final


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


# Anchored: these open ADMINISTRATIVE lines. A real title may itself begin
# "RESOLUTION URGING..." - only the header forms (RESOLUTION # / No.) are noise.
BOILER_RE = re.compile(
    r"^(?:RESOLUTION\s*(?:#|NO\.?\s|No\.)|LEGISLATIVE\s+ACTION|COMMITTEE\s+ACTION|"
    r"APPROVED|REVIEWED|WHEREAS|RESOLVED|COUNTY\s+OF\s+NIAGARA|STATE\s+OF\s+NEW\s+YORK|"
    r"DATED|AYES|NOES|PAGE\s*\d|Page\s*\d|MOVED\s+BY|ADOPTED|From:)", re.I)


def _capsy(t):
    letters = [c for c in t if c.isalpha()]
    return letters and sum(c.isupper() for c in letters) / len(letters) >= 0.7


def block_title(block):
    """The heading of a resolution's text: the first substantially-uppercase
    line, joined with up to two continuation lines (titles wrap)."""
    lines = block.splitlines()[:60]
    for i, ln in enumerate(lines):
        t = ln.strip()
        if not (12 <= len(t) <= 160) or not _capsy(t) or BOILER_RE.match(t):
            continue
        parts = [t]
        for nxt in lines[i + 1:i + 3]:
            n = nxt.strip()
            if 3 <= len(n) <= 160 and _capsy(n) and not BOILER_RE.match(n):
                parts.append(n)
            else:
                break
        return re.sub(r"\s+", " ", " ".join(parts))[:240]
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
floor_only = []           # ids recovered from minutes alone
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
            if re.match(r"Page\s*\d", rest, re.I):
                continue   # "IF-126-25 Page 2" is a sheet marker, not a title
            if rid in agenda_ids and ", re" not in rest:
                continue
            agenda_ids[rid] = rest

    if not agenda_ids and not mt["minutes"]:
        continue   # nothing parseable at all; minutes alone can still carry votes

    # full-text blocks for amounts. Two header eras: "RESOLUTION# IF-172-25"
    # (id inline) and 2021+ packets where "RESOLUTION#" is blank and the id is
    # a stamp pdftotext drops - those blocks are title-keyed against the
    # meeting's own agenda list instead.
    blocks = {}
    # Headers appear three ways: "RESOLUTION# IF-172-25" (inline id),
    # "DATE: ... RESOLUTION# __I_F_-2_1_0_-2_4_" (a fill-in stamp - the id
    # survives if you de-underscore it), and a bare "RESOLUTION#" whose id
    # was a graphic stamp (title-keyed below). Case-sensitive + '#' so prose
    # references ("pursuant to Resolution No. X") never split a block.
    hdr = list(re.finditer(r"RESOLUTION\s*#", body_text))

    def _norm_t(t):
        return re.sub(r"[^A-Z0-9]", "", (t or "").upper())

    agenda_norm = {}
    for _rid, _rest in agenda_ids.items():
        _t = _rest
        _m2 = re.match(r"(.{2,120}?),\s*re[:.\s]\s*(.+)$", _rest or "")
        if _m2:
            _t = _m2.group(2)
        agenda_norm[_rid] = _norm_t(_t)[:64]

    for i, h in enumerate(hdr):
        end = hdr[i + 1].start() if i + 1 < len(hdr) else min(len(body_text), h.end() + 20000)
        btext = body_text[h.end():end]
        rid = None
        tail = re.sub(r"[_\s]", "", btext[:60])
        # squashed text loses word boundaries (IF-210-24APPROVED), so \b-free
        idm = re.search(r"(?<![A-Z0-9])([A-Z]{1,4})-(\d{2,4})-(\d{2})(?![0-9])", tail[:26])
        if idm:
            rid = norm_id(idm)
        if rid is None:
            bt = _norm_t(block_title(btext))[:64]
            if len(bt) >= 12:
                cands = [r2 for r2, n in agenda_norm.items()
                         if n[:28] == bt[:28] or n.startswith(bt[:32]) or bt.startswith(n[:32])]
                if len(cands) == 1:
                    rid = cands[0]
        if rid is None:
            continue
        blocks.setdefault(rid, "")
        blocks[rid] += btext
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
    win_texts = {}
    for i, (pos, rid) in enumerate(id_pos):
        end = id_pos[i + 1][0] if i + 1 < len(id_pos) else min(len(min_text), pos + 12000)
        window = min_text[pos:end]
        win_texts.setdefault(rid, window)
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

    # resolutions voted in the minutes but absent from every packet list:
    # late floor items. The minutes reprint their text, so title and amounts
    # come from there; flagged ft=2 for the drill note.
    for rid, v in votes.items():
        if rid in agenda_ids or rid.rsplit("-", 1)[1] != str(year)[2:]:
            continue
        win = win_texts.get(rid, "")
        t = block_title(win)
        agenda_ids[rid] = None
        text_titles[rid] = t or "(title not machine-readable in the county documents)"
        blocks.setdefault(rid, win)
        floor_only.append(rid)

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
        rec = {"id": rid, "date": date, "cm": pref, "title": title,
               "tp": topic_of(title)}
        if rest is None:
            rec["ft"] = 2 if rid in floor_only else 1
        if cm_prose and " and " in cm_prose.lower():
            # keep the actual sponsoring-committee prose from the agenda line
            rec["cms"] = re.sub(r"\s+", " ", cm_prose).strip(" .,")[:90]
        blk = blocks.get(rid, "")
        caps = [clean_money(c) for c in CAP_RE.findall(blk)]
        caps = [c for c in caps if c]
        if caps:
            rec["cap"] = max(caps)
        am = amounts_ctx(blk)
        if am:
            if "cap" not in rec:
                rec["amt"] = max(r0[0] for r0 in am)
            rec["amtn"] = len(am)
            rec["am"] = am[:10]
        ac = acct_codes(blk)
        if ac:
            rec["ac"] = ac
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
if floor_only:
    print(f"note: {len(floor_only)} late floor resolutions recovered from minutes alone")
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
topic_counts = Counter(r["tp"] for r in recs)
summary = {
    "topics": [[c, lbl, topic_counts.get(c, 0)] for c, lbl, _ in TOPIC_RULES]
              + [["o", "Everything else", topic_counts.get("o", 0)]],
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
