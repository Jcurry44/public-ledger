"""Generate a Council Warrant Brief for EVERY parsed warrant.

Outputs briefs/<slug>.html per warrant plus brief.html (the latest, canonical
URL). Each brief is one printable page: two computed visuals, prose, and the
flag tables, with a warrant switcher and a print button.

Methodology - two deliberate choices:
  - A warrant's baseline is only the warrants BEFORE it, so an old brief shows
    what council would have known that night, not hindsight. "First appearance"
    means first at that point in the record.
  - Purchasing-card (VISA) warrants are compared against prior CARD warrants,
    and regular warrants against prior regular ones - otherwise every card
    brief would read "0.1x a typical meeting".

Flags are questions, not findings - every line links to its source page.
"""
import datetime
import json
import os
import re
import statistics
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))
S = json.load(open(os.path.join(ROOT, "data", "site-data.json"), encoding="utf-8"))

ACCT_PROJ = dict(zip(S["accounts"], S["acctProj"]))
DEPTS = S["depts"]
DOC_URL = {d["f"]: d["u"] for d in S["docs"]}

docs = [x for x in W["docs"] if x["rows"]]
BRIEF_DIR = os.path.join(ROOT, "briefs")
os.makedirs(BRIEF_DIR, exist_ok=True)


def slug(fname):
    """Deterministic from the filename; build_site_data.py mirrors this."""
    return re.sub(r"[^a-z0-9]+", "-", fname.lower().replace(".pdf", "")).strip("-")


def money(v):
    return "${:,.2f}".format(v)


def money0(v):
    return "${:,.0f}".format(round(v))


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def ts(d):
    return datetime.datetime(int(d[6:10]), int(d[0:2]), int(d[3:5])).timestamp()


def is_card(doc):
    return "VISA" in doc["file"].upper()


CSS = """
:root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--strong:#cdc6b7;--navy:#1b3a5c;--ok:#1c6b47;--ok-soft:#e3f0e9;--warn:#8f5c10;--warn-soft:#f7eeda;
  --desk:#e9e3d5}
*{box-sizing:border-box}
html{border-top:5px solid var(--navy);background:var(--desk)}
body{margin:0;background:var(--desk);color:var(--ink);
  font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.page{max-width:860px;margin:26px auto 48px;padding:34px 40px 44px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--strong),0 26px 70px -32px rgba(20,18,10,.45)}
@media (max-width:700px){.page{margin:0;border-radius:0;box-shadow:none;padding:28px 20px 40px}}
a{color:var(--navy)}
.mast{display:flex;align-items:baseline;gap:14px;border-bottom:3px double var(--strong);padding-bottom:12px;flex-wrap:wrap}
.mark{font:600 24px/1 ui-serif,Georgia,serif}.mark span{color:var(--navy)}
.sample{margin-left:auto;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;
  color:var(--warn);border:1.5px solid var(--warn);border-radius:4px;padding:4px 8px}
h1{font:600 20px/1.3 ui-serif,Georgia,serif;margin:18px 0 2px}
.sub{color:var(--muted);font-size:13px;margin:0 0 16px}
.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}
.toolbar select{font:inherit;font-size:13px;padding:7px 10px;border:1px solid var(--strong);
  border-radius:8px;background:var(--card);color:var(--ink);max-width:60vw}
.toolbar button{font:600 12.5px/1 system-ui;padding:8px 14px;border:1px solid var(--strong);
  border-radius:99px;background:var(--card);color:var(--muted);cursor:pointer}
.toolbar button:hover{color:var(--ink);border-color:var(--navy)}
.toolbar .back{font-size:12.5px;margin-left:auto}
.strip{display:flex;gap:24px;flex-wrap:wrap;border-top:1px solid var(--strong);
  border-bottom:3px double var(--strong);padding:11px 2px;margin:0 0 18px}
.strip em{font-style:normal;display:block;font-size:10px;letter-spacing:.09em;
  text-transform:uppercase;color:var(--faint);font-weight:600}
.strip b{font-size:16px}
.tick{color:var(--ok);font-weight:700}
h2{font:600 11px/1 system-ui;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);
  margin:20px 0 8px;display:flex;gap:10px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
table{border-collapse:collapse;width:100%;font-size:13px}
td{padding:5px 8px 5px 0;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:0}
.r{text-align:right;white-space:nowrap}
.mut{color:var(--muted)}.fnt{color:var(--faint);font-size:12px}
.pill{display:inline-block;background:var(--warn-soft);color:var(--warn);font-size:10px;
  font-weight:700;letter-spacing:.05em;border-radius:4px;padding:2px 6px;margin-left:6px}
.okpill{display:inline-block;background:var(--ok-soft);color:var(--ok);font-size:11px;
  font-weight:600;border-radius:99px;padding:3px 10px}
.note{font-size:11.5px;color:var(--faint);border-top:1px solid var(--rule);margin-top:22px;padding-top:10px}
.tabs{display:inline-flex;gap:2px;padding:3px;border-radius:99px;background:#eae6dc;margin:0 0 14px}
.tabs button{border:0;background:transparent;color:var(--muted);font:600 12.5px/1 system-ui;
  padding:7px 14px;border-radius:99px;cursor:pointer}
.tabs button[aria-selected=true]{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.lead p{font-size:14.5px;line-height:1.65;margin:0 0 12px;max-width:72ch}
.lead b{font-weight:600}
.viz{margin:0 0 6px}
.viz svg{display:block;width:100%;height:auto}
.viz .cap{font-size:12px;color:var(--muted);margin:4px 0 0}
.vrow{display:grid;grid-template-columns:1fr auto;gap:2px 12px;margin:0 0 9px}
.vrow .vl{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vrow .vv{font-size:12.5px;font-weight:600}
.vrow .vt{grid-column:1/-1;height:9px;background:#eae6dc;border-radius:2px;overflow:hidden}
.vrow .vt i{display:block;height:100%;background:#c07a24;border-radius:0 4px 4px 0}
.vrow .vp{grid-column:1/-1;font-size:11px;color:var(--faint);margin-top:-1px}
.pane[hidden]{display:none}
details.morex summary{list-style:none;cursor:pointer}
details.morex summary::-webkit-details-marker{display:none}
details.morex .hint::after{content:'\2014 view the list';color:var(--navy);font-weight:600;font-size:11px}
details.morex[open] .hint::after{content:'\2014 collapse'}
.printhead{display:none}
/* On a phone the four-column tables overflowed the page sideways and account
   codes shattered across three lines. Each row re-lays as a card; codes never
   wrap. Desktop keeps the tables. */
@media (max-width:640px){
  .t-first,.t-lines,.t-depts,.t-proj,
  .t-first tbody,.t-lines tbody,.t-depts tbody,.t-proj tbody{display:block;width:100%}
  .t-first tr,.t-lines tr,.t-depts tr,.t-proj tr{display:grid;grid-template-columns:1fr auto;
    gap:1px 12px;padding:9px 0;border-bottom:1px solid var(--rule)}
  .t-first td,.t-lines td,.t-depts td,.t-proj td{display:block;padding:0;border:0;text-align:left}
  .t-first td:first-child,.t-lines td:first-child,.t-depts td:first-child,.t-proj td:first-child{
    grid-column:1;grid-row:1;font-weight:600}
  .t-first td:nth-child(2){grid-column:2;grid-row:1;text-align:right;font-weight:600}
  .t-lines td:nth-child(2){grid-column:1;grid-row:2;white-space:nowrap;font-size:11.5px}
  .t-lines td:nth-child(3){grid-column:2;grid-row:1;text-align:right;font-weight:600}
  .t-lines td:nth-child(4){grid-column:2;grid-row:2;text-align:right}
  .t-depts td:nth-child(2){grid-column:2;grid-row:1;text-align:right;font-weight:600}
  .t-depts td:nth-child(3){grid-column:1;grid-row:2;font-size:11.5px}
  .t-depts td:nth-child(4){grid-column:1 / -1;grid-row:3;font-size:11.5px}
  .t-proj td:nth-child(2){grid-column:2;grid-row:1;text-align:right;font-weight:600}
  .t-proj td:nth-child(3){grid-column:1 / -1;grid-row:2;font-size:11.5px;text-align:left}
}
.thin{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);
  border-radius:8px;padding:9px 12px;font-size:12.5px;margin:0 0 14px}
@media print{html{border-top:0;background:#fff}body{background:#fff}.page{padding:0;margin:0;max-width:none;box-shadow:none;border-radius:0}a{color:inherit;text-decoration:none}
  .tabs,.toolbar{display:none}.pane[hidden]{display:block}.printhead{display:block}}
"""


def generate(idx):
    """Build the brief for docs[idx] against its prior-only baseline."""
    target = docs[idx]
    priors = docs[:idx]
    kind_priors = [x for x in priors if is_card(x) == is_card(target)]
    url = DOC_URL[target["file"]]
    total = sum(r["amount"] for r in target["rows"])
    thin = len(kind_priors) < 3
    med = (statistics.median(sum(r["amount"] for r in x["rows"]) for x in kind_priors)
           if kind_priors else None)
    kind_word = "card warrant" if is_card(target) else "meeting"

    # first-appearance payees vs everything before this warrant (either kind)
    seen = set()
    for x in priors:
        for r in x["rows"]:
            seen.add(r["vendor_name"])
    new_v = defaultdict(float)
    for r in target["rows"]:
        if r["vendor_name"] not in seen:
            new_v[r["vendor_name"]] += r["amount"]
    new_v = sorted(new_v.items(), key=lambda x: -x[1])

    largest = sorted(target["rows"], key=lambda r: -r["amount"])[:5]

    # department run-rates from same-kind priors
    hist = defaultdict(list)
    for x in kind_priors:
        dep = defaultdict(float)
        for r in x["rows"]:
            dep[r["fund"] + "-" + r["dept"]] += r["amount"]
        for k, v in dep.items():
            hist[k].append(v)
    cur = defaultdict(float)
    driver = {}
    for r in target["rows"]:
        k = r["fund"] + "-" + r["dept"]
        cur[k] += r["amount"]
        if k not in driver or r["amount"] > driver[k]["amount"]:
            driver[k] = r
    flags = []
    for k, v in cur.items():
        h = hist.get(k, [])
        if len(h) >= 5 and v >= 25000:
            m = statistics.median(h)
            if m > 0 and v / m >= 3:
                flags.append((k, v, m, v / m))
    flags.sort(key=lambda x: -x[1])

    # capital projects drawing this warrant, cumulative THROUGH this warrant
    proj_now, proj_cum = defaultdict(float), defaultdict(float)
    for x in docs[:idx + 1]:
        for r in x["rows"]:
            lbl = ACCT_PROJ.get(r["account"], "")
            if not lbl:
                continue
            proj_cum[lbl] += r["amount"]
            if x is target:
                proj_now[lbl] += r["amount"]
    proj_rows = sorted(proj_now.items(), key=lambda x: -x[1])

    credits = [r for r in target["rows"] if r.get("is_credit")]
    tie = next(t for t in W["tie_out"] if t["file"] == target["file"])

    def dept_label(k):
        projs = defaultdict(float)
        for r in target["rows"]:
            if r["fund"] + "-" + r["dept"] != k:
                continue
            lbl = ACCT_PROJ.get(r["account"], "")
            if lbl:
                projs[lbl] += r["amount"]
        if projs:
            top = max(projs, key=projs.get)
            return top + (" (& %d other project%s)" % (len(projs) - 1, "" if len(projs) == 2 else "s")
                          if len(projs) > 1 else "")
        lbl = DEPTS.get(k, "")
        return lbl if lbl else "Department " + k

    def row_link(r):
        return '<a href="%s#page=%d">p.%d</a>' % (url, r["page"], r["page"])

    def drv(k):
        r = driver[k]
        proj = ACCT_PROJ.get(r["account"], "")
        return "%s — %s (%s)" % (esc(proj if proj else r["vendor_name"]),
                                 money0(r["amount"]), row_link(r))

    # ---- visual 1: this warrant against every warrant on record ----
    dated = [(x, ts(x["report_date"]), sum(r["amount"] for r in x["rows"])) for x in docs]
    totals_sorted = sorted((v for _, _, v in dated), reverse=True)
    rank = totals_sorted.index(total) + 1
    ORD = {1: "the largest", 2: "the 2nd-largest", 3: "the 3rd-largest"}
    rank_txt = ORD.get(rank, "the %dth-largest" % rank)

    CW, CH, ml, mr = 740, 86, 6, 6
    t0 = min(t for _, t, _ in dated) - 10 * 86400
    t1 = max(t for _, t, _ in dated) + 10 * 86400
    mx = max(v for _, _, v in dated)

    def _x(t):
        return ml + (CW - ml - mr) * (t - t0) / (t1 - t0)

    svg = ['<svg viewBox="0 0 %d %d" fill="none">' % (CW, CH + 22)]
    for yy in (2025, 2026):
        js = datetime.datetime(yy, 1, 1).timestamp()
        je = datetime.datetime(yy + 1, 1, 1).timestamp()
        if js > t0:
            svg.append('<line x1="%.1f" y1="0" x2="%.1f" y2="%d" stroke="#cdc6b7" stroke-dasharray="3 3"/>'
                       % (_x(js), _x(js), CH + 4))
        cx = (_x(max(js, t0)) + _x(min(je, t1))) / 2
        svg.append('<text x="%.1f" y="%d" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" '
                   'font-size="11" font-weight="700" letter-spacing=".08em" fill="#93979f">%d</text>'
                   % (cx, CH + 16, yy))
    if med:
        ymed = CH - (med / mx) * (CH - 10)
        svg.append('<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#93979f" stroke-dasharray="2 3"/>'
                   % (ml, ymed, CW - mr, ymed))
        svg.append('<text x="%d" y="%.1f" font-size="10" font-family="ui-monospace,Menlo,monospace" '
                   'fill="#93979f">median %s</text>' % (ml + 2, max(ymed - 4, 9), kind_word))
    for x_, t, v in dated:
        h = max(v / mx * (CH - 10), 3)
        svg.append('<rect x="%.1f" y="%.1f" width="6" height="%.1f" rx="2" fill="%s"/>'
                   % (_x(t) - 3, CH - h, h, "#1b3a5c" if x_ is target else "#c6bfb0"))
    svg.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#cdc6b7"/>' % (ml, CH, CW - mr, CH))
    svg.append('</svg>')
    viz1 = ('<div class="viz"><h2>Against every warrant on record</h2>' + "".join(svg) +
            '<p class="cap">This warrant (navy) is <b>' + rank_txt + '</b> of the %d on record'
            % len(docs) +
            (' — %.1f&times; the median %s.' % (total / med, kind_word) if med else '.') + '</p></div>')

    # ---- visual 2: where this warrant goes ----
    by_dept = sorted(cur.items(), key=lambda kv: -kv[1])
    top6, rest = by_dept[:6], sum(v for _, v in by_dept[6:])
    mx6 = top6[0][1]
    rows_html = []
    for k, v in top6:
        rows_html.append('<div class="vrow"><span class="vl">%s <span class="fnt num">%s</span></span>'
                         '<span class="vv num">%s</span>'
                         '<span class="vt"><i style="width:%.1f%%"></i></span>'
                         '<span class="vp num">%.0f%% of this warrant</span></div>'
                         % (esc(dept_label(k)), k, money0(v), v / mx6 * 100, v / total * 100))
    if rest > 0:
        # 'All other' opens: a native details listing every remaining
        # department, so the grouping is a summary, not a cap.
        head_row = ('<div class="vrow"><span class="vl" style="color:var(--muted)">All other (%d departments) '
                    '<span class="hint"></span></span>'
                    '<span class="vv num" style="color:var(--muted)">%s</span>'
                    '<span class="vt"><i style="width:%.1f%%;background:#c6bfb0"></i></span>'
                    '<span class="vp num">%.0f%% of this warrant</span></div>'
                    % (len(by_dept) - 6, money0(rest), rest / mx6 * 100, rest / total * 100))
        tail_rows = "".join(
            '<div class="vrow"><span class="vl" style="color:var(--muted)">%s <span class="fnt num">%s</span></span>'
            '<span class="vv num" style="color:var(--muted)">%s</span>'
            '<span class="vt"><i style="width:%.1f%%;background:#c6bfb0"></i></span></div>'
            % (esc(dept_label(k)), k, money0(v), max(v / mx6 * 100, 0.5))
            for k, v in by_dept[6:])
        rows_html.append('<details class="morex"><summary>%s</summary>%s</details>'
                         % (head_row, tail_rows))
    viz2 = '<div class="viz"><h2>Where this warrant goes</h2>' + "".join(rows_html) + '</div>'

    # ---- prose ----
    top = largest[0]
    top_proj = ACCT_PROJ.get(top["account"], "")
    top_new = top["vendor_name"] in dict(new_v)
    share = top["amount"] / total
    cap_flags = sum(1 for k, v, m, r_ in flags if ACCT_PROJ.get(driver[k]["account"], ""))
    lead = '<div class="lead">' + viz1 + viz2 + '<h2>In plain words</h2>'
    if thin:
        lead += ('<div class="thin">Early in the record: only %d comparable prior warrant%s existed, '
                 'so run-rate comparisons are thin here.</div>'
                 % (len(kind_priors), "" if len(kind_priors) == 1 else "s"))
    lead += ("<p>%s is a single line: <b class=\"num\">%s</b> to <b>%s</b>%s%s (%s).</p>"
             % ("Over a third of this warrant" if share > 1 / 3 else "The largest line",
                money(top["amount"]), esc(top["vendor_name"]),
                " for the " + esc(top_proj) if top_proj else "",
                " — a payee appearing for the first time in the record to that point" if top_new else "",
                row_link(top)))
    lead += ("<p><b>%d department%s</b> run%s far above the usual draw%s. <b>%d payee%s</b> appear%s "
             "for the first time, totalling %s.</p>"
             % (len(flags), "" if len(flags) == 1 else "s", "s" if len(flags) == 1 else "",
                " — %d of them capital-project draws, the usual honest explanation" % cap_flags
                if cap_flags else "",
                len(new_v), "" if len(new_v) == 1 else "s", "s" if len(new_v) == 1 else "",
                money0(sum(a for _, a in new_v))))
    lead += ("<p>The parse ties the warrant&rsquo;s own printed control totals exactly "
             "(variance %s); %d credit memo%s worth %s included. Every figure above links to its "
             "page of the source document.</p></div>"
             % (money(tie["variance"]), len(credits), "" if len(credits) == 1 else "s",
                money(-sum(r["amount"] for r in credits))))

    # ---- assemble ----
    options = "".join('<option value="%s"%s>%s%s</option>'
                      % (slug(x["file"]), " selected" if x is target else "",
                         x["report_date"], " · card" if is_card(x) else "")
                      for x in reversed(docs))
    h = "<!doctype html>\n"
    h += '<html lang="en"><head><meta charset="utf-8">\n'
    h += '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    h += '<meta name="robots" content="noindex, nofollow">\n'
    h += "<title>Warrant Brief — %s — SAMPLE</title>\n<style>%s</style></head><body><div class=\"page\">\n" \
         % (target["report_date"], CSS)
    h += ('<div class="mast"><div class="mark">Public <span>Ledger</span></div>'
          '<div class="fnt">Council Warrant Brief</div>'
          '<div class="sample">SAMPLE — NOT REQUESTED BY THE CITY</div></div>')
    h += '<h1>Warrant of %s%s</h1>' % (target["report_date"],
                                       " <span class=\"fnt\">(purchasing card)</span>" if is_card(target) else "")
    baseline_txt = ("with no prior warrant on record — this is where the record begins"
                    if not priors else
                    "against the %d prior warrant%s on record at the time"
                    % (len(priors), "" if len(priors) == 1 else "s"))
    h += ('<p class="sub">Everything below was computed automatically from '
          '<a href="%s">the published warrant</a> %s. '
          'Flags are questions worth a look before the vote — not findings.</p>'
          % (url, baseline_txt))
    h += ('<div class="toolbar"><label class="fnt">Warrant:</label>'
          '<select onchange="location.href=this.value+\'.html\'">%s</select>'
          '<button type="button" onclick="window.print()">Print / save as PDF</button>'
          '<a class="back" href="../index.html#recon">&larr; the full ledger</a></div>' % options)
    h += '<div class="strip">'
    h += '<div><em>This warrant</em><b class="num">%s</b></div>' % money(total)
    h += ('<div><em>Lines / POs</em><b class="num">%d / %s</b></div>'
          % (len(target["rows"]), target.get("pub_po_count") or "—"))
    if med:
        h += ('<div><em>vs typical %s</em><b class="num">%.1f&times;</b> <span class="fnt num">median %s</span></div>'
              % (kind_word, total / med, money0(med)))
    h += ('<div><em>Reconciliation</em><span class="okpill">&#10003; ties the printed totals exactly</span></div>'
          '</div>')
    h += ('<div class="tabs" role="tablist">'
          '<button type="button" role="tab" data-tab="brief" aria-selected="true">In brief</button>'
          '<button type="button" role="tab" data-tab="detail" aria-selected="false">The detail</button></div>')
    h += '<div class="pane" id="pane-brief"><h2 class="printhead">In brief</h2>' + lead + '</div>'
    h += '<div class="pane" id="pane-detail" hidden>'

    h += '<h2>First-time payees</h2>'
    if new_v:
        h += '<table class="t-first">' + "".join(
            '<tr><td>%s<span class="pill">FIRST APPEARANCE</span></td><td class="r num">%s</td></tr>'
            % (esc(v), money(a)) for v, a in new_v) + '</table>'
        h += ('<p class="fnt">First appearance within the record to that point — a routine check, '
              'not an allegation.</p>')
    else:
        h += '<p class="fnt">None — every payee on this warrant had been paid before.</p>'

    h += '<h2>Largest lines</h2><table class="t-lines">'
    for r in largest:
        proj = ACCT_PROJ.get(r["account"], "")
        h += ('<tr><td>%s<span class="fnt">%s</span></td><td class="mut num">%s</td>'
              '<td class="r num">%s</td><td class="r fnt">%s</td></tr>'
              % (esc(r["vendor_name"]), (" &middot; " + esc(proj)) if proj else "",
                 r["account"], money(r["amount"]), row_link(r)))
    h += '</table>'

    h += '<h2>Departments far off their run rate</h2>'
    if flags:
        h += '<table class="t-depts">' + "".join(
            '<tr><td>%s <span class="fnt num">%s</span></td><td class="r num">%s</td>'
            '<td class="r fnt num">%.0f&times; its median %s</td><td class="fnt">driver: %s</td></tr>'
            % (esc(dept_label(k)), k, money0(v), r_, money0(m), drv(k))
            for k, v, m, r_ in flags[:6]) + '</table>'
        h += ('<p class="fnt">Median is that department&rsquo;s draw across prior %s warrants where it '
              'appears. Capital-project draws are the usual honest explanation.</p>'
              % ("card" if is_card(target) else "regular"))
    else:
        h += '<p class="fnt">None flagged%s.</p>' % (" — baseline too thin this early in the record" if thin else "")

    if proj_rows:
        h += '<h2>Capital projects drawing this warrant</h2><table class="t-proj">' + "".join(
            '<tr><td>%s</td><td class="r num">%s</td><td class="r fnt num">%s committed to date</td></tr>'
            % (esc(lbl), money(a), money0(proj_cum[lbl])) for lbl, a in proj_rows) + '</table>'

    h += '</div>'
    h += ('<p class="note"><b>Method &amp; limits.</b> Generated automatically by '
          '<a href="https://jcurry44.github.io/public-ledger/">Public Ledger</a> from the city&rsquo;s '
          'published Warrant of Claims. Parsed totals tie the control figures printed on the document. '
          'Approvals as published, not payments; the baseline window opens January 2025, and each '
          'brief compares only against warrants that preceded it. This sample was prepared from public '
          'records and was not requested by or produced for the City of North Tonawanda.</p>')
    h += """<script>
document.querySelector('.tabs').addEventListener('click',function(e){
  var b=e.target.closest('button[data-tab]'); if(!b) return;
  this.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-selected',x===b?'true':'false');});
  document.getElementById('pane-brief').hidden = b.dataset.tab!=='brief';
  document.getElementById('pane-detail').hidden = b.dataset.tab!=='detail';
});
</script>"""
    h += '</div></body></html>'
    return h


latest_html = None
for i in range(len(docs)):
    html = generate(i)
    path = os.path.join(BRIEF_DIR, slug(docs[i]["file"]) + ".html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    if i == len(docs) - 1:
        latest_html = html

# canonical latest at the stable URL; its relative links must work from the root
latest_root = latest_html.replace("location.href=this.value+'.html'",
                                  "location.href='briefs/'+this.value+'.html'") \
                         .replace('href="../index.html#recon"', 'href="index.html#recon"')
with open(os.path.join(ROOT, "brief.html"), "w", encoding="utf-8") as f:
    f.write(latest_root)

print("wrote %d briefs to briefs/ + brief.html (latest: warrant %s)"
      % (len(docs), docs[-1]["report_date"]))
