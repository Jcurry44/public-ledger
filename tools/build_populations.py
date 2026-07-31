"""Sourced 2020 Census populations for every government in Niagara County,
from New York State's official mirror of the census (data.ny.gov sxhg-qquj:
'Census 2010 and 2020 Population: Region, Counties, Cities, Towns,
Villages'). Emits data/populations.json (small, committed).

Name matching is asserted UNIQUE per (name, class) - if the state dataset
ever carries two 'Wilson town' rows, this build fails loud rather than
guessing which one is ours.
"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://data.ny.gov/resource/sxhg-qquj.json?$limit=5000"

WANT = {
    "City of Niagara Falls": ("Niagara Falls city", "city"),
    "City of North Tonawanda": ("North Tonawanda city", "city"),
    "City of Lockport": ("Lockport city", "city"),
    "Town of Lockport": ("Lockport town", "town"),
    "Town of Wheatfield": ("Wheatfield town", "town"),
    "Town of Lewiston": ("Lewiston town", "town"),
    "Town of Newfane": ("Newfane town", "town"),
    "Town of Niagara": ("Niagara town", "town"),
    "Town of Pendleton": ("Pendleton town", "town"),
    "Town of Royalton": ("Royalton town", "town"),
    "Town of Cambria": ("Cambria town", "town"),
    "Town of Wilson": ("Wilson town", "town"),
    "Town of Porter": ("Porter town", "town"),
    "Town of Hartland": ("Hartland town", "town"),
    "Town of Somerset": ("Somerset town", "town"),
    "Village of Lewiston": ("Lewiston village", "village"),
    "Village of Youngstown": ("Youngstown village", "village"),
    "Village of Wilson": ("Wilson village", "village"),
    "Village of Middleport": ("Middleport village", "village"),
    "Village of Barker": ("Barker village", "village"),
}

req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
rows = json.load(urllib.request.urlopen(req, timeout=120))

out = {"source": URL,
       "dataset": "data.ny.gov sxhg-qquj (NYS mirror of 2020 Decennial Census P1)",
       "retrieved": "2026-07-31",
       "county": {"name": "Niagara County", "pop2020": None},
       "munis": {}}

hits = [r for r in rows if r["area_name"] == "Niagara County" and r["area_type"] == "County"]
assert len(hits) == 1
out["county"]["pop2020"] = int(hits[0]["_2020_census_population"])

for ent, (nm, cls) in WANT.items():
    hits = [r for r in rows if r["area_name"] == nm and r["area_type"].lower() == cls]
    assert len(hits) == 1, "ambiguous or missing: %s (%d hits)" % (nm, len(hits))
    out["munis"][ent] = int(hits[0]["_2020_census_population"])

assert len(out["munis"]) == 20
assert out["munis"]["City of North Tonawanda"] == 30496      # anchor check
assert out["county"]["pop2020"] == 212666

path = os.path.join(ROOT, "data", "populations.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1)
print("wrote %s - county %s + %d munis" % (path, out["county"]["pop2020"], len(out["munis"])))
