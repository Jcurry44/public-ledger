"""Build Warrant end to end, in dependency order.

The steps are order-dependent and the failure is silent: editing an upstream
builder and running only build_site.py republishes the previous run's JSON, so
the page looks fine and shows stale numbers. Always run this, not the parts.

  python build.py            full rebuild
  python build.py --fast     skip the OSC pass (slow; only needed when
                             tools/build_osc.py or the OSC zip changes)
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
    ("build_taxrates.py", "overlapping tax rates, nine cities (cached fetch)"),
    ("build_brief.py", "sample council Warrant Brief (brief.html)"),
    ("build_audit.py", "Exception Report (audit.html)"),
    ("build_site.py", "inline all payloads into index.html"),
]

for script, label in STEPS:
    if FAST and script == "build_osc.py":
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
        print("\nBUILD FAILED at %s -- index.html NOT updated." % script)
        sys.exit(1)

print("\nBuild complete: index.html is current with data/ and src/.")
