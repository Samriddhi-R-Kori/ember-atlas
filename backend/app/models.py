"""PostgreSQL models for the Ember Atlas evidence store: relational provenance contract plus JSON provenance."""
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    type_annotation_map={str:Text}


class Identity:
    id: Mapped[str] = mapped_column(Text, primary_key=True)


class Investigation(Identity, Base):
    __tablename__='investigation'
    name: Mapped[str]
    scientific_status: Mapped[str]


class EvidenceSource(Identity, Base):
    __tablename__='evidence_source'
    investigation_id: Mapped[str | None] = mapped_column(ForeignKey('investigation.id'))
    path: Mapped[str] = mapped_column(Text, unique=True)
    sha256: Mapped[str]
    extraction_metadata: Mapped[dict] = mapped_column(JSONB)
    source_url: Mapped[str | None]
    license: Mapped[str | None]
    provenance_status: Mapped[str]


class EvidenceLocation(Identity, Base):
    __tablename__='evidence_location'
    source_id: Mapped[str] = mapped_column(ForeignKey('evidence_source.id'))
    sheet: Mapped[str | None]
    row_number: Mapped[int | None]
    column_number: Mapped[int | None]
    coordinate: Mapped[str | None]
    raw_payload: Mapped[dict] = mapped_column(JSONB)


class SourceRecord(Identity, Base):
    __tablename__='source_record'
    investigation_id: Mapped[str] = mapped_column(ForeignKey('investigation.id'))
    location_id: Mapped[str] = mapped_column(ForeignKey('evidence_location.id'))
    source_identifier: Mapped[str | None]
    raw_payload: Mapped[dict] = mapped_column(JSONB)
    duplicate_of: Mapped[str | None] = mapped_column(ForeignKey('source_record.id'))
    scientific_status: Mapped[str]


class ExperimentRun(Identity, Base):
    __tablename__='experiment_run'
    investigation_id: Mapped[str] = mapped_column(ForeignKey('investigation.id'))
    source_identifier: Mapped[str | None]
    gravity_environment: Mapped[str]
    identity_status: Mapped[str]
    evidence_location_id: Mapped[str] = mapped_column(ForeignKey('evidence_location.id'))


class OperatingConditionSegment(Identity, Base):
    __tablename__='operating_condition_segment'
    run_id: Mapped[str] = mapped_column(ForeignKey('experiment_run.id'))
    start_time_s: Mapped[float | None] = mapped_column(Numeric)
    end_time_s: Mapped[float | None] = mapped_column(Numeric)
    timing_basis: Mapped[str | None]
    evidence_location_id: Mapped[str] = mapped_column(ForeignKey('evidence_location.id'))


class ParameterDefinition(Identity, Base):
    __tablename__='parameter_definition'
    investigation_id: Mapped[str | None] = mapped_column(ForeignKey('investigation.id'))
    name: Mapped[str]
    physical_definition: Mapped[str | None]
    original_unit: Mapped[str | None]
    canonical_unit: Mapped[str | None]
    basis: Mapped[str | None]
    mapping_status: Mapped[str]


class ParameterObservation(Identity, Base):
    __tablename__='parameter_observation'
    definition_id: Mapped[str] = mapped_column(ForeignKey('parameter_definition.id'))
    source_record_id: Mapped[str] = mapped_column(ForeignKey('source_record.id'))
    evidence_location_id: Mapped[str] = mapped_column(ForeignKey('evidence_location.id'))
    segment_id: Mapped[str | None] = mapped_column(ForeignKey('operating_condition_segment.id'))
    original_value: Mapped[str | None]
    normalized_value: Mapped[str | None]
    normalized_unit: Mapped[str | None]
    value_status: Mapped[str]
    uncertainty: Mapped[str | None]
    uncertainty_status: Mapped[str]
    conversion_metadata: Mapped[dict | None] = mapped_column(JSONB)
    scientific_status: Mapped[str]


class Measurement(Identity, Base):
    __tablename__='measurement'
    observation_id: Mapped[str] = mapped_column(ForeignKey('parameter_observation.id'))
    method: Mapped[str]
    formula: Mapped[str | None]
    cached_value: Mapped[str | None]
    recalculated_value: Mapped[str | None]
    calibration_evidence: Mapped[dict | None] = mapped_column(JSONB)
    scientific_status: Mapped[str]


class MediaAsset(Identity, Base):
    __tablename__='media_asset'
    evidence_location_id: Mapped[str] = mapped_column(ForeignKey('evidence_location.id'))
    original_reference: Mapped[str]
    resolved_uri: Mapped[str | None]
    run_id: Mapped[str | None] = mapped_column(ForeignKey('experiment_run.id'))
    relationship_status: Mapped[str]


class ReconciliationLink(Identity, Base):
    __tablename__='reconciliation_link'
    left_record_id: Mapped[str] = mapped_column(ForeignKey('source_record.id'))
    right_record_id: Mapped[str] = mapped_column(ForeignKey('source_record.id'))
    relation_kind: Mapped[str]
    review_status: Mapped[str]
    evidence_payload: Mapped[dict] = mapped_column(JSONB)
    scientific_merge_approved: Mapped[bool] = mapped_column(Boolean, default=False)


class QualityIssue(Identity, Base):
    __tablename__='quality_issue'
    code: Mapped[str]
    status: Mapped[str]
    evidence_payload: Mapped[object] = mapped_column(JSONB)
    detail: Mapped[dict] = mapped_column(JSONB)


class ExperimentRecipe(Identity, Base):
    __tablename__='experiment_recipe'
    investigation_id: Mapped[str | None] = mapped_column(ForeignKey('investigation.id'))
    proposed_conditions: Mapped[dict] = mapped_column(JSONB)
    evidence_payload: Mapped[dict] = mapped_column(JSONB)
    review_status: Mapped[str]


class ResearchSuggestion(Identity, Base):
    __tablename__='research_suggestion'
    recipe_id: Mapped[str | None] = mapped_column(ForeignKey('experiment_recipe.id'))
    rationale: Mapped[str]
    evidence_payload: Mapped[dict] = mapped_column(JSONB)
    review_status: Mapped[str]


class DatasetRelease(Identity, Base):
    __tablename__='dataset_release'
    version: Mapped[str]
    manifest_sha256: Mapped[str]
    baseline_sha256: Mapped[str]
    metadata_payload: Mapped[dict] = mapped_column(JSONB)


class RecordQuality(Base):
    __tablename__='record_quality'
    record_id: Mapped[str] = mapped_column(ForeignKey('source_record.id'),primary_key=True)
    issue_id: Mapped[str] = mapped_column(ForeignKey('quality_issue.id'),primary_key=True)
    scope: Mapped[str]

Index('idx_location_source',EvidenceLocation.source_id,EvidenceLocation.sheet,EvidenceLocation.row_number)
Index('idx_record_investigation',SourceRecord.investigation_id)
Index('idx_observation_record',ParameterObservation.source_record_id)
Index('idx_observation_definition',ParameterObservation.definition_id)
Index('idx_links_left',ReconciliationLink.left_record_id)
Index('idx_issue_code',QualityIssue.code)
