"""Generate the 1200x630 Open Graph card and the 180x180 apple-touch-icon.

The texted link IS the first screen of the demo: without og tags iMessage and
Slack render a bare gray domain. The card states the artifact and its proof in
the site's own visual language (paper, ink, navy, serif).
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.load(open(os.path.join(ROOT, "data", "site-data.json"), encoding="utf-8"))["meta"]

PAPER = (246, 244, 239)
INK = (22, 24, 29)
MUTED = (108, 112, 121)
NAVY = (27, 58, 92)
RULE = (205, 198, 183)
GREEN = (28, 107, 71)
GREEN_SOFT = (227, 240, 233)

georgia = "C:/Windows/Fonts/georgia.ttf"
georgia_b = "C:/Windows/Fonts/georgiab.ttf"
segoe = "C:/Windows/Fonts/segoeui.ttf"


def og_card():
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), PAPER)
    dr = ImageDraw.Draw(im)

    dr.rectangle([0, 0, W, 10], fill=NAVY)                       # top rule
    dr.text((80, 84), "Public Ledger", font=ImageFont.truetype(georgia_b, 96), fill=INK)

    dr.text((82, 218), "City of North Tonawanda", font=ImageFont.truetype(georgia, 44), fill=NAVY)
    dr.text((82, 292), "Where the city's money comes from, where it goes,",
            font=ImageFont.truetype(segoe, 34), fill=MUTED)
    dr.text((82, 340), "and how to check it.", font=ImageFont.truetype(segoe, 34), fill=MUTED)

    # verification line - the drawn check avoids glyph-fallback tofu
    parsed = meta["docs"] - meta.get("scans", 0)
    dr.line([84, 432, 96, 444], fill=GREEN, width=6)
    dr.line([96, 444, 118, 414], fill=GREEN, width=6)
    dr.text((134, 408), "%d of %d warrants reconcile exactly \u2014 $0.00 variance"
            % (meta["exact"], parsed), font=ImageFont.truetype(segoe, 31), fill=GREEN)

    dr.line([80, 486, W - 80, 486], fill=RULE, width=2)

    stats = [
        ("%s lines" % format(meta["rows"], ","), "of approved claims"),
        ("$%.1fM" % (meta["totalAll"] / 1e6), "traced to source"),
        ("30 years", "of state filings"),
    ]
    x = 82
    for big, small in stats:
        dr.text((x, 512), big, font=ImageFont.truetype(georgia_b, 46), fill=INK)
        dr.text((x, 574), small, font=ImageFont.truetype(segoe, 26), fill=MUTED)
        x += 360

    path = os.path.join(ROOT, "og-card.png")
    im.save(path, optimize=True)
    return path


def touch_icon():
    S = 180
    im = Image.new("RGB", (S, S), NAVY)
    dr = ImageDraw.Draw(im)
    f = ImageFont.truetype(georgia_b, 118)
    w = dr.textlength("PL", font=f)
    dr.text(((S - w) / 2, 22), "PL", font=f, fill=PAPER)
    dr.rectangle([30, 152, S - 30, 158], fill=(143, 182, 221))
    path = os.path.join(ROOT, "apple-touch-icon.png")
    im.save(path, optimize=True)
    return path


if __name__ == "__main__":
    for p in (og_card(), touch_icon()):
        print("wrote %s (%.0f KB)" % (p, os.path.getsize(p) / 1024))
