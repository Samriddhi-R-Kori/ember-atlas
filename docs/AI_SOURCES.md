# AI sources and architecture

Date: 2026-11-15. Contract `2026-11-15.2`. Dataset `p0_v1_review` (provisional; no scientific approval).
Status words used below: **implemented** (code exists and is tested), **evaluated** (executed with saved results),
**recommended** (not implemented; requires the owner's decision).

## 1. Principles (unchanged)

- AI proposes, retrieves, explains and organizes. It never invents measurements, approves evidence, corrects
  values, interpolates, or gives safety verdicts.
- Only approved content enters the Q&A corpus: spine facts, P0 review findings, human-confirmed findings and
  cited scenario statements. Pending candidates, page-located statements and publication titles do not support answers.
- Every answer sentence cites a passage and must pass a **number audit** (each number appears in a cited passage)
  and a **claim audit** (term support, no safety verdict). Instruction-like source text is quarantined.
- No API key is assumed; none is stored in the frontend. A configured but unvalidated provider **fails closed**
  (`EMBER_ATLAS_LLM_PROVIDER` set without a validated adapter → answers unavailable, not fabricated).

## 2. Authoritative scientific sources (ranked)

| Rank | Source | Use | Status in this project |
|---|---|---|---|
| 1 | NASA PSI investigation files (CSV/XLS/XLSX/DOCX for PSI-69, -39, -101, -107, -25) | Measurements, conditions | Ingested; byte-identical to NASA downloads; SHA-256 pinned |
| 2 | NASA Technical Reports Server (NTRS) reports with hashed local copies: NASA/TP-2015-216046 (FLEX), NASA/TM-20210011385 (BASS-II), NTRS 20130000422 / AIAA 2012-3536 (SAME-2) | Page-located findings, flame behaviour, extraction | Stored under `dataset/references/nasa-psi/`; declared in `contract.REFERENCES` |
| 3 | NASA PSI final reports (SPICE, CFI, SAME-R) from psi.nasa.gov | Findings, smoke points, cool flames | Stored and hashed |
| 4 | Peer-reviewed / DOI-linked publications listed in the NASA PSI catalog (85 titles) | Citations, future extraction | Titles only; not used as evidence |
| 5 | NASA Glenn / NTRS public references (e.g. NTRS 19960008390, *Candle Flames in Microgravity*) | Qualitative flame-renderer rules | Cited in `FLAME_EVIDENCE`; not stored locally; not used for data |
| 6 | Scenario sources (FM2 poster NTRS 20240015307, LPSC 2026 abstract 1799, NASA/TM-2013-217377, OCHMO-TB-003, NSSDCA Moon fact sheet) | Scenario presets, FM2 status | Verified 2026-11-15; in the contract |
| — | Wikipedia, blogs, search snippets | Discovery only | **Never** evidence |

**Programmatic access to NTRS (recommended):** the NASA STI OpenAPI (`/api/citations/search`, `/api/citations/{id}`, document
downloads) is documented in the STI *OpenAPI Documentation* (2022-11-22) and its data dictionary. Use it to fetch
metadata and PDFs. Store each PDF with its SHA-256 and retrieval manifest, as `dataset/references/nasa-psi/retrieval_manifest.json` already does.
Downloaded PDFs are untrusted input: parse them in isolation and quarantine instruction-like text.

## 3. Retrieval architecture

```
approved corpus ──► passages (id, locator, kind, source hash) ──► lexical retrieval (implemented)
   spine facts            │                                        │
   P0 review findings     │                                        ▼
   confirmed findings     └── optional embedding index ──► hybrid rank (recommended)
   scenario statements                                              │
                                                                    ▼
             answer composer: extractive (implemented) │ LLM with document citations (recommended)
                                                                    ▼
                         number audit + claim audit + safety filter (implemented)
                                                                    ▼
                    answer with passage IDs │ "Not in our data." + related sources (implemented)
```

- **Implemented:** `backend/app/science/ai.py`. It does term-vector retrieval over the approved corpus, quarantine,
  extractive answering, audits and safety non-verdicts. When evidence is absent, it returns `not_in_data` with `nearby_evidence`,
  which the Resources page shows as "Related sources".
- **Recommended next step:** hybrid retrieval, adding a local sentence-embedding model (CPU is sufficient for about 35k
  passages) to the existing lexical scores. An LLM composer would then be allowed to answer only from retrieved passages. Keep the same
  audits on its output. If an answer sentence fails an audit, drop the sentence; do not rewrite it.

## 4. Extraction workflow (approved PDFs → review queue)

**Implemented in this increment:** `scripts/extract_pdf_candidates.py`, which uses `ai.extract_from_approved`.

1. Only documents in `contract.REFERENCES` with a stored local copy **and** a matching SHA-256 can be read.
   An unknown key or a hash mismatch raises an error.
2. **Inline mode** extracts number + unit mentions, with unit conversion recorded separately from the original value.
3. **Table mode** extracts numeric cells under a header that names a unit. It records the table label (e.g. *Table 2.1*),
   the row line and the column.
4. **Condition hints** (O₂ %, pressure, gravity words found near the value) are attached and flagged
   *Condition inferred from context (unverified)*.
5. Every row carries the `Ambiguous` flag, `review_status: pending_review` and a content-derived ID. With `--write`, rows are
   appended idempotently to `dataset/references/findings/extraction_candidates.jsonl`. That file is separate from the human-curated
   `candidates.jsonl`, and nothing in it reaches the spine, the export or the Q&A corpus.

Executed example (dry run, BASS-II PDF p.36): table mode recovered the Table 2.1 extinction velocities `10±5` and `30±5`
(mm/s). It also bound the header unit mm/s to the O₂ column value `21`, which is wrong. This is the documented reason every
row is a proposal: a human or a validated model must bind each value to its column, material and criterion.
The test `test_pdf_extraction_requires_approved_hash_and_flags_every_row` covers this case.

The 12 assistant-proposed findings in `dataset/references/findings/candidates.jsonl` were re-checked on 2026-11-15. Every source file
hash matches, and the key terms and numbers appear on the cited PDF pages ("dilution with gaseous N2" and
"Fifty-two smoke points" are the source wordings). All 12 remain **pending review**.

## 5. Provider evaluation (no provider has been executed in this project)

No API key is available, and no model was run against the project's data. The comparison below therefore lists
capabilities and integration facts only. **It makes no performance claims.**

| Option | PDF/scientific extraction | Citation support | Cost | Privacy / locality | Rate limits | Integration |
|---|---|---|---|---|---|---|
| **Anthropic Claude API** (e.g. `claude-opus-5-5`; `claude-haiku-5-5` for bulk extraction) | Native PDF document input (base64 or Files API; up to 600 pages / 32 MB per request) | Built-in document citations with `page_location` (start/end page) for PDFs; structured outputs for schema-bound rows (citations and structured outputs cannot be combined in one request) | Per-token; Batch API at half price for offline extraction (see current pricing page) | Hosted; data leaves the machine; retention per account terms | Account-tier limits | Official Python SDK; server-side only |
| **Other hosted LLM APIs** | Varies by vendor | Varies; usually prompt-level citations | Per-token | Hosted | Vendor-specific | Needs a new adapter and the same audits |
| **Local open-weight model** (e.g. via a local runtime) | Requires a separate PDF-to-text or vision step | None built-in; IDs must be enforced by prompt and audits | Hardware only | Data stays local | None | Machine: 30 GB RAM, ≈526 GB free disk, NVIDIA GPU present but no driver tools (`nvidia-smi` absent). Small quantized models are feasible on CPU but slow; check VRAM and driver before any large download |
| **Current extractive mode** | Regex/table rules (this increment) | Exact passage IDs | Free | Local | None | Implemented |

**Recommendation:**

- **Keep extractive mode as the default.**
- **Extraction:** add the Claude API as an *optional, server-side* adapter for PDF extraction, behind
  `EMBER_ATLAS_LLM_PROVIDER=anthropic` and an environment variable key. Use document citations to get page-located candidate
  rows, and route them to `extraction_candidates.jsonl` exactly like the rule-based rows.
- **Q&A:** use the model only as a composer over retrieved approved passages, keeping the audits.
- **Validation before enabling either:** before enabling either path, validate it on a held-out set of hand-labelled
  pages. Measure value/unit/condition binding accuracy and citation-page accuracy against reviewer labels; the current
  20-case AI suite is a regression suite, not a benchmark.
- **Local models:** treat a local model as a privacy fallback only after the same evaluation.

## 6. Existing trained model (verified, unchanged)

`models/registry.json` and `models/flex-burning-rate-ridge/1.0.0+ea3a73cc/model.json` were hash-checked before and after
this increment and are unchanged. The registry records:

- **Feature inputs:** `fuel_heptane`, `oxygen`, `pressure_kpa`, `he_fraction`, `co2_fraction`, `initial_diameter_mm`
- **Target:** FLEX burning-rate constant (mm²/s)
- **Training data:** 257 records, 107 condition groups
- **Validation:** 5-fold grouped CV; ridge MAE 0.0475 mm²/s
- **Status:** `not_approved`; predictions are disabled
- **Training code:** `training_code_version` `4cc74669e2ccbe5c`, a hash covering `contract.py`, `spine.py` and `modeling.py` as of training

The contract changed to `2026-11-15.2` in this increment (citation/UI metadata only; no data mapping changed). The stored
hash therefore no longer equals a fresh hash of `contract.py`, and retraining would produce a new version string.
`scripts/verify.py` now re-exports the spine with `scripts/export_static.py` instead of
`scripts/build_artifacts.py`, so routine verification never retrains or overwrites the model.

## 7. Implementation status summary

| Item | Status |
|---|---|
| Grounded extractive Q&A with audits, refusal, related sources | Implemented, evaluated (20/20 regression cases, previous run) |
| Approved-document gate (contract REFERENCES + SHA-256) | Implemented, tested |
| Rule-based inline + table extraction to a separate review file | Implemented, tested (dry run; no rows written) |
| LLM adapter (Claude API) for extraction / composition | Recommended; not implemented; needs key, owner approval and evaluation |
| Embedding/hybrid retrieval | Recommended; not implemented |
| Human review of the 12 candidate findings | Pending (no reviewer decision recorded) |
