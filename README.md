# Public Ledger — City of North Tonawanda

Where the city's money comes from, where it goes, and how to check it.

Self-contained HTML pages built from public records. No backend, no
dependencies, no tracking. Open `index.html` and it works — on a phone, offline,
or from a USB stick.

**Currently unlisted** (`noindex`) pending a courtesy review by the city.

## What it shows

- **Revenue & spending** — 30 years of the city's annual financial reports filed
  with the NYS Office of the State Comptroller (1995–2024; self-reported and
  certified by the city's chief fiscal officer — OSC desk-reviews but does not
  audit these filings), by category, with drill-down
  to sub-category, object of expenditure, and individual account lines. Compare
  any two years and see which categories outgrew revenue.
- **The register** — every claim the city approved across 2025 and 2026:
  8,865 line items, 960 payees, summarised first and filterable, with each line
  linked to the page of the PDF it was read from.
- **Capital projects** — 40 named projects, their pace, their contractors, and
  every line behind them.
- **Your tax bill, decomposed** — enter a home value, see the school/city/county
  split at current full-value rates for nine cities, with thirteen years of
  rate history — plus the school district's own 31 years of filings (it
  outspends the city itself).
- **How this was verified** — the reconciliation, below.
- **What this cannot show** — the questions this data cannot answer, and why.

### The companion surfaces

- **`audit.html` — the Exception Report.** 63 computed flags across six
  sections (record gaps, catch-all accounts, spikes vs an account's own 30-year
  median, vendor-master duplicates, account sprawl, first-time payees), every
  one framed as a question with its resolution path, and none of it truncated —
  an exception report about silent gaps keeps no silent caps of its own.
- **`brief.html` + `briefs/` — a council brief for every warrant.** One
  printable page per meeting, auto-generated, using prior-only baselines (an
  old brief shows only what council could have known that night). 38 and
  counting.
- **`county.html` — the County Edition.** Niagara County's 31 consecutive
  filings (1995–2025) with the same drill-down machinery, budget-vs-actual
  against the county's own adopted budget book, and the shared sales tax
  reconstructed: the county's one $69.1M line vs all 20 recipients' own
  filings — two sets of books that agree within 0.14%.
- **`m/` — twenty municipal ledgers.** A full Public Ledger page for every
  city, town and village in the county, derived from the county template by
  anchored surgery so the machinery never forks.
- **`atlas.html` — the County Atlas.** All 20 general-purpose governments,
  31-year sparks, filing discipline named per card — zero gaps county-wide
  since 1995.

## Sources

| Source | Used for |
|---|---|
| [northtonawanda.gov/accounting](https://www.northtonawanda.gov/accounting) | Warrant of Claims PDFs (2026, linked) |
| `/documents/Warrant of Claims/2025/` | 2025 warrants (unlinked; filenames recovered from the Wayback CDX index) |
| [OSC Local Government Financial Data](https://www.osc.ny.gov/local-government/data) | `{city,county,town,village,schooldistrict}_all_years.zip` — annual filings, 1995–2025 |
| [Real Property Tax Rates by Municipality](https://data.ny.gov/resource/iq85-sdzs) | overlapping county/city/school full-value rates, FY2013–2025 |
| [Census 2010/2020 Population (NYS mirror)](https://data.ny.gov/resource/sxhg-qquj) | per-resident figures, all 20 governments |
| Niagara County 2025 Adopted Budget Book | county budget-vs-actual (parsed, hard-gated to its printed totals) |

## The reconciliation

Each warrant prints its own control figures: *Total P.O. Line Items*,
*Total List Amount*, and *Total Of All Funds*. Those are the check figures, so
nothing here is self-graded.

**38 of 38 machine-readable documents reconcile exactly — $0.00 variance.**
The remaining 6 of 44 are image-only scans with no text layer; they are declared
on the page and excluded from every figure rather than quietly dropped.

`tools/test_fidelity.py` is a build-blocking gate. It fails the build if any
document stops tying, if a row count or list amount drifts, or if any published
payee name fails to round-trip against the source text.

## Build

```
python build.py            # full rebuild — city register AND the county family
python build.py --fast     # warrant-only refresh (annual-data builders skipped, loudly)
```

Steps are order-dependent and fail silently if run individually — editing an
upstream builder and running only `build_site.py` republishes the previous run's
JSON, so the page looks fine and shows stale numbers. Always run `build.py`.
A full run rebuilds every surface (city, county, munis, atlas, school), so no
page can drift from the others; every `--fast` skip is printed, never silent.

| File | Role |
|---|---|
| `tools/parse_warrants.py` | PDF → line items; tie-out; dedupe; scan detection |
| `tools/test_fidelity.py` | **build-blocking gate** |
| `tools/build_site_data.py` | compact register JSON |
| `tools/build_osc.py` | 30 years of OSC revenue/expenditure |
| `tools/build_populations.py` | census populations, asserted unique per (name, class) |
| `tools/build_county.py` | County Edition (`county.html`) — template source for `m/` |
| `tools/build_school.py` | NT school district payload |
| `tools/build_munis.py` | twenty municipal ledgers (`m/`) |
| `tools/build_atlas.py` | County Atlas (`atlas.html`) |
| `tools/build_brief.py` | council briefs (`brief.html` + `briefs/`) |
| `tools/build_audit.py` | Exception Report (`audit.html`) |
| `tools/build_site.py` | inlines all payloads into `index.html` |
| `tools/diagnose.py`, `tools/nearmiss.py`, `tools/profile.py` | parser forensics |

### Extraction notes

Things that silently corrupt totals, learned the hard way:

- Use `pdftotext -table`, never `-layout` — `-layout` reassigns account
  descriptions at a 2:1 stride and loses ~30% of dollars while row counts stay
  plausible.
- **Vendor credits print as `96.13 -`** — trailing minus, no currency symbol.
  Missing them overstates spend.
- Never hard-code whitespace: `Total  Of All Funds` appears with a double space
  in some documents.
- The vendor cell bleeds the PO-Type column (`PC1`) and `Account Continued`
  page-break markers into the payee name. Clean at the edges only — a truncated
  payee is a fabricated person.
- P-card warrants use PO format `26-00251`, not `V6-01681`.
- Republished duplicates exist. Identity is (P.O. range + control total + line
  count), not the filename.

## Accuracy

Figures are approvals and filings as published, not audited actuals, and this
page is not affiliated with, endorsed by, or produced for the City of North
Tonawanda. Every figure links to its source page — corrections welcome.

Built by Joe Curry.
