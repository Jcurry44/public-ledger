"""Overlapping property-tax rates (county + city + school) for the nine cities.

Source: NYS Tax & Finance / OSC "Real Property Tax Rates Levy Data By
Municipality" on data.ny.gov (dataset iq85-sdzs), fetched once and cached to
data/taxrates-raw.json (committed) so builds are reproducible offline.

Two honesty rules learned from probing the raw data:
  - Years are published on either a Full Value or an Assessed Value basis.
    Assessed-basis years are NOT comparable across cities (each city assesses
    at its own fraction of market value), so only Full Value years ship.
  - City limits can cross school-district lines (Batavia spans six districts).
    The calculator uses each city's NAMESAKE district - the one serving the
    bulk of each of these nine cities - and the page says so.
"""
import json
import os
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "taxrates-raw.json")
OUT = os.path.join(ROOT, "data", "taxrates.json")

# municipality name -> (namesake school_name, swis constraint or None)
# City of Tonawanda needs the swis pin: the TOWN of Tonawanda shares the name.
CITIES = {
    "North Tonawanda": ("North Tonawanda", None),
    "Tonawanda": ("Tonawanda", "141600"),
    "Lockport": ("Lockport", None),
    "Lackawanna": ("Lackawanna", None),
    "Niagara Falls": ("Niagara Falls", None),
    "Batavia": ("Batavia", None),
    "Jamestown": ("Jamestown", None),
    "Dunkirk": ("Dunkirk", None),
    "Olean": ("Olean", None),
}


def fetch_raw():
    where = "municipality in (%s) OR swis_code='141600'" % ",".join(
        "'%s'" % c for c in CITIES)
    params = urllib.parse.urlencode({"$where": where, "$limit": "8000"})
    url = "https://data.ny.gov/resource/iq85-sdzs.json?" + params
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    rows = json.load(urllib.request.urlopen(req, timeout=120))
    assert len(rows) > 400, "suspiciously few rows (%d) - dataset moved?" % len(rows)
    with open(RAW, "w", encoding="utf-8") as f:
        json.dump(rows, f)
    return rows


def main():
    if os.path.exists(RAW):
        rows = json.load(open(RAW, encoding="utf-8"))
    else:
        rows = fetch_raw()
        print("fetched %d raw rows -> %s" % (len(rows), RAW))

    series = {}                    # city -> {fy: {c, m, s}}
    counties = {}
    for r in rows:
        muni = r["municipality"]
        if muni not in CITIES:
            continue
        school, swis = CITIES[muni]
        if swis and r["swis_code"] != swis:
            continue
        if r["school_name"] != school:
            continue
        if r["type_of_value_on_whichtax_rates_are_applied"] != "Full Value":
            continue
        fy = int(r["fiscal_year_ending"])
        series.setdefault(muni, {})[fy] = {
            "c": float(r["county_tax_rate_outside_village_per_1000_assessed_value"]),
            "m": float(r["municipal_tax_rate_outside_village_per_1000_assessed_value"]),
            "s": float(r["school_district_tax_rate_per_1000_assessed_value"]),
        }
        counties[muni] = r["county"]

    # gates: every city present, NT deep, rates plausible
    missing = [c for c in CITIES if c not in series]
    assert not missing, "cities with no Full Value rows: %s" % missing
    years = sorted(set(y for s in series.values() for y in s))
    assert len(series["North Tonawanda"]) >= 10, "NT has <10 full-value years"
    assert years[-1] >= 2025, "latest year is %s - dataset stale?" % years[-1]
    for c, s in series.items():
        for fy, v in s.items():
            total = v["c"] + v["m"] + v["s"]
            assert 5 < total < 60, "%s FY%d total %.2f implausible" % (c, fy, total)

    out = {
        "years": years,
        "cities": [{
            "name": c,
            "county": counties[c],
            "school": CITIES[c][0],
            "self": c == "North Tonawanda",
            "c": [series[c].get(y, {}).get("c") for y in years],
            "m": [series[c].get(y, {}).get("m") for y in years],
            "s": [series[c].get(y, {}).get("s") for y in years],
        } for c in CITIES],
        "source": "https://data.ny.gov/resource/iq85-sdzs (NYS Real Property Tax Rates by Municipality)",
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    nt = series["North Tonawanda"]
    last = max(nt)
    v = nt[last]
    print("years FY%d-FY%d | cities %d" % (years[0], years[-1], len(out["cities"])))
    print("NT FY%d: county %.2f + city %.2f + school %.2f = %.2f per $1,000 full value"
          % (last, v["c"], v["m"], v["s"], v["c"] + v["m"] + v["s"]))
    print("wrote %s (%.0f KB)" % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
