"""Render social-preview cards (1200x630 PNG) for the decisions and
legislators pages, in the product's own paper-and-ink language."""
import io
import json
import sys
import tempfile
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
S = json.loads((ROOT / "data" / "resolutions.json").read_text(encoding="utf-8"))["summary"]

FONT = (ROOT / "fonts" / "Fraunces-600-latin.woff2").resolve().as_uri()

def card(kicker, big, sub, stats):
    stat_html = "".join(
        f'<div class="s"><div class="v">{v}</div><div class="l">{l}</div></div>'
        for v, l in stats)
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:'Fraunces';src:url('{FONT}') format('woff2');font-weight:600}}
*{{margin:0;box-sizing:border-box}}
body{{width:1200px;height:630px;background:#f6f2ea;color:#1e1c18;
  font:26px/1.4 Georgia,serif;padding:64px 72px;display:flex;flex-direction:column;
  border-top:14px solid #1e1c18}}
.k{{font:600 20px/1 system-ui,Segoe UI;letter-spacing:.22em;color:#8a8478;
  text-transform:uppercase}}
.b{{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:92px;line-height:1.02;
  margin:26px 0 18px;letter-spacing:-.015em}}
.sub{{color:#5b564c;font-size:30px;max-width:900px}}
.row{{display:flex;gap:64px;margin-top:auto}}
.s .v{{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:52px}}
.s .l{{font:600 15px/1.6 system-ui;letter-spacing:.14em;color:#8a8478;text-transform:uppercase}}
.wm{{position:absolute;right:72px;bottom:56px;font-family:'Fraunces',Georgia,serif;
  font-weight:600;font-size:26px;color:#7a5c2e}}
</style></head><body>
<div class="k">{kicker}</div>
<div class="b">{big}</div>
<div class="sub">{sub}</div>
<div class="row">{stat_html}</div>
<div class="wm">Public Ledger</div>
</body></html>"""

y0, y1 = S["years"]
cards = {
    "og-decisions.png": card(
        f"Niagara County Legislature &middot; {y0}&ndash;{y1}",
        f'{S["total"]:,} decisions',
        "Every resolution, every recorded vote, every dollar authorized &mdash; parsed from the county&rsquo;s own minutes.",
        [(f'{round(100*S["unanimous"]/max(1,S["vote_matched"]))}%', "Unanimous"),
         (f'{S["meetings"]}', "Meetings"),
         ("Every vote", "By name")]),
    "og-legislators.png": card(
        f"Niagara County Legislature &middot; {y0}&ndash;{y1}",
        "The Legislators",
        "Who moves, who dissents, who shows up &mdash; every member&rsquo;s record from the minutes.",
        [("29", "Members"), ("Attendance", "From minutes"), ("No votes", "By name")]),
}

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=1).new_page()
    for fname, html in cards.items():
        tmp = Path(tempfile.gettempdir()) / ("og_" + fname + ".html")
        tmp.write_text(html, encoding="utf-8")
        pg.goto(tmp.as_uri())
        pg.wait_for_timeout(600)
        pg.screenshot(path=str(ROOT / fname), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
        print("wrote", fname, (ROOT / fname).stat().st_size // 1024, "KB")
    b.close()
