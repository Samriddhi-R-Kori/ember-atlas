# PSI-107 SPICE — Preliminary Validation Record

- Source file: `Spice.csv`
- Structural review: Preliminary review completed
- Scientific validation: Pending
- Provenance verification: Pending

## Known structural findings
- 469 source rows and 9 columns.
- 34 exact duplicate rows were identified in the preliminary audit.
- Timestamps repeat across different experimental conditions.
- Timestamp formatting is inconsistent.
- Some time relationships and negative air-rate values require investigation.
- Flame-off time, fuel and air-rate fields contain missing values.

## Related workbook findings
- The SPICE workbooks contain multiple sections, measurement types and reference/calibration data.
- Some worksheets contain repeated headings and mixed experiment/media metadata.
- Smoke-point sheets contain calibration-reference inconsistencies, including a Day 119 discrepancy and a possible mixed-reference issue for Day 055.
- These findings are documented separately in `PSI107_audit_notes_v1.md`.

## Required checks
- Compare CSV records with the relevant workbook and source documentation.
- Determine whether repeated rows are duplicate exports or meaningful repeated observations.
- Verify timestamp conventions, units and suspicious values.
- Preserve workbook formulas, cached values and calibration references separately.

## Curation decision
Do not deduplicate by timestamp or assume one row equals one experiment. Keep the CSV and workbook evidence distinct until reconciled.
