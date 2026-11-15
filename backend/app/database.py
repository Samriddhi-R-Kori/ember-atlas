import os
from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@lru_cache
def engine():
    url=os.environ.get('DATABASE_URL','postgresql+psycopg://ember_atlas@localhost:5432/ember_atlas')
    if not url.startswith('postgresql+psycopg://'):
        raise ValueError('P1A requires PostgreSQL through psycopg; no silent SQLite fallback')
    return create_engine(url,pool_pre_ping=True)


def get_session():
    with sessionmaker(engine())() as session:
        yield session
