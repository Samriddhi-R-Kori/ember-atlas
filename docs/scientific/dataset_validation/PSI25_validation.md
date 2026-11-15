# PSI-25 BASS-II — Preliminary Validation Record

- Source file: `BASS-II.csv`
- Structural review: Preliminary review completed
- Scientific validation: Pending
- Provenance verification: Pending

## Known structural findings
- 129 source rows.
- No exact duplicate rows identified in the preliminary audit.
- Header contains a BOM-related artifact: `ï»¿PI`.
- Fan/air display fields and final gas measurements contain missing values.

## Required checks
- Verify the original header and encoding.
- Determine the meaning of missing fan, air-display and final-gas values from source documentation.
- Confirm units and measurement definitions.
- Verify experiment identifiers and source provenance.

## Curation decision
Preserve original values. Do not replace missing measurements with zero. Do not claim scientific validation.
