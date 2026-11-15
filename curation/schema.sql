-- Portable PostgreSQL/SQLite relational baseline v1. JSON documents are encoded
-- in TEXT for portable staging. P1 may migrate them to PostgreSQL JSONB.
CREATE TABLE IF NOT EXISTS schema_version (version TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS investigation (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    scientific_status TEXT NOT NULL DEFAULT 'not_reviewed'
);
CREATE TABLE IF NOT EXISTS evidence_source (
    id TEXT PRIMARY KEY, investigation_id TEXT REFERENCES investigation(id),
    path TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL CHECK (length(sha256)=64),
    extraction_metadata TEXT NOT NULL, source_url TEXT, license TEXT,
    provenance_status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence_location (
    id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES evidence_source(id),
    sheet TEXT, row_number INTEGER CHECK(row_number > 0),
    column_number INTEGER CHECK(column_number > 0), coordinate TEXT,
    raw_payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source_record (
    id TEXT PRIMARY KEY, investigation_id TEXT NOT NULL REFERENCES investigation(id),
    location_id TEXT NOT NULL REFERENCES evidence_location(id),
    source_identifier TEXT, raw_payload TEXT NOT NULL,
    duplicate_of TEXT REFERENCES source_record(id),
    scientific_status TEXT NOT NULL DEFAULT 'not_reviewed'
);
CREATE TABLE IF NOT EXISTS experiment_run (
    id TEXT PRIMARY KEY, investigation_id TEXT NOT NULL REFERENCES investigation(id),
    source_identifier TEXT, gravity_environment TEXT NOT NULL DEFAULT 'unknown'
    CHECK(gravity_environment IN ('actual_microgravity','reduced_gravity','terrestrial_1g','simulated_gravity','numerical_model','unknown')),
    identity_status TEXT NOT NULL, evidence_location_id TEXT NOT NULL REFERENCES evidence_location(id)
);
CREATE TABLE IF NOT EXISTS operating_condition_segment (
    id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES experiment_run(id),
    start_time_s NUMERIC, end_time_s NUMERIC, timing_basis TEXT,
    evidence_location_id TEXT NOT NULL REFERENCES evidence_location(id)
);
CREATE TABLE IF NOT EXISTS parameter_definition (
    id TEXT PRIMARY KEY, investigation_id TEXT REFERENCES investigation(id),
    name TEXT NOT NULL, physical_definition TEXT,
    original_unit TEXT, canonical_unit TEXT, basis TEXT,
    mapping_status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS parameter_observation (
    id TEXT PRIMARY KEY, definition_id TEXT NOT NULL REFERENCES parameter_definition(id),
    source_record_id TEXT NOT NULL REFERENCES source_record(id),
    evidence_location_id TEXT NOT NULL REFERENCES evidence_location(id),
    segment_id TEXT REFERENCES operating_condition_segment(id),
    original_value TEXT, normalized_value TEXT, normalized_unit TEXT,
    value_status TEXT NOT NULL, uncertainty TEXT, uncertainty_status TEXT NOT NULL,
    conversion_metadata TEXT, scientific_status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS measurement (
    id TEXT PRIMARY KEY, observation_id TEXT NOT NULL REFERENCES parameter_observation(id),
    method TEXT NOT NULL, formula TEXT, cached_value TEXT,
    recalculated_value TEXT, calibration_evidence TEXT,
    scientific_status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media_asset (
    id TEXT PRIMARY KEY, evidence_location_id TEXT NOT NULL REFERENCES evidence_location(id),
    original_reference TEXT NOT NULL, resolved_uri TEXT,
    run_id TEXT REFERENCES experiment_run(id), relationship_status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reconciliation_link (
    id TEXT PRIMARY KEY, left_record_id TEXT NOT NULL REFERENCES source_record(id),
    right_record_id TEXT NOT NULL REFERENCES source_record(id),
    relation_kind TEXT NOT NULL, review_status TEXT NOT NULL,
    evidence_payload TEXT NOT NULL, scientific_merge_approved BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS quality_issue (
    id TEXT PRIMARY KEY, code TEXT NOT NULL, status TEXT NOT NULL,
    evidence_payload TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS experiment_recipe (
    id TEXT PRIMARY KEY, investigation_id TEXT REFERENCES investigation(id),
    proposed_conditions TEXT NOT NULL, evidence_payload TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'proposal'
);
CREATE TABLE IF NOT EXISTS research_suggestion (
    id TEXT PRIMARY KEY, recipe_id TEXT REFERENCES experiment_recipe(id),
    rationale TEXT NOT NULL, evidence_payload TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'hypothesis_requires_review'
);
CREATE INDEX IF NOT EXISTS idx_location_source ON evidence_location(source_id,sheet,row_number);
CREATE INDEX IF NOT EXISTS idx_observation_record ON parameter_observation(source_record_id);
CREATE INDEX IF NOT EXISTS idx_issue_code ON quality_issue(code);
CREATE INDEX IF NOT EXISTS idx_links_left ON reconciliation_link(left_record_id);
