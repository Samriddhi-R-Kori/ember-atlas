# Ember Atlas dataset release p0_v1_review — reproducible source reconciliation

Engineering curation and bounded structural audits; NOT scientific validation. All original files retained unchanged.
No source rows removed. Candidate links never establish unique experiment identity or overwrite contradictory measurements.

## Five CSV audits

| Investigation | Rows | Exact repeats beyond first | Encoding |
|---|---:|---:|---|
| PSI-107 | 469 | 34 | utf-8 |
| PSI-69 | 274 | 0 | cp1252 |
| PSI-39 | 87 | 8 | utf-8 |
| PSI-101 | 109 | 0 | utf-8 |
| PSI-25 | 129 | 0 | utf-8 |

## Computed reconciliation summary

```json
{
  "csv_rows": 1068,
  "duplicates_retained": 42,
  "smoke_candidates": [
    55,
    55
  ],
  "flight_rows_with_numeric_day": 526,
  "flame_length_rows": 12,
  "workbook_nonempty_cells": 19641,
  "links_by_kind": {
    "smoke_sheet_correspondence": 55,
    "smoke_flight": 362,
    "smoke_flight_original_label": 24,
    "smoke_csv": 366,
    "csv_flight": 2126,
    "flamelength_day045_tp": 27
  },
  "csv_flight_link_status": {
    "value_compatible_candidate": 404,
    "conflicting_or_incomplete_candidate": 1722
  },
  "csv_rows_with_value_compatible_flight_candidates": 364,
  "smoke_pairs_with_value_differences": 3,
  "smoke_length_reference_disagreements": 2,
  "quality_issues_by_code": {
    "EXACT_DUPLICATE": 42,
    "NEGATIVE_NUMERIC_REVIEW": 21,
    "REPEATED_SOURCE_IDENTIFIER": 9,
    "UNMATCHED_RECORD": 109,
    "DATA_OUTSIDE_IGNITION_INTERVAL": 16,
    "UNPARSED_TIME": 121,
    "TIME_ORDER": 18,
    "SMOKE_SHEET_DISAGREEMENT": 3,
    "CALIBRATION_REFERENCE_DISAGREEMENT": 2,
    "FLEX_284_VS_274": 1,
    "FLEX_PRESSURE_TEST114": 1,
    "FLEX_EXTINCTION_AND_BURN_RATE": 1,
    "CFI_DUPLICATE_PROVENANCE": 1,
    "SAMER_66_VS_109": 1,
    "BASS_DISPLAY_AND_ENCODING": 1,
    "SPICE_CALIBRATION_CONTEXT": 1,
    "SPICE_526_VS_SOURCE_ROWS": 1,
    "EXTERNAL_PROVENANCE_AND_LICENSE": 5,
    "FLEX_REPEATED_IDENTIFIER": 2,
    "FLEX_TEST114_SOURCE_PRESSURE": 1,
    "CFI_COMPOSITION_SUM_REVIEW": 4,
    "BASS_OXYGEN_INCREASE": 2
  },
  "source_hashes_unchanged": true,
  "scientific_approval": "pending_human_review",
  "review_findings_by_status": {
    "verified": 1,
    "resolved_documentary": 2,
    "resolved_unit_definition": 1,
    "verified_unresolved": 3,
    "resolved_general_definition_individual_values_open": 2,
    "resolved_general_interpretation": 1,
    "verified_origin_meaning_open": 1,
    "verified_context_assignments_open": 1
  },
  "official_data_files_byte_verified": 8,
  "quality_issues_by_status": {
    "open": 351,
    "verified_discrepancy": 2,
    "verified_source_contradiction": 1,
    "partially_resolved": 3,
    "resolved_documentary": 1,
    "resolved_investigation_data_scope": 5
  },
  "unique_experiment_run_count": null,
  "smoke_records_with_flight_time_candidates": 104,
  "smoke_records_with_csv_time_candidates": 104,
  "csv_rows_with_any_flight_time_candidates": 454
}
```

## Match rules and limits

- Smoke-sheet correspondence first requires day, ignition, flame-off, data time, fuel and nozzle agreement. A separate fallback requires day, flame-off, fuel, nozzle, fuel display, air display, fan and pixel input agreement. Reciprocal uniqueness is required for supported correspondence. All overlapping fields except source-specific labels are compared; differences stay separate.
- Flight/CSV and smoke/flight candidates require day and ignition agreement. All alternatives and condition differences remain recorded. Strict value compatibility additionally requires fuel, nozzle and four flow fields; CSV mass-flow rounding tolerance is 0.0005 mg/s and air tolerance 0.005 cm/s.
- Full hh:mm:ss and hh.mm.ss formats are parsed under an explicit format rule, with originals retained. Qualitative ignition annotations and short ambiguous values remain unparsed. Original first-sheet labels provide separate day+label+fuel+nozzle flight candidates and do not override clock conflicts. No clock corrections, year inference, midnight rollover, one-to-one assignment, or automatic duplicate removal.
- Flame-length TP candidates are scoped to Day045 using layout.json. Only flight labels and the first smoke sheet original labels are eligible; second-sheet numbering is a different sequence. No measured value is silently substituted.
- Cached formula results are separate from formula text and BIFF tokens. Simple smoke pixel*slope+intercept expressions and the explicitly printed flame-length equation are recalculated. Arithmetic agreement does not approve calibration context.
- Every populated workbook cell is extracted, including reference sheets and historical/test-matrix sections. Blank coordinates within sheet extents remain recoverable as absent cells. Original workbook bytes and hashes remain authoritative for rich formatting, Excel serials, shared formulas, and unsupported formula semantics.

## Flame-length arithmetic and candidate coverage

| Workbook row | TP | Input | Cached mm | Recalculated mm | Status |
|---|---|---|---|---|---|
| 4 | 1.0 | 4.375 | 47.169375 | 47.169375 | arithmetic_checked_link_candidate_only |
| 5 | 2.0 | 6.175 | 20.891175000000004 | 20.891175000000004 | arithmetic_checked_link_candidate_only |
| 6 | 3.0 | 3.71875 | 56.74996875000001 | 56.74996875000001 | arithmetic_checked_link_candidate_only |
| 7 | 4.0 | 5.875 | 25.270875000000004 | 25.270875000000004 | arithmetic_checked_link_candidate_only |
| 8 | 5.0 | 5.64375 | 28.646893750000004 | 28.646893750000004 | arithmetic_checked_link_candidate_only |
| 9 | 6.0 | 6.64375 | 14.047893750000014 | 14.047893750000014 | arithmetic_checked_link_candidate_only |
| 10 | 7.0 | 0.0 | 111.04 | 111.04 | needs_clarification |
| 11 | 8.0 | 4.3125 | 48.081812500000005 | 48.081812500000005 | arithmetic_checked_link_candidate_only |
| 12 | 9.0 | n/a | n/a | None | needs_clarification |
| 13 | 10.0 | 4.45625 | 45.98320625000001 | 45.98320625000001 | arithmetic_checked_link_candidate_only |
| 14 | 11.0 | 0.03125 | 110.58378125 | 110.58378125 | arithmetic_checked_link_candidate_only |
| 15 | 12.0 | 4.3125 | 48.081812500000005 | 48.081812500000005 | arithmetic_checked_link_candidate_only |

## Unresolved scientific release gates

- All eight original data files are byte-identical to NASA downloads; the five catalog licenses are CC0-1.0. Code, papers and media rights remain separate; byte identity does not validate measurements.
- Day119 sheet calibration assignments and pixel values disagree. Day055 mixed calibration references and Day136 errors require source-owner/scientist review. No authoritative sheet selected.
- Repeated timestamps can indicate multiple conditions/media. Unique run and operating-condition segmentation remains unresolved; no run counts asserted.
- FLEX CSV274 versus table280 versus introduction284, Test114 source contradiction, repeated ID, approximate burn times and individual extinction zeros require review. Burning-rate mm²/s and general dash meaning are documented.
- CFI repeats are present in the official CSV but not repeated master-sheet IDs. SAME-R final report explains 67 runs and 109 entries including secondary aging. BASS readme defines display conventions and video-date offset; individual missing/negative/disputed readings remain open.
- Official flight-table/master-record sections have documented actual-microgravity context. Historical/comparison/calibration cells are not assigned ISS gravity from filenames.
- This deliverable is suitable for P1 engineering against provisional evidence with quality flags. Scientific publication, validated gap claims, or predictive modeling remain gated by human review.

See quality_issues.jsonl for exact locations, source_manifest.json for hashes, and build_manifest.json for code/tool versions and output hashes.

## Evidence review supersedes preliminary release-gate statements above

All eight data files are byte-identical to NASA downloads, and all five investigation catalogs declare CC0-1.0. SAME-R 67/109 counts are explained by the original final report. FLEX mm²/s unit is documented and now normalized separately. Flight-table gravity context is evidence-backed. Calibration/image assignment, contradictory values and human scientific approval remain open. Publication and third-party code rights remain separate. See review/findings.json, review/registry.json, and reports/P0_FINAL_REVIEW.md.
