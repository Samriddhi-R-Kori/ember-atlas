import { Fragment, useEffect, useState } from 'react'
import { CheckCircle2, CircleDashed, ExternalLink, XCircle } from 'lucide-react'
import { primaryInvestigations, useAppState } from '../state/AppState'
import { EvidenceBadge } from '../components/shared/Evidence'
import { displayValue, human, shortPath, trim } from '../lib/format'
import { RULE_TEXT } from '../science/gapEngine'

export const SECTIONS = ['Project Overview', 'Scientific Dataset', 'NASA Investigations', 'Research Papers', 'Experimental Conditions', 'Measurement Methods',
  'Evidence Coverage & Gaps', 'FM2 & Lunar Research', 'AI & Machine Learning', 'Validation Results', 'Scientific Limitations', 'References & Downloads']
const id = (i: number) => `resources-${String(i + 1).padStart(2, '0')}`

export default function ResourcesPage() {
  const { spine, mode, applyMeasuredConditions } = useAppState()
  const [active, setActive] = useState(0)
  const reg = spine.models; const model = reg?.models[0]; const ver = spine.verification
  const go = (i: number) => { setActive(i); document.getElementById(id(i))?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  useEffect(() => {
    const obs = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (v) setActive(Number(v.target.id.slice(-2)) - 1) }, { rootMargin: '-80px 0px -60% 0px' })
    SECTIONS.forEach((_, i) => { const el = document.getElementById(id(i)); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  const refs = spine.references ?? {}
  // Engineering checks that actually ran. Unexecuted orchestration (Docker) is reported in the saved verification report, not here.
  const checks = (ver?.checks ?? []).filter(c => !/docker/i.test(c.name))
  const excluded = spine.primary_selector_excluded ?? {}
  const shown = new Set(primaryInvestigations(spine).map(i => i.id))
  const H = ({ i }: { i: number }) => <h2><span>{String(i + 1).padStart(2, '0')}</span>{SECTIONS[i]}</h2>
  return <div className="page"><div className="three-col">
    <nav className="card method-nav" aria-label="Resources sections">{SECTIONS.map((s, i) => <button key={s} aria-current={active === i} onClick={() => go(i)}><span>{String(i + 1).padStart(2, '0')}</span>{s}</button>)}</nav>
    <article className="card doc" aria-label="Resources">
      <header><div className="kicker">Resources</div><h1 className="doc-title">Scientific resource center</h1>
        <p className="note">Methodology, data provenance, validation and limitations behind every number in the dashboard.</p></header>

      <section id={id(0)}><H i={0} />
        <p>Ember Atlas (our Flame in Freefall project) consolidates source-linked NASA microgravity combustion records so researchers can inspect conditions and measurements, compare compatible quantities, see where the indexed evidence is thin, and reason about future experiments. It is an evidence summary — not a combustion simulator and not a safety tool.</p>
        <ul><li><strong>Scenario Simulator</strong> — match ISS Cabin or Lunar Habitat conditions against measured records; illustrative flame rendering.</li>
          <li><strong>Cinematic Evidence Graph</strong> — investigations, papers, materials, planned experiments and deterministic gaps.</li>
          <li><strong>Earth Applications</strong> — how microgravity combustion research reaches building materials, fire safety, burners, wildfire, soot and engines.</li>
          <li><strong>Resources</strong> — this page.</li></ul>
        <p>The Simulator follows three steps: <strong>Summarize</strong> (measured values from the indexed records), <strong>Rank</strong> (records ordered by how many requested conditions they match, using deterministic strict matching — not machine learning) and <strong>Interpret</strong> (source-backed fire-safety advisories and coverage gaps).</p>
        <p>All views read one data spine (<span className="mono">spine {spine.spine_version}</span>, contract <span className="mono">{spine.contract_version}</span>) served from PostgreSQL or a SHA-256-verified static export.</p></section>

      <section id={id(1)}><H i={1} />
        <p>Dataset <span className="mono">{spine.dataset.version}</span> (manifest <span className="mono">{spine.dataset.manifest_sha256.slice(0, 16)}…</span>): {spine.investigations.length} NASA PSI investigations, {spine.dataset.summary.csv_rows.toLocaleString()} original CSV rows, {spine.dataset.summary.duplicates_retained} exact repeats retained. Source files are byte-identical to NASA downloads (CC0-1.0). Scientific approval: <strong>{spine.dataset.scientific_approval ? 'granted' : 'not granted'}</strong>; external sign-off: <strong>{spine.dataset.external_signoff ? 'yes' : 'none'}</strong>.</p>
        <table className="table"><thead><tr><th>Investigation</th><th>Condition source</th><th>Records</th><th>Repeats</th><th>DOI</th></tr></thead><tbody>{spine.investigations.map(i => <tr key={i.id}><td>{i.short} · {i.id}{!shown.has(i.id) && <div className="note">not in primary selector</div>}</td>
          <td className="mono">{i.sources.map(s => `${s.id.split('/').pop()}${s.sheet ? ` [${s.sheet}]` : ''} (${s.role.replaceAll('_', ' ')})`).join('; ')}</td><td className="mono">{i.condition_records}</td><td className="mono">{i.exact_repeats_retained}</td><td className="mono">{i.doi}</td></tr>)}</tbody></table>
        {Object.entries(excluded).map(([inv, why]) => <p key={inv} className="note" data-testid="cfi-note"><strong>{spine.investigations.find(i => i.id === inv)?.short} ({inv}) in the selectors:</strong> {why}{mode === 'live_api' && <> Browse its records in the <a href="#/records">source-record workbench</a>.</>}</p>)}
        <div className="kicker" style={{ marginTop: 8 }}>Evidence labels</div>
        <ul>{Object.entries(spine.labels).map(([k, v]) => <li key={k}><strong>{human(k)}:</strong> {v}</li>)}</ul></section>

      <section id={id(2)}><H i={2} />
        <div className="cards-grid">{spine.investigations.map(i => <div key={i.id} className="paper">
          <h4>{i.short} · {i.id}</h4><p className="note">{i.title}</p>
          <dl className="kv"><dt>Platform</dt><dd>{i.platform}</dd><dt>Gravity</dt><dd>{i.gravity}</dd><dt>Scale</dt><dd>{i.scale}</dd>
            <dt>Material class</dt><dd>{spine.material_classes[i.material_class]?.label}</dd>
            {(['oxygen', 'pressure', 'flow'] as const).map(d => { const r = i.condition_ranges[d]
              return <Fragment key={d}><dt>{human(d)}</dt><dd className="mono">{r.min !== null ? `${displayValue(r.min, r.unit)} – ${displayValue(r.max!, r.unit)}` : 'not reported'}{(r.states.restricted ?? 0) > 0 ? ` · ${r.states.restricted} unresolved` : ''}</dd></Fragment> })}
            <dt>Catalog</dt><dd><a href={i.catalog_url} target="_blank" rel="noreferrer">NASA PSI <ExternalLink size={10} /></a></dd></dl></div>)}</div></section>

      <section id={id(3)}><H i={3} />
        <p>Publication titles come from the NASA PSI catalog ({spine.papers.length} titles). They are citations; results are used only through reviewed findings or page-located statements listed below.</p>
        {spine.investigations.map(i => { const ps = spine.papers.filter(p => p.investigations.includes(i.id)); return <details key={i.id}><summary>{i.short} — {ps.length} publications</summary>
          <ul className="note">{ps.map(p => <li key={p.id}>{p.title}{p.doi && <> · <a href={p.source_link} target="_blank" rel="noreferrer">DOI {p.doi}</a></>}</li>)}</ul></details> })}
        <div className="kicker" style={{ marginTop: 8 }}>Key findings from NASA reports</div>
        <ul data-testid="resource-findings">{(spine.source_findings ?? []).map((f, i) => { const r = refs[f.ref]; return <li key={i}><strong>{spine.investigations.find(x => x.id === f.inv)?.short}</strong> — {f.statement} <span className="faint">({r ? <a href={r.url} target="_blank" rel="noreferrer">{r.id}</a> : f.ref}, PDF p.{f.pdf_page})</span></li> })}</ul>
        <div className="kicker" style={{ marginTop: 8 }}>Primary documents cited in the dashboard</div>
        <ul>{Object.entries(refs).map(([k, r]) => <li key={k}><a href={r.url} target="_blank" rel="noreferrer">{r.id}</a> — {r.title} <span className="faint">({r.kind}{r.sha256 ? `; local SHA-256 ${r.sha256.slice(0, 12)}…` : ''})</span></li>)}</ul></section>

      <section id={id(4)}><H i={4} />
        {spine.scenarios.map(s => <div key={s.id} className="paper" style={{ marginBottom: 8 }}><h4>{s.name} <span className="badge planned">Source-backed design preset</span></h4>
          <ul>{Object.entries(s.conditions).map(([k, c]) => <li key={k}><strong>{k}:</strong> {c.display} — {c.note}{c.source && <> Source: <a href={spine.scenario_sources[c.source].url} target="_blank" rel="noreferrer">{spine.scenario_sources[c.source].title}</a> ({spine.scenario_sources[c.source].locator}).</>}</li>)}</ul>
          <ul className="note">{s.assumptions.map(a => <li key={a}>{a}</li>)}</ul></div>)}
        <p>Only these two scenarios exist. Presets are conditions, not observations.</p>
        <h3>Scientific calculations</h3>
        <ul data-testid="calculations"><li><strong>Oxygen partial pressure:</strong> P<sub>O₂</sub> = P<sub>total</sub> × X<sub>O₂</sub>. ISS Cabin: 101.35 kPa × 0.21 = 21.3 kPa. Lunar Habitat: 56.54 kPa × 0.34 = 19.2 kPa. Calculated, not measured; P<sub>O₂</sub> alone does not decide whether a material burns.</li>
          <li><strong>Lunar gravity:</strong> 1.62 m/s² ÷ 9.80665 m/s² = 0.165 g (NSSDCA Moon fact sheet).</li>
          <li><strong>LUCI centrifugal gravity:</strong> (2π × 11 rpm / 60)² × 1.22 m = 1.62 m/s² ≈ 0.165 g, from the stated spin rate and radius.</li>
          <li><strong>Unit conversions:</strong> 1 psi = 6.894757 kPa; 760 mmHg = 101.325 kPa; volume fraction = mole fraction for ideal-gas mixtures.</li></ul>
        <div className="kicker" style={{ marginTop: 8 }}>Demonstration presets (measured records)</div>
        <table className="table" data-testid="demo-table"><thead><tr><th>Preset</th><th>Source record</th><th>Why</th><th /></tr></thead><tbody>
          {(spine.demonstration_records ?? []).map(d => <tr key={d.id}><td>{d.label}</td><td className="mono" style={{ fontSize: 10.5 }}>{shortPath(d.record_id)}</td><td className="note">{d.why}</td>
            <td><button className="btn sm" onClick={() => { applyMeasuredConditions(d.record_id); window.location.hash = '#/simulator' }}>Load</button></td></tr>)}</tbody></table></section>

      <section id={id(5)}><H i={5} />
        <h3>Measured quantities</h3>
        <table className="table"><thead><tr><th>Investigation</th><th>Metric</th><th>Unit</th><th>Criterion / status</th></tr></thead><tbody>{spine.metrics.map(m => <tr key={m.investigation + m.key}>
          <td>{spine.investigations.find(i => i.id === m.investigation)?.short}</td><td>{m.label}</td><td className="mono">{m.unit ?? '—'}</td>
          <td className="note">{m.restricted ? <><span className="badge warn">Not plotted</span> {m.why}</> : m.criterion}</td></tr>)}</tbody></table>
        <h3>Strict matching (the only mode)</h3>
        <p>{spine.tolerance_rule.rule}</p><p className="note">{spine.tolerance_rule.basis}</p>
        {spine.tolerance_rule.requirements && <ul>{spine.tolerance_rule.requirements.map(r => <li key={r}>{r}</li>)}</ul>}
        <p><strong>Gravity:</strong> {spine.gravity_rule.rule}</p>
        <h3>Interpolation</h3>
        <p>Considered only within one compatibility group (same investigation, metric, literal material and every other reported condition/context value), with ≥3 measured points and ≥3 distinct levels; linear between adjacent level medians; never outside the measured domain. Three points do not establish validity. Metric cards show descriptive statistics of matching source values and never read the animation.</p>
        <h3 id="flame-renderer">Flame renderer</h3>
        <p>The flame is a GPU fragment shader (WebGL, procedural value-noise, no bundled imagery) drawn from a qualitative mapping of the controls: buoyancy scales with √g, forced flow tilts cross-flow flames and shortens coflow jets, flicker appears only with buoyancy, soot luminosity depends on the fuel's relative sooting tendency, and quiescent low-flow orbital flames of solids turn blue through radiative cooling. Oxygen and pressure change brightness and size mildly; they never switch the colour on their own.</p>
        <p><strong>Limits:</strong> geometry, colours and flicker are illustrative. They are not a validated combustion model or a quantitative prediction, no number is read from the rendering, and the dataset supports no validated flame-shape model (Mode B remains unavailable). Smoke-generation samples (SAME-R) are drawn as heated, non-flaming sources.</p>
        <div className="kicker">Source behaviours the renderer imitates</div>
        <ul data-testid="flame-evidence">{(spine.flame_evidence ?? []).map((f, i) => { const r = refs[f.ref]; return <li key={i}>{f.statement} <span className="faint">— {r ? <a href={r.url} target="_blank" rel="noreferrer">{r.id}</a> : f.ref}{f.pdf_page ? `, PDF p.${f.pdf_page}` : ''}</span></li> })}</ul></section>

      <section id={id(6)}><H i={6} />
        <p><strong>Coverage gap:</strong> no qualifying record in our catalogue combines the requested gravity, oxygen, pressure, flow, material and measurement criterion. Missing values never count as matches.</p>
        <p><strong>Evidence-quality gap:</strong> related records exist but cannot support a reliable conclusion because of missing metadata, uncertain experiment identity, calibration concerns, incompatible measurements, unreviewed evidence, missing uncertainty or disputed source reconciliation. It is <em>blocking</em> when no record qualifies and <em>limiting</em> when qualifying records exist.</p>
        <p className="note">{RULE_TEXT}</p>
        <p><strong>Progressive gaps:</strong> the graph starts with one coverage and one quality node per scenario. Selecting a scenario or gap reveals condition-pair gaps (e.g. O₂ + pressure) and material-class gaps — at most seven per scenario, created only where a gap exists.</p>
        <p><strong>Explanations:</strong> every gap lists the requested combination, which dimensions have evidence, records considered and excluded (by reason), its type and a proposed measurement that would address it. Proposals need scientific review.</p>
        <p><strong>Scope:</strong> a gap in our catalogue is not proof that NASA has never performed such a test.</p></section>

      <section id={id(7)}><H i={7} />
        <p><EvidenceBadge label="planned" /> <strong>{spine.fm2.status_label}.</strong> {spine.fm2.status_detail}</p>
        <ul>{spine.fm2.planned_conditions.map(c => <li key={c.label}>{c.label}: {Math.round(c.oxygen * 100)}% O₂ at {c.pressure_psia} psia, {c.gravity} gravity; {c.samples}.</li>)}</ul>
        <p>What the planned design does not establish:</p><ul>{spine.fm2.does_not_establish.map(x => <li key={x}>{x}</li>)}</ul>
        <p className="note">Sources: {spine.fm2.sources.map(s => <a key={s} href={spine.scenario_sources[s].url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>{spine.scenario_sources[s].id}</a>)}{refs.luci_2025 && <a href={refs.luci_2025.url} target="_blank" rel="noreferrer">{refs.luci_2025.id}</a>}</p>
        <h3>Partial-gravity combustion evidence</h3>
        <p>No flame has yet been measured on the lunar surface. The closest evidence is listed by type; it is kept separate from the indexed NASA PSI catalogue and does not close the Lunar Habitat coverage gap (its oxygen and pressure differ).</p>
        <table className="table" data-testid="partial-gravity-table"><thead><tr><th>Study</th><th>Type</th><th>Conditions</th><th>Result</th></tr></thead><tbody>
          {(spine.partial_gravity_evidence ?? []).map(e => { const r = refs[e.ref]; return <tr key={e.id}>
            <td>{r ? <a href={r.url} target="_blank" rel="noreferrer">{r.id}</a> : e.ref}<div className="note">{e.locator}</div></td>
            <td className="note">{e.kind === 'measured_simulated_lunar_g' ? 'Measured, simulated lunar g' : e.kind === 'measured_parabolic_flight' ? 'Measured, parabolic flight' : 'Review'}</td>
            <td className="note">{e.gravity}{e.gravity_note ? ` (${e.gravity_note})` : ''}; {e.material}{e.oxygen ? `; ${e.oxygen}` : ''}{e.pressure ? `; ${e.pressure}` : ''}{e.airflow ? `; ${e.airflow}` : ''}</td>
            <td className="note">{e.statement}{e.measurements.length > 0 && <> {e.measurements.map(m => `${m.parameter}: ${m.value} ${m.unit}${m.one_g !== null ? ` (1 g: ${m.one_g})` : ''}`).join('; ')}.</>}</td></tr> })}</tbody></table>
        <p className="note">Related parabolic-flight work cited by these sources: Sacksteder &amp; T'ien (1994), Feier et al. (2002, Proc. Combust. Inst. 29), Kleinhenz et al. (2008, Combust. Flame 154), Ferkul &amp; Olson (2011, J. Thermophys. Heat Transf. 25).</p></section>

      <section id={id(8)} className="ml-section"><H i={8} />
        <p className="ml-lede">Ember Atlas combines machine learning, AI-assisted extraction of findings from NASA reports, and deterministic evidence analysis to make NASA&apos;s microgravity combustion research easier to understand. A trained regression model studies how combustion conditions relate to measured burning rates, and a separate counting algorithm shows where experimental evidence is plentiful, thin or missing.</p>
        <div className="ml-pillars">
          <div><span className="ml-num">1</span><strong>Ridge regression</strong><span>Learns how FLEX droplet burning rates depend on test conditions.</span></div>
          <div><span className="ml-num">2</span><strong>Research gap detection</strong><span>Counts qualifying records for every combination of two parameters.</span></div>
          <div><span className="ml-num">3</span><strong>AI-assisted research</strong><span>Drafted findings from NASA PDFs, each checked against its page.</span></div>
        </div>

        <h3>1 · Machine learning model: ridge regression</h3>
        <p>We trained a ridge regression model on NASA&apos;s FLEX (Flame Extinguishment Experiment) data to study the <strong>burning-rate constant</strong> K of liquid fuel droplets in microgravity: the slope of the d²-law, d² = d₀² − K·t, reported in mm²/s. The model learns a linear relationship between the experimental conditions and the measured K.</p>
        <div className="equation" aria-label="beta hat equals the inverse of X transpose X plus lambda I, times X transpose y"><span className="math"><span className="hat">β</span> = (X<sup>T</sup>X + λI)<sup>−1</sup> X<sup>T</sup>y</span><span className="eq-tag">(1)</span></div>
        <dl className="symbols">
          <div><dt><span className="math">X</span></dt><dd>Matrix of experimental input features: one row per test, one column per feature.</dd></div>
          <div><dt><span className="math">y</span></dt><dd>Measured burning-rate constants (mm²/s).</dd></div>
          <div><dt><span className="math"><span className="hat">β</span></span></dt><dd>Learned regression coefficients.</dd></div>
          <div><dt><span className="math">λ</span></dt><dd>Regularization strength: larger values shrink coefficients and limit overfitting.</dd></div>
          <div><dt><span className="math">I</span></dt><dd>Identity matrix.</dd></div>
        </dl>
        <p>Ridge regression minimizes the squared prediction error plus a penalty on large coefficients, <span className="math">Σ(y<sub>i</sub> − ŷ<sub>i</sub>)² + λ‖β‖²</span>. Equation (1) is its closed-form solution. In our implementation every feature is first <strong>standardized</strong> with the training data&apos;s mean and standard deviation, <span className="math">z<sub>j</sub> = (x<sub>j</sub> − μ<sub>j</sub>) / σ<sub>j</sub></span>. The <strong>intercept</strong> is the mean burning rate <span className="math">ȳ</span> and is not penalized:</p>
        <div className="equation"><span className="math">ŵ = (Z<sup>T</sup>Z + λI)<sup>−1</sup> Z<sup>T</sup>(y − ȳ),&nbsp;&nbsp;&nbsp; ŷ = ȳ + z<sup>T</sup>ŵ</span><span className="eq-tag">(2)</span></div>

        <h4 className="ml-sub">How we trained the model</h4>
        <ol className="timeline" data-testid="ml-timeline">
          <li><span className="tl-dot">1</span><div><strong>Data collection</strong>
            <p>The catalogue indexes five NASA Physical Sciences Informatics investigations ({spine.investigations.map(i => i.short).join(', ')}). Only FLEX measures droplet burning-rate constants, so the model trains on FLEX alone: {model ? `${model.training_records + Object.values(model.excluded_records).reduce((a, b) => a + b, 0)} FLEX source records` : 'the FLEX source records'}. The other investigations measure different quantities, such as smoke points, smoke particles and solid flame spread, and are not training data.</p></div></li>
          <li><span className="tl-dot">2</span><div><strong>Data preparation</strong>
            <p>Each record becomes six numeric features: a fuel indicator (n-heptane = 1, methanol = 0), ambient O₂ mole fraction, pressure (kPa), helium fraction, CO₂ fraction and initial droplet diameter (mm). Only plain observed burning-rate values are used, and nothing is imputed: {model ? Object.entries(model.excluded_records).map(([k, v]) => `${v} record${v > 1 ? 's' : ''} excluded (${k.replace('target_not_reported', 'no reported burning rate').replace('input_not_usable:pressure', 'pressure not usable').replaceAll('_', ' ')})`).join(', ') : 'incomplete records are excluded'}, leaving <strong>{model?.training_records ?? '—'} records</strong>. Tests sharing the same fuel, O₂, helium, CO₂ and pressure (rounded to 1 kPa) form one condition group: <strong>{model?.independent_condition_groups ?? '—'} groups</strong> in total.</p></div></li>
          <li><span className="tl-dot">3</span><div><strong>Model training</strong>
            <p>Python and NumPy solve equation (2) directly with a linear solver. No iterative optimizer or neural network is involved. λ is chosen from {'{'}0.01, 0.1, 1, 10, 100{'}'} by an inner grouped cross-validation that sees only training data. The registered model uses λ = 10, and its coefficients, feature means and standard deviations are stored with SHA-256 hashes of the data and the training code.</p></div></li>
          <li><span className="tl-dot">4</span><div><strong>Model evaluation</strong>
            <p>We use {model?.validation.folds ?? 5}-fold <strong>grouped cross-validation</strong>: whole condition groups are assigned to folds, so repeated tests at the same conditions are never split between training and testing. Without this, a model could score well simply by recognising near-duplicate tests (data leakage). The code checks that no group appears on both sides of any split.</p></div></li>
          <li><span className="tl-dot">5</span><div><strong>Scientific integration</strong>
            <p>The model is a research-analysis component. Numerical predictions stay <strong>disabled</strong> in the public simulator, so a model estimate can never be mistaken for a NASA measurement. A qualified reviewer has not yet approved the model.</p></div></li>
        </ol>
        <div className="equation" aria-label="MAE equals one over n times the sum of absolute errors"><span className="math">MAE = <span className="frac"><span>1</span><span>n</span></span> <span className="bigop">Σ</span> |y<sub>i</sub> − ŷ<sub>i</sub>|</span><span className="eq-tag">(3)</span></div>
        <p className="note">n is the number of evaluated predictions, y<sub>i</sub> the measured burning-rate constant and ŷ<sub>i</sub> the model&apos;s prediction for a test it did not see during training. A smaller MAE means a smaller average absolute error, in the same unit as the target (mm²/s).</p>
        {model ? <div className="ml-results" data-testid="ml-results">
          <div className="ml-metrics">{([['ridge', 'Ridge regression'], ['per_fuel_mean', 'Per-fuel mean baseline'], ['global_mean', 'Global mean baseline']] as const).map(([k, label]) => { const m = model.validation.metrics[k]; if (!m) return null
            return <div key={k} className={k === 'ridge' ? 'best' : ''}><span>{label}</span><strong className="mono">{trim(m.mae, 3)}</strong><small>MAE, mm²/s · RMSE {trim(m.rmse, 3)} · n = {m.n}</small>
              <i style={{ width: `${Math.min(100, m.mae / model.validation.metrics.global_mean.mae * 100)}%` }} /></div> })}</div>
          <p className="note">Saved grouped-CV results for model {model.version}. Ridge regression&apos;s MAE is {Math.round((1 - model.validation.metrics.ridge.mae / model.validation.metrics.per_fuel_mean.mae) * 100)}% lower than predicting each fuel&apos;s average burning rate. This holds only for new condition groups inside the tested range. Predictive uncertainty has not been validated.</p>
          <details><summary>Model card (technical detail)</summary>
            <p className="note">Inputs: {model.inputs.join(', ')}. Target: {model.target.definition} ({model.target.unit}). Validation: {model.validation.procedure}.</p>
            <ul className="note">{model.limitations.map(l => <li key={l}>{l}</li>)}</ul>
            <table className="table"><thead><tr><th>Candidate target</th><th>Decision</th><th>Reason</th></tr></thead><tbody>{reg?.eligibility.map(e => <tr key={e.target}><td>{e.label}</td><td>{human(e.decision)}</td><td className="note">{e.reason}</td></tr>)}</tbody></table></details>
        </div> : <p>Training not scientifically supported by current data.</p>}

        <h3>2 · Research gap detection</h3>
        <p>The <strong>Research Gap Explorer</strong> shows which combinations of experimental parameters have plenty of qualifying records, few, or none in the indexed dataset. Unlike the regression model, it is deterministic counting: it learns nothing, predicts nothing, and gives the same answer every time.</p>
        <ol className="flow" data-testid="gap-flow">
          <li><strong>Extract</strong><span>Organize records by recorded parameters: fuel, nozzle diameter, O₂, pressure, flow and others.</span></li>
          <li><strong>Compare</strong><span>Pick a horizontal and a vertical parameter to form a matrix of combinations.</span></li>
          <li><strong>Count</strong><span>Count the qualifying records in every cell.</span></li>
          <li><strong>Classify</strong><span>Label each cell observed, sparse or unobserved.</span></li>
          <li><strong>Interpret</strong><span>Read the gaps as gaps in this catalogue, not in all of science.</span></li>
        </ol>
        <div className="equation" aria-label="C of a b equals the sum over i from 1 to N of the indicator that A i equals a and B i equals b"><span className="math">C(a,b) = <span className="sum-lim"><small>N</small><span className="bigop">Σ</span><small>i=1</small></span> 𝟙(A<sub>i</sub> = a ∧ B<sub>i</sub> = b)</span><span className="eq-tag">(4)</span></div>
        <dl className="symbols">
          <div><dt><span className="math">C(a,b)</span></dt><dd>Number of qualifying records for the combination (a, b).</dd></div>
          <div><dt><span className="math">N</span></dt><dd>Total records examined.</dd></div>
          <div><dt><span className="math">A, B</span></dt><dd>The two selected parameters.</dd></div>
          <div><dt><span className="math">𝟙</span></dt><dd>Indicator: 1 when both conditions hold, otherwise 0.</dd></div>
        </dl>
        <p><strong>Binning numeric parameters:</strong> a numeric parameter with eight or fewer distinct values uses those exact values as levels. Otherwise its observed range is split into equal-width bins (2–8, default 4); each bin excludes its upper bound except the last. Records with missing or unusable values are left out of the grid and reported separately, so missing metadata never shows up as an empty cell. Exact repeat rows are kept in the counts.</p>
        <div className="gap-legend">
          <div className="observed"><i />Observed<span>Qualifying records exist (count ≥ threshold).</span></div>
          <div className="sparse"><i />Sparse<span>Some records, but fewer than the chosen threshold (default 3).</span></div>
          <div className="unobserved"><i />Unobserved<span>No qualifying indexed record for this combination.</span></div>
        </div>
        <p className="note">The threshold sets what &ldquo;sparse&rdquo; means. Raising it from 3 to 10 flags combinations that have only a handful of repeats; lowering it to 2 flags only single tests.</p>
        <div className="paper gap-example" data-testid="gap-example">
          <h4>Example · SPICE fuel × nozzle diameter</h4>
          <p className="note">Research Gap Explorer on PSI-107 <span className="mono">Spice.csv</span> (469 rows, 3 exact nozzle levels, threshold 3).</p>
          <table className="table coverage-mini"><thead><tr><th>Fuel</th><th>0.41 mm</th><th>0.76 mm</th><th>1.60 mm</th></tr></thead><tbody>
            {([['Ethylene', 17, 12, 18], ['Propane', 16, 12, 22], ['Propylene', 46, 31, 45], ['Methane', 2, 2, 0]] as const).map(([f, ...c]) => <tr key={f}><td>{f}</td>{c.map((n, i) => <td key={i} className={n === 0 ? 'unobserved' : n < 3 ? 'sparse' : 'observed'}><span className="mono">{n}</span></td>)}</tr>)}</tbody></table>
          <p className="note">Methane has only two records at each of the smaller nozzles and none at 1.6 mm. That is a clear target for a future smoke-point or flame-length measurement, but it shows only that the indexed CSV has no such record, not that no NASA test or publication exists. Propylene-blend rows are left out of this excerpt because their source labels vary (&ldquo;75 % Propylene&rdquo; and &ldquo;75% Propylene&rdquo;); the explorer keeps such label variants separate and flags them.</p>
          {mode === 'live_api' && <a className="btn sm" href="#/records">Open the Research Gap Explorer</a>}
        </div>
        <p className="note">The Simulator and Evidence Graph use the same counting idea with strict matching: a record qualifies only when every selected condition matches within its reported precision.</p>

        <h3>3 · AI-assisted scientific research</h3>
        <p>An AI assistant read hashed copies of NASA technical reports offline and drafted candidate findings, each with a page reference. Every statement&apos;s key terms and numbers were then checked against the cited page. Statements that could not be matched were rewritten or dropped. The {(spine.source_findings ?? []).length} findings that passed appear with page links in the Simulator, the Evidence Graph and Research Papers above. A separate rule-based script proposes numeric values with page and table citations for human review only.</p>
        <p className="note">No generative AI model runs in the dashboard. Every view is computed by deterministic code from the indexed records, and no AI output is used as a measurement.</p>

        <h3>4 · Technologies used</h3>
        <div className="tech-grid" data-testid="tech-grid">{([['Python', 'Scientific processing and model training'], ['NumPy', 'Numerical computation and matrix operations'], ['Ridge regression', 'Learning relationships within FLEX burning-rate measurements'],
          ['Grouped cross-validation', 'Leakage-resistant model evaluation'], ['PostgreSQL', 'Storage of structured NASA research records'], ['FastAPI', 'Backend APIs and scientific analysis'],
          ['React & TypeScript', 'Interactive user interface'], ['Plotly', 'Scientific data visualization'], ['Cytoscape.js', 'Interactive evidence graph']] as const).map(([t, d]) => <div key={t}><strong>{t}</strong><span>{d}</span></div>)}</div>

        <h3>5 · Why this matters</h3>
        <p>Our approach pairs machine learning with transparent, evidence-based analysis. The regression model shows how burning rates depend on the measured conditions. The Research Gap Explorer shows where experimental records are concentrated and where they are missing. Together they make NASA&apos;s combustion research easier to explore, understand and use for studying fire safety in space.</p>
        <blockquote className="ml-quote">Our objective is not simply to visualize flames, but to make NASA&apos;s combustion evidence easier to explore, compare, and understand.</blockquote>
      </section>

      <section id={id(9)}><H i={9} />
        <p className="note">{ver ? `Executed ${ver.generated_at}` : 'No verification run embedded.'}</p>
        <div data-testid="validation-checks">{checks.map(c => <div key={c.name} className="check">{c.status === 'passed' ? <CheckCircle2 size={14} color="#3FBF8F" /> : c.status === 'failed' ? <XCircle size={14} color="#D91B5C" /> : <CircleDashed size={14} color="#9CA3AF" />}
          <div><div>{c.name}</div><div className="note">{c.detail}</div></div></div>)}</div>
</section>

      <section id={id(10)}><H i={10} />
        <div className="limits-grid">
        <div className="paper"><h4>Open scientific issues ({spine.open_issues.length})</h4>
        <table className="table" data-testid="open-issues"><thead><tr><th>Issue</th><th>Required to resolve</th></tr></thead><tbody>{spine.open_issues.map(o => <tr key={o.issue}><td>{o.issue}</td><td className="note">{o.required}</td></tr>)}</tbody></table></div>
        <div className="paper"><h4>Scope of the evidence</h4>
        <ul><li>All indexed combustion records are ISS microgravity; no partial-gravity or lunar measurement exists in the catalogue.</li>
          <li>Each source row is a reported record; rows are not yet linked to individual experiment runs, and repeated rows are kept but counted once as matching evidence.</li>
          <li>Publication records are titles; page-located statements and AI candidates are not reviewed findings.</li>
          <li>The flame visualizer is illustrative and produces no numbers.</li>
          <li>The FLEX burning-rate model is evaluated but not approved; predictions are disabled.</li></ul></div></div></section>

      <section id={id(11)}><H i={11} />
        <ul>{Object.values(spine.scenario_sources).map(s => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.id}</a> — {s.title}. {s.authors}. {s.venue}. <span className="faint">Verified {s.verified_on}; {s.locator}.</span></li>)}</ul>
        <ul>{spine.investigations.map(i => <li key={i.id}>{i.id} {i.short}: <a href={i.catalog_url} target="_blank" rel="noreferrer">NASA PSI catalog</a> · <a href={`https://doi.org/${i.doi}`} target="_blank" rel="noreferrer">DOI {i.doi}</a> · {i.license}</li>)}</ul>
        <p className="note">Data-source CC0 declarations do not license third-party code, papers, media or logos.</p>
        <pre className="mono" style={{ whiteSpace: 'pre-wrap', background: '#05070b', padding: 10, borderRadius: 8 }}>{`python scripts/restore_references.py --download   # cited NASA documents (SHA-256 verified)
python scripts/init_database.py                     # migrations + verified ingestion + record counts
bash scripts/start_backend.sh                       # FastAPI on :8000
bash scripts/start_frontend.sh                      # dashboard on :5173
python scripts/verify.py                            # all tests + builds; writes verification results`}</pre>
        <p className="note">Spine {spine.spine_version} · contract {spine.contract_version} · dataset {spine.dataset.version}. Independent research project; not endorsed by NASA.</p></section>
    </article>
    <aside style={{ display: 'grid', gap: 12, position: 'sticky', top: 70 }}>
      <div className="card"><div className="card-h"><h3>Dataset status</h3></div><dl className="kv">
        <dt>Version</dt><dd className="mono">{spine.dataset.version}</dd><dt>Mode</dt><dd>{mode === 'live_api' ? 'Live local database' : 'Static export'}</dd>
        <dt>Records</dt><dd className="mono">{spine.records.length} spine records</dd><dt>Papers</dt><dd className="mono">{spine.papers.length} NASA-listed</dd>
        <dt>Checks</dt><dd className="mono">{ver ? `${checks.filter(c => c.status === 'passed').length}/${checks.length} passed` : '—'}</dd></dl></div>
    </aside>
  </div></div>
}
