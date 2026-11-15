# Dataset Validation Record

Copy this template for each dataset. Do not mark a dataset scientifically validated based on structural checks alone.

## 1. Dataset identity

- Dataset ID:
- Experiment ID:
- Dataset name:
- Original source file:
- Repository-relative source path:
- Source format:
- Encoding:
- Source URL/publication:
- License:
- SHA-256:
- Review date:
- Reviewer:

## 2. Source integrity and provenance

- [ ] Original source file preserved unchanged.
- [ ] File checksum recorded.
- [ ] Source location and originating organization recorded.
- [ ] License and redistribution restrictions reviewed.
- [ ] Extraction method and tool recorded.
- [ ] Every curated record can be traced to its source location.
- [ ] Transformation scripts and versions recorded.

Evidence and notes:

## 3. Structure and field mapping

| Source field | Canonical field | Definition confirmed? | Original unit | Normalized unit | Transformation | Evidence / notes |
|---|---|---|---|---|---|---|
| | | | | | | |

- [ ] All source fields accounted for.
- [ ] Unmapped fields retained.
- [ ] Identifier fields preserved as strings where appropriate.
- [ ] Dataset-specific fields documented.
- [ ] Mixed tables or embedded headers identified.

## 4. Data quality checks

| Check | Result | Evidence / notes |
|---|---|---|
| Row and column counts | | |
| Empty rows and columns | | |
| Missing-value patterns | | |
| Exact duplicate rows | | |
| Repeated identifiers | | |
| Invalid or suspicious values | | |
| Date and time consistency | | |
| Unit consistency | | |
| Numeric parsing failures | | |
| Formula and derived-value checks | | |
| Cross-file or cross-sheet consistency | | |

Do not delete duplicate rows automatically. Determine whether repeated rows represent repeated measurements, multiple media records, duplicated transcription, or an unresolved issue.

## 5. Missingness and uncertainty

| Source value / pattern | Interpretation | Curated status | Evidence |
|---|---|---|---|
| | | | |

Preserve blanks, dashes, zeroes, N/A, qualitative values, estimates, and uncertain values as distinct states.

## 6. Gravity and experiment context

- Gravity classification:
  - [ ] actual_microgravity
  - [ ] reduced_gravity
  - [ ] terrestrial_1g
  - [ ] simulated_gravity
  - [ ] numerical_model
  - [ ] unknown
- Evidence supporting classification:
- Facility/platform:
- Experiment configuration:
- Context limitations:

Do not classify an experiment from its title or filename alone.

## 7. Derived values and calibration

| Derived field | Source inputs | Formula | Calibration/reference | Reproducible? | Discrepancy / notes |
|---|---|---|---|---|---|
| | | | | | |

- [ ] Original formula retained where available.
- [ ] Calibration context recorded.
- [ ] Cached spreadsheet values distinguished from recalculated values.
- [ ] No unverified correction applied.

## 8. Review outcomes

- Structural status:
  - [ ] not_reviewed
  - [ ] structurally_reviewed
  - [ ] needs_clarification
- Provenance status:
  - [ ] not_reviewed
  - [ ] provenance_reviewed
  - [ ] needs_clarification
- Scientific status:
  - [ ] not_reviewed
  - [ ] scientifically_reviewed
  - [ ] approved_for_use
  - [ ] rejected

Unresolved questions:

Required follow-up:

Reviewer conclusion:

Approval scope and intended use:

## 9. Change log

| Version | Date | Change | Author | Evidence |
|---|---|---|---|---|
| 1.0 | | Initial validation record | | |
