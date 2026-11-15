"""Baseline PostgreSQL schema of the Ember Atlas evidence store (preserves every curation concept and its provenance)."""
from pathlib import Path
from alembic import op
revision='0001_p1a'
down_revision=None
branch_labels=None
depends_on=None


def upgrade():
    sql=Path(__file__).with_suffix('.sql').read_text()
    # Remove comments before splitting; this migration has no procedural SQL.
    sql='\n'.join(line for line in sql.splitlines() if not line.lstrip().startswith('--'))
    for statement in sql.split(';'):
        if statement.strip():op.execute(statement)


def downgrade():
    # Explicit Alembic downgrade is a destructive operator action, never automatic startup.
    for table in ['record_quality','dataset_release','research_suggestion','experiment_recipe','quality_issue',
                  'reconciliation_link','media_asset','measurement','parameter_observation','parameter_definition',
                  'operating_condition_segment','experiment_run','source_record','evidence_location','evidence_source','investigation']:
        op.drop_table(table)
