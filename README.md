# Public Ledger — City of North Tonawanda

Where the city's money comes from, where it goes, and how to check it.

A single self-contained HTML page built from public records. No backend, no
dependencies, no tracking. Open `index.html` and it works — on a phone, offline,
or from a USB stick.

**Currently unlisted** (`noindex`) pending a courtesy review by the city.

## What it shows

- **Revenue & spending** — 30 years of the city's audited annual filings to the
  NYS Office of the State Comptroller (1995–2024), by category, with drill-down
  to sub-category, object of expenditure, and individual account lines. Compare
  any two years and see which categories outgrew revenue.
- **The register** — every claim the city approved across 2025 and 2026:
  8,532 line items, 937 payees, summarised first and filterable, with each line
  linked to the page of the PDF it was read from.
- **Capital projects** — 20 named projects, their pace, their contractors, and
  every line behind them.
- **How this was verified** — the reconciliation, below.
- **What this cannot show** — the questions this data cannot answer, and why.

## Sources

| Source | Used for |
|---|---|
| [northtonawanda.gov/accounting](https://www.northtonawanda.gov/accounting) | Warrant of Claims PDFs (2026, linked) |
| `/documents/Warrant of Claims/2025/` | 2025 warrants (unlinked; filenames recovered from the Wayback CDX index) |
| [OSC Local Government Financial Data](https://wwe1.osc.state.ny.us/localgov/findata/index_choice.cfm) | `city_all_years.zip` — annual filings, 1995–2024 |

## The reconciliation

Each warrant prints its own control figures: *Total P.O. Line Items*,
*Total List Amount*, and *Total Of All Funds*. Those are the check figures, so
nothing here is self-graded.

**36 of 36 machine-readable documents reconcile exactly — $0.00 variance.**
The remaining 6 of 42 are image-only scans with no text layer; they are declared
on the page and excluded from every figure rather than quietly dropped.

`tools/test_fidelity.py` is a build-blocking gate. It fails the build if any
document stops tying, if a row count or list amount drifts, or if any published
payee name fails to round-trip against the source text.

## Build

```
python build.py            # full rebuild, in dependency order
python build.py --fast     # skip the slow OSC pass
```

Steps are order-dependent and fail silently if run individually — editing an
upstream builder and running only `build_site.py` republishes the previous run's
JSON, so the page looks fine and shows stale numbers. Always run `build.py`.

| File | Role |
|---|---|
| `tools/parse_warrants.py` | PDF → line items; tie-out; dedupe; scan detection |
| `tools/test_fidelity.py` | **build-blocking gate** |
| `tools/build_site_data.py` | compact register JSON |
| `tools/build_osc.py` | 30 years of OSC revenue/expenditure |
| `tools/build_site.py` | inlines both payloads into `index.html` |
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
