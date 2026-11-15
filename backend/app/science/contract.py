"""Scientific contract for the dashboard data spine.

Everything here is an explicit, reviewable declaration: which source column supplies
which condition dimension or metric, under what measurement criterion, and with which
restrictions. Nothing in this module computes or invents a measurement. Mapping status
is provisional; it inherits the curation `*_semantics_pending` status of every parameter.
"""
from __future__ import annotations

SPINE_VERSION = '1.0.0'
CONTRACT_VERSION = '2026-11-15.3'  # .3: partial-gravity evidence, source findings, fire-safety rules (no data-mapping change)
RAW = 'dataset/raw'   # dataset-relative provenance identifiers (see ember_atlas/paths.py)

# --------------------------------------------------------------------------- labels
EVIDENCE_LABELS = {
    'measured': 'Reported in a scientific source (provisional curated value; not scientifically approved).',
    'interpolated': 'Calculated deterministically between compatible observations using a documented method.',
    'extrapolated': 'Outside the supported measurement domain. No numerical value is generated.',
    'planned': 'Documented planned experiment or condition; no completed measurement.',
    'unknown': 'No applicable evidence or insufficient information.',
    'model_prediction': 'MODEL PREDICTION — NOT A MEASURED VALUE.',
    'ai_candidate': 'AI-extracted candidate awaiting human review; never used as evidence until confirmed.',
}

DIMENSIONS = ('gravity', 'oxygen', 'pressure', 'flow', 'material')

# Dimension value states inside a condition record.
DIMENSION_STATES = {
    'reported': 'A usable normalized value is reported for this record.',
    'not_reported': 'The indexed source does not report this condition for the record.',
    'restricted': 'A value exists but its unit/basis/method/quality prevents use for matching.',
}

# --------------------------------------------------------------------------- gravity
GRAVITY_RULE = {
    'category': 'orbital_microgravity',
    'label': 'ISS orbital microgravity (residual acceleration not reported in index)',
    'rule': ('Gravity is categorical. Every indexed record is classified actual_microgravity by the curation '
             'flight-context review (catalog + flight report), but no record reports a residual-acceleration '
             'magnitude. A query gravity of exactly 0 g (the slider minimum, representing orbital microgravity) '
             'matches that category. Any non-zero query gravity has no qualifying evidence, because no record '
             'reports a partial-gravity or 1 g condition. No numerical tolerance is chosen.'),
    'basis': 'Curation gravity_evidence on each source record; docs/scientific/CURATION_REVIEW.md (flight-context classification).',
}

# --------------------------------------------------------------------------- tolerances
TOLERANCE_RULE = {
    'name': 'equal_within_reported_precision',
    'rule': ('A numeric record value v matches a query value q when |v - q| <= h_v + h_q, where h_v is half of '
             'the last reported decimal place of the original source string (converted with the same factor as '
             'the normalized value) and h_q is half of the query step or of the preset value\'s stated precision.'),
    'basis': ('No physically justified similarity tolerance for combustion conditions is established by the '
              'indexed evidence. Equality within stated reporting precision is the strictest defensible rule and '
              'involves no arbitrary choice. It is the only matching mode: no user-selectable or widened '
              'tolerance exists (exploratory bands were removed in contract 2026-11-15.2).'),
    'requirements': [
        'Every enabled condition must be matched; a not-reported or restricted value never counts as a match.',
        'Gravity is categorical: only 0 g (orbital microgravity) matches the indexed ISS records.',
        'Units must be compatible (O2: mol/mol or volume fraction; pressure: Pa; airflow: m/s).',
        'Material matches by contract class and, when chosen, by the literal source label.',
        'Exact repeats are retained as source records but counted once as eligible evidence.',
        'When measured conditions are loaded from a record, the query precision equals that record\'s reported precision.',
    ],
}

# --------------------------------------------------------------------------- scenarios
SOURCES = {
    'fm2_poster': {
        'id': 'NTRS-20240015307', 'kind': 'conference_poster',
        'title': 'Flammability of Materials on the Moon',
        'authors': 'Jennifer Zayac, Michael Johnston, Gary Ruff, Paul Ferkul',
        'venue': 'ASGSR Annual Meeting, San Juan, 3-7 Dec 2024 (NTRS acquired 29 Nov 2024)',
        'url': 'https://ntrs.nasa.gov/citations/20240015307',
        'locator': 'NTRS abstract text',
        'verified_on': '2026-11-15',
        'statement': ('FM2 is a robotic, self-contained combustion chamber for the lunar surface (CLPS mission '
                      'CP-21); burns in 21% oxygen at 14.7 psia and 34% oxygen at 8.2 psia; two SIBAL fabrics '
                      'in air and two acrylic rods in normoxic space exploration atmospheres.'),
    },
    'fm2_lpsc2026': {
        'id': 'LPSC-2026-1799', 'kind': 'conference_abstract',
        'title': '57th Lunar and Planetary Science Conference 2026, abstract 1799 (Ferkul, Kralik, Liao, Johnston)',
        'authors': 'Paul Ferkul, Nathan Kralik, Ya-Ting Liao, Michael Johnston',
        'venue': 'LPI Contrib. No. 3160 (2026)',
        'url': 'https://www.hou.usra.edu/meetings/lpsc2026/pdf/1799.pdf',
        'locator': 'Section "Combustion on the Moon", page 1',
        'verified_on': '2026-11-15',
        'statement': ('FM2 will burn four solid fuel samples in quiescent habitable atmospheres in long-duration '
                      'lunar gravity, with a planned launch date of late 2026; cameras record flame '
                      'characteristics including spread rate; radiometers and an oxygen sensor are included.'),
    },
    'eawt_2013': {
        'id': 'NTRS-20130013505', 'kind': 'technical_report',
        'title': 'Effects of the 8 psia / 32% O2 Atmosphere on the Human in the Spaceflight Environment',
        'authors': 'J. Norcross et al.', 'venue': 'NASA/TM-2013-217377 (2013)',
        'url': 'https://ntrs.nasa.gov/citations/20130013505', 'locator': 'Abstract',
        'verified_on': '2026-11-15',
        'statement': 'Describes the 8.2 psia / 34% O2 exploration atmosphere ("8.2/34").',
    },
    'ochmo_tb003': {
        'id': 'OCHMO-TB-003-RevA', 'kind': 'technical_brief',
        'title': 'NASA-STD-3001 Technical Brief: Habitable Atmosphere (OCHMO-TB-003 Rev A)',
        'authors': 'NASA Office of the Chief Health & Medical Officer', 'venue': 'NASA (2023)',
        'url': 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf',
        'locator': '"Sea Level Total Air Pressure" box',
        'verified_on': '2026-11-15',
        'statement': '1 ATM = 760 mmHg = 14.7 psia = 101.3 kPa.',
    },
    'moon_factsheet': {
        'id': 'NSSDC-MOON-FACTSHEET', 'kind': 'reference_data',
        'title': 'NASA NSSDCA Moon Fact Sheet', 'authors': 'NASA GSFC (last updated 11 January 2024)',
        'venue': 'NSSDCA', 'url': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
        'locator': 'Surface gravity (m/s^2) row', 'verified_on': '2026-11-15',
        'statement': 'Lunar surface gravity 1.62 m/s^2.',
    },
}

STANDARD_GRAVITY = 9.80665  # m/s^2, definitional constant
PSI_TO_PA = 6894.757293168  # exact definition of psi in Pa (to 9 decimals)

SCENARIOS = [
    {
        'id': 'iss_cabin', 'name': 'ISS Cabin', 'accent': 'blue',
        'status': 'proposed_design_preset_source_backed',
        'conditions': {
            'gravity': {'value': 0.0, 'unit': 'g', 'half_precision': 0.0, 'display': '≈0 g (orbital microgravity)',
                        'source': None, 'note': 'Orbital free fall; residual acceleration is not specified by any cited source.'},
            'oxygen': {'value': 0.21, 'unit': 'mol/mol', 'half_precision': 0.005, 'display': '21 % O2',
                       'source': 'fm2_poster', 'note': 'FM2 "air" test atmosphere: 21% oxygen.'},
            'pressure': {'value': round(14.7 * PSI_TO_PA, 1), 'unit': 'Pa', 'half_precision': round(0.05 * PSI_TO_PA, 1),
                         'display': '14.7 psia (101.3 kPa)', 'source': 'fm2_poster',
                         'note': '14.7 psia per FM2 poster; 101.3 kPa equivalence per OCHMO-TB-003.'},
        },
        'assumptions': [
            'Represents sea-level-equivalent air as used for the FM2 air tests; actual ISS cabin O2 fraction and total '
            'pressure vary operationally and are not specified here.',
            'Gravity 0 g is a categorical stand-in for orbital microgravity.',
            'Airflow is not specified by the cited sources and is unconstrained unless the user enables it.',
        ],
        'version': '1',
    },
    {
        'id': 'lunar_habitat', 'name': 'Lunar Habitat', 'accent': 'red',
        'status': 'proposed_design_preset_source_backed',
        'conditions': {
            'gravity': {'value': round(1.62 / STANDARD_GRAVITY, 4), 'unit': 'g',
                        'half_precision': round(0.005 / STANDARD_GRAVITY, 4), 'display': '≈0.165 g (1.62 m/s²)',
                        'source': 'moon_factsheet', 'note': '1.62 m/s² ÷ 9.80665 m/s² (standard gravity).'},
            'oxygen': {'value': 0.34, 'unit': 'mol/mol', 'half_precision': 0.005, 'display': '34 % O2',
                       'source': 'fm2_poster', 'note': 'Normoxic space exploration atmosphere (8.2/34).'},
            'pressure': {'value': round(8.2 * PSI_TO_PA, 1), 'unit': 'Pa', 'half_precision': round(0.05 * PSI_TO_PA, 1),
                         'display': '8.2 psia (56.5 kPa)', 'source': 'fm2_poster',
                         'note': '8.2 psia per FM2 poster and NASA/TM-2013-217377.'},
        },
        'assumptions': [
            'The 8.2 psia / 34% O2 atmosphere is a NASA recommendation for exploration vehicles, not a requirement '
            'for every lunar habitat.',
            'Airflow is not specified by the cited sources and is unconstrained unless the user enables it.',
        ],
        'version': '1',
    },
]

FM2 = {
    'id': 'FM2', 'name': 'Flammability of Materials on the Moon (FM2)',
    'status': 'planned',
    'status_label': 'Planned · no results yet',
    'status_detail': ('LPSC 2026 abstract 1799 states a planned launch in late 2026 (CLPS CP-21). The NASA LUCI presentation '
                      '(ASGSR, December 2025; NTRS 20250010653) gives "planned to launch in late 2026" (slide 12) and says FM2 '
                      '"will fly on a SpaceX Human Lander System unmanned test flight" (slide 37). No source confirming launch, '
                      'landing or results was found on 2026-11-15; no FM2 values are measurements.'),
    'planned_conditions': [
        {'label': 'Air test', 'oxygen': 0.21, 'pressure_psia': 14.7, 'gravity': 'lunar surface',
         'samples': 'Two SIBAL fabrics (cotton/fiberglass blend)', 'source': 'fm2_poster'},
        {'label': 'Space exploration atmosphere test', 'oxygen': 0.34, 'pressure_psia': 8.2, 'gravity': 'lunar surface',
         'samples': 'Two acrylic (PMMA) rods', 'source': 'fm2_poster'},
    ],
    'does_not_establish': [
        'No measurement exists until results are published; planned conditions are not observations.',
        'Four samples in two atmospheres cannot characterize flammability across materials, geometries or flows.',
        'Quiescent chamber tests do not cover forced-ventilation conditions.',
        'Results would not by themselves certify any material as safe.',
    ],
    'sources': ['fm2_poster', 'fm2_lpsc2026'],
    'related_refs': ['luci_2025'],
}

# --------------------------------------------------------------------------- material classes
MATERIAL_CLASSES = {
    'liquid_droplet': {'label': 'Liquid fuel droplets', 'basis': 'FLEX and CFI are droplet-combustion investigations (NASA catalog titles).'},
    'gaseous_jet': {'label': 'Gaseous fuel jets', 'basis': 'SPICE studies coflow gas-jet diffusion flames (NASA catalog title).'},
    'solid_material': {'label': 'Solid materials', 'basis': 'BASS-II burns solid samples (NASA catalog title).'},
    'smoke_source_material': {'label': 'Heated spacecraft materials (smoke sources)',
                              'basis': 'SAME-R generates smoke from heated material samples (NASA catalog title).'},
}

# --------------------------------------------------------------------------- source mappings
# Each investigation has exactly one condition source to avoid double counting. Records from
# other sources may contribute restricted metrics only (role != 'condition_source').
INVESTIGATIONS = {
    'PSI-69': {
        'short': 'FLEX', 'material_class': 'liquid_droplet', 'scale': 'Free/tethered droplets, ~mm initial diameter',
        'sources': [{
            'path': f'{RAW}/flex/FLEX.csv', 'sheet': None, 'role': 'condition_source',
            'material': 'Fuel',
            'dimensions': {
                'oxygen': {'heading': 'O initial ambient composition; mole fraction',
                           'criterion': 'Initial ambient O2 mole fraction (prepared chamber composition)'},
                'pressure': {'heading': 'Ambient pressure; mmHg', 'criterion': 'Ambient chamber pressure'},
                'flow': {'state': 'not_reported', 'why': 'No forced-flow column in the FLEX CSV.'},
            },
            'context': {
                'n2_fraction': 'N initial ambient composition; mole fraction',
                'he_fraction': 'He initial ambient composition; mole fraction',
                'co2_fraction': 'CO initial ambient composition; mole fraction',
                'initial_diameter_mm': 'Droplet initial diameter; mm',
            },
            'metrics': {
                'burning_rate': {'heading': 'Burning rate; mm', 'label': 'Burning-rate constant', 'category': 'combustion_rate',
                                 'criterion': 'd²-law burning-rate constant (NASA/TP-2015-216046 App. A.1, Table IX: mm²/s)'},
                'burn_time': {'heading': 'Burn time; s', 'label': 'Burn time', 'category': 'duration',
                              'criterion': 'Burn duration; some values are source-approximate (estimated status kept)'},
                'extinction_diameter': {'heading': 'Visible flame extinction diameter; mm', 'label': 'Extinction diameter',
                                        'category': 'extinction', 'restricted': True,
                                        'why': 'Zero/dash meanings vary per test (quality issue FLEX_EXTINCTION_AND_BURN_RATE partially resolved).'},
                'initial_diameter': {'heading': 'Droplet initial diameter; mm', 'label': 'Droplet initial diameter',
                                     'category': 'scale', 'criterion': 'Initial droplet diameter (sample scale)'},
            },
        }],
    },
    'PSI-39': {
        'short': 'CFI', 'material_class': 'liquid_droplet', 'scale': 'Droplets (dodecane / iso-dodecane blends)',
        'sources': [{
            'path': f'{RAW}/cfi/CFI.csv', 'sheet': None, 'role': 'condition_source', 'material': 'Fuel ',
            'dimensions': {
                'oxygen': {'heading': 'Oxygen', 'force_restricted': True,
                           'why': 'Values (0.17, 0.21) are not normalized during curation: unit and basis (mole vs mass fraction) are not established in the index.'},
                'pressure': {'heading': 'Pressure', 'criterion': 'Ambient pressure (source in atm)'},
                'flow': {'state': 'not_reported', 'why': 'No forced-flow column in the CFI CSV.'},
            },
            'context': {}, 'metrics': {},
        }],
    },
    'PSI-101': {
        'short': 'SAME-R', 'material_class': 'smoke_source_material', 'scale': 'Heated material samples (smoke generation)',
        'sources': [{
            'path': f'{RAW}/same-r/SAME-R.csv', 'sheet': None, 'role': 'condition_source', 'material': 'Sample Type',
            'dimensions': {
                'oxygen': {'state': 'not_reported', 'why': 'No oxygen column in the SAME-R CSV.'},
                'pressure': {'state': 'not_reported', 'why': 'No pressure column in the SAME-R CSV.'},
                'flow': {'heading': 'Inlet velocity (cm/s)', 'force_restricted': True,
                         'why': 'Air flow past a sample heated below its ignition point (smoke generation, no flame; Urban et al., AIAA 2012-3536, p. 1); not comparable with airflow around a flame.'},
            },
            'context': {}, 'metrics': {
                'rt_r0': {'heading': 'Rt/R0', 'label': 'Rt/R0', 'category': 'smoke', 'restricted': True,
                          'why': 'Physical meaning of the ratio is not mapped in the index (semantics pending).'},
                'net_aging_time': {'heading': 'Net aging time (sec)', 'label': 'Net aging time', 'category': 'duration',
                                   'criterion': 'Smoke aging time'},
            },
        }],
    },
    'PSI-107': {
        'short': 'SPICE', 'material_class': 'gaseous_jet', 'scale': 'Coflow laminar jet flames (nozzle diameter in mm)',
        'sources': [
            {'path': f'{RAW}/spice/Spice Flight Test Data II modified.xls', 'sheet': 'Data record of Video and Stills',
             'role': 'condition_source', 'material': 'fuel',
             'dimensions': {
                 'oxygen': {'state': 'not_reported', 'why': 'Coflow oxidizer composition is not reported in the indexed SPICE tables.'},
                 'pressure': {'heading': 'pressure', 'criterion': 'Chamber pressure as recorded in the flight workbook'},
                 'flow': {'heading': 'air_cm_s', 'criterion': 'Coflow air velocity'},
             },
             'context': {'nozzle_mm': 'nozzle', 'fuel_mg_s': 'fuel_mg_s'},
             'metrics': {
                 'flame_length': {'heading': 'length_mm', 'label': 'Flame length', 'category': 'flame_size', 'restricted': True,
                                  'why': 'Image-derived length; calibration context and record-to-image assignment are unapproved (open SPICE calibration issues).'},
                 'fuel_mass_flow': {'heading': 'fuel_mg_s', 'label': 'Fuel mass flow', 'category': 'operating_condition',
                                    'criterion': 'Fuel mass flow rate setting/record'},
             }},
            {'path': f'{RAW}/spice/SmokePointReview-0g-3.xlsx', 'sheet': 'Smoke Point Datasheet',
             'role': 'restricted_metric_source', 'material': 'fuel', 'dimensions': {}, 'context': {},
             'metrics': {'smoke_point_length': {'heading': 'length_mm', 'label': 'Smoke-point flame length', 'category': 'sootiness',
                                                'restricted': True,
                                                'why': 'Two smoke-point sheets disagree for 3 pairs; Day055/119/136 calibration assignments unapproved; neither sheet is authoritative.'}}},
        ],
    },
    'PSI-25': {
        'short': 'BASS-II', 'material_class': 'solid_material', 'scale': 'Solid rods, sheets and fabrics (cm scale)',
        'sources': [{
            'path': f'{RAW}/bass-ii/BASS-II.csv', 'sheet': None, 'role': 'condition_source', 'material': 'Fuel Sample Material',
            'dimensions': {
                'oxygen': {'heading': 'Calibrated  initial O2 % by vol ', 'criterion': 'Calibrated initial O2 sensor reading (% by volume)',
                           'equivalence_note': 'Volume fraction treated as equal to mole fraction (ideal-gas mixture); measured by sensor, unlike FLEX prepared compositions.'},
                'pressure': {'state': 'not_reported', 'why': 'No pressure column in the BASS-II CSV.'},
                'flow': {'heading': 'Air display', 'force_restricted': True,
                         'why': 'Display value (cm/s per ReadMe) with slow response and mixed/ramped entries; not converted globally.'},
            },
            'context': {},
            'metrics': {
                'final_o2': {'heading': 'Calibrated final O2 % by vol', 'label': 'Final O2 (calibrated)', 'category': 'gas_measurement',
                             'criterion': 'Calibrated final O2 % by volume'},
                'final_co2': {'heading': 'Final CO2 % by vol', 'label': 'Final CO2', 'category': 'gas_measurement',
                              'criterion': 'Final CO2 % by volume'},
                'final_co': {'heading': 'Final CO (ppm)', 'label': 'Final CO', 'category': 'gas_measurement', 'restricted': True,
                             'why': 'ppm basis unspecified; CO overrange documented in ReadMe.'},
            },
        }],
    },
}

# Equipment areas are linked to investigations only through explicit title-keyword rules over
# NASA-listed titles. Edges carry the matching title; they are not reviewed findings.
EQUIPMENT_AREAS = {
    'detection': {'label': 'Detection', 'keywords': ['smoke detector', 'fire detection', 'detection of smoke', 'smoke particulate', 'smoke aerosol']},
    'suppression': {'label': 'Suppression', 'keywords': ['suppression', 'extinction', 'extinguish']},
    'spacecraft_materials': {'label': 'Spacecraft Materials', 'keywords': ['flammability', 'pmma', 'fabric', 'material', 'kapton', 'teflon']},
    'wire_insulation': {'label': 'Wire Insulation', 'keywords': ['wire insulation', 'wire', 'insulation']},
    'protective_gear': {'label': 'Protective Gear', 'keywords': ['protective gear', 'protective clothing', 'nomex']},
    'earth_applications': {'label': 'Earth Applications', 'keywords': ['jet-a', 'gasoline', 'biofuel', 'transportation fuels', 'soot formation', 'normal gravity', 'surrogate']},
}

MODEL_GATE = {
    'min_independent_groups': 10,
    'rule': ('A target is eligible for grouped validation only with a documented physical definition and unit, '
             'a single measurement method, >= 10 independent condition groups, no unresolved calibration blocker, '
             'and inputs that are reported for every training record (no imputation).'),
}

# Open scientific issues carried from docs/scientific/OUTSTANDING_SCIENTIFIC_ISSUES.md (status unchanged).
OPEN_ISSUES = [
    ('SPICE Day119 DVD/DVCAM, pixels 458/459', 'Original image/method identification and qualified image/calibration review', 'Pending'),
    ('SPICE Day055 mixed references', 'Approved slope/intercept assignment', 'Pending'),
    ('SPICE Day136 DVCAM errors; Days 173/174 assignment', 'Source frames, missing calibration evidence and scientific review', 'Pending'),
    ('SPICE conflicting times, 52 vs 55 smoke-point scope, 526 flames', 'Original logs/video, source-owner clarification and denominator review', 'Pending'),
    ('Run/condition-segment identities and candidate links', 'Evidence-backed identities, timing conventions and reviewer acceptance', 'Pending'),
    ('FLEX CSV 274 / table 280 / introduction 284', 'Source-owner disposition of missing/inconsistent coverage', 'Pending'),
    ('FLEX Test 114 zero vs 0.70 atm; extinction zeros/approximate times/repeated ID', 'Qualified review; no automatic correction', 'Pending'),
    ('CFI eight repeats and four composition-sum flags', 'Approved duplicate handling and gas-basis interpretation', 'Pending'),
    ('SAME-R individual aging links/missing timing', 'Record-level evidence; count denominator already documented', 'Pending'),
    ('BASS mixed display/ramp values, sensors, date associations', 'Daily calibration and individual source/video interpretation', 'Pending'),
    ('Intended scientific use of each curated dataset', 'Qualified scientific review and explicit scope of acceptance', 'None received'),
    ('Publication/media/third-party code redistribution', 'Applicable rights review and explicit user publication approval', 'Not approved'),
]

# --------------------------------------------------------------------------- primary-source references
# Hashed local copies of primary NASA / peer-reviewed documents (dataset/references/, retrieval_manifest.json and
# official_file_manifest.json). Page numbers are PDF page indices. Statements below are short paraphrases whose
# key terms/numbers were checked against the cited page text on 2026-11-15 (pdftotext); none has been reviewed
# by a qualified scientist, so every one carries review_status 'not_reviewed'.
REFERENCES = {
    'flex_tp': {'id': 'NASA/TP-2015-216046', 'title': 'Detailed Results from the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011',
                'url': 'https://ntrs.nasa.gov/citations/20150023456', 'local': 'dataset/references/nasa-psi/flex_report.pdf',
                'sha256': 'b4f6ca983e2792c33a0b92220a791a818f426bb635b94f7fd33dc8c9c471e79d', 'kind': 'NASA technical publication'},
    'bass_tm': {'id': 'NASA/TM-20210011385', 'title': 'Burning and Suppression of Solids–II (BASS-II) Summary Report',
                'url': 'https://ntrs.nasa.gov/citations/20210011385', 'local': 'dataset/references/nasa-psi/bass_report.pdf',
                'sha256': '5ffa911fd9b6356f204646003fb9342e341810dcdfdf5cb15756e7f01ec5f770', 'kind': 'NASA technical memorandum'},
    'spice_final': {'id': 'PSI-107 SPICE Final Report', 'title': 'Smoke Point in Co-flow Experiment (SPICE): Laminar Smoke Point Properties of Non-buoyant Round-Jet Diffusion Flames (Urban, Sunderland et al.)',
                    'url': 'https://psi.nasa.gov/geode-py/ws/studies/PSI-107/download?file=PSI-107_Reports_SPICE_FinalReport.pdf&version=1&redirect=false',
                    'local': 'dataset/references/nasa-psi/official_PSI-107_Reports_SPICE_FinalReport.pdf',
                    'sha256': '95e76859017d201dcd6a9fb12f1df568aed77e0edf7a1b609975db37f32fa680', 'kind': 'NASA PSI final report'},
    'spice_thesis': {'id': 'UMD thesis (SPICE)', 'title': 'University of Maryland thesis on SPICE smoke points (DRUM repository)',
                     'url': 'https://api.drum.lib.umd.edu/server/api/core/bitstreams/dd4d9bb5-d8ca-4264-833d-8c5aa07de306/content',
                     'local': 'dataset/references/nasa-psi/spice_thesis.pdf',
                     'sha256': '1bb111e67a9101ca957265d08a193e55cc6e4cc800f84766f6bfbf2c6f3df9cf', 'kind': 'thesis'},
    'same2_aiaa': {'id': 'AIAA 2012-3536', 'title': 'Particle Morphology and Size Results from the Smoke Aerosol Measurement Experiment-2 (Urban et al.)',
                   'url': 'https://ntrs.nasa.gov/citations/20130000422', 'local': 'dataset/references/nasa-psi/same_report.pdf',
                   'sha256': 'bdc5e7e0d65f569c2c4a0b8899870d2d47e8f0d644cfe033a450d9fd892375aa', 'kind': 'conference paper (DOI 10.2514/6.2012-3536)'},
    'luci_2025': {'id': 'NTRS-20250010653', 'title': 'Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket (Ferkul, Johnston, Kralik, Liao; ASGSR 2025)',
                  'url': 'https://ntrs.nasa.gov/citations/20250010653', 'local': 'dataset/references/partial-gravity/luci_ntrs_20250010653.pdf',
                  'sha256': 'bb0aadd2f9543483467b86796e6aa19f4e13c3f8169eec96134015f95ed61d79', 'kind': 'NASA conference presentation (measured flight data)'},
    'konno_pci39': {'id': 'Proc. Combust. Inst. 39 (Konno et al.)', 'title': 'Experimental study on downward/opposed flame spread and extinction over electric wires in partial gravity environments (Konno, Li, Citerne, Legros, Guibaud, Hashimoto, Fujita)',
                    'url': 'https://www.sciencedirect.com/science/article/abs/pii/S154074892200027X', 'local': 'dataset/references/partial-gravity/konno_pci39_manuscript.pdf',
                    'sha256': 'd59702a77ff426503a7482a2bc8ff31cbdea65e600d5e549d1c041d9da67f574', 'kind': 'peer-reviewed journal article (accepted manuscript, UCL Discovery)'},
    'gollner_2021': {'id': 'NTRS-20210022402', 'title': 'Topical: Solid Fuel Combustion in Partial and Micro-Gravity (Gollner, Wichman, Liao, Carmignani et al.; Decadal Survey white paper)',
                     'url': 'https://ntrs.nasa.gov/citations/20210022402', 'local': 'dataset/references/partial-gravity/gollner_ntrs_20210022402.pdf',
                     'sha256': 'ed300588dae8d09102e851a81c66018a9e050514aa63b4d62ee13e200630d2ad', 'kind': 'research review / white paper'},
    'acme_2021': {'id': 'NTRS-20210022542', 'title': 'Recent Research on Flames of Gaseous Fuel Aboard the International Space Station (Stocker; ACME, JASMAC-33)',
                  'url': 'https://ntrs.nasa.gov/citations/20210022542', 'local': 'dataset/references/partial-gravity/acme_ntrs_20210022542.pdf',
                  'sha256': '6524faf4675134d7d7ca9be629ff95284d5b9acd38a4e230ede39c6a092e8ccf', 'kind': 'NASA conference presentation'},
    'cfi_final': {'id': 'PSI-39 CFI Science Final Report', 'title': 'Cool Flames Investigation (CFI) Science Final Report',
                  'url': 'https://psi.nasa.gov/geode-py/ws/studies/PSI-39/download?file=PSI-39_Reports_CFI+Science+Final+Report.pdf&version=2&redirect=false',
                  'local': 'dataset/references/nasa-psi/official_PSI-39_Reports_CFI Science Final Report.pdf', 'sha256': 'e15158689180314583917200a071730d3aed9088e1ae689b847bd416674010f9', 'kind': 'NASA PSI final report'},
    'samer_final': {'id': 'PSI-101 SAME-R Final Report', 'title': 'Smoke Aerosol Measurement Experiment Reflight (SAME-R) Final Report',
                    'url': 'https://psi.nasa.gov/geode-py/ws/studies/PSI-101/download?file=PSI-101_Reports_SAME-R_Final+Report.pdf&version=1&redirect=false',
                    'local': 'dataset/references/nasa-psi/official_PSI-101_Reports_SAME-R_Final Report.pdf', 'sha256': '65381e2715eb7379113dd1b9c550baaa5fa5a247dba00419123143aa98ef80d6', 'kind': 'NASA PSI final report'},
    'candle_usml1': {'id': 'NTRS-19960008390', 'title': 'Candle Flames in Microgravity (Dietrich & Ross, NASA Lewis/Glenn)',
                     'url': 'https://ntrs.nasa.gov/citations/19960008390', 'local': None, 'sha256': None,
                     'kind': 'NASA conference paper (public reference; not stored locally, not used for data)'},
}

# Flame-appearance evidence used to choose the illustrative renderer's qualitative rules.
FLAME_EVIDENCE = [
    {'ref': 'flex_tp', 'pdf_page': 8, 'rule': 'gravity_symmetry',
     'statement': 'Natural convection destroys the spherical symmetry of droplet combustion in normal gravity; microgravity allows spherically symmetric burning.'},
    {'ref': 'flex_tp', 'pdf_page': 11, 'rule': 'gravity_symmetry',
     'statement': 'In the ISS FLEX tests the g-environment was low enough that buoyant flow could be considered negligible (g-jitter still moved some droplets).'},
    {'ref': 'flex_tp', 'pdf_page': 22, 'rule': 'soot_inside_blue',
     'statement': 'For heptane, soot luminosity dominates the colour camera and typically peaks inside the blue flame envelope.'},
    {'ref': 'flex_tp', 'pdf_page': 46, 'rule': 'fuel_dependent_colour',
     'statement': 'A microgravity heptane droplet flame was described as very luminous and yellow with significant sooting — microgravity flames are not always blue.'},
    {'ref': 'bass_tm', 'pdf_page': 21, 'rule': 'low_flow_blue',
     'statement': 'As ventilation flow was reduced, the flame shrank, its orange colour disappeared and it became completely blue before radiative extinction.'},
    {'ref': 'spice_final', 'pdf_page': 2, 'rule': 'coflow_length',
     'statement': 'Increasing coflow velocity decreases luminous flame length of nonbuoyant jet flames, but moves smoke points to higher fuel flow.'},
    {'ref': 'spice_final', 'pdf_page': 8, 'rule': 'soot_path',
     'statement': 'Soot mainly convects with the flow, so soot paths differ between buoyant and nonbuoyant jet diffusion flames.'},
    {'ref': 'spice_thesis', 'pdf_page': 12, 'rule': 'buoyant_flicker',
     'statement': 'Buoyant laminar jet flames flicker; a coflow of excess oxidant is typically needed to reduce flickering.'},
    {'ref': 'candle_usml1', 'pdf_page': None, 'rule': 'gravity_symmetry',
     'statement': 'NASA candle experiments in microgravity produced near-spherical, dim blue flames, unlike the teardrop shape and yellow tip caused by buoyancy on Earth.'},
]

# Fire-safety insights: page-located source statements (not reviewed) linked to the matching AI candidate
# where one exists. They inform; they do not certify any material, system or atmosphere.
FIRE_SAFETY_INSIGHTS = [
    {'id': 'FSI-GRAVITY', 'category': 'Terrestrial vs microgravity combustion', 'ref': 'flex_tp', 'pdf_page': 8, 'candidate': None,
     'scenarios': None, 'material_classes': None,
     'statement': 'Buoyant convection reshapes flames on Earth; in orbit it is negligible, so 1 g screening behaviour does not transfer directly to spacecraft.'},
    {'id': 'FSI-LOWFLOW', 'category': 'Extinction', 'ref': 'bass_tm', 'pdf_page': 21, 'candidate': None,
     'scenarios': None, 'material_classes': ['solid_material'],
     'statement': 'Reducing ventilation flow around a burning solid shrank the flame to blue and led to radiative extinction (BASS-II).'},
    {'id': 'FSI-EXT-VELOCITY', 'category': 'Extinction', 'ref': 'bass_tm', 'pdf_page': 36, 'candidate': 'M-BASS-01',
     'scenarios': ['iss_cabin'], 'material_classes': ['solid_material'],
     'statement': 'Table 2.1 lists an experimental extinction flow velocity of 10 ± 5 mm/s for thin PMMA at 1 atm and 21% O2 (30 ± 5 mm/s at 16% O2).'},
    {'id': 'FSI-1G-BLOWOFF', 'category': 'Terrestrial vs microgravity combustion', 'ref': 'bass_tm', 'pdf_page': 34, 'candidate': None,
     'scenarios': None, 'material_classes': ['solid_material'],
     'statement': 'Model results for downward spread in quiescent 1 g show steady spread at 21% O2, but buoyancy-driven blowoff at 16% O2 — a regime absent in microgravity.'},
    {'id': 'FSI-LOI', 'category': 'Oxygen and flammability', 'ref': 'flex_tp', 'pdf_page': 8, 'candidate': 'F-FLEX-01',
     'scenarios': None, 'material_classes': ['liquid_droplet'],
     'statement': 'FLEX droplet tests (0.70–3.05 atm, N2/CO2 dilution) found limiting oxygen index values slightly lower than initially expected.'},
    {'id': 'FSI-SOOT', 'category': 'Flame spread & soot', 'ref': 'spice_final', 'pdf_page': 2, 'candidate': 'F-SPICE-01',
     'scenarios': None, 'material_classes': ['gaseous_jet'],
     'statement': 'Fifty-two microgravity smoke points were measured; higher coflow shortened luminous flames but shifted smoke points to higher fuel flow.'},
    {'id': 'FSI-SMOKE-SIZE', 'category': 'Detection', 'ref': 'same2_aiaa', 'pdf_page': 1, 'candidate': 'F-SAME2-01',
     'scenarios': None, 'material_classes': ['smoke_source_material'],
     'statement': 'Smoke from heated (non-flaming) spacecraft materials had average particle sizes mostly 200–400 nm, relevant to detector design.'},
    {'id': 'FSI-FM2', 'category': 'Partial-gravity flammability', 'ref': None, 'source': 'fm2_poster', 'pdf_page': None, 'candidate': None,
     'scenarios': ['lunar_habitat'], 'material_classes': None,
     'statement': 'FM2 plans lunar-gravity burns of SIBAL fabric (21% O2, 14.7 psia) and acrylic rods (34% O2, 8.2 psia); no results exist yet.'},
]

# Records whose own reported conditions demonstrate strict matching (values are loaded from the record itself).
DEMONSTRATION_RECORDS = [
    {'id': 'demo_flex_methanol_air', 'label': 'FLEX methanol droplet · air, 1 atm',
     'record_id': f'{RAW}/flex/FLEX.csv::CSV::5',
     'why': 'FLEX Test 4: methanol, 0.21 O2 mole fraction, 760 mmHg, burning-rate constant 0.6 mm²/s (CSV row 5).'},
    {'id': 'demo_spice_ethylene_coflow', 'label': 'SPICE ethylene jet · 0.36 m/s coflow',
     'record_id': f'{RAW}/spice/Spice Flight Test Data II modified.xls::Data record of Video and Stills::5',
     'why': 'SPICE flight record 1.0: ethylene, 101325 Pa, coflow 36.39 cm/s (cells I5, K5, U5). O2 is not reported by SPICE and is left unconstrained.'},
    {'id': 'demo_bass_pmma_film', 'label': 'BASS-II thin PMMA film · 22.2% O2',
     'record_id': f'{RAW}/bass-ii/BASS-II.csv::CSV::2',
     'why': 'BASS-II record: 100 µm PMMA film, calibrated initial O2 22.2% by volume. Pressure is not reported and airflow is restricted, so both stay unconstrained.'},
]

# Investigations hidden from the primary investigation selector (kept everywhere else).
PRIMARY_SELECTOR_EXCLUDED = {
    'PSI-39': ('CFI maps no plottable outcome metric in the indexed CSV and its oxygen values are restricted (basis not '
               'established), so it has no usable measurement for the Simulator chart or metric cards. All 87 CFI records '
               'remain in PostgreSQL, the evidence graph, Resources and the source-record workbench.'),
}

# --------------------------------------------------------------------------- source findings (12 AI-proposed, page-verified)
# Each statement was re-checked on 2026-11-15 against the cited page of the hashed local PDF (key terms and numbers present).
# review_status stays 'not_reviewed' (internal audit state; no qualified scientist has confirmed them). Shown as
# source statements with links, never as approved conclusions. `candidate` links to dataset/references/findings/candidates.jsonl.
SOURCE_FINDINGS = [
    {'candidate': 'F-FLEX-01', 'inv': 'PSI-69', 'ref': 'flex_tp', 'pdf_page': 8, 'topics': ['Ignition & extinction', 'Oxygen & pressure'],
     'statement': 'FLEX burned methanol and n-heptane droplets (2–5 mm) at 0.70–3.05 atm, diluted with nitrogen, carbon dioxide or mixtures; observed limiting oxygen index values were slightly lower than initially expected, with radiative extinction at higher dilution and diffusive extinction at lower dilution.'},
    {'candidate': 'M-BASS-01', 'inv': 'PSI-25', 'ref': 'bass_tm', 'pdf_page': 36, 'topics': ['Ignition & extinction', 'Fire suppression'],
     'statement': 'Table 2.1: experimental extinction (opposed-flow) velocity for thin PMMA at 1 atm is 10 ± 5 mm/s at 21% O₂ and 30 ± 5 mm/s at 16% O₂ (computation 15 and 35 mm/s; theory 7.5 and 10 mm/s).'},
    {'candidate': 'F-BASS-01', 'inv': 'PSI-25', 'ref': 'bass_tm', 'pdf_page': 9, 'topics': ['Material flammability', 'Oxygen & pressure'],
     'statement': 'BASS-II used glovebox dilution with gaseous N₂ for the first time on ISS (a stirred-reactor model set the N₂ flow); main variables were ambient O₂, ventilation flow velocity, and fuel type, thickness and geometry.'},
    {'candidate': 'F-BASS-02', 'inv': 'PSI-25', 'ref': 'bass_tm', 'pdf_page': 10, 'topics': ['Spacecraft fire hazards'],
     'statement': 'Heat release rates estimated from O₂ consumption (13.1 kJ per g O₂) were mostly well below 100 W, and the global equivalence ratio was fuel rich, about 1.3 on average.'},
    {'candidate': 'F-BASS-03', 'inv': 'PSI-25', 'ref': 'bass_tm', 'pdf_page': 9, 'topics': ['Smoke detection'],
     'statement': 'Before/after O₂ and CO₂ readings agreed with one-step stoichiometry; CO versus CO₂ was linear for some datasets but not for all fuel geometries and flows.'},
    {'candidate': 'F-SPICE-01', 'inv': 'PSI-107', 'ref': 'spice_final', 'pdf_page': 2, 'topics': ['Soot formation'],
     'statement': 'Fifty-two smoke points were found (ethylene, propane, propylene, propylene/N₂; burners 0.41, 0.76, 1.6 mm). Higher coflow shortened luminous flames but moved smoke points to higher fuel flow; smaller burners had longer smoke points.'},
    {'candidate': 'F-SPICE-02', 'inv': 'PSI-107', 'ref': 'spice_final', 'pdf_page': 2, 'topics': ['Soot formation'],
     'statement': 'Pseudo threshold-soot-index estimates from the smoke points indicate an unusually high sooting propensity for propane in microgravity diffusion flames.'},
    {'candidate': 'F-CFI-01', 'inv': 'PSI-39', 'ref': 'cfi_final', 'pdf_page': 11, 'topics': ['Earth applications'],
     'statement': 'CFI produced cool-flame burning data for n-dodecane, n-dodecane/iso-dodecane mixtures and farnesane, including pressure and helium-dilution effects, to help validate low-temperature kinetic mechanisms for engines.'},
    {'candidate': 'F-SAME2-01', 'inv': 'PSI-101', 'ref': 'same2_aiaa', 'pdf_page': 1, 'topics': ['Smoke detection'],
     'statement': 'SAME-2 heated five spacecraft materials (Teflon, Kapton, cotton, silicone rubber, Pyrell) below ignition; most average smoke-particle sizes were 200–400 nm.'},
    {'candidate': 'F-SAMER-01', 'inv': 'PSI-101', 'ref': 'samer_final', 'pdf_page': 2, 'topics': ['Smoke detection'],
     'statement': 'Flight and post-flight ground tests support the moment method with a lognormal size assumption as an effective way to characterize spacecraft smoke aerosol.'},
    {'candidate': 'F-SAMER-02', 'inv': 'PSI-101', 'ref': 'samer_final', 'pdf_page': 2, 'topics': ['Smoke detection'],
     'statement': 'Tests with the same Rt/R0 can have quite different sample heating temperatures, so the revised data reduction characterizes each test by heating temperature instead of Rt/R0.'},
    {'candidate': None, 'inv': 'PSI-25', 'ref': 'bass_tm', 'pdf_page': 21, 'topics': ['Ignition & extinction', 'Microgravity flames'],
     'statement': 'As ventilation flow was reduced, a burning thin solid shrank, its orange colour disappeared and it turned completely blue before radiative extinction at about 1.1 cm/s.'},
]

# --------------------------------------------------------------------------- partial-gravity evidence (supplemental, not in PostgreSQL)
# evidence_kind: measured_simulated_lunar_g | measured_parabolic_flight | review | planned. Values copied from the cited page.
PARTIAL_GRAVITY_EVIDENCE = [
    {'id': 'luci-sibal', 'kind': 'measured_simulated_lunar_g', 'ref': 'luci_2025', 'locator': 'slides 12, 19, 33, 34',
     'platform': 'Blue Origin New Shepard, spinning at 11 RPM (effective radius 1.22 m), launched 4 Feb 2025',
     'gravity': 'Lunar (centrifugal, simulated)', 'gravity_g': 0.165, 'gravity_note': '0.165 g calculated from the stated 11 RPM and 1.22 m',
     'material': 'SIBAL cotton-fiberglass fabric (5 cm × 30 cm), downward spread', 'material_class': 'solid_material',
     'oxygen': 'air, ≈20% at start (falls to ≈18%)', 'oxygen_frac': 0.20, 'pressure': 'normal pressure', 'pressure_kpa': None, 'airflow': 'not stated (quiescent chamber)',
     'measurements': [{'parameter': 'Flame base spread rate', 'value': 0.9, 'unit': 'mm/s', 'one_g': 1.5},
                      {'parameter': 'Flame tip spread rate', 'value': 1.1, 'unit': 'mm/s', 'one_g': 2.8}],
     'statement': 'Fabric kept burning for over a minute in simulated lunar gravity; spread was slower than at 1 g, and the 1 g flame went out about 45 s sooner.'},
    {'id': 'luci-pmma', 'kind': 'measured_simulated_lunar_g', 'ref': 'luci_2025', 'locator': 'slides 16, 21, 22, 36',
     'platform': 'Blue Origin New Shepard, spinning at 11 RPM (effective radius 1.22 m), launched 4 Feb 2025',
     'gravity': 'Lunar (centrifugal, simulated)', 'gravity_g': 0.165, 'gravity_note': '0.165 g calculated from the stated 11 RPM and 1.22 m',
     'material': 'Acrylic (PMMA) rod, 4 mm diameter, upward spread', 'material_class': 'solid_material',
     'oxygen': 'air, 20% falling to 14.3% during the burn (1 g: 21% to 14.5%)', 'oxygen_frac': 0.20, 'pressure': 'normal pressure', 'pressure_kpa': None, 'airflow': 'not stated (quiescent chamber)',
     'measurements': [{'parameter': 'Flame tip spread rate', 'value': 1.5, 'unit': 'mm/s', 'one_g': 4.0},
                      {'parameter': 'Lowest chamber O₂ during burn', 'value': 14.3, 'unit': '% O₂', 'one_g': 14.5}],
     'statement': 'The PMMA flame grew to engulf the rod in simulated lunar gravity while chamber O₂ fell from 20% to about 14%; tip spread was slower than at 1 g.'},
    {'id': 'konno-wire', 'kind': 'measured_parabolic_flight', 'ref': 'konno_pci39', 'locator': 'Abstract; Section 2 (p.2)',
     'platform': 'Novespace A310 parabolic flights: 24 s at 0.16 g (±0.1 g); compared with 0 g and 1 g',
     'gravity': 'Lunar 0.16 g (aircraft)', 'gravity_g': 0.16, 'gravity_note': 'stated; accuracy ±0.1 g',
     'material': 'LDPE-insulated wires (Cu and NiCr cores), downward/opposed spread', 'material_class': 'solid_material',
     'oxygen': 'below 21 vol.%', 'oxygen_frac': None, 'pressure': '1 atm', 'pressure_kpa': 101.3, 'airflow': '60 or 150 mm/s opposed flow',
     'measurements': [],
     'statement': 'Limiting oxygen concentration of the NiCr-core wire decreased as gravity decreased (Cu-core less affected): reduced gravity can let insulation burn at lower oxygen than 1 g.'},
    {'id': 'gollner-review', 'kind': 'review', 'ref': 'gollner_2021', 'locator': 'p.3',
     'platform': 'Review of aircraft and 5.2 s drop-tower centrifuge tests', 'gravity': 'Lunar and other partial-gravity levels', 'gravity_g': None, 'gravity_note': '',
     'material': 'Solid fuels', 'material_class': 'solid_material', 'oxygen': '', 'oxygen_frac': None, 'pressure': '', 'pressure_kpa': None, 'airflow': '', 'measurements': [],
     'statement': 'Limited testing identified a “sweet spot” of enhanced flame-spread propensity close to lunar gravity; direct partial-gravity tests are lacking.'},
]

# --------------------------------------------------------------------------- fire-safety rules (Simulator advisory)
# Deterministic rules. A rule fires only when every stated condition holds. Absence of a rule or record never implies safety.
FIRE_SAFETY_RULES = [
    {'id': 'enriched-quiescent', 'level': 'hazard', 'ref': 'acme_2021', 'locator': 'slide 4',
     'when': {'gravity_max': 0.02, 'flow_max': 0.005, 'oxygen_min': 0.25},
     'statement': 'Low-momentum microgravity flames burned for minutes with no airflow at elevated oxygen (ACME BRE); they self-extinguished below ~25% O₂.'},
    {'id': 'thin-solid-above-extinction-flow', 'level': 'hazard', 'ref': 'bass_tm', 'locator': 'PDF p.36, Table 2.1',
     'when': {'gravity_max': 0.02, 'material_classes': ['solid_material'], 'oxygen_min': 0.21, 'flow_min': 0.015, 'pressure_min_kpa': 90, 'pressure_max_kpa': 112},
     'statement': 'Airflow is above the measured extinction velocity for thin PMMA at 21% O₂ (10 ± 5 mm/s): flame spread over thin solids is sustained.'},
    {'id': 'lunar-gravity-burning', 'level': 'hazard', 'ref': 'luci_2025', 'locator': 'slides 16, 19, 21',
     'when': {'gravity_min': 0.1, 'gravity_max': 0.4, 'oxygen_min': 0.20},
     'statement': 'Fabric and acrylic kept burning in simulated lunar gravity in air (LUCI); reviews note enhanced flame-spread propensity near lunar gravity.'},
    {'id': 'reduced-g-lower-loc', 'level': 'hazard', 'ref': 'konno_pci39', 'locator': 'Abstract',
     'when': {'gravity_min': 0.1, 'gravity_max': 0.5, 'material_classes': ['solid_material']},
     'statement': 'Wire insulation (NiCr core) burned at lower oxygen in reduced gravity than at 1 g.'},
]
