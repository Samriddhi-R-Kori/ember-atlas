// Typed contract for the shared data spine (backend/app/science/spine.py).
export type Dim = 'gravity' | 'oxygen' | 'pressure' | 'flow' | 'material'
export type NumericDim = 'oxygen' | 'pressure' | 'flow'
export type ValueState = 'reported' | 'not_reported' | 'restricted'

export type ValueEntry = {
  s: ValueState; o?: string; ou?: string | null; vs?: string; loc?: string
  v?: number; u?: string; h?: number | null; why?: string; unc?: string
}
export type GravityEntry = { s: ValueState; cat?: string; o?: string | null; why?: string }
export type MaterialEntry = { s: ValueState; label?: string; cls?: string; loc?: string }

export type SpineRecord = {
  id: string; inv: string; src: string; role: 'condition_source' | 'restricted_metric_source'
  sheet: string | null; row: number; ident: string | null; dup: string | null; flags: string[]; status: string
  c: { gravity: GravityEntry; material: MaterialEntry; oxygen: ValueEntry; pressure: ValueEntry; flow: ValueEntry }
  m: Record<string, ValueEntry>; x: Record<string, ValueEntry>
}

export type ScenarioCondition = { value: number; unit: string; half_precision: number; display: string; source: string | null; note: string }
export type Scenario = { id: string; name: string; accent: 'blue' | 'red'; status: string; version: string
  conditions: { gravity: ScenarioCondition; oxygen: ScenarioCondition; pressure: ScenarioCondition }; assumptions: string[] }
export type CitedSource = { id: string; kind: string; title: string; authors: string; venue: string; url: string; locator: string; verified_on: string; statement: string }

export type Range = { min: number | null; max: number | null; unit: string | null; states: Record<string, number> }
export type Publication = { title: string; doi: string | null; authors: string; verification_scope: string }
export type InvestigationSummary = {
  id: string; short: string; name: string; title: string; doi: string; catalog_url: string; license: string
  platform: string; status: string; material_class: string; scale: string; scientific_status: string
  sources: { id: string; sheet: string | null; role: string; records: number }[]
  condition_ranges: Record<NumericDim, Range>; materials: Record<string, number>; condition_records: number
  exact_repeats_retained: number; gravity: string; publications: Publication[]
}
export type Metric = { key: string; id: string; investigation: string; label: string; category: string; criterion: string | null
  restricted: boolean; why: string | null; source: string; heading: string; unit: string | null; definition_ids: string[] }
export type Paper = { id: string; title: string; authors: string | null; doi: string | null; investigations: string[]
  source_link: string; verification_scope: string; provenance: string }
export type SourceInfo = { path: string; sha256: string; url: string | null; download: string | null; license: string | null; provenance_status: string }

export type ModelEntry = {
  model_id: string; version: string; training_code_version: string; data_release: string; inputs: string[]
  target: { id: string; definition: string; unit: string }; training_records: number; independent_condition_groups: number
  excluded_records: Record<string, number>; beats_per_fuel_baseline: boolean; uncertainty: string
  validation: { procedure: string; folds: number; metrics: Record<string, { mae: number; rmse: number; bias: number; n: number }>
    skill_vs_per_fuel_mean_mae: number; largest_errors: { flex_test: string; row: number; fuel: string; observed: number; cv_prediction: number; error: number }[] }
  applicability_domain: { rule: string; per_fuel_feature_ranges: Record<string, Record<string, { min: number; max: number } | number>> }
  approval_status: string; approval_note: string; limitations: string[]; prediction_available: boolean
}
export type Eligibility = { target: string; label: string; unit: string | null; reported_values: number; restricted_values: number
  not_reported_values: number; decision: string; reason: string; independent_condition_groups?: number }
export type Registry = { gate: { rule: string; min_independent_groups: number }; eligibility: Eligibility[]; models: ModelEntry[] }

export type Finding = { id: string; kind: string; investigation?: string
  payload: { title: string; finding: string; categories: string[]; proposed_relevance: string }
  source: { path: string; sha256: string; pdf_page: number | string; printed_page: string | null; section: string; document: string }
  flags: string[]; review_status: string; reviewed_on?: string; extraction: { method: string; model?: string; date?: string } }
export type AiEvaluation = { provider: string; llm_mode: string; metrics: Record<string, number | null>; caveats?: string[]
  cases: { id: string; category: string; question: string; status: string; passed: boolean; problems: string[] }[] }
export type Verification = { generated_at: string; checks: { name: string; status: 'passed' | 'failed' | 'skipped'; detail: string; evidence: string }[] }

export type Spine = {
  spine_version: string; contract_version: string; mode: 'live_api' | 'static_export'
  dataset: { version: string; manifest_sha256: string; baseline_sha256: string; scientific_approval: boolean; external_signoff: boolean
    summary: { csv_rows: number; duplicates_retained: number; official_data_files_byte_verified?: number } }
  labels: Record<string, string>; dimension_states: Record<string, string>
  gravity_rule: { category: string; label: string; rule: string; basis: string }
  tolerance_rule: { name: string; rule: string; basis: string; requirements?: string[] }
  scenarios: Scenario[]; scenario_sources: Record<string, CitedSource>
  fm2: { id: string; name: string; status: string; status_label: string; status_detail: string
    planned_conditions: { label: string; oxygen: number; pressure_psia: number; gravity: string; samples: string; source: string }[]
    does_not_establish: string[]; sources: string[] }
  material_classes: Record<string, { label: string; basis: string }>
  equipment_areas: Record<string, { label: string; keywords: string[] }>
  investigations: InvestigationSummary[]; sources: Record<string, SourceInfo>; metrics: Metric[]
  records: SpineRecord[]; papers: Paper[]
  provenance_findings: { code: string; status: string; detail: string; evidence: string[]; blocker_type: string }[]
  models: Registry | null; reviewed_findings: Finding[]; ai_evaluation: AiEvaluation | null
  verification?: Verification | null; notice: string
  open_issues: { issue: string; required: string; status: string }[]
  references?: Record<string, Reference>; flame_evidence?: FlameEvidence[]; fire_safety_insights?: FireInsight[]
  demonstration_records?: DemoRecord[]; primary_selector_excluded?: Record<string, string>
  source_findings?: SourceFinding[]; partial_gravity_evidence?: PartialGravityEvidence[]; fire_safety_rules?: FireSafetyRule[]
}
export type SourceFinding = { candidate: string | null; inv: string; ref: string; pdf_page: number; topics: string[]; statement: string }
export type PartialGravityEvidence = { id: string; kind: 'measured_simulated_lunar_g' | 'measured_parabolic_flight' | 'review' | 'planned'; ref: string; locator: string
  platform: string; gravity: string; gravity_g: number | null; gravity_note: string; material: string; material_class: string
  oxygen: string; oxygen_frac: number | null; pressure: string; pressure_kpa: number | null; airflow: string
  measurements: { parameter: string; value: number; unit: string; one_g: number | null }[]; statement: string }
export type FireSafetyRule = { id: string; level: 'hazard'; ref: string; locator: string; statement: string
  when: { gravity_min?: number; gravity_max?: number; flow_min?: number; flow_max?: number; oxygen_min?: number; oxygen_max?: number
    pressure_min_kpa?: number; pressure_max_kpa?: number; material_classes?: string[] } }
export type Reference = { id: string; title: string; url: string; sha256: string | null; kind: string; stored_locally: boolean }
export type FlameEvidence = { ref: string; pdf_page: number | null; rule: string; statement: string }
export type FireInsight = { id: string; category: string; ref: string | null; source?: string; pdf_page: number | null; candidate: string | null
  scenarios: string[] | null; material_classes: string[] | null; statement: string }
export type DemoRecord = { id: string; label: string; record_id: string; why: string }
