import os
import sys
from pathlib import Path

# Make the backend package and the shared ember_atlas config importable from database/.
_REPO = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(_REPO / 'backend'), str(_REPO)]

from alembic import context
from sqlalchemy import create_engine
from app.models import Base

config=context.config
url=os.environ.get('DATABASE_URL',config.get_main_option('sqlalchemy.url'))
if context.is_offline_mode():
    context.configure(url=url,target_metadata=Base.metadata,literal_binds=True)
    with context.begin_transaction():context.run_migrations()
else:
    with create_engine(url).connect() as connection:
        context.configure(connection=connection,target_metadata=Base.metadata,compare_type=True)
        with context.begin_transaction():context.run_migrations()
