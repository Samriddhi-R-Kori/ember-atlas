"""Closed-form ridge regression on standardized features with an unpenalized mean intercept."""
import hashlib

import numpy as np

from ml.config import ALPHAS, INNER_FOLDS


def standardize(train):
    mean = train.mean(axis=0)
    std = train.std(axis=0)
    std[std == 0] = 1.0
    return mean, std


def fit_ridge(X, y, alpha):
    mean, std = standardize(X)
    Z = (X - mean) / std
    y_mean = y.mean()
    A = Z.T @ Z + alpha * np.eye(Z.shape[1])
    w = np.linalg.solve(A, Z.T @ (y - y_mean))
    return {'mean': mean, 'std': std, 'w': w, 'b': y_mean, 'alpha': alpha}


def predict_ridge(model, X):
    return ((X - model['mean']) / model['std']) @ model['w'] + model['b']


def group_folds(groups, k):
    """Deterministic grouped folds: groups ordered by SHA-256 of their key, assigned round-robin."""
    unique = sorted(set(groups), key=lambda g: hashlib.sha256(g.encode()).hexdigest())
    fold_of = {g: i % k for i, g in enumerate(unique)}
    return np.array([fold_of[g] for g in groups])


def select_alpha(X, y, groups, k=INNER_FOLDS):
    """Inner grouped CV on training data only (prevents test-fold leakage into alpha choice)."""
    folds = group_folds(groups, min(k, len(set(groups))))
    best = None
    for alpha in ALPHAS:
        errors = []
        for f in sorted(set(folds)):
            tr, te = folds != f, folds == f
            model = fit_ridge(X[tr], y[tr], alpha)
            errors.append(np.mean(np.abs(predict_ridge(model, X[te]) - y[te])))
        score = float(np.mean(errors))
        if best is None or score < best[1]:
            best = (alpha, score)
    return best[0]
