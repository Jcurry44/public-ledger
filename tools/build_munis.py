"""Twenty ledgers: a full Public Ledger page for every city, town and
village in Niagara County, at m/<class>-<slug>.html.

Each page is the County Edition's machinery - scrubbable trend, year
panels, the three-tab category modal with cross-filtering and year
decomposition, per-account histories, compare-two-years, the method set
in ink - pointed at that municipality's own filings. The county-specific
sections (shared sales tax, budget-vs-actual) are cut; in their place:
what the county sends this government (its own A1120 filings), and its
same-class neighbours.

One source of truth: the template is DERIVED from build_county.py's at
build time by anchored surgery, so the heavy JS never forks. Every cut
is asserted - if the county template drifts, this build fails loud
rather than shipping a half-derived page.
"""
import csv
import io
import json
import os
import re
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
SCHEMA_BREAK = 2013
CLASSES = [("city", "City"), ("town", "Town"), ("village", "Village")]


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


# ---------------- one pass over the three class zips ------------------------
munis = {}      # entity -> {cls, code, rows:[raw], series:{yr:{rev,exp}}}
for cls, tag in CLASSES:
    z = zipfile.ZipFile(os.path.join(ROOT, "data", "osc", cls + "_all_years.zip"))
    for name in sorted(n for n in z.namelist() if n.endswith("_%s.csv" % tag)):
        yr = int(name.split("_")[0])
        rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
        for r in rd:
            if (r.get("COUNTY") or "") != "Niagara":
                continue
            sec = section_of(r)
            if sec not in ("REVENUE", "EXPENDITURE"):
                continue
            ent = r["ENTITY_NAME"]
            m = munis.setdefault(ent, {"cls": cls, "code": r["MUNICIPAL_CODE"],
                                       "raw": [], "series": {}})
            amt = float(r["AMOUNT"] or 0)
            yy = m["series"].setdefault(yr, {"rev": 0.0, "exp": 0.0})
            yy["rev" if sec == "REVENUE" else "exp"] += amt
            m["raw"].append((yr, 0 if sec == "REVENUE" else 1,
                             r.get("LEVEL_1_CATEGORY"), r.get("LEVEL_2_CATEGORY"),
                             r.get("OBJECT_OF_EXPENDITURE"), r.get("ACCOUNT_CODE_NARRATIVE"),
                             (r.get("ACCOUNT_CODE") or "").strip(), round(amt, 2)))

assert len(munis) == 20, "expected 20 municipalities, found %d" % len(munis)


def shortname(ent):
    return (ent.replace("City of ", "").replace("Town of ", "")
            .replace("Village of ", ""))


def slug(ent, cls):
    return cls + "-" + re.sub(r"[^a-z0-9]+", "-", shortname(ent).lower()).strip("-")


# ---------------- derive the page template from the county's ----------------
src = open(os.path.join(ROOT, "tools", "build_county.py"), encoding="utf-8").read()
_i = src.find('TEMPLATE = r"""')
assert _i >= 0, "county TEMPLATE start missing"
_i += len('TEMPLATE = r"""')
_j = src.find('"""', _i)
assert _j > _i, "county TEMPLATE end missing"
tpl = src[_i:_j]


def cut(s, start, end, label):
    i = s.find(start)
    assert i >= 0, "cut anchor missing: " + label
    j = s.find(end, i)
    assert j >= 0, "cut end missing: " + label
    return s[:i] + s[j + len(end):]


def swap(s, a, b, label):
    assert a in s, "swap anchor missing: " + label
    return s.replace(a, b, 1)


def cut_upto(s, start, upto, label):
    """Remove [start, upto), keeping the upto anchor itself."""
    i = s.find(start)
    assert i >= 0, "cut anchor missing: " + label
    j = s.find(upto, i)
    assert j > i, "cut boundary missing: " + label
    return s[:i] + s[j:]


# county-only sections out: peers, shared and budget all sit between the
# sales-tax section start and the method section
tpl = cut_upto(tpl, '  <section id="peers">', '  <section id="method">', "county-sections")
# their rail entries; the neighbours/aid sections take their place
tpl = swap(tpl, '<a href="#peers">Nine counties</a>\n    <a href="#shared">Sales tax, shared</a>\n'
           '    <a href="#budget">Budget vs actual</a>', '<a href="#aid">County aid</a>\n'
           '    <a href="#neighbors">Neighbours</a>', "rail")
# peers JS block out
tpl = cut(tpl, "/* ---- peers with metric toggle (ported) ---- */",
          "render('exp');\n})();", "peers-js")
# identity swaps
tpl = swap(tpl, "<title>Public Ledger — County Edition — Niagara County</title>",
           "<title>Public Ledger — __TITLE__</title>", "title")
tpl = swap(tpl, '<span class="edition">COUNTY EDITION</span>',
           '<span class="edition">__CHIP__</span>', "chip")
tpl = swap(tpl, 'Niagara County · filings <b>__Y0__–__Y1__</b>',
           '__TITLE__ · filings <b>__Y0__–__Y1__</b>', "meta")
tpl = swap(tpl, "<h1>Where Niagara County&rsquo;s money comes from, and where it goes</h1>",
           "<h1>Where __POSS__ money comes from, and where it goes</h1>", "h1")
tpl = swap(tpl, """  <p class="lede">__YEARS__ years of the county&rsquo;s own annual filings to the state —
    self-reported, desk-reviewed but not audited by OSC. <b>No checkbook here, and honestly so:</b>
    the county does not publish its claims abstract, so this edition tells the filings story.
    The <a href="./">city edition</a> has a register because North Tonawanda publishes its warrants.</p>""",
           """  <p class="lede">__YEARS__ years of __POSS2__ own annual filings to the state — self-reported,
    desk-reviewed but not audited by OSC, parsed on the same method as every page of
    <a href="../">Public Ledger</a>. No checkbook here: this government does not publish an
    itemised claims register, so this is the filings story — complete, and drillable to the
    account line.</p>""", "lede")
tpl = swap(tpl, """    <div class="hfoot">A single-year filing gap is not a deficit claim — fund balance, transfers
      and capital timing all argue. The county runs roughly <span class="num">__SCALE__&times;</span>
      North Tonawanda&rsquo;s budget.</div>""",
           """    <div class="hfoot">A single-year filing gap is not a deficit claim — fund balance, transfers
      and capital timing all argue. __RANKLINE__</div>""", "hfoot")
tpl = swap(tpl, "aria-label=\"Niagara County revenue and expenditure, __Y0__ to __Y1__\"",
           "aria-label=\"__TITLE__ revenue and expenditure, __Y0__ to __Y1__\"", "aria")
# adaptive gridline step (a village axis is $300K, a city's is $60M)
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
# modal eyebrow names the muni
tpl = swap(tpl, "' · '+year+' filing · Niagara County';",
           "' · '+year+' filing · __SHORT__';", "eyebrow")
tpl = swap(tpl, "document.getElementById('mEyebrow').textContent='Annual filings · Niagara County';",
           "document.getElementById('mEyebrow').textContent='Annual filings · __SHORT__';", "cmp-eyebrow")
# method text
tpl = swap(tpl, """    <p class="lede" style="color:var(--muted)">Built exactly like the city edition. Parsed from the
      Comptroller&rsquo;s statewide county files — <span class="num">__NROWS__</span> account-level
      rows for Niagara County, __Y0__–__Y1__ — joined on municipal code (never entity name),
      flows only, balance-sheet rows excluded.""",
           """    <p class="lede" style="color:var(--muted)">Built exactly like every Public Ledger edition. Parsed
      from the Comptroller&rsquo;s statewide __CLS__ files — <span class="num">__NROWS__</span>
      account-level rows for __SHORT__, __Y0__–__Y1__ — joined on municipal code (never entity
      name), flows only, balance-sheet rows excluded.""", "method")
# fonts path + foot links from inside m/
tpl = swap(tpl, "src:url(fonts/Fraunces-600-latin.woff2)", "src:url(../fonts/Fraunces-600-latin.woff2)", "font")
tpl = swap(tpl, """    <p>Part of <a href="./">Public Ledger</a> — the City of North Tonawanda edition carries the
      reconciled warrant register, council briefs and the exception report. The
      <a href="atlas.html">County Atlas</a> profiles all twenty municipalities inside the county.</p>""",
           """    <p>Part of <a href="../">Public Ledger</a>. Companions: <a href="../atlas.html">the County
      Atlas</a> — all twenty municipalities — and <a href="../county.html">the County Edition</a>,
      where this government&rsquo;s share of the county sales tax is reconciled against the
      county&rsquo;s own line.</p>""", "foot")
tpl = swap(tpl, '<div class="backrow"><a href="./">&larr; Public Ledger — the city edition</a></div>',
           '<div class="backrow"><a href="../atlas.html">&larr; the County Atlas</a></div>', "backrow")
# the two new sections, before method
tpl = swap(tpl, '  <section id="method">', """  <section id="aid">
    <h2>What the county sends</h2>
    <div class="panel">
      <h3>County sales tax, shared to __SHORT__ <span class="tot num">__AIDLATEST__</span></h3>
      <div class="sub">Account A1120, &ldquo;Non-Property Tax Distribution by County&rdquo;, as this
        government filed it, __AIDY0__–__AIDY1__. The county-side line reconciles on
        <a href="../county.html#shared">the County Edition</a>.</div>
      <svg viewBox="0 0 260 44" preserveAspectRatio="none" style="display:block;width:100%;max-width:640px;height:52px">
        <path d="__AIDSPARK__ L260 44 L0 44 Z" fill="var(--exp)" opacity=".10"></path>
        <path d="__AIDSPARK__" fill="none" stroke="var(--exp)" stroke-width="1.6" vector-effect="non-scaling-stroke"></path>
      </svg>
    </div>
  </section>

  <section id="neighbors">
    <h2>Same class, same county</h2>
    <div class="panel">
      <div class="sub">Every __CLS__ in Niagara County by latest-filed expenditure — totals as filed,
        not per resident; sizes differ. Select one to open its ledger.</div>
      <div class="rank">__SIBLINGS__</div>
    </div>
  </section>

  <section id="method">""", "aid+neighbors")

MUNI_TEMPLATE = tpl


def spark_path(vals, W=260, H=44):
    mx = max(vals) or 1
    return " ".join("%s%.1f %.1f" % ("L" if i else "M", W * i / (len(vals) - 1),
                                     H - 3 - (H - 8) * (v / mx))
                    for i, v in enumerate(vals))


# class rank lines for the hero foot
by_cls = defaultdict(list)
for ent, m in munis.items():
    latest = max(m["series"])
    by_cls[m["cls"]].append((ent, m["series"][latest]["exp"]))
for cls in by_cls:
    by_cls[cls].sort(key=lambda x: -x[1])

CLS_WORD = {"city": "city", "town": "town", "village": "village"}
ORD = ["largest", "second-largest", "third-largest", "fourth-largest", "fifth-largest",
       "sixth-largest", "seventh-largest", "eighth-largest", "ninth-largest",
       "tenth-largest", "eleventh-largest", "twelfth-largest"]

os.makedirs(os.path.join(ROOT, "m"), exist_ok=True)
built = []
for ent, mu in sorted(munis.items()):
    cls = mu["cls"]
    dicts = {"l1": [], "l2": [], "obj": [], "narr": []}
    didx = {k: {} for k in dicts}

    def di(kind, val):
        val = title_label((val or "").strip()) or "Unclassified"
        d = didx[kind]
        if val not in d:
            d[val] = len(dicts[kind])
            dicts[kind].append(val)
        return d[val]

    flows = [[yr, sec, di("l1", l1), di("l2", l2), di("obj", obj), di("narr", narr),
              acct, amt] for yr, sec, l1, l2, obj, narr, acct, amt in mu["raw"]]
    yrs = sorted(mu["series"])
    assert yrs == list(range(yrs[0], yrs[-1] + 1)), ent + " has a filing gap"
    cats = {0: {}, 1: {}}
    for f in flows:
        c = cats[f[1]].setdefault(f[0], {})
        k = dicts["l1"][f[2]]
        c[k] = c.get(k, 0) + f[7]
    payload = {
        "years": yrs,
        "rev": [round(mu["series"][y]["rev"], 2) for y in yrs],
        "exp": [round(mu["series"][y]["exp"], 2) for y in yrs],
        "latest": yrs[-1],
        "revByYear": {str(y): sorted(([k, round(v, 2)] for k, v in cats[0].get(y, {}).items()),
                                     key=lambda x: -x[1]) for y in yrs},
        "expByYear": {str(y): sorted(([k, round(v, 2)] for k, v in cats[1].get(y, {}).items()),
                                     key=lambda x: -x[1]) for y in yrs},
        "dict": dicts,
        "flows": flows,
        "schemaBreak": SCHEMA_BREAK,
        "peers": [],
        "peerYear": yrs[-1],
    }
    latest = yrs[-1]
    rl, el2 = mu["series"][latest]["rev"], mu["series"][latest]["exp"]
    net = rl - el2

    aid = {y: 0.0 for y in yrs}
    for f in flows:
        if f[1] == 0 and f[6].startswith("A1120"):
            aid[f[0]] += f[7]
    aid_vals = [aid[y] for y in yrs]

    sibs = by_cls[cls]
    rank = [i for i, (n, _) in enumerate(sibs) if n == ent][0]
    rankline = ("__SHORT__ runs the %s %s budget in the county."
                % (ORD[rank], CLS_WORD[cls])) if len(sibs) > 1 else ""
    mxs = sibs[0][1]
    sib_rows = "".join(
        ('<a class="rk can" href="{href}" style="text-decoration:none;color:inherit">'
         '<span class="lb"{hl}>{n}</span><span class="vl num">${v:,.0f}</span>'
         '<span class="tr"><i style="width:{w:.1f}%;background:{bg}"></i></span>'
         '<span class="pc num">latest filing</span></a>').format(
            href=slug(n, cls) + ".html",
            hl=' style="font-weight:700"' if n == ent else ' style="color:var(--muted)"',
            n=esc(shortname(n)), v=v, w=v / mxs * 100,
            bg="var(--exp)" if n == ent else "var(--rule-strong)")
        for n, v in sibs)

    page = (MUNI_TEMPLATE
            .replace("__TITLE__", esc(ent))
            .replace("__SHORT__", esc(shortname(ent)))
            .replace("__POSS2__", "the " + CLS_WORD[cls] + "&rsquo;s")
            .replace("__POSS__", esc(shortname(ent)) + "&rsquo;s")
            .replace("__CHIP__", cls.upper() + " LEDGER")
            .replace("__CLS__", CLS_WORD[cls])
            .replace("__RANKLINE__", rankline.replace("__SHORT__", esc(shortname(ent))))
            .replace("__AIDLATEST__", "${:,.0f}".format(aid_vals[-1]))
            .replace("__AIDY0__", str(yrs[0])).replace("__AIDY1__", str(latest))
            .replace("__AIDSPARK__", spark_path(aid_vals))
            .replace("__SIBLINGS__", sib_rows)
            .replace("__Y0__", str(yrs[0])).replace("__Y1__", str(latest))
            .replace("__YEARS__", str(len(yrs)))
            .replace("__LATEST__", str(latest))
            .replace("__NETCOL__", "var(--bad)" if net < 0 else "var(--ok)")
            .replace("__PEERYEAR__", str(latest))
            .replace("__NROWS__", "{:,}".format(len(flows)))
            .replace("__PAYLOAD__", json.dumps(payload, separators=(",", ":"))))
    fn = os.path.join(ROOT, "m", slug(ent, cls) + ".html")
    open(fn, "w", encoding="utf-8").write(page)
    built.append((slug(ent, cls), len(flows), os.path.getsize(fn) // 1024))

assert len(built) == 20
print("built %d muni ledgers in m/ — %s rows total, %d KB total"
      % (len(built), "{:,}".format(sum(b[1] for b in built)), sum(b[2] for b in built)))
for s2, n, kb in built:
    print("  m/%-22s %6s rows %5d KB" % (s2 + ".html", "{:,}".format(n), kb))
