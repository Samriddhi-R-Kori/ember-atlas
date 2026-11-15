# PSI-69 FLEX — Preliminary Validation Record

- Source file: `FLEX.csv`
- Structural review: Preliminary review completed
- Scientific validation: Pending
- Provenance verification: Pending

## Known structural findings
- 274 source records, with test numbers 1–274.
- No exact duplicate rows identified in the preliminary audit.
- Two original-style 15-column copies were byte-identical; they are not independent sources.
- The NASA report refers to 284 tests; tests 275–284 were not present in the inspected CSV.
- Test 114 has a pressure discrepancy between the original table and processed data.
- Identifier `193F001` appears in Tests 70 and 73.
- Missing extinction diameter and burn-time values require interpretation.
- Dash values for extinction diameter must not be interpreted as zero.

## Required checks
- Resolve the report-versus-CSV record-count difference.
- Review Test 114 against the source report.
- Review repeated identifiers and missing values.
- Verify units and the burning-rate definition.

## Curation decision
The curated file is provisional. Preserve source values and record unresolved discrepancies; do not call this dataset scientifically validated.
