# Ember Atlas machine learning

One model is implemented: a **ridge regression of the FLEX droplet burning-rate constant**. It is an
evaluation-only research component. Its approval status is `not_approved`, and numerical predictions are disabled in every
user interface, so no model output can be mistaken for a NASA measurement.

## What it learns

| | |
|---|---|
| Training data | NASA FLEX (PSI-69, `dataset/raw/flex/FLEX.csv`) only. The other four investigations measure other quantities and are **not** used. |
| Target | d²-law burning-rate constant K in mm²/s (d² = d₀² − K·t). The unit is documented in NASA/TP-2015-216046, App. A.1, Table IX. |
| Features (`config.py`) | fuel indicator (n-heptane = 1, methanol = 0); O₂ mole fraction; pressure (kPa); He fraction; CO₂ fraction; initial droplet diameter (mm) |
| Records | 274 FLEX rows. 16 are excluded (no reported burning rate) and 1 more (pressure not usable), leaving **257**. Nothing is imputed, and exact repeat rows would be excluded. |
| Groups | **107** condition groups. A group shares fuel, O₂, He, CO₂ and pressure (rounded to 1 kPa). |

## Method

Ridge regression minimizes squared error plus a penalty on large coefficients. Its closed form is

  β̂ = (XᵀX + λI)⁻¹ Xᵀy

The implementation in `training/ridge.py` standardizes every feature with training-fold statistics,
z = (x − μ) / σ. It keeps an **unpenalized intercept** equal to the mean target:

  ŵ = (ZᵀZ + λI)⁻¹ Zᵀ(y − ȳ),  ŷ = ȳ + zᵀŵ

NumPy solves this directly (`np.linalg.solve`); there is no iterative optimizer. λ is chosen from
{0.01, 0.1, 1, 10, 100} by an inner 4-fold grouped cross-validation that uses training data only. The registered
model uses λ = 10.

## Evaluation

The outer evaluation is a 5-fold **grouped** cross-validation (`evaluation/grouped_cv.py`):

- Whole condition groups are assigned to folds. Groups are ordered by SHA-256 and assigned round-robin, so the split is deterministic.
- Repeated tests at the same conditions never fall on both sides of a split, which prevents leakage. The code asserts this.
- Two baselines are always evaluated: the global mean and the per-fuel mean.

MAE = (1/n) Σ |yᵢ − ŷᵢ|, where n is the number of held-out predictions.

| Model | MAE (mm²/s) | RMSE (mm²/s) | MAE, n-heptane | MAE, methanol |
|---|---:|---:|---:|---:|
| **Ridge regression** | **0.0475** | 0.0746 | 0.0705 | 0.0310 |
| Per-fuel mean baseline | 0.1021 | 0.1337 | 0.1207 | 0.0889 |
| Global mean baseline | 0.1072 | 0.1383 | 0.1254 | 0.0942 |

Ridge MAE is 53.5% lower than the per-fuel baseline. The λ chosen per fold was [10, 1, 10, 1, 0.01].

These numbers estimate interpolation to unseen condition groups **within the tested range** only. Predictive
uncertainty is not validated, and gravity does not vary: every record is from orbital microgravity.

The full report, with the largest errors and the applicability domain, is in `reports/MODEL_EVALUATION_REPORT.md`.

## Layout and commands

```
ml/
├── config.py                      features, target, units, λ grid, fold counts
├── preprocessing/flex_features.py FLEX records → features/target (exclusions counted, no imputation)
├── training/ridge.py              standardization, closed-form ridge, grouped folds, λ selection
├── training/registry.py           target-eligibility gate, final fit, registry and report
├── evaluation/grouped_cv.py       grouped CV vs baselines, applicability domain
├── train.py                       entry point
├── artifacts/                     registry.json + flex-burning-rate-ridge/<version>/model.json (coefficients)
└── reports/MODEL_EVALUATION_REPORT.md
```

```bash
python -m ml.train --check                                    # re-evaluate and confirm the registered metrics (writes nothing)
python -m ml.train                                            # retrain from PostgreSQL (DATABASE_URL) and rewrite artifacts
python -m ml.train --spine frontend/public/data/<export>/spine.json   # same, from the static export (no database)
```

Run these from the repository root with `PYTHONPATH=.:backend`. The scripts in `scripts/` set this up automatically. The model
version suffix is the first eight characters of the dataset build-manifest hash. The static export never contains coefficients.

## Target eligibility

Only the FLEX burning-rate constant passes the gate:

- a documented definition and unit;
- a single measurement method;
- at least 10 independent groups;
- no unresolved calibration blocker.

Burn time is rejected because it would leak the burning-rate information. SPICE flame length and smoke-point length are rejected because their image calibration is unapproved. Operating settings are rejected because they are not combustion outcomes. The reasons are listed in `artifacts/registry.json` under `eligibility`.
