# Flame in Freefall — Common Data Dictionary and Data Standards

Version: 1.0  
Status: Draft standard for source-data curation; not scientific validation  
Basis: Initial CSV header inventory and preliminary source audits  
Scope: NASA-related research datasets currently inventoried in this repository

---

## 1. Purpose and design

This standard defines a common structure for describing, tracing, and validating research records from different experiments.

The project must not force unrelated datasets into one flat measurement table. It uses:

1. A shared experiment and provenance core.
2. Dataset-specific measurement fields.
3. Explicit source-value and normalized-value separation.
4. Validation and uncertainty metadata.

A field mapping is provisional until confirmed against the source documentation or an authoritative experiment report.

## 2. Core record structure

Every curated record should carry the following metadata where available.

| Canonical field | Definition | Rule |
|---|---|---|
| record_id | Unique identifier assigned to the curated record | Generate internally; never replace the source ID |
| source_record_id | Original row, test, sample, or record identifier | Preserve exactly as supplied |
| experiment_id | Experiment or investigation identifier | Preserve source naming, e.g. PSI-69 |
| experiment_name | Human-readable experiment name | Use documented name |
| dataset_name | Name of the source dataset or table | Required |
| source_file | Original filename | Required |
| source_path | Repository-relative source path | Required |
| source_sheet | Workbook sheet name, if applicable | Preserve exactly |
| source_row | Original spreadsheet row or CSV row | Record when available |
| source_column | Original column heading | Preserve for each mapped field |
| source_value | Original value as represented in source | Never overwrite |
| normalized_value | Parsed or converted value | Only populate when conversion is justified |
| original_unit | Unit stated or implied by source | Do not guess silently |
| normalized_unit | Unit used by the curated field | Must be explicit |
| extraction_method | Manual, CSV parser, spreadsheet formula, OCR, etc. | Required |
| evidence_reference | Report, page, figure, table, sheet, or other evidence location | Required where available |
| validation_status | Current review state | Use controlled values below |
| reviewer_notes | Explanation of ambiguity, correction, or review | Preserve unresolved issues |

A single source record may produce multiple curated measurement records. Retain a link to the original record in every case.

## 3. Experiment and environment fields

| Canonical field | Meaning | Notes |
|---|---|---|
| experiment_id | Investigation identifier | Example: PSI-107 |
| test_id | Original test identifier | Keep as text; identifiers may contain letters |
| test_day | Original test day or day number | Do not assume it is a calendar date |
| test_date | Calendar date | Normalize only when date interpretation is unambiguous |
| test_time | Original time | Preserve timezone and source wording |
| sample_id | Sample identifier | Preserve leading zeros and suffixes |
| sample_material | Material or fuel sample description | Preserve source wording |
| fuel_type | Fuel identity or mixture | Keep mixture composition separately where possible |
| flame_type | Flame configuration/type | Preserve source terminology |
| gravity_environment | Physical gravity environment classification | See Section 8 |
| environment_description | Original description of environment | Do not infer from experiment name |
| facility_or_platform | Facility, spacecraft, aircraft, or laboratory | Populate only from evidence |

## 4. Combustion and flow measurement families

These are candidate canonical field families. They do not imply that every dataset measures every quantity.

| Canonical field | Meaning | Common source examples |
|---|---|---|
| fuel_flow_rate | Fuel flow rate | Fuel Rate, Fuel MFC |
| hydrocarbon_flow_rate | Hydrocarbon-only flow rate | HC Fuel Rate, HC burnrate |
| oxidizer_flow_rate | Oxygen or oxidizer flow rate | mO2, O2 flow rate |
| diluent_flow_rate | Nitrogen or other diluent flow rate | mN2 |
| total_mass_flow_rate | Combined mass flow rate | mtot |
| air_flow_rate | Air flow or velocity | Air Rate, Air Flow |
| inlet_velocity | Flow velocity at inlet | Inlet velocity |
| fuel_velocity | Fuel jet velocity | ufuel |
| oxygen_mole_fraction | Oxygen mole fraction | XO2, Percent O2 |
| fuel_mole_fraction | Fuel mole fraction | Xfuel, Xf |
| initial_pressure | Initial pressure | pinit, Pressure |
| final_pressure | Final pressure | pfinal |
| mean_pressure | Mean pressure | pmean |
| ambient_temperature | Ambient temperature | Ambient Temperature |
| adiabatic_flame_temperature | Adiabatic flame temperature | Tad |
| stoichiometric_mixture_fraction | Stoichiometric mixture fraction | Zst |
| burn_time | Duration of burning | burn time, Burn Time |
| ignition_time | Ignition time or duration | Ignition Time, GMT ignition |
| flame_off_time | Flame-off time | GMT Flame Off |
| extinction_diameter | Diameter at extinction | FLEX-specific measurement |
| flame_length | Flame length | May be image-derived |
| flame_width | Flame width | May be image-derived |
| smoke_point_height | Smoke-point height | SPICE-related measurement |

Do not merge measurements solely because their headings look similar. Confirm physical meaning, measurement method, and units first.

## 5. Material and sample measurement families

| Canonical field | Meaning | Source examples |
|---|---|---|
| sample_thickness | Sample thickness | Sample Thickness |
| sample_length | Sample length | Sample Length |
| sample_width | Sample width | Sample Width |
| initial_sample_mass | Initial mass | Dataset-specific |
| final_sample_mass | Final mass | Dataset-specific |
| weight_loss_rate | Rate of sample mass loss | Weight loss rate |
| burn_length | Length burned | ?-g Burn Length |
| spread_length | Flame spread length | ?-g Spread Length |
| spread_rate | Flame spread rate | 1-g Spread Rate |
| flow_direction | Direction of flow relative to flame | Concurrent, Opposed |
| ignition_power | Applied ignition power | Ignition Power |
| radiometer_gain | Radiometer gain setting | Radiometer gain |

Question marks or ambiguous source labels must be retained in source metadata and clarified before normalization.

## 6. Units and normalization

Store the original value and unit independently from the normalized value and unit.

Examples of possible target units, subject to confirmation:

| Quantity | Candidate normalized unit |
|---|---|
| Length / diameter | mm |
| Time / duration | s |
| Pressure | Pa |
| Temperature | K |
| Mass flow rate | mg/s |
| Volumetric flow rate | sccm |
| Velocity | m/s |
| Mole fraction | Dimensionless |
| Concentration | Preserve source basis; specify volume, mass, or mole basis |
| Weight loss rate | mg/min |

Rules:

1. Never convert a value without recording the conversion and original unit.
2. Do not assume all pressures are absolute.
3. Do not treat a display setting as a calibrated physical measurement.
4. Do not interpret percent as a fraction without recording the conversion.
5. Do not combine cm/s and m/s without explicit conversion metadata.
6. Do not convert qualitative or approximate values into precise numbers.
7. Do not assume a reported temperature is ambient, flame, or burner temperature without evidence.
8. Retain formula-derived values separately from directly measured values.

## 7. Missing, ambiguous, and qualitative values

Never silently replace source values with zero or an empty string.

Use a separate missingness or interpretation status:

| Status | Meaning |
|---|---|
| observed | Value is explicitly present in source |
| not_reported | Source does not report the value |
| blank | Source cell is blank |
| source_dash | Source contains a dash |
| not_applicable | Field does not apply |
| below_detection_limit | Source explicitly reports below detection |
| uncertain | Meaning or value is ambiguous |
| qualitative | Non-numeric description |
| derived | Calculated from other values |
| estimated | Source explicitly identifies an estimate |
| transcription_error_suspected | Possible source or transcription error; not corrected |

Examples:
- A dash in an extinction field is not automatically zero.
- `RAMPED` is qualitative or categorical, not a numeric measurement.
- `n/a` must not be converted to zero.
- A blank duration remains missing until evidence supports a value.
- A value such as `~21.5` must retain its approximate qualifier.
- Identifiers such as `51a`, `20a`, `055`, and `60E` must be preserved as strings.

## 8. Gravity environment classification

Use one of these controlled categories:

| Category | Definition |
|---|---|
| actual_microgravity | Experiment conducted in an actual microgravity environment, supported by evidence |
| reduced_gravity | Experiment conducted at a non-terrestrial reduced gravity level |
| terrestrial_1g | Experiment conducted under terrestrial gravity |
| simulated_gravity | Ground-based simulation or analogue |
| numerical_model | Computational or numerical study |
| unknown | Evidence is insufficient to classify |

Do not infer actual microgravity from the use of terms such as `0g` in a filename or title alone.

Store the original source description and the evidence supporting the classification.

## 9. Calibration and derived measurements

For image-derived or formula-derived measurements, retain:

- derived field name;
- original input value(s);
- original formula, where available;
- formula or calculation version;
- calibration identifier;
- calibration date/day;
- imaging method or camera;
- reference workbook and sheet;
- reference cells or coefficients;
- original cached spreadsheet result, if available;
- independently recalculated result, if performed;
- discrepancy and review status.

Never silently substitute one calibration context for another.

A formula result and its spreadsheet cached value are separate evidence items. Do not assume that a spreadsheet recalculates correctly or that a cached result is current.

## 10. Provenance requirements

Every curated dataset must have a dataset-level provenance record containing:

- dataset name and experiment identifier;
- original source filename and repository path;
- source owner or originating organization, when documented;
- source URL or publication reference, when available;
- source license and redistribution restrictions;
- source file checksum;
- file format and encoding;
- extraction date;
- extraction tool and version;
- transformation script and version;
- transformation date;
- curator/reviewer;
- known limitations;
- validation status.

Every derived field must also have field-level provenance sufficient to trace it to source values, formulas, or evidence.

Original files must remain unchanged.

## 11. Validation status vocabulary

| Status | Meaning |
|---|---|
| not_reviewed | Not yet inspected |
| structurally_reviewed | File and field structure inspected |
| provenance_reviewed | Source traceability inspected |
| needs_clarification | Ambiguity requires evidence or human review |
| scientifically_reviewed | Reviewed by a qualified scientific reviewer |
| approved_for_use | Approved for a specified project use |
| rejected | Not suitable for the intended use |

Structural review does not imply scientific validation.

## 12. Dataset-specific cautions from the initial inventory

| Dataset | Initial caution |
|---|---|
| PSI-10 | Normal and inverse flame tables have different columns; `RAMPED` appears in measurement fields |
| PSI-25 | BASS-II includes sample descriptions and gas measurements; missing final values must remain missing |
| PSI-39 | CFI identifiers, date, local time, pressure, and gas composition require source-specific interpretation |
| PSI-47 | DAFT records describe sessions and sampling context, not a uniform combustion measurement table |
| PSI-68 | FLEX2 includes ranges and lists of possible conditions; do not expand these into individual experiments without evidence |
| PSI-69 | FLEX CSV requires explicit encoding handling; earlier audit identified missing values and identifier concerns |
| PSI-98 | SAFFIRE-1 material, geometry, flow, oxygen, ignition, and burn-time fields |
| PSI-99 | SAFFIRE-2 includes qualitative and mixed-unit values; preserve source wording |
| PSI-100 | SAFFIRE-3 sample and camera records; inspect units and relation to other SAFFIRE datasets |
| PSI-101 | SAME-R identifiers include suffixes; retain as text |
| PSI-102 | SAME sample records include flow, weight-loss, and aging measurements |
| PSI-106 | SLICE CSV appears descriptive and includes narrative rows; do not treat every row as a test measurement |
| PSI-107 | SPICE contains multiple related tables, image records, and calibration contexts; retain record-level links |
| PSI-159 | CFI-G normal and inverse flame tables have different schemas; preserve separate source field mappings |

This table is an initial inventory, not a complete scientific characterization of these investigations.

## 13. Dataset-specific extension policy

Each dataset may define additional fields not represented in the shared core.

For each extension field, document:

- canonical field name;
- original source heading;
- definition;
- data type;
- original unit;
- normalized unit, if applicable;
- valid values or range, if documented;
- transformation rule;
- provenance;
- unresolved questions.

Do not discard a source field simply because it has no current canonical mapping.

## 14. Release gate

A dataset must not be labelled validated or approved for scientific use until:

1. Its source files and licenses have been reviewed.
2. Its source records can be traced.
3. Its field mappings and units have been documented.
4. Missing and ambiguous values have been preserved.
5. Transformations and derived values are reproducible.
6. Duplicate records and identifiers have been reviewed in context.
7. Gravity environment has been classified from evidence or marked unknown.
8. Scientific review has been completed for the intended use.

---

**Current status:** Draft v1. This standard is a curation contract for the project, not a claim that the inventoried datasets have passed validation.
