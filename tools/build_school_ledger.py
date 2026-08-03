"""The school district's full ledger: North Tonawanda City School District
at school.html, carrying the complete Public Ledger machinery - scrubbable
trend, the three-tab category modal (cross-filtered breakdown, anomaly
trend with year decomposition, composition), per-account histories,
compare-two-years, the method in ink.

School-specific: fiscal years run July-June (stated everywhere it
matters), 'What the state sends' replaces county aid (State Aid is half
the district's revenue), and the neighbours are the county's ten school
districts - totals only, honestly, because AFRs carry no enrollment.

Template DERIVED from build_county.py's at build time, same as the muni
ledgers - one source of truth, asserted surgery, drift fails loud.
"""
import csv
import io
import json
import os
import re
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, "data", "osc", "schooldistrict_all_years.zip")
NTSD = "290536000000"
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
SCHEMA_BREAK = 2013


def section_of(row):
    if "ACCOUNT_CODE_SECTION" in row:
        return row["ACCOUNT_CODE_SECTION"]
    return SEGMENT_MAP.get(row.get("FINANCIAL_STATEMENT_SEGMENT", ""), "")


SMALL = {"and", "of", "for", "the", "to", "in", "on", "or", "a"}


def title_label(s):
    if not s:
        return s
    words = (s.title() if s == s.upper() else s).split()
    return " ".join(w if i == 0 or w.lower() not in SMALL else w.lower()
                    for i, w in enumerate(words))


def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------- one pass over the school zip ------------------------------
z = zipfile.ZipFile(ZIP)
raw, series = [], {}
peers = {}                                   # district -> {yr: exp}
for name in sorted(n for n in z.namelist() if n.endswith("_SchoolDistrict.csv")):
    yr = int(name.split("_")[0])
    rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
    tot = {"REVENUE": 0.0, "EXPENDITURE": 0.0}
    found = False
    for r in rd:
        if (r.get("COUNTY") or "") != "Niagara":
            continue
        sec = section_of(r)
        if sec not in ("REVENUE", "EXPENDITURE"):
            continue
        amt = float(r["AMOUNT"] or 0)
        if sec == "EXPENDITURE":
            d = peers.setdefault(r["ENTITY_NAME"], {})
            d[yr] = d.get(yr, 0) + amt
        if r["MUNICIPAL_CODE"] != NTSD:
            continue
        found = True
        tot[sec] += amt
        raw.append((yr, 0 if sec == "REVENUE" else 1,
                    r.get("LEVEL_1_CATEGORY"), r.get("LEVEL_2_CATEGORY"),
                    r.get("OBJECT_OF_EXPENDITURE"), r.get("ACCOUNT_CODE_NARRATIVE"),
                    (r.get("ACCOUNT_CODE") or "").strip(), round(amt, 2)))
    if found:
        series[yr] = {"rev": round(tot["REVENUE"], 2), "exp": round(tot["EXPENDITURE"], 2)}

yrs = sorted(series)
assert yrs == list(range(yrs[0], yrs[-1] + 1)), "school filing gap"
for y in yrs:
    assert series[y]["rev"] > 20_000_000, "school year %d implausible" % y
latest = yrs[-1]

dicts = {"l1": [], "l2": [], "obj": [], "narr": []}
didx = {k: {} for k in dicts}


def di(kind, val):
    val = title_label((val or "").strip()) or "Unclassified"
    m = didx[kind]
    if val not in m:
        m[val] = len(dicts[kind])
        dicts[kind].append(val)
    return m[val]


flows = [[yr, sec, di("l1", l1), di("l2", l2), di("obj", obj), di("narr", narr),
          acct, amt] for yr, sec, l1, l2, obj, narr, acct, amt in raw]
cats = {0: {}, 1: {}}
for f in flows:
    c = cats[f[1]].setdefault(f[0], {})
    k = dicts["l1"][f[2]]
    c[k] = c.get(k, 0) + f[7]

payload = {
    "years": yrs,
    "rev": [series[y]["rev"] for y in yrs],
    "exp": [series[y]["exp"] for y in yrs],
    "latest": latest,
    "revByYear": {str(y): sorted(([k, round(v, 2)] for k, v in cats[0].get(y, {}).items()),
                                 key=lambda x: -x[1]) for y in yrs},
    "expByYear": {str(y): sorted(([k, round(v, 2)] for k, v in cats[1].get(y, {}).items()),
                                 key=lambda x: -x[1]) for y in yrs},
    "dict": dicts,
    "flows": flows,
    "schemaBreak": SCHEMA_BREAK,
    "peers": [],
    "peerYear": latest,
}

# state aid series + latest share
aid_vals = []
for y in yrs:
    aid_vals.append(round(cats[0].get(y, {}).get("State Aid", 0), 2))
assert aid_vals[-1] > 10_000_000, "State Aid category not found"
aid_share = aid_vals[-1] / series[latest]["rev"] * 100

rl, el2 = series[latest]["rev"], series[latest]["exp"]
net = rl - el2

# ---------------- derive the template (same trick as the munis) -------------
src = open(os.path.join(ROOT, "tools", "build_county.py"), encoding="utf-8").read()
_i = src.find('TEMPLATE = r"""')
assert _i >= 0
_i += len('TEMPLATE = r"""')
_j = src.find('"""', _i)
tpl = src[_i:_j]


def cut(s, start, end, label):
    i = s.find(start)
    assert i >= 0, "cut anchor: " + label
    j = s.find(end, i)
    assert j >= 0, "cut end: " + label
    return s[:i] + s[j + len(end):]


def cut_upto(s, start, upto, label):
    i = s.find(start)
    assert i >= 0, "cut anchor: " + label
    j = s.find(upto, i)
    assert j > i, "cut boundary: " + label
    return s[:i] + s[j:]


def swap(s, a, b, label):
    assert a in s, "swap anchor: " + label
    return s.replace(a, b, 1)


tpl = cut_upto(tpl, '  <section id="peers">', '  <section id="method">', "county-sections")
tpl = swap(tpl, '<a href="#peers">Nine counties</a>\n    <a href="#shared">Sales tax, shared</a>\n'
           '    <a href="#budget">Budget vs actual</a>', '<a href="#aid">State aid</a>\n'
           '    <a href="#districts">Ten districts</a>', "rail")
tpl = cut(tpl, "/* ---- peers with metric toggle (ported) ---- */",
          "render('exp');\n})();", "peers-js")
tpl = swap(tpl, "<title>Public Ledger — County Edition — Niagara County</title>",
           "<title>Public Ledger — North Tonawanda City School District</title>", "title")
tpl = swap(tpl, '<span class="edition">COUNTY EDITION</span>',
           '<span class="edition">SCHOOL LEDGER</span>', "chip")
tpl = swap(tpl, 'Niagara County · filings <b>__Y0__–__Y1__</b>',
           'North Tonawanda City School District · filings <b>FY__Y0__–FY__Y1__</b>', "meta")
tpl = swap(tpl, "<h1>Where Niagara County&rsquo;s money comes from, and where it goes</h1>",
           "<h1>Where the school district&rsquo;s money comes from, and where it goes</h1>", "h1")
tpl = swap(tpl, """  <p class="lede">__YEARS__ years of the county&rsquo;s own annual filings to the state —
    self-reported, desk-reviewed but not audited by OSC. <b>No checkbook here, and honestly so:</b>
    the county does not publish its claims abstract, so this edition tells the filings story.
    The <a href="./">city edition</a> has a register because North Tonawanda publishes its warrants.</p>""",
           """  <p class="lede">The district that levies <b>the biggest line on a North Tonawanda tax
    bill</b> — a separate government with its own elected board and its own budget vote — profiled
    from __YEARS__ years of its own filings to the state. <b>School fiscal years run July–June:</b>
    &ldquo;FY__LATEST__&rdquo; is July __PREVCAL__ through June __LATEST__. Same method as every
    page of <a href="./">Public Ledger</a>; drill any category to the account line.</p>""", "lede")
tpl = swap(tpl, '<span class="k">Revenue · __LATEST__</span>',
           '<span class="k">Revenue · FY__LATEST__</span>', "hk1")
tpl = swap(tpl, '<span class="k">Expenditure · __LATEST__</span>',
           '<span class="k">Expenditure · FY__LATEST__</span>', "hk2")
tpl = swap(tpl, '<span class="k">Net · __LATEST__ filing</span>',
           '<span class="k">Net · FY__LATEST__ filing</span>', "hk3")
tpl = swap(tpl, """    <div class="hfoot">A single-year filing gap is not a deficit claim — fund balance, transfers
      and capital timing all argue. The county runs roughly <span class="num">__SCALE__&times;</span>
      North Tonawanda&rsquo;s budget.</div>""",
           """    <div class="hfoot">A single-year filing gap is not a deficit claim — fund balance, transfers
      and capital timing all argue. The district spends <b>more than the city itself</b> —
      <span class="num">$__PERBILL__</span> of every $1,000 of a city tax bill is the school levy.</div>""",
           "hfoot")
tpl = swap(tpl, 'aria-label="Niagara County revenue and expenditure, __Y0__ to __Y1__"',
           'aria-label="School district revenue and expenditure, FY__Y0__ to FY__Y1__"', "aria")
tpl = swap(tpl, "  var step=narrow?200000000:100000000;",
           """  function niceStep(m2){
    var t=m2/(narrow?3:5), p=Math.pow(10,Math.floor(Math.log(t)/Math.LN10));
    var c=t/p;
    return (c>=5?5:c>=2.5?2.5:c>=2?2:1)*p;
  }
  var step=niceStep(max);""", "step")
tpl = swap(tpl, "'\" text-anchor=\"end\" font-size=\"'+fs+'\">$'+(g/1000000)+'M</text>');",
           "'\" text-anchor=\"end\" font-size=\"'+fs+'\">'+(g>=995000?'$'+((g/1e6)%1?"
           "(g/1e6).toFixed(1):(g/1e6))+'M':'$'+Math.round(g/1e3)+'K')+'</text>');", "ticks")
tpl = swap(tpl, "' · '+year+' filing · Niagara County';",
           "' · FY'+year+' · the school district';", "eyebrow")
tpl = swap(tpl, "document.getElementById('mEyebrow').textContent='Annual filings · Niagara County';",
           "document.getElementById('mEyebrow').textContent='Annual filings · the school district';",
           "cmp-eyebrow")
tpl = swap(tpl, """    <p class="lede" style="color:var(--muted)">Built exactly like the city edition. Parsed from the
      Comptroller&rsquo;s statewide county files — <span class="num">__NROWS__</span> account-level
      rows for Niagara County, __Y0__–__Y1__ — joined on municipal code (never entity name),
      flows only, balance-sheet rows excluded.""",
           """    <p class="lede" style="color:var(--muted)">Built exactly like every Public Ledger edition. Parsed
      from the Comptroller&rsquo;s statewide school-district files — <span class="num">__NROWS__</span>
      account-level rows for this district, FY__Y0__–FY__Y1__ — joined on municipal code (never
      entity name), flows only, balance-sheet rows excluded.""", "method")
tpl = swap(tpl, "Peer populations are the 2020\n      Census (P1).",
           "School fiscal years run July–June; each year label is the June it ends.", "fy-note")
tpl = swap(tpl, """    <p>Part of <a href="./">Public Ledger</a> — the City of North Tonawanda edition carries the
      reconciled warrant register, council briefs and the exception report. The
      <a href="atlas.html">County Atlas</a> profiles all twenty municipalities inside the county.</p>""",
           """    <p>Part of <a href="./">Public Ledger</a>. This district is the school slice of
      <a href="./#taxes">the city page&rsquo;s tax-bill section</a>; the
      <a href="atlas.html">County Atlas</a> and <a href="county.html">County Edition</a> carry
      the other layers of government.</p>""", "foot")
tpl = swap(tpl, '<div class="backrow"><a href="./">&larr; Public Ledger — the city edition</a></div>',
           '<div class="backrow"><a href="./#taxes">&larr; back to Your tax bill</a></div>', "backrow")
tpl = swap(tpl, '  <section id="method">', """  <section id="aid">
    <h2>What the state sends</h2>
    <div class="panel">
      <h3>State aid to the district <span class="tot num">__AIDLATEST__</span></h3>
      <div class="sub">Level-1 &ldquo;State Aid&rdquo; as the district filed it, FY__Y0__–FY__Y1__ —
        <span class="num">__AIDSHARE__%</span> of FY__LATEST__ revenue. The local levy covers most of
        the rest; the split is the whole story of school funding.</div>
      <svg viewBox="0 0 260 44" preserveAspectRatio="none" style="display:block;width:100%;max-width:640px;height:52px">
        <path d="__AIDSPARK__ L260 44 L0 44 Z" fill="var(--rev)" opacity=".10"></path>
        <path d="__AIDSPARK__" fill="none" stroke="var(--rev)" stroke-width="1.6" vector-effect="non-scaling-stroke"></path>
      </svg>
    </div>
  </section>

  <section id="districts">
    <h2>Ten districts, one county</h2>
    <div class="panel">
      <div class="sub">Every school district in Niagara County by latest-filed expenditure — totals
        as filed. District sizes differ and the AFR carries no enrollment, so these are not
        per-student figures.</div>
      <div class="rank">__DISTRICTS__</div>
    </div>
  </section>

  <section id="method">""", "aid+districts")

# ---------------- assemble ---------------------------------------------------


def spark_path(vals, W=260, H=44):
    mx = max(vals) or 1
    return " ".join("%s%.1f %.1f" % ("L" if i else "M", W * i / (len(vals) - 1),
                                     H - 3 - (H - 8) * (v / mx))
                    for i, v in enumerate(vals))


dist_rows = []
latest_by = {d: max(m) for d, m in peers.items()}
ranked = sorted(peers.items(), key=lambda kv: -kv[1][latest_by[kv[0]]])
mx = ranked[0][1][latest_by[ranked[0][0]]]
for dname, m in ranked:
    v = m[latest_by[dname]]
    me = "North Tonawanda" in dname
    short = dname.replace(" School District", "").replace(" City", " City") \
                 .replace(" Central", "")
    dist_rows.append(
        '<div class="rk"><span class="lb"{hl}>{n}</span>'
        '<span class="vl num"{hl2}>${v:,.0f}</span>'
        '<span class="tr"><i style="width:{w:.1f}%;background:{bg}"></i></span>'
        '<span class="pc num">FY{y} filing</span></div>'.format(
            hl=' style="font-weight:700"' if me else ' style="color:var(--muted)"',
            hl2='' if me else ' style="color:var(--muted)"',
            n=esc(short), v=v, w=v / mx * 100, y=latest_by[dname],
            bg="var(--exp)" if me else "var(--rule-strong)"))

out = (tpl
       .replace("__AIDLATEST__", "${:,.0f}".format(aid_vals[-1]))
       .replace("__AIDSHARE__", "%.0f" % aid_share)
       .replace("__AIDSPARK__", spark_path(aid_vals))
       .replace("__DISTRICTS__", "".join(dist_rows))
       .replace("__PERBILL__", "453")          # 11.01 of 24.31 per $1,000
       .replace("__PREVCAL__", str(latest - 1))
       .replace("__Y0__", str(yrs[0])).replace("__Y1__", str(latest))
       .replace("__YEARS__", str(len(yrs)))
       .replace("__LATEST__", str(latest))
       .replace("__NETCOL__", "var(--bad)" if net < 0 else "var(--ok)")
       .replace("__PEERYEAR__", str(latest))
       .replace("__NROWS__", "{:,}".format(len(flows)))
       .replace("__PAYLOAD__", json.dumps(payload, separators=(",", ":"))))

path = os.path.join(ROOT, "school.html")
open(path, "w", encoding="utf-8").write(out)
print("wrote %s (%.0f KB) - FY%d-FY%d, %s flows, aid $%s (%.0f%%), %d districts"
      % (path, os.path.getsize(path) / 1024, yrs[0], latest, "{:,}".format(len(flows)),
         "{:,.0f}".format(aid_vals[-1]), aid_share, len(peers)))
