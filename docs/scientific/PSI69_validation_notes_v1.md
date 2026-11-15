# PSI-69 Scientific Validation Notes — Version 1

## Dataset
Investigation: PSI-69
Experiment: Flame Extinguishment Experiment (FLEX)
Records in curated dataset: 274

## Primary documentation
NASA/TP-2015-216046
Title: Detailed Results From the Flame Extinguishment Experiment (FLEX)
DOI: 10.60555/mbq8-0451 (investigation DOI)
Official report:
https://ntrs.nasa.gov/api/citations/20150023456/downloads/20150023456.pdf

Relevant section: Appendix A, A.1 Summary Data.

## Missing-value interpretation
- A dash in visible flame extinction diameter means extinction
  did not occur because the droplet burned to completion or was disrupted.
- If the droplet left the camera field of view, NASA estimated
  extinction diameter only when sufficient history was available.
- Otherwise, the extinction diameter was not listed.
- Explicit numeric zero values must be preserved separately
  from dashes and empty cells.
- Do not interpret zero as a physical zero-sized droplet without
  additional evidence.

## Unit correction
NASA defines burning rate as an average burning-rate constant
from a linear fit of droplet diameter squared against time.

Canonical unit: mm^2/s.

The source CSV heading "Burning rate; mm" is incomplete.
Preserve the original heading in the source metadata.

## Known data-quality issues
- 8 explicit zero extinction-diameter values identified.
- 77 extinction-diameter values represented by empty or dash.
- Test 114 pressure discrepancy: source table records 0,
  Fotia processed table is blank.
- FLEX identifier 193F001 occurs for two separate test records.
- Two burn-time values are marked approximate in Fotia.

## Validation status
Partially validated against NASA technical documentation.
Individual source discrepancies remain open.
Do not treat this report as complete scientific validation.
