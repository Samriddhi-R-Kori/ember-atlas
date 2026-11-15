import os
from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def database_url():
    """DATABASE_URL normalized to the psycopg 3 driver. Hosted providers (Neon, Render) issue postgres:// or
    postgresql:// URLs; anything that is not PostgreSQL is refused (no silent SQLite fallback)."""
    url=os.environ.get('DATABASE_URL','postgresql+psycopg://ember_atlas@localhost:5432/ember_atlas')
    for prefix in ('postgres://','postgresql://'):
        if url.startswith(prefix):url='postgresql+psycopg://'+url[len(prefix):]
    if not url.startswith('postgresql+psycopg://'):
        raise ValueError('Ember Atlas requires PostgreSQL through psycopg; no silent SQLite fallback')
    return url


@lru_cache
def engine():
    return create_engine(database_url(),pool_pre_ping=True,pool_recycle=300)


def get_session():
    with sessionmaker(engine())() as session:
        yield session
