"""Run every Ember Atlas check and record the executed results (never assumed).

    python scripts/verify.py

Requires DATABASE_URL (an initialized database), EMBER_ATLAS_TEST_DATABASE_URL for the PostgreSQL integration tests
(defaults to DATABASE_URL), frontend dependencies, Chromium for Playwright (`npx playwright install chromium`) and
`pdftotext` (poppler-utils). Playwright reuses servers already running on API_PORT/WEB_PORT or starts them.
Writes docs/verification/VERIFICATION_RESULTS.{json,md} plus logs, then refreshes the static export (no retraining)
so the Resources page shows these exact results.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
FRONT = PROJECT / 'frontend'
OUT = PROJECT / 'docs/verification'
PY = os.environ.get('PYTHON_BIN', str(PROJECT / '.venv/bin/python'))
PYPATH = {'PYTHONPATH': f'{PROJECT}:{PROJECT / "backend"}'}


def run(name, cmd, cwd, parse=None, env=None):
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env={**os.environ, **(env or {})})
    output = (proc.stdout + proc.stderr)[-6000:]
    log = PROJECT / '.verify-logs' / (re.sub(r'\W+', '_', name).strip('_').lower() + '.txt')
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(f'$ {" ".join(cmd)}\n(exit {proc.returncode})\n\n{proc.stdout}\n{proc.stderr}')
    detail = parse(output) if parse else ('exit 0' if proc.returncode == 0 else f'exit {proc.returncode}')
    status = 'passed' if proc.returncode == 0 else 'failed'
    if status == 'passed' and parse and 'skipped' in detail and not re.search(r'\d+ passed', detail):
        status = 'skipped'
    print(f'[{status}] {name}: {detail}')
    shown = ' '.join('python' if c == PY else c.replace('./node_modules/.bin/', 'npx ') for c in cmd)
    return {'name': name, 'status': status, 'detail': detail, 'evidence': shown if cwd == PROJECT else f'(frontend) {shown}'}


def last_line(pattern):
    return lambda out: (re.findall(pattern, out) or ['no summary line'])[-1].strip()


def main():
    if not os.environ.get('DATABASE_URL'):
        sys.exit('DATABASE_URL not set (see .env.example)')
    os.environ.setdefault('EMBER_ATLAS_TEST_DATABASE_URL', os.environ['DATABASE_URL'])
    checks = [
        run('Dataset manifest, hashes and record counts', [PY, 'scripts/validate_dataset.py'], PROJECT, last_line(r'(dataset OK[^\n]*|[^\n]+)$')),
        run('Curation pipeline regression tests (pytest)', [PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests'], PROJECT,
            last_line(r'\n([^\n]*(?:passed|failed|error)[^\n]*)')),
        run('PostgreSQL API, research, science and ML tests (pytest)', [PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'backend/tests'], PROJECT,
            last_line(r'\n([^\n]*(?:passed|failed|error)[^\n]*)')),
        run('ML evaluation reproduces registered metrics', [PY, '-m', 'ml.train', '--check'], PROJECT,
            lambda o: 'grouped-CV metrics reproduced' if '"metrics_reproduced": true' in o else 'metrics differ', env=PYPATH),
        run('Alembic schema drift check', [PY, '-m', 'alembic', '-c', 'database/alembic.ini', 'check'], PROJECT,
            lambda o: 'no schema drift' if 'No new upgrade' in o else o.strip().splitlines()[-1] if o.strip() else 'no output', env=PYPATH),
        run('Gap engine, interpolation and graph tests (vitest)', ['./node_modules/.bin/vitest', 'run'], FRONT, last_line(r'Tests\s+([^\n]+)')),
        run('TypeScript + Vite production build', ['npm', 'run', 'build'], FRONT, last_line(r'(built in [^\n]+)')),
        run('Static public build (VITE_STATIC_ONLY=1)', ['./node_modules/.bin/vite', 'build', '--outDir', 'dist-static', '--base', './'], FRONT,
            last_line(r'(built in [^\n]+)'), env={'VITE_STATIC_ONLY': '1'}),
        run('Browser journeys incl. legacy MVP (Playwright, Chromium)', ['./node_modules/.bin/playwright', 'test'], FRONT,
            last_line(r'\n\s*(\d+ (?:passed|failed)[^\n]*)')),
        run('Static demo smoke test (no database)', ['node', 'scripts/static_smoke.mjs'], FRONT, last_line(r'(STATIC[^\n]+)')),
    ]
    dist = FRONT / 'dist-static'
    leaks = []
    for f in dist.rglob('*'):
        if f.is_file() and f.suffix in ('.js', '.json', '.html', '.css'):
            text = f.read_text(errors='ignore')
            for pat in (r'postgresql\+psycopg://', r'/home/[^/\s"]+/', r'EMBER_ATLAS_REVIEWER_TOKEN=', r'local-dev-token'):
                if re.search(pat, text):
                    leaks.append(f'{f.relative_to(dist)}: {pat}')
    checks.append({'name': 'Static bundle secret/path scan', 'status': 'passed' if not leaks else 'failed',
                   'detail': 'no database URLs, local paths or reviewer tokens' if not leaks else '; '.join(leaks[:5]),
                   'evidence': 'scripts/verify.py (scan of frontend/dist-static)'})
    result = {'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'checks': checks}
    (OUT / 'VERIFICATION_RESULTS.json').write_text(json.dumps(result, indent=1) + '\n')
    lines = ['# Ember Atlas verification results', '', f"Executed {result['generated_at']} by `python scripts/verify.py`.", '',
             '| Check | Status | Detail | Command |', '|---|---|---|---|']
    lines += [f"| {c['name']} | {c['status']} | {c['detail']} | `{c['evidence']}` |" for c in checks]
    (OUT / 'VERIFICATION_RESULTS.md').write_text('\n'.join(lines) + '\n')
    # Re-embed the new verification results in the static export WITHOUT retraining models (model artifacts are preserved).
    rebuild = subprocess.run([PY, 'scripts/export_static.py'], cwd=PROJECT, capture_output=True, text=True)
    print('export rebuilt' if rebuild.returncode == 0 else rebuild.stderr[-2000:])
    sys.exit(1 if any(c['status'] == 'failed' for c in checks) else 0)


if __name__ == '__main__':
    main()
