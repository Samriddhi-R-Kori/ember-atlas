# P0 data contract v1

Status: implementable local curation contract, not scientific approval. This adds
an executable dictionary/schema to `common_data_dictionary_v1.md`; that existing
draft and preliminary handover reports are preserved. The generated
`dataset/processed/data_dictionary.json` is the exact source-field inventory.

## Canonical units

| Quantity/basis | Canonical unit | Rule |
|---|---|---|
| Length/diameter | mm | cm ×10; m ×1000; no calibration substitution |
| Duration | s | sec identity; ms ×0.001; clock time is distinct from duration |
| Pressure | Pa | atm ×101325; mmHg ×133.322387415; absolute/gauge basis not inferred |
| Mass flow | mg/s | Keep distinct from volumetric flow |
| Volumetric flow | sccm | Reference temperature/pressure must be reviewed before comparison |
| Velocity | m/s | cm/s ×0.01 |
| Mole fraction explicitly labelled | mol/mol | Identity; no mass/volume basis substitution |
| Gas percent explicitly by volume | volume_fraction | Divide by 100; retain source percent |
| CO ppm | ppm_unspecified | Original ppm retained; basis unspecified, not converted to mole fraction |
| Temperature | K | Only with source support |
| Burning-rate constant | mm²/s | Definition in prior FLEX notes; incomplete source heading remains blocked in automated normalization |
| Dimensionless Rt/R0 | 1 | Source ratio retained |
| Display setting/pixel/time annotation | No physical target | Requires measurement/calibration/semantic evidence |

These factors are unit definitions, not measurement accuracy or inferred uncertainty.
No uncertainty was invented. Every normalized observation retains a separate source
value, original unit and conversion rule. Decimal strings avoid introducing binary
rounding into CSV conversions. Workbook source floating values remain as extracted;
no new significant-figure or uncertainty claims are made.

## Provenance and relational contract

The exact DDL is `../../curation/schema.sql`. Required entities are Investigation, Experiment
Run, Operating Condition Segment, Parameter Definition, Parameter Observation,
Measurement, Media Asset, Evidence Source, Evidence Location, Quality Issue,
Experiment Recipe and Research Suggestion. Source Record and Reconciliation Link
preserve row identity and uncertain cross-file associations independently of runs.

Evidence sources have repository paths, SHA-256 and extraction metadata. Locations
identify sheet, 1-based row and column/cell. CSV row indexes count logical CSV records;
physical line ranges are also kept. Header positions disambiguate repeated column
names. Definitions remain source-specific until scientific equivalence is established.

Observed source values, derived cached values and independently recalculated values
are distinct. Formula text, shared-formula/token payloads and calibration references
stay traceable. Blank, dash, annotation, estimated and observed values are separate
statuses. Numeric zero remains observed. A source `n/a` annotation is not automatically
approved as not applicable. Unsupported or approximate numerics are not normalized.

Gravity status remains unknown at record level; project-level local descriptions
of ISS work do not prove every row's gravity environment. Historical blocks are
preserved separately, not turned into ISS runs. Local metadata describes 526 SPICE
flames and 66 SAME-R test points; matching numerical row counts do not verify those
identities. Original URLs and license metadata remain pending when absent.

## Bounded audit acceptance

The five source CSVs must be fully accounted for, duplicates retained, exact source
headers/identifiers preserved, hashes verified, missingness and negative/contradictory
values visible, and transformations reproducible. These automated checks are
implemented. Prior reported scientific issues remain explicitly marked as prior
findings when primary evidence has not been independently inspected.

## Release and P1 gates

Engineering ingestion is suitable for building P1 against provisional evidence
with visible flags. P0 scientific approval is **not complete**. Remaining gates:

1. Qualified review of SPICE calibration contexts, Day119 pixel/reference differences,
   Day055 mixed references, Day136 error handling and conflicting clocks/conditions.
2. Evidence-supported run/segment identities and disposition of unresolved cross-file
   candidates; 1,068 rows are not a unique experiment count.
3. Primary-source review of FLEX report count/pressure/extinction/burning-rate issues,
   CFI repeat provenance/composition basis, SAME-R suffix/aging identities, and BASS
   display calibration/missing/negative readings.
4. External source authenticity, licensing/redistribution, and record-level gravity
   classifications; local hashes establish file identity, not external authenticity.
5. Human scientific approval for each intended use. No validated dataset publication
   or predictive-model claims before that approval.

PostgreSQL/SQLAlchemy/Alembic implementation and PostgreSQL integration testing are
P1 engineering work. SQLite staging tests validate referential integrity locally;
they do not claim production database readiness.

## Evidence review amendment

See `CURATION_REVIEW.md` and `dataset/processed/review/`. FLEX burning-rate
units are now verified from the primary report and numeric values are normalized as
mm²/s with the incomplete original heading preserved. The eight original data files
are byte-identical to NASA downloads; the five catalog licenses are CC0-1.0. SAME-R
67/109 denominators are documented. Actual-microgravity flight context and SPICE2009
calendar interpretation now have authoritative evidence; historical/calibration cells
remain outside that classification. Disputed FLEX pressure is not accepted as a
physical zero. Original v1 prose above records the pre-review state.
