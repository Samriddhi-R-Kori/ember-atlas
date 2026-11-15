# Curation pipeline

`curation/` turns the NASA PSI raw files in `dataset/raw/` into the curated, provenance-preserving release in
`dataset/processed/` (release id `p0_v1_review`, pipeline 1.2.0). It performs local-source extraction, conservative
cross-file reconciliation, bounded audits of the five experimental tables, explicit unit conversion and an
evidence-review overlay. It does not confer scientific validation.

## Run

From the repository root (Python 3.10+, `requirements.lock` installed):

```bash
python scripts/restore_references.py --download   # once: cited documents the review step hash-checks
python scripts/build_dataset.py                   # = python -m curation.pipeline + re-pin dataset/metadata/baseline.json + manifest
python -m pytest -q tests/curation                # 30 regression tests
python -m curation.ingest --database /tmp/ember-atlas-staging.sqlite   # optional SQLite staging check
```

No LLM, network request or source-file write is involved. The pipeline refuses to write inside `dataset/raw/` or
`dataset/references/`, writes only to `dataset/processed/` (or an explicit `/tmp` directory for tests) and checks
every raw-file hash before and after extraction. Data outputs are deterministic for the same inputs and code;
`build_manifest.json` records a timestamp, which is why `build_dataset.py` re-pins the baseline after each build.

| Module | Role |
|---|---|
| `extract.py` | CSV/XLS/XLSX extraction (csv.reader, xlrd with BIFF formula tokens, openpyxl formula + cached values), missingness |
| `units.py` | explicit unit conversions; nothing is converted without a documented rule |
| `reconcile.py` | SPICE smoke-sheet, flight-sheet and CSV correspondence rules (candidates, never merges) |
| `project.py` | workbook observations and media references |
| `review.py` | evidence overlay: NASA catalog/licence registry, byte identity with official downloads, documented units, flight context, findings |
| `pipeline.py` | orchestration, audits, quality issues, outputs, build manifest |
| `ingest.py` + `schema.sql` | portable relational projection (SQLite) reused by the backend as an ingestion interchange |

Provenance identifiers are dataset-relative (`dataset/raw/flex/FLEX.csv::CSV::5`), resolved through
`ember_atlas/paths.py`, so outputs do not depend on where the repository is checked out.

## Files and provenance

- `source_manifest.json`: local file paths, SHA-256, sizes, extraction method,
  and explicitly pending external provenance/license metadata.
- `build_manifest.json`: code hashes, dependency versions, source/output hashes,
  and extraction timestamp. Data outputs are deterministic for the same inputs
  and code; the build timestamp is intentionally not byte-identical between runs.
- `source_records.jsonl`: all 1,068 CSV rows with positional arrays, source
  identifiers as text, physical line ranges, and duplicate pointers. No rows removed.
- `observations.jsonl`: each CSV cell, original heading/value, missingness,
  uncertainty status, and justified numeric conversion separately.
- `PSI-*/curated_records.jsonl`: investigation-specific source-preserving views.
- `audits/PSI-*.json`: bounded field statistics and unresolved issues by investigation.
- `data_dictionary.json`: original heading inventories and positional workbook mappings.
- `quality_issues.jsonl`: explicit unresolved checks and prior-review claims with
  distinctions between recalculated findings and prior documentation.
- `spice/workbook_inventory.json`: every sheet, used extent, populated-row count,
  merged ranges, XLS date mode, and shared/array BIFF formula payloads.
- `spice/workbook_cells.jsonl`: all populated cells from all three workbooks,
  source coordinates, typed values, formats, XLS formula tokens and cached values,
  and XLSX raw XML value/formula tokens (including date/time serials).
- `spice/records.jsonl`: 55 records per smoke sheet and 526 flight rows with
  numeric source day. These are source records, **not 526 verified experiment runs**.
- `spice/observations.jsonl`: mapped workbook fields, explicit blanks, cached
  derived values, and conversions with calibration approval withheld.
- `spice/reconciliation_links.jsonl`: all candidate and supported record
  correspondences, match rules, alternatives, and differing fields. No scientific
  merge is approved. Original smoke numbering and the second sheet's sequence
  are distinct identifiers.
- `spice/formula_comparisons.json` and `calibration_checks.json`: calibration
  assignment comparisons and independently recalculated simple linear formulas.
- `spice/flame_length.jsonl`: 12 original TP rows, ruler inputs, cached/recomputed
  lengths, and unresolved zero/n/a inputs. The printed equation is checked, not
  scientifically endorsed or transferred to another imaging context.
- `spice/media_references.jsonl`: source identifiers from flight workbook columns
  AD/AE, including multiline provenance. These are references, not downloaded media.
- `summary.json` and `REPORT.md`: machine-readable counts and human-readable limits.

Blank workbook coordinates are absent in the exhaustive cell export but present
where mapped into observations. Sheet extents and original source bytes remain
available; no absent cell is assigned a physical zero. Rich workbook formatting,
shared-formula interpretation, and scientific calibration meaning remain dependent
on the original hashed files. No arbitrary Excel formulas are executed.

## Reconciliation policy

Smoke-sheet correspondence uses the explicit identity signature and reciprocal
uniqueness in `reconcile.py`. Whitespace-only annotation differences are normalized
for comparison, while original values remain unchanged. A fallback condition
signature supports the known data-time discrepancy without pretending the times
agree. Qualitative ignition annotation equality is text equality, never a parsed time.

Cross-file day+ignition links preserve all alternatives. Original first-sheet
labels provide additional day+label+fuel+nozzle candidates where clocks disagree.
CSV/flight value compatibility uses source rounding tolerances (0.0005 mg/s,
0.005 cm/s), not assumed measurement uncertainty. Full `hh.mm.ss` parsing is
explicit; short `1744`, qualitative text, dates/years and midnight rollovers are
not guessed. Run/segment assignment remains unapproved.

## Reconciliation policy

Smoke-sheet correspondence uses the explicit identity signature and reciprocal uniqueness in `reconcile.py`.
Whitespace-only annotation differences are normalized for comparison, while original values remain unchanged.
A fallback condition signature supports the known data-time discrepancy without pretending the times agree.
Qualitative ignition annotation equality is text equality, never a parsed time.

Cross-file day+ignition links preserve all alternatives. Original first-sheet
labels provide additional day+label+fuel+nozzle candidates where clocks disagree.
CSV/flight value compatibility uses source rounding tolerances (0.0005 mg/s,
0.005 cm/s), not assumed measurement uncertainty. Full `hh.mm.ss` parsing is
explicit; short `1744`, qualitative text, dates/years and midnight rollovers are
not guessed. Run/segment assignment remains unapproved.

## Review overlay

`review.py` verifies the acquisition hashes recorded in `dataset/references/nasa-psi/`, confirms that the eight raw
data files are byte-identical to official NASA downloads (each stored once, in `dataset/raw/`), records source,
publication and code licences separately, and applies documented unit, flight-context, calendar and issue-status
metadata. `review/*.json` outputs hold the investigation/publication registry, evidence snapshots, findings,
calibration contexts, candidate condition groups, CFI master references and publication rights. Source-only
FLEX 275–280 identifiers are inventoried separately and are not appended to the CSV. Repeated conditions never
automatically create experiment runs. Run and segment tables stay empty rather than inventing experiment identities.

See `docs/scientific/CURATION_REVIEW.md`, `docs/scientific/DATA_CONTRACT.md` and
`docs/scientific/OUTSTANDING_SCIENTIFIC_ISSUES.md`.
