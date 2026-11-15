# Flame in Freefall — P0 final evidence review

Review date: 2026-11-14. **P0 is not scientifically complete.** Local curation,
provenance verification, bounded audits and executable checks are complete for
this review's scope. Remaining scientific uncertainties are explicitly retained.
No P1 application was started. No original dataset was changed, no measurements
were replaced, and nothing was pushed or published.

The previous `p0_v1/` outputs and handover are historical snapshots. New outputs
are in [`dataset/processed/`](../../dataset/processed/).
The offline pipeline applies `curation/review.py` to saved, hashed evidence; network
acquisition is a separate explicit step. The acquisition manifests in `dataset/references/` record every
download (URL, time, SHA-256); `scripts/restore_references.py` re-fetches them. Acquired documents are internal evidence, not a public
redistribution bundle.

## Verified and resolved within evidence scope

### NASA identity, attribution and dataset licenses

All **eight** original local data files are SHA-256-identical to fresh public NASA
downloads: five initial CSVs and three SPICE workbooks. All five catalog records
explicitly declare **CC0-1.0** and identify an ISS microgravity investigation.
Saved metadata includes investigation version, individual file version, stable
download endpoint, official name, acquisition timestamp and content hash.

| Investigation | Verified investigation DOI | Catalog version |
|---|---|---:|
| [PSI-107 SPICE](https://psi.nasa.gov/physci/repo/data/investigations/PSI-107) | 10.60555/9kbh-e962 | 4 |
| [PSI-69 FLEX](https://psi.nasa.gov/physci/repo/data/investigations/PSI-69) | 10.60555/mbq8-0451 | 5 |
| [PSI-39 CFI](https://psi.nasa.gov/physci/repo/data/investigations/PSI-39) | 10.60555/m6pj-a914 | 4 |
| [PSI-101 SAME-R](https://psi.nasa.gov/physci/repo/data/investigations/PSI-101) | 10.60555/2np7-jv14 | 4 |
| [PSI-25 BASS-II](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25) | 10.60555/4qc4-de67 | 4 |

These are investigation references, not publication DOIs. Catalog-listed publication
titles, authors and DOIs are preserved in `review/registry.json`; listing does not
verify a paper's conclusions. The NASA public metadata API used is
`https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-<number>`. The browser HTML
is an application shell and is not used as a substitute for its metadata response.

Flight-context classifications now apply to authenticated experimental CSVs and
the ISS master-sheet record sections, supported by catalog and primary flight
reports. Historical comparison blocks and calibration/reference cells are not
blanket-classified as ISS observations. Classification does not validate a value
or provide measured residual acceleration.

### PSI-101 SAME-R

The original NASA final report explicitly distinguishes **66 test points**, **67
runs**, and **109 entries including secondary aging runs**. Appendix A preserves
suffixed identifiers and timing fields. The former 66-versus-109 issue is closed
as a documentary count/denominator question. No rows were merged, missing timings
filled, or aging relationships inferred merely by stripping suffixes.

Evidence: NASA catalog-linked `official_PSI-101_Reports_SAME-R_Final Report.pdf`,
flight-operation section and Appendix A. The NASA-listed paper
[Particle Morphology and Size Results from SAME-2](https://ntrs.nasa.gov/citations/20130000422)
(DOI 10.2514/6.2012-3536) independently supports the ISS reflight and aging context.

### PSI-69 FLEX

[NASA/TP-2015-216046](https://ntrs.nasa.gov/citations/20150023456), Appendix A.1 and
Table IX, confirms the burning-rate constant definition and **mm²/s** unit.
Curated numeric normalization now records that evidence while retaining the
incomplete original CSV heading. The report also documents general dash meanings
and the conditions for extrapolating or omitting extinction diameters. These
definitions are resolved; individual zero values are not reinterpreted wholesale.

The source contradiction is now traced directly: Table IX gives Test114 pressure
as **0 mmHg**, while Table VI and Fig118 describe **0.70 atm**. Neither is selected.
The zero is flagged as disputed, including its arithmetic conversion. Table IX
contains Tests275–280 beyond the CSV's 274; the introduction says 284. Six additional
publication-only identifiers are inventoried separately without changing the CSV.
Tests281–284 remain unestablished. The repeated `193F001` also appears in the report,
so it was not introduced by this pipeline.

Locations: printed pp19–28, Table VI and Fig118 on p142. Relevant table pages were
visually inspected from the downloaded PDF; its hash is recorded.

### PSI-107 SPICE

The NASA final/postflight reports explain that fuel flow was adjusted during
ignition and measurements/media were recorded at particular conditions. Changed
conditions under repeated ignition clocks are therefore not automatically errors.
The Image Organization Guide explicitly defines 2009 day-of-year, Day045 scope
for the flame-length workbook, day/TP/columnAC frame naming, and AD Nikon IDs.
Calendar dates and media-reference context now use that documented convention.

[Dotson's original thesis](https://drum.lib.umd.edu/items/e1cf9d1d-2c54-475a-a201-a57d3874011b),
Table6.1, printed p67 (PDF page77), independently supports **13** workbook/context
coefficient comparisons at published precision, including DVD/DVCAM distinctions.
Day119 DVCAM coefficients agree with Day174 DVCAM at published precision; using
those numbers is not disproved by a Day174 cell label alone. Neither image method
nor the 458-versus-459 pixel choice is resolved. Day055 mixed slope/intercept and
Day136 DVCAM error cells remain unapproved. No calibration coefficients were changed.

Primary evidence: catalog-linked SPICE final report, postflight report, Image
Organization Guide and hashed original workbooks. The thesis table was visually
inspected. The documented journal reference is DOI 10.1016/j.firesaf.2011.08.002;
no full-text scientific validation of that article is claimed.

### PSI-39 CFI

The eight exact repeat rows are present in the official NASA CSV. The independently
retrieved `CFI_DataSummary_Spreadsheet_Jan2021.xlsx` has one Master Sheet row per
corresponding repeated test identifier. Duplicate origin is established at source
export level; whether and how to consolidate remains open. All 87 rows remain.

The CFI final report supports ISS operations in January–September2017 and fuel/
ambient-condition context. Four composition-sum flags remain source-supported
uncertainties; no omitted constituent or fraction renormalization is invented.
Workbook candidate locations are in `review/cfi_master_comparison.json`.

### PSI-25 BASS-II

The official ReadMe resolves display definitions: fan values can be voltage×10 or
control-pot settings; air display is cm/s with slow response; video dates are one
day later than actual dates; a/b suffixes distinguish repeated-sample runs. It also
documents O2 daily offsets and CO overrange. Day/restrictor-dependent fan calibration
exists but does not justify blanket conversion of mixed/ramped settings.

The UTF-8 BOM is preserved as a source-header feature. P22b (20→39.1% O2) and T28b
(20.7→40.4%) are flagged. The third-party claim that purging explains these particular
increases is not established. Missing/negative readings are retained.

Evidence: catalog-linked BASS-II ReadMe and Fan Calibration workbook; the
[NASA summary report](https://ntrs.nasa.gov/citations/20210011385) supports flight,
sensor and dilution context, not corrections to these two CSV rows.

## Unresolved matters requiring evidence or qualified review

| Issue | Established evidence | Remaining blocker |
|---|---|---|
| Day119 calibration/pixels | Both image-method coefficient contexts exist; sheet values differ | Source frame, method and defensible pixel choice; scientist/image review |
| Day055 mixed references | Slope/intercept come from different reference blocks | Approved calibration assignment; no automatic repair |
| Day136 DVCAM | Original workbook contains error values; DVD context documented | Missing/error calibration evidence; do not substitute DVD |
| Days173/174 | Published coefficient values corroborated | Record-to-image calibration assignment |
| SPICE times | Row35 differs by two seconds; other ordering/qualitative-time flags persist | Original logs/video or source-owner clarification |
| SPICE run identities | 157 parseable day/ignition groups;119 contain changed condition signatures | Groups are not verified runs or temporal segments |
| SPICE denominators | Final report:526 flames/52 smoke points; sheets:55 candidates each; postflight:108+155 test points | Different scopes/definitions require reconciliation; equal row counts are insufficient |
| FLEX coverage and pressure | CSV274/table280/introduction284; source pressure contradiction | Missing/source inconsistency disposition by qualified reviewer |
| FLEX extinction/approximate times | General definitions verified | Individual zeros, estimates and repeated identifier interpretation |
| CFI repeats/composition | Official CSV repeats; master-sheet references available | Approved handling and gas-basis/constituent review |
| SAME-R timings | 67/109 denominator explained | Missing fields and individual aging relationships remain unfilled |
| BASS sensors/display/date | Primary definitions available | Individual ramps/settings, anomalies and actual-versus-video date linkage |

No numerical correction, duplicate removal, or definitive run merge is approved.
Current cross-file counts remain 55 smoke-sheet correspondences (three differing
pairs), 454/469 CSV rows with flight-time candidates and 364/469 with at least one
value-compatible candidate. These are rule-bound record links, not experiment counts.

## Code, dataset and publication rights

`review/third_party_licenses.json` records local license paths and hashes.

- Fotia, MicroFire Atlas and FIRE-X have MIT license files. Substantial code reuse
  requires retaining copyright/permission notices. Fotia explicitly excludes data
  from its code license. No third-party application was copied into our code.
- No local license file establishes a code-reuse grant for Krypton-N, Mehedi752,
  FLARENEXUS or Nasa-Hack-2026. Public visibility or dependency/package metadata
  does not establish permission for an entire application.
- NASA CC0 catalog declarations are established for the eight authenticated dataset
  files. Local packaging text, other reference datasets, papers and arbitrary media
  do not automatically inherit that determination. Attribution remains recorded.
- NTRS marks the FLEX and SAME paper records `PUBLIC_USE_PERMITTED`, but the BASS
  summary record is `GOV_PERMITTED`. Public access is not a blanket CC0 license for
  that report. Its redistribution outside the stated scope remains unapproved.
- Thesis/publisher-specific rights and media-personality/logo restrictions are not
  waived by the dataset declaration. This review makes no blanket publication grant.
- No project-wide license was added for our repository. No datasets were published.

The [NASA Science Data Portal policy](https://science.data.nasa.gov/about/license)
distinguishes declared licenses, NASA-led mission data and other/third-party content;
our manifest keeps those scopes separate.

## Engineering defects versus external blockers

**Engineering handled:** authenticated-file checks; reproducible evidence overlay;
field-level unit evidence; disputed-value status; review-status propagation; source/
output hashes; explicit gravity scope; no automatic run/segment creation; separate
code/data/publication rights. Source raw values, all1,068 CSV rows and all42 exact
repeats remain unchanged. Historical `p0_v1` artifacts and earlier reports are preserved.

**External/scientific blockers:** the table above, intended-use scientific sign-off,
and any additional rights review for papers/media/code before future redistribution.
These cannot be closed by a passing program or by substituting plausible values.

**Not a P0 engineering defect:** production PostgreSQL/SQLAlchemy/Alembic deployment
has not been implemented or tested; it remains outside this requested P0 review.
No P1 application development was performed.

## Execution and completion assessment

Final full-suite result: **30 passed in 8.83 seconds**. Processing and staging ingestion succeeded.
Final execution results are recorded in `P0_FINAL_TEST_RESULTS.txt` and
`P0_FINAL_RUN_RESULTS.json`; changed-file paths are in `P0_FINAL_CHANGED_FILES.txt`.
The full P0 suite covers extraction preservation, missingness, formulas/calibration
provenance, units, clocks, deterministic rebuilds, evidence checksums, authenticated
source licenses, documented gravity/year scope, issue status, relational ingestion,
idempotency, foreign keys and tamper rejection.

**Assessment:** this evidence-bounded P0 review is delivered, with several previously
unverified provenance/unit/count questions closed. **The overall P0 scientific
release gate remains incomplete.** Datasets are curated evidence with explicit
limitations, not scientifically validated results. No publication, predictive-model
claims or P1 implementation is authorized by this assessment.
