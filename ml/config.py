"""Configuration of the FLEX burning-rate ridge regression (single source for features, target and search grid)."""
MODEL_ID = 'flex-burning-rate-ridge'
MODEL_KIND = 'ridge_regression_standardized'
TARGET = {'id': 'PSI-69:burning_rate', 'definition': 'FLEX d²-law burning-rate constant', 'unit': 'mm^2/s'}
FLEX_FEATURES = ['fuel_heptane', 'oxygen', 'pressure_kpa', 'he_fraction', 'co2_fraction', 'initial_diameter_mm']
FEATURE_UNITS = {'fuel_heptane': 'indicator (1 = n-heptane, 0 = methanol)', 'oxygen': 'mol/mol', 'pressure_kpa': 'kPa',
                 'he_fraction': 'mol/mol', 'co2_fraction': 'mol/mol', 'initial_diameter_mm': 'mm'}
ALPHAS = [0.01, 0.1, 1.0, 10.0, 100.0]   # ridge regularization grid (λ)
OUTER_FOLDS = 5                          # grouped cross-validation folds (evaluation)
INNER_FOLDS = 4                          # grouped folds used to choose λ inside each training split
