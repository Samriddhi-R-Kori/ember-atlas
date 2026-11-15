"""Append AI-extracted candidate findings to the local review queue (idempotent).

Provenance of these candidates: proposed by the Claude Code assistant on 2026-11-15 after
reading `pdftotext` output of the cited pages of locally saved, hash-recorded NASA
documents. They are paraphrases, not quotations, and are PENDING human review. They are
never treated as evidence until a reviewer confirms or corrects them via the review queue.
`proposed_relevance` is the assistant's suggested engineering relevance — a proposal, not a
source finding.
"""
import hashlib
import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(PROJECT / 'backend'), str(PROJECT)]
from app.science.review import QUEUE, candidates  # noqa: E402

EV = 'dataset/references/nasa-psi/'
EXTRACTION = {'method': 'assistant_reading_pdftotext_output', 'model': 'Claude Opus 5.5 (Claude Code session)',
              'date': '2026-11-15', 'tool': 'pdftotext (poppler)'}


def src(name, pdf_page, printed, section, doc):
    from ember_atlas.paths import resolve
    path = resolve(EV + name)
    return {'path': EV + name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'pdf_page': pdf_page,
            'printed_page': printed, 'section': section, 'document': doc}


SAMER = 'official_PSI-101_Reports_SAME-R_Final Report.pdf'
SAME2 = 'same_report.pdf'
BASS = 'bass_report.pdf'
SPICE = 'official_PSI-107_Reports_SPICE_FinalReport.pdf'
CFI = 'official_PSI-39_Reports_CFI Science Final Report.pdf'
FLEX = 'flex_report.pdf'

CANDIDATES = [
    ('F-SAMER-01', 'finding', 'PSI-101', ['Detection'], 'Moment method validated for spacecraft smoke characterization',
     'Combining SAMER flight and post-flight ground tests, the report concludes that the moment method with a lognormal '
     'particle-size assumption is a valid, effective way to characterize aerosol encountered in space vehicles; particle '
     'size distributions were identified for five materials common in spacecraft.',
     'Supports smoke-detector design that relies on particle-size moments; detector performance itself is not evaluated here.',
     src(SAMER, 2, None, 'Abstract', 'SAMER Final Report (NASA PSI-101)'), []),
    ('F-SAMER-02', 'finding', 'PSI-101', ['Detection'], 'Heating temperature preferred over Rt/R0 to characterize tests',
     'The report states that tests with the same Rt/R0 can have quite different sample heating temperatures, so its revised '
     'data reduction characterizes each test by heating temperature derived from engineering data instead of Rt/R0.',
     'Explains why this dashboard does not interpret Rt/R0 as a physical condition.',
     src(SAMER, 2, None, 'Introduction', 'SAMER Final Report (NASA PSI-101)'), []),
    ('F-SAME2-01', 'finding', 'PSI-101', ['Detection', 'Spacecraft Materials'], 'Most smoke particles 200–400 nm',
     'SAME-2 heated five spacecraft-representative materials (Teflon, Kapton, cotton, silicone rubber, Pyrell) below their '
     'ignition point, with flow past the sample from quiescent to 8 cm/s and smoke aging from 11 to 1800 s. Most average '
     'particle sizes were 200–400 nm; some quiescent cases produced substantially larger particles.',
     'Relevant to sizing assumptions for spacecraft smoke detection; no flaming combustion occurred in these tests.',
     src(SAME2, 1, None, 'Abstract', 'Urban et al., AIAA 2012-3536 (DOI 10.2514/6.2012-3536)'), []),
    ('F-BASS-01', 'finding', 'PSI-25', ['Spacecraft Materials'], 'Ambient O2 added as a controlled test variable',
     'BASS-II used nitrogen dilution of the glovebox working volume for the first time on ISS, using a stirred-reactor model '
     'calibrated against onboard sensors; main variables were ambient O2, ventilation flow velocity, and fuel type, thickness '
     'and geometry.',
     'Method precedent for reduced-O2 flammability testing in orbit.',
     src(BASS, 9, '1', 'Summary', 'BASS-II Summary Report, NASA/TM-20210011385'), []),
    ('F-BASS-02', 'finding', 'PSI-25', ['Spacecraft Materials', 'Suppression'], 'Small heat release; fuel-rich global burning',
     'Heat release rates estimated from O2 consumption and burn time (13.1 kJ per g O2) were mostly well below 100 W, and the '
     'global equivalence ratio was estimated as fuel rich, about 1.3 on average.',
     'Indicates scale of fire signatures in small orbital tests; not a material-acceptance result.',
     src(BASS, 10, '2', 'Summary (continued)', 'BASS-II Summary Report, NASA/TM-20210011385'), []),
    ('F-BASS-03', 'finding', 'PSI-25', ['Detection'], 'Gas readings consistent with one-step stoichiometry',
     'Before/after O2 and CO2 readings compared well with stoichiometric ratios for a one-step gas-phase reaction; CO versus '
     'CO2 followed a linear trend for some datasets but not for all fuel geometries and flows.',
     'Suggests O2/CO2 sensors can track combustion completeness; CO behaviour is configuration dependent.',
     src(BASS, '9-10', '1-2', 'Summary', 'BASS-II Summary Report, NASA/TM-20210011385'), []),
    ('M-BASS-01', 'measurement', 'PSI-25', ['Suppression'], 'Extinction flow velocity, thin PMMA, 21% O2',
     'Table 2.1 lists an experimental extinction velocity of 10 ± 5 mm/s for thin PMMA at 1 atm and 21% O2 (computation 15, '
     'theory 7.5 mm/s).',
     'Low-flow extinction limits inform ventilation-shutdown suppression strategies (proposal).',
     src(BASS, 36, None, 'Table 2.1', 'BASS-II Summary Report, NASA/TM-20210011385'), ['Ambiguous']),
    ('M-BASS-02', 'measurement', 'PSI-25', ['Suppression'], 'Extinction flow velocity, thin PMMA, 16% O2',
     'Table 2.1 lists an experimental extinction velocity of 30 ± 5 mm/s for thin PMMA at 1 atm and 16% O2 (computation 35, '
     'theory 10 mm/s).',
     'Low-flow extinction limits inform ventilation-shutdown suppression strategies (proposal).',
     src(BASS, 36, None, 'Table 2.1', 'BASS-II Summary Report, NASA/TM-20210011385'), ['Ambiguous']),
    ('F-SPICE-01', 'finding', 'PSI-107', ['Earth Applications'], 'Coflow and burner size shift smoke points',
     'SPICE found 52 smoke points (ethylene, propane, propylene, propylene/N2) with burners of 0.41, 0.76 and 1.6 mm and '
     'coflow 5.4–65 cm/s. Higher coflow shortened luminous flames but moved smoke points to higher fuel flow and longer '
     'flames; smaller burners had longer smoke points.',
     'Microgravity sooting data can test soot models also used for terrestrial flames (proposal).',
     src(SPICE, 2, 'ii', 'Abstract', 'SPICE Final Report (NASA PSI-107)'), []),
    ('F-SPICE-02', 'finding', 'PSI-107', ['Earth Applications', 'Spacecraft Materials'], 'High microgravity sooting propensity for propane',
     'Pseudo threshold-soot-index estimates from the measured smoke points indicate an unusually high sooting propensity for '
     'propane in microgravity diffusion flames.',
     'Fuel-dependent soot behaviour matters for smoke/radiation hazards; cross-gravity transfer is not established.',
     src(SPICE, 2, 'ii', 'Abstract', 'SPICE Final Report (NASA PSI-107)'), []),
    ('F-CFI-01', 'finding', 'PSI-39', ['Earth Applications'], 'Cool-flame droplet data for low-temperature chemistry',
     'CFI produced cool-flame burning data for n-dodecane, n-dodecane/iso-dodecane mixtures and farnesane, studying pressure '
     'and helium dilution; the report states these data help validate low-temperature kinetic mechanisms relevant to '
     'low-temperature engine concepts such as HCCI.',
     'Benefit statements are the source authors\' claims; no engine result is reported.',
     src(CFI, 11, '10', '5.5 Summary of findings; b. Benefits', 'CFI Science Final Report (NASA PSI-39)'), []),
    ('F-FLEX-01', 'finding', 'PSI-69', ['Suppression', 'Spacecraft Materials'], 'Limiting oxygen index slightly lower than expected',
     'FLEX burned methanol and n-heptane droplets (2–5 mm) at 0.70–3.05 atm with N2/CO2 dilution; observed limiting oxygen '
     'index values appeared slightly lower than initially expected, with radiative extinction at higher dilution and diffusive '
     'extinction at lower dilution.',
     'Relevant to diluent-based fire suppression and atmosphere selection; values are fuel- and geometry-specific.',
     src(FLEX, 8, '1', 'Executive Summary', 'NASA/TP-2015-216046 (FLEX)'), []),
]


def main():
    existing = {c['id'] for c in candidates()}
    QUEUE.mkdir(parents=True, exist_ok=True)
    added = 0
    with (QUEUE / 'candidates.jsonl').open('a') as handle:
        for cid, kind, inv, cats, title, text, relevance, source, flags in CANDIDATES:
            if cid in existing:
                continue
            handle.write(json.dumps({'id': cid, 'kind': kind, 'investigation': inv,
                                     'payload': {'title': title, 'finding': text, 'categories': cats,
                                                 'proposed_relevance': relevance},
                                     'source': source, 'extraction': EXTRACTION, 'flags': flags,
                                     'evidence_label': 'ai_candidate'}, ensure_ascii=False) + '\n')
            added += 1
    print(f'added {added} candidates; queue now {len(existing) + added}')


if __name__ == '__main__':
    main()
