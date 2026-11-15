# Working on Ember Atlas

Scientific credibility and provenance come first. Every change must keep these rules:

- **Never modify `dataset/raw/`.** Original values, units, identifiers (kept as text, including suffixes such as `51a`),
  headings and bytes are preserved. The pipeline checks their hashes before and after every build.
- **Never invent measurements, citations or results.** Missing, zero, dash, not-applicable and disputed values stay
  distinct; nothing is imputed. Repeated rows are retained; exact repetition and identifier repetition are separate findings.
- **One row is not one experiment.** Run and segment identities are not established and their tables stay empty.
- **Keep raw and derived values separate**, with the formula, calibration context and evidence for every conversion.
- **Keep evidence types distinct in the UI:** measured NASA evidence, published findings, calculations and physical
  relationships, illustrative visualization, and (disabled) model estimates. Absence of matching evidence is never
  "safe"; a gap is a gap in this catalogue, not proof that no experiment exists.
- **No scientific approval is implied.** AI-assisted findings stay `not_reviewed` until a qualified reviewer decides;
  the ML model stays `not_approved` and predictions stay disabled.
- **Paths go through `ember_atlas/paths.py`.** Never hard-code machine paths; provenance identifiers are
  dataset-relative (`dataset/raw/...`).

Before opening a change, run `python scripts/verify.py` and keep `python scripts/validate_dataset.py` green. If you
rebuild the dataset (`scripts/build_dataset.py`), load it into a fresh database and record why in the commit message.
