# PSI-107 SPICE — Source Audit Notes

Status: Preliminary source audit; not scientific validation.
Source directory:
`dataset/raw/spice/`

## 1. Source inventory

| File | Size (bytes) | Audit status |
|---|---:|---|
| Spice.csv | 31,205 | Structure inspected; anomalies identified |
| Spice_Flight_Flamelength.xls | 16,896 | Calibration formulas inspected |
| Spice Flight Test Data II modified.xls | 429,568 | Sheets and mixed record types inspected |
| SmokePointReview-0g-3.xlsx | 295,735 | Sheets, formulas, and calibration references inspected |
| info.md | 2,549 | Descriptive source note |
| layout.json | 4,439 | Layout metadata |

## 2. Spice.csv

- 469 data rows and 9 columns.
- 34 exact duplicate rows were identified by the initial structural audit.
- Repeated timestamps occur with different experimental conditions; timestamps must not be treated as unique experiment identifiers.
- Timestamp formats are inconsistent.
- Some time relationships and negative air-rate values require source-level review.
- Missing flame-off times, fuel information, and air-rate values must remain missing unless supported by source evidence.

## 3. Flight Test Data II workbook

The `Data record of Video and Stills` sheet contains approximately 530 rows, including repeated headings, experimental measurements, image references, and camera metadata.

The `Reference` sheet contains burner dimensions and fuel-related K factors.

Repeated column labels represent different quantities and units. Examples include:
- Fuel type versus fuel display.
- Fuel rate in sccm versus mg/s.
- Flame width in pixels versus mm.
- Flame height in pixels versus mm.

Do not interpret each row as one experiment or assume that row numbers and test labels uniquely identify experiments. Preserve links between experimental records and associated media where the source supports them.

## 4. SmokePointReview-0g-3.xlsx

The workbook contains multiple datasets and reference sections, not one uniform table.

### Smoke Point Datasheet
- 119 worksheet rows and 66 columns.
- Contains timestamped experiment records, historical comparison blocks, and a separate test matrix.
- Rows 5–59 contain 55 candidate experiment records.
- Rows 62–101 contain historical comparison and analysis sections.
- Rows 105–119 contain 15 test-matrix records.
- These sections must not be merged without defining their different meanings.

### Smoke Point Datasheet (2)
- 59 worksheet rows and 43 columns.
- Contains 55 candidate records in rows 5–59.
- Includes additional columns for radius, length, fuel properties, and velocity quantities.
- Some columns appear to contain paired or converted representations. Preserve original values and units separately.

### Record and field cautions
- Test labels are not consistently numeric; preserve identifiers as strings.
- Qualitative ignition annotations such as `Ku LOS` and `no ku` are not timestamps.
- A time-like value in a radiometer field must not be automatically converted.
- Some ignition, flame-off, and data timestamps have unusual ordering.
- Rows with similar timestamps and conditions must not be deduplicated without stronger evidence.

## 5. Formula and calibration findings

The workbook uses pixel-to-length calibration formulas and reference values.

Calibration coefficients vary by day and imaging method. The calibration block must be associated with the correct source record before accepting a derived length.

### Day 119 discrepancy

For candidate records in Excel rows 23 and 24:

- `Smoke Point Datasheet` uses `Reference!K78` and `Reference!K79`.
- The Reference sheet labels K78/K79 as Day 174 DVCAM.
- `Smoke Point Datasheet (2)` uses `Reference!R42` and `Reference!R43`.
- The Reference sheet labels R42/R43 as Day 119 DVD.

The sheets also differ in the row 23 pixel input:
- First sheet: 458 pixels.
- Second sheet: 459 pixels.

Row 24 has 431 pixels in both sheets.

Cached smoke-point lengths:
| Row | First sheet (mm) | Second sheet (mm) |
|---:|---:|---:|
| 23 | 14.158541 | 15.435434 |
| 24 | 20.364052 | 21.704862 |

This is a confirmed source discrepancy involving calibration references and, for row 23, the pixel input. Neither sheet is approved as authoritative by this audit.

### Day 055 formula references

Rows 31, 32, and 37 use the Day 055 slope reference with the Day 052 intercept reference (`J42` and `F43`). This mixed reference assignment requires review. Preserve the original formulas and cached values.

### Other calibration cautions

- Day 119 DVD and Day 119 DVCAM are distinct calibration contexts.
- Day 136 DVD and DVCAM are distinct contexts; a DVCAM calibration calculation error must not be replaced silently with DVD values.
- Calibration assignments for Days 173 and 174 require supporting source confirmation.
- The separate flame-length workbook includes a calibration formula, but its applicability must be established before reuse.

## 6. Curation rules

1. Never modify original workbooks or CSV files.
2. Preserve original values, units, formulas, and cached values where available.
3. Keep raw measurements separate from calculated quantities.
4. Record calibration day, imaging method, coefficient references, and formula provenance for derived lengths.
5. Keep ambiguous identifiers and qualitative annotations unchanged.
6. Do not infer experiment uniqueness from timestamps or row positions.
7. Do not deduplicate repeated measurements without source evidence.
8. Mark unresolved values and relationships for human review.
9. Do not mix actual microgravity data with terrestrial or simulated-gravity data.
10. Keep synthetic or demonstration data separate from NASA-derived evidence.

## 7. Audit conclusion

PSI-107 contains multiple related but non-identical datasets, calibration contexts, and media records. Its spreadsheets require record-level provenance and calibration tracking before their measurements can be safely unified.

The findings in this document are preliminary audit findings, not approved scientific corrections or a declaration that the dataset is fully validated.

No source data has been modified as part of this audit.
