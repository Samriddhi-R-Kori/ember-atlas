# Sources and attribution

This file lists only sources that Ember Atlas actually uses, cites or incorporates. Each entry was taken from the code, data or build:

- `backend/app/science/contract.py` (`REFERENCES`, scenario sources);
- `dataset/references/`;
- the Earth Applications module (`frontend/earth-module/`);
- the dependency manifests.

A source that is merely relevant is not listed.

Scientific measurements were collected by NASA and the investigation teams. Ember Atlas curates and visualizes them; it does not claim them.

## NASA data

### Experimental data (NASA Physical Sciences Informatics, CC0-1.0)

These are stored in `dataset/raw/`. Each is byte-identical to the official download.

| Investigation | NASA id | Dataset DOI | Catalog |
|---|---|---|---|
| Flame Extinguishment Experiment (FLEX) | PSI-69 | https://doi.org/10.60555/mbq8-0451 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-69 |
| Cool Flames Investigation (CFI) | PSI-39 | https://doi.org/10.60555/m6pj-a914 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-39 |
| Smoke Aerosol Measurement Experiment Reflight (SAME-R) | PSI-101 | https://doi.org/10.60555/2np7-jv14 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-101 |
| Smoke Point In Co-flow Experiment (SPICE) | PSI-107 | https://doi.org/10.60555/9kbh-e962 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-107 |
| Burning and Suppression of Solids II (BASS-II) | PSI-25 | https://doi.org/10.60555/4qc4-de67 | https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 |

- **Licence:** each catalog record declares CC0-1.0. The snapshots are in `dataset/references/nasa-psi/psi*_catalog.json`; NASA's data licence page is https://science.data.nasa.gov/about/license.
- **Publications:** the 85 NASA-listed publication titles shown in the dashboard come from these catalogs. They are citations only; no result from them is used unless it appears below.

### NASA reports and documents cited

These are used for page-located findings, units, fire-safety rules and flame behaviour. They are not redistributed: `scripts/restore_references.py` retrieves them by SHA-256 from the URLs below.

| Reference | Used for | URL |
|---|---|---|
| Dietrich, Ferkul, Bryg, Nayagam, Hicks, Williams, *Detailed Results from the Flame Extinguishment Experiment (FLEX)*, NASA/TP-2015-216046 | FLEX burning-rate unit (App. A.1, Table IX), findings, flame-shape evidence, ML target definition | https://ntrs.nasa.gov/citations/20150023456 |
| *Burning and Suppression of Solids–II (BASS-II) Summary Report*, NASA/TM-20210011385 | extinction-velocity table (p.36), findings, fire-safety rule | https://ntrs.nasa.gov/citations/20210011385 |
| *Smoke Point in Co-flow Experiment (SPICE)* Final Report (PSI-107) | smoke-point findings | https://psi.nasa.gov/physci/repo/data/investigations/PSI-107 |
| SPICE 30-Day Post-Flight Report (PSI-107) | curation review (methods) | https://psi.nasa.gov/physci/repo/data/investigations/PSI-107 |
| *Cool Flames Investigation (CFI) Science Final Report* (PSI-39) | finding | https://psi.nasa.gov/physci/repo/data/investigations/PSI-39 |
| *SAME-R Final Report* (PSI-101) | findings, run-count explanation | https://psi.nasa.gov/physci/repo/data/investigations/PSI-101 |
| Urban et al., *Particle Morphology and Size Results from SAME-2*, AIAA 2012-3536 (NTRS 20130000422) | smoke-particle-size finding | https://ntrs.nasa.gov/citations/20130000422 |
| Ferkul, Johnston, Kralik, Liao, *Lunar Combustion Investigation (LUCI)*, NTRS 20250010653 | measured simulated-lunar-gravity flame spread, fire-safety rule, Earth ref. [14] | https://ntrs.nasa.gov/citations/20250010653 |
| Stocker, *Recent Research on Flames of Gaseous Fuel Aboard the ISS* (ACME), NTRS 20210022542 | fire-safety rule (slide 4), Earth ref. [13] | https://ntrs.nasa.gov/citations/20210022542 |
| Gollner, Wichman, Liao, Carmignani et al., *Solid Fuel Combustion in Partial and Micro-Gravity*, NTRS 20210022402 | partial-gravity review statement | https://ntrs.nasa.gov/citations/20210022402 |
| Dietrich & Ross, *Candle Flames in Microgravity*, NTRS 19960008390 | flame-shape statement (public reference, not stored) | https://ntrs.nasa.gov/citations/19960008390 |
| Zayac, Johnston et al., *Flammability of Materials on the Moon* (FM2), NTRS 20240015307 | scenario presets: FM2 atmospheres | https://ntrs.nasa.gov/citations/20240015307 |
| Ferkul, Kralik, Liao, Johnston, LPSC 2026 abstract 1799 (FM2 status) | FM2 status | https://www.hou.usra.edu/meetings/lpsc2026/pdf/1799.pdf |
| Norcross et al., NASA/TM-2013-217377 (exploration atmosphere) | lunar-habitat atmosphere context | https://ntrs.nasa.gov/citations/20130013505 |
| NASA OCHMO-TB-003 Rev A, *Habitable Atmosphere* | 101.3 kPa equivalence | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf |
| NASA NSSDCA *Moon Fact Sheet* | lunar gravity 1.62 m/s² (0.165 g) | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |

### NASA sources cited by Earth Applications

| Ref. | Source | URL |
|---|---|---|
| [1] | NASA Glenn Research Center, Combustion Science | https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/ |
| [2] | NASA, Candle Flame: 1g vs Microgravity (2020) | https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/ |
| [3] | NASA, A Researcher's Guide to Combustion Science (2015) | https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/ |
| [4] | NASA Glenn, Beginner's Guide to Aeronautics: Combustion | https://www.grc.nasa.gov/www/k-12/airplane/combst1.html |
| [5] | NASA Earth Observatory, Biomass Burning | https://science.nasa.gov/earth/earth-observatory/biomass-burning/ |
| [10] | NASA Glenn, Otto Cycle Thermodynamic Analysis | https://www.grc.nasa.gov/WWW/K-12/airplane/ottoa.html |
| [12] | NASA Scientific Visualization Studio, NASA Studies Fire in Microgravity | https://svs.gsfc.nasa.gov/31394/ |
| [13]–[15] | ACME, LUCI and FLEX reports (see above) | — |

The evidence list in Earth Applications cites 25 NASA PSI investigation records by DOI: PSI-10, 20, 21, 22, 23, 25, 26, 39, 60, 62, 68, 69, 98, 99, 100, 101, 102, 106, 107, 108, 115, 117, 142, 159 and 181. They are listed in `frontend/earth-module/original/data/psi_records.json`, and each resolves at `https://doi.org/<doi>`.

## Other scientific resources

| Source | Used for | URL |
|---|---|---|
| Konno et al., *Experimental study on downward/opposed flame spread and extinction over electric wires in partial gravity*, Proc. Combust. Inst. 39 (accepted manuscript via UCL Discovery) | reduced-gravity LOC finding, fire-safety rule | https://www.sciencedirect.com/science/article/abs/pii/S154074892200027X (manuscript: https://discovery.ucl.ac.uk/id/eprint/10154634/) |
| University of Maryland M.S. thesis on SPICE smoke points (DRUM repository) | SPICE calibration coefficients (Table 6.1), flicker statement | https://drum.lib.umd.edu/items/e1cf9d1d-2c54-475a-a201-a57d3874011b |
| Rothermel (1972), *A mathematical model for predicting fire spread in wildland fuels*, USDA Forest Service INT-115 | Earth: wildfire moisture damping [8] | https://research.fs.usda.gov/treesearch/32533 |
| Limiting oxygen index method (ASTM D2863 / ISO 4589-2; Fenimore & Martin 1966), typical values via SpecialChem | Earth: building-materials LOI values [9] | https://omnexus.specialchem.com/polymer-property/fire-resistance-loi |
| CSIRO, *Slope effects* (McArthur 1967; Noble et al. 1980) | Earth: wildfire slope rule [11] | https://research.csiro.au/spark/resources/model-library/slope-effects |
| Engineering LibreTexts (Pisupati), *Fossil Fuels and Products of Combustion* | Earth: soot and particle sizes [6] | https://eng.libretexts.org/Bookshelves/Environmental_Engineering_(Sustainability_and_Conservation)/Energy_Conservation_for_Environmental_Protection_(Pisupati)/04%3A_Energy_and_the_Environment/4.01%3A_New_Page |
| UC Museum of Paleontology, *Understanding Global Change: Burning of fossil fuels* | Earth: climate context [7] | https://ugc.berkeley.edu/background-content/burning-of-fossil-fuels/ |

**Physical relationships** used in calculations (P<sub>O₂</sub> = P<sub>total</sub>·X<sub>O₂</sub>, buoyant velocity ∝ √(g·L),
the d²-law, the ideal Otto efficiency 1 − r<sup>1−γ</sup>) are standard textbook physics. Each is labelled in the
interface as a calculation or physical relationship.

## Software and external assets

### Data packaging and Earth module

| Item | Licence | Source |
|---|---|---|
| Fotia project: packaging of the NASA PSI files, plus `info.md` and `layout.json` catalog summaries (no Fotia application code is included) | MIT, notice kept in `dataset/upstream/FOTIA_LICENSE` | https://github.com/AnteurAbderraouf/Fotia (licence copyright: Das Stein Adler) |
| Ember Atlas Earth Applications module sources (`frontend/earth-module/original/`), supplied by the project team; hash-pinned | project | — |

### Frontend (npm)

| Package | Version | Licence | URL |
|---|---|---|---|
| React, React DOM | 19.3 | MIT | https://react.dev |
| Vite, @vitejs/plugin-react | 7.3 / 4.7 | MIT | https://vite.dev |
| TypeScript | 5.9 | Apache-2.0 | https://www.typescriptlang.org |
| Tailwind CSS, @tailwindcss/vite | 4.3 | MIT | https://tailwindcss.com |
| Plotly.js (basic dist) | 3.7 | MIT | https://plotly.com/javascript/ |
| Cytoscape.js | 3.30 | MIT | https://js.cytoscape.org |
| lucide-react (icons) | 0.468 | ISC | https://lucide.dev |
| @radix-ui/react-slot | 1.5 | MIT | https://www.radix-ui.com |
| class-variance-authority | 0.7 | Apache-2.0 | https://cva.style |
| clsx · tailwind-merge | 2.1 · 3.7 | MIT | https://github.com/lukeed/clsx · https://github.com/dcastil/tailwind-merge |
| Vitest | 4.1 | MIT | https://vitest.dev |
| Playwright | 1.65 | Apache-2.0 | https://playwright.dev |

### Fonts

The fonts come through Fontsource and are licensed under SIL OFL 1.1. The licence texts ship with the Earth module font files in `frontend/public/earth/fonts/LICENSE-*.txt`.

| Font | Source |
|---|---|
| Inter | https://github.com/rsms/inter |
| Space Grotesk | https://github.com/floriankarsten/space-grotesk |
| JetBrains Mono | https://github.com/JetBrains/JetBrainsMono |

They are distributed via https://fontsource.org. No Google Fonts are loaded at runtime.

### Backend and science (Python)

| Package | Version | Licence | URL |
|---|---|---|---|
| FastAPI (with Starlette, Pydantic) | 0.162 | MIT (Starlette BSD-3-Clause) | https://fastapi.tiangolo.com |
| SQLAlchemy | 2.0 | MIT | https://www.sqlalchemy.org |
| Alembic | 1.20 | MIT | https://alembic.sqlalchemy.org |
| psycopg 3 | 3.3 | LGPL-3.0 | https://www.psycopg.org |
| Uvicorn | 0.54 | BSD-3-Clause | https://uvicorn.dev |
| NumPy | 2.2 | BSD-3-Clause | https://numpy.org |
| openpyxl | 3.1 | MIT | https://openpyxl.readthedocs.io |
| xlrd | 2.0 | BSD | https://github.com/python-excel/xlrd |
| httpx · pytest | 0.28 · 8.4 | BSD-3-Clause · MIT | https://www.python-httpx.org · https://pytest.org |

### System tools (not redistributed)

| Tool | Used for | Licence | URL |
|---|---|---|---|
| PostgreSQL | database | PostgreSQL License | https://www.postgresql.org |
| Poppler `pdftotext` | page-text checks of cited PDFs | GPL | https://poppler.freedesktop.org |
| Node.js | frontend toolchain | MIT | https://nodejs.org |

No images, logos or media from third parties are bundled. The flame is drawn procedurally in WebGL, and the Earth module draws its scenes on canvas.

## AI assistance

The 12 candidate findings (`dataset/references/findings/candidates.jsonl`) were drafted by an AI assistant (Claude, via Claude Code) from the cited pages. They were then checked against `pdftotext` output of those pages. They are labelled as pending human review. No AI model runs inside Ember Atlas.
