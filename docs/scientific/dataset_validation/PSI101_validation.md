# PSI-101 SAME-R — Preliminary Validation Record

- Source file: `SAME-R.csv`
- Structural review: Preliminary review completed
- Scientific validation: Pending
- Provenance verification: Pending

## Known structural findings
- 109 source records.
- No exact duplicate rows identified in the preliminary audit.
- Some identifiers contain suffixes, such as `51a`.
- Duration, aging and mixing fields contain missing values.

## Required checks
- Preserve identifiers with suffixes as strings.
- Determine the meaning of missing duration, aging and mixing values from documentation.
- Verify units, measurement definitions and source provenance.

## Curation decision
Do not convert suffixed identifiers to numbers or infer missing values. Preserve the source records unchanged.
