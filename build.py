"""Build Warrant end to end, in dependency order.

The steps are order-dependent and the failure is silent: editing an upstream
builder and running only build_site.py republishes the previous run's JSON, so
the page looks fine and shows stale numbers. Always run this, not the parts.

  python build.py            full rebuild — city register AND the county
                             family (county.html, m/, atlas.html, school),
                             so no surface can silently go stale
  python build.py --fast     warrant-only refresh: skips the OSC pass and
                             the county family (slow; annual-data builders —
                             every skip is printed, never silent)
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
FAST = "--fast" in sys.argv

STEPS = [
    ("parse_warrants.py", "parse the warrant PDFs and tie out to control totals"),
    ("test_fidelity.py", "GATE: name fidelity + tie-out + row count + list amount"),
    ("build_site_data.py", "compact register JSON"),
    ("build_osc.py", "30 years of OSC revenue/expenditure"),
    ("build_populations.py", "census populations, all 20 governments (asserted unique)"),
    ("build_county.py", "County Edition (county.html) — template source for m/"),
    ("build_school.py", "NT school district payload (build_site.py inlines it)"),
    ("build_munis.py", "twenty municipal ledgers (m/) — derived from county template"),
    ("build_atlas.py", "County Atlas (atlas.html)"),
    ("build_taxrates.py", "overlapping tax rates, nine cities (cached fetch)"),
    ("build_brief.py", "sample council Warrant Brief (brief.html) + briefs/"),
    ("build_audit.py", "Exception Report (audit.html)"),
    ("build_site.py", "inline all payloads into index.html"),
    # County-legislature chain. fetch_resolutions.py is NOT a step (network
    # fetch of new meetings — run manually, it lays down data/resolutions/);
    # build_issue_proto.py is NOT a step (prototype by its own docstring).
    ("build_resolutions.py", "parse minutes cache -> resolutions.json (gated)"),
    ("build_decisions.py", "Decisions register (decisions.html) + poster.html"),
    ("build_legislators.py", "per-member records (legislators.html)"),
    ("gen_og_card.py", "og-card.png + apple-touch-icon from live meta counts"),
    ("build_og.py", "og cards for decisions + legislators (Playwright)"),
]

# Annual-data builders: slow, and their inputs (OSC/census) change once a
# year — but a FULL build runs them so county.html, m/ and atlas.html can
# never silently drift from the city pages (the exact defect class the
# tie-out gates exist to catch). build_resolutions.py (762-file PDF parse)
# and build_og.py (browser render) skip on --fast for the same reason;
# build_decisions.py / build_legislators.py are cheap renders of the
# committed resolutions.json, so they stay in every build.
SLOW = {"build_osc.py", "build_populations.py", "build_county.py",
        "build_school.py", "build_munis.py", "build_atlas.py",
        "build_resolutions.py", "build_og.py"}

for script, label in STEPS:
    if FAST and script in SLOW:
        print("\n[skip] %-22s (--fast)" % script)
        continue
    print("\n[run]  %-22s %s" % (script, label))
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", script)],
                       capture_output=True, text=True)
    out = (r.stdout or "").strip().splitlines()
    for line in out[-4:]:
        print("   " + line)
    if r.returncode != 0:
        print("   " + (r.stderr or "").strip()[-800:])
        print("\nBUILD FAILED at %s -- remaining steps not run." % script)
        sys.exit(1)

print("\nBuild complete: every page is current with data/ and src/.")
